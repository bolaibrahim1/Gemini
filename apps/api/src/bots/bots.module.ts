import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [BotsController],
  providers: [BotsService],
})
export class BotsModule {}
