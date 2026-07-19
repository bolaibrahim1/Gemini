import { Module } from '@nestjs/common';
import { OrgMemberGuard } from './org-member.guard';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgMemberGuard],
  exports: [OrgMemberGuard],
})
export class OrganizationsModule {}
