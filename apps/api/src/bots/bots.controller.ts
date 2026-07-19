import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BotStatus } from '@platform/database';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgMemberGuard, RequirePermission } from '../organizations/org-member.guard';
import { BotsService } from './bots.service';
import { CreateBotDto, UpdateBotDto } from './dto';

@ApiTags('bots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgMemberGuard)
@Controller('organizations/:orgId/bots')
export class BotsController {
  constructor(private readonly bots: BotsService) {}

  @Get()
  @RequirePermission('bots:read')
  list(@Param('orgId') orgId: string) {
    return this.bots.list(orgId);
  }

  @Post()
  @RequirePermission('bots:manage')
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBotDto,
  ) {
    return this.bots.create(orgId, user.id, dto);
  }

  @Get(':botId')
  @RequirePermission('bots:read')
  get(@Param('orgId') orgId: string, @Param('botId') botId: string) {
    return this.bots.get(orgId, botId);
  }

  @Patch(':botId')
  @RequirePermission('bots:manage')
  update(
    @Param('orgId') orgId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateBotDto,
  ) {
    return this.bots.update(orgId, user.id, botId, dto);
  }

  @Post(':botId/pause')
  @RequirePermission('bots:manage')
  pause(
    @Param('orgId') orgId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.bots.setStatus(orgId, user.id, botId, BotStatus.PAUSED);
  }

  @Post(':botId/activate')
  @RequirePermission('bots:manage')
  activate(
    @Param('orgId') orgId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.bots.setStatus(orgId, user.id, botId, BotStatus.PUBLISHED);
  }

  @Post(':botId/archive')
  @RequirePermission('bots:manage')
  archive(
    @Param('orgId') orgId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.bots.setStatus(orgId, user.id, botId, BotStatus.ARCHIVED);
  }
}
