import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AcceptInvitationDto,
  CreateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
} from './dto';
import { OrgMemberGuard, RequirePermission } from './org-member.guard';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(user.id, dto);
  }

  @Get()
  listMine(@CurrentUser() user: { id: string }) {
    return this.organizations.listForUser(user.id);
  }

  @Post('invitations/accept')
  accept(@CurrentUser() user: { id: string; email: string }, @Body() dto: AcceptInvitationDto) {
    return this.organizations.acceptInvitation(user.id, user.email, dto.token);
  }

  @Get(':orgId')
  @UseGuards(OrgMemberGuard)
  @RequirePermission('org:read')
  get(@Param('orgId') orgId: string) {
    return this.organizations.getById(orgId);
  }

  @Patch(':orgId')
  @UseGuards(OrgMemberGuard)
  @RequirePermission('org:update')
  update(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizations.update(orgId, user.id, dto);
  }

  @Get(':orgId/members')
  @UseGuards(OrgMemberGuard)
  @RequirePermission('members:read')
  listMembers(@Param('orgId') orgId: string) {
    return this.organizations.listMembers(orgId);
  }

  @Post(':orgId/invitations')
  @UseGuards(OrgMemberGuard)
  @RequirePermission('members:invite')
  async invite(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: InviteMemberDto,
  ) {
    const { invitation } = await this.organizations.invite(orgId, user.id, dto);
    return invitation;
  }

  @Patch(':orgId/members/:memberId/role')
  @UseGuards(OrgMemberGuard)
  @RequirePermission('members:update')
  updateRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizations.updateMemberRole(orgId, user.id, memberId, dto);
  }

  @Delete(':orgId/members/:memberId')
  @UseGuards(OrgMemberGuard)
  @RequirePermission('members:remove')
  @HttpCode(204)
  async remove(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.organizations.removeMember(orgId, user.id, memberId);
  }
}
