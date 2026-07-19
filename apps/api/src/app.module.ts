import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BotsModule } from './bots/bots.module';
import { ConversationsModule } from './conversations/conversations.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { FlowsModule } from './flows/flows.module';
import { HealthModule } from './health/health.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueuesModule } from './queues/queues.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AiModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WorkspacesModule,
    BotsModule,
    FlowsModule,
    ConversationsModule,
    KnowledgeModule,
    QueuesModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
