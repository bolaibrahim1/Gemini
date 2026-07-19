import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgMemberGuard, RequirePermission } from '../organizations/org-member.guard';
import { FlowGraph } from './flow-validator';
import { FlowsService } from './flows.service';

class CreateFlowDto {
  @IsUUID()
  botId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}

class UpdateDraftDto {
  @IsObject()
  graph: FlowGraph;
}

class ListFlowsQuery {
  @IsOptional()
  @IsUUID()
  botId?: string;
}

@ApiTags('flows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgMemberGuard)
@Controller('organizations/:orgId/flows')
export class FlowsController {
  constructor(private readonly flows: FlowsService) {}

  @Get()
  @RequirePermission('flows:read')
  list(@Param('orgId') orgId: string, @Query() query: ListFlowsQuery) {
    return this.flows.list(orgId, query.botId);
  }

  @Post()
  @RequirePermission('flows:manage')
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFlowDto,
  ) {
    return this.flows.create(orgId, user.id, dto.botId, dto.name);
  }

  @Get(':flowId')
  @RequirePermission('flows:read')
  get(@Param('orgId') orgId: string, @Param('flowId') flowId: string) {
    return this.flows.get(orgId, flowId);
  }

  @Patch(':flowId/draft')
  @RequirePermission('flows:manage')
  updateDraft(
    @Param('orgId') orgId: string,
    @Param('flowId') flowId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateDraftDto,
  ) {
    return this.flows.updateDraft(orgId, user.id, flowId, dto.graph);
  }

  @Post(':flowId/validate')
  @RequirePermission('flows:read')
  validate(@Param('orgId') orgId: string, @Param('flowId') flowId: string) {
    return this.flows.validate(orgId, flowId);
  }

  @Post(':flowId/publish')
  @RequirePermission('bots:publish')
  publish(
    @Param('orgId') orgId: string,
    @Param('flowId') flowId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.flows.publish(orgId, user.id, flowId);
  }
}
