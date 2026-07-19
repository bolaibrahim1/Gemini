import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgMemberGuard, RequirePermission } from '../organizations/org-member.guard';
import { KNOWLEDGE_QUEUE } from '../queues/queues.tokens';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from './knowledge.service';

class CreateKnowledgeBaseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

class FaqPairDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  answer: string;
}

class CreateTextSourceDto {
  @IsIn(['ARTICLE', 'FAQ'])
  type: 'ARTICLE' | 'FAQ';

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FaqPairDto)
  pairs?: FaqPairDto[];
}

class QueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  question: string;
}

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgMemberGuard)
@Controller('organizations/:orgId')
export class KnowledgeController {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly ai: AiService,
    @Inject(KNOWLEDGE_QUEUE) private readonly ingestionQueue: Queue,
  ) {}

  @Get('knowledge-bases')
  @RequirePermission('knowledge:read')
  list(@Param('orgId') orgId: string) {
    return this.knowledge.list(orgId);
  }

  @Post('knowledge-bases')
  @RequirePermission('knowledge:manage')
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateKnowledgeBaseDto,
  ) {
    return this.knowledge.create(orgId, user.id, dto.name, dto.description);
  }

  @Get('knowledge-bases/:kbId')
  @RequirePermission('knowledge:read')
  get(@Param('orgId') orgId: string, @Param('kbId') kbId: string) {
    return this.knowledge.get(orgId, kbId);
  }

  @Post('knowledge-bases/:kbId/sources')
  @RequirePermission('knowledge:manage')
  async createTextSource(
    @Param('orgId') orgId: string,
    @Param('kbId') kbId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTextSourceDto,
  ) {
    const source = await this.knowledge.createTextSource(orgId, user.id, kbId, dto);
    await this.enqueueIngestion(orgId, source.id);
    return source;
  }

  @Post('knowledge-bases/:kbId/sources/upload')
  @RequirePermission('knowledge:manage')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadFileSource(
    @Param('orgId') orgId: string,
    @Param('kbId') kbId: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const source = await this.knowledge.createFileSource(orgId, user.id, kbId, file);
    await this.enqueueIngestion(orgId, source.id);
    return source;
  }

  @Post('knowledge-sources/:sourceId/reindex')
  @RequirePermission('knowledge:manage')
  async reindex(
    @Param('orgId') orgId: string,
    @Param('sourceId') sourceId: string,
  ) {
    await this.knowledge.requireSource(orgId, sourceId);
    await this.enqueueIngestion(orgId, sourceId);
    return { queued: true };
  }

  @Delete('knowledge-sources/:sourceId')
  @RequirePermission('knowledge:manage')
  @HttpCode(204)
  async deleteSource(
    @Param('orgId') orgId: string,
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.knowledge.deleteSource(orgId, user.id, sourceId);
  }

  /** AI test console (plan Phase 3): ask a question against a knowledge base. */
  @Post('knowledge-bases/:kbId/query')
  @RequirePermission('knowledge:read')
  async query(
    @Param('orgId') orgId: string,
    @Param('kbId') kbId: string,
    @Body() dto: QueryDto,
  ) {
    await this.knowledge.get(orgId, kbId);
    const result = await this.ai.answer({
      organizationId: orgId,
      knowledgeBaseId: kbId,
      question: dto.question,
    });
    return {
      answer: result.answer,
      grounded: result.grounded,
      citations: result.citations,
      retrieved: result.chunks.map((c) => ({
        chunkId: c.id,
        sourceName: c.sourceName,
        similarity: Number(c.similarity.toFixed(4)),
        preview: c.content.slice(0, 200),
      })),
    };
  }

  private enqueueIngestion(organizationId: string, sourceId: string) {
    return this.ingestionQueue.add(
      'ingest',
      { organizationId, sourceId },
      { jobId: `ingest:${sourceId}:${Date.now()}` },
    );
  }
}
