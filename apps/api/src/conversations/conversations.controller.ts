import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Channel, ConversationStatus } from '@platform/database';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgMemberGuard, RequirePermission } from '../organizations/org-member.guard';
import { ConversationsService } from './conversations.service';

class ListConversationsQuery {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;
}

class SimulatorMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgMemberGuard)
@Controller('organizations/:orgId')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get('conversations')
  @RequirePermission('conversations:read')
  list(@Param('orgId') orgId: string, @Query() query: ListConversationsQuery) {
    return this.conversations.list(orgId, query.status);
  }

  @Get('conversations/:conversationId')
  @RequirePermission('conversations:read')
  get(@Param('orgId') orgId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.get(orgId, conversationId);
  }

  @Post('conversations/:conversationId/return-to-bot')
  @RequirePermission('conversations:manage')
  returnToBot(
    @Param('orgId') orgId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.conversations.returnToBot(orgId, user.id, conversationId);
  }

  @Post('conversations/:conversationId/resolve')
  @RequirePermission('conversations:manage')
  resolve(
    @Param('orgId') orgId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.conversations.resolve(orgId, user.id, conversationId);
  }

  /**
   * Flow test simulator (plan §6.4): runs the published bot synchronously in
   * a SIMULATOR-channel conversation scoped to the calling builder.
   */
  @Post('bots/:botId/simulator/messages')
  @RequirePermission('bots:manage')
  simulate(
    @Param('orgId') orgId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SimulatorMessageDto,
  ) {
    return this.conversations.processInbound({
      organizationId: orgId,
      botId,
      channel: Channel.SIMULATOR,
      text: dto.text,
      conversationId: dto.conversationId,
      contactExternalId: `simulator:${user.id}`,
    });
  }
}
