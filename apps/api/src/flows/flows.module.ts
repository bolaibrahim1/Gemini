import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [FlowsController],
  providers: [FlowsService],
})
export class FlowsModule {}
