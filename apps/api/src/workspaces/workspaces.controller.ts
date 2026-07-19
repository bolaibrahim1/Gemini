import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgMemberGuard, RequirePermission } from '../organizations/org-member.guard';
import { WorkspacesService } from './workspaces.service';

class WorkspaceNameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgMemberGuard)
@Controller('organizations/:orgId/workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  @RequirePermission('workspaces:read')
  list(@Param('orgId') orgId: string) {
    return this.workspaces.list(orgId);
  }

  @Post()
  @RequirePermission('workspaces:manage')
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: WorkspaceNameDto,
  ) {
    return this.workspaces.create(orgId, user.id, dto.name);
  }

  @Patch(':workspaceId')
  @RequirePermission('workspaces:manage')
  rename(
    @Param('orgId') orgId: string,
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: WorkspaceNameDto,
  ) {
    return this.workspaces.rename(orgId, user.id, workspaceId, dto.name);
  }
}
