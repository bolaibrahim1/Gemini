import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { ConversationsModule } from '../conversations/conversations.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { FlowWorker } from './flow.worker';
import { KnowledgeWorker } from './knowledge.worker';
import {
  INBOUND_EVENTS_QUEUE,
  INBOUND_QUEUE,
  KNOWLEDGE_INGESTION_QUEUE,
  KNOWLEDGE_QUEUE,
  REDIS_CONNECTION,
} from './queues.tokens';

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

/**
 * Queue foundation (plan §13). The API enqueues jobs; workers consume them.
 * Workers run in-process for now (modular monolith, plan §8.1) and can be
 * split into separate deployments by booting with WORKER_ENABLED=true there
 * and false on the API tier. Global so tenant modules can inject queue
 * tokens without importing this module (avoids import cycles).
 */
@Global()
@Module({
  imports: [ConversationsModule, KnowledgeModule],
  providers: [
    {
      provide: REDIS_CONNECTION,
      useFactory: () =>
        new IORedis(env.REDIS_URL, {
          maxRetriesPerRequest: null,
          lazyConnect: true,
          enableOfflineQueue: false,
        }),
    },
    {
      provide: INBOUND_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) =>
        new Queue(INBOUND_EVENTS_QUEUE, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    },
    {
      provide: KNOWLEDGE_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) =>
        new Queue(KNOWLEDGE_INGESTION_QUEUE, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    },
    FlowWorker,
    KnowledgeWorker,
  ],
  exports: [INBOUND_QUEUE, KNOWLEDGE_QUEUE],
})
export class QueuesModule implements OnModuleDestroy {
  constructor(
    private readonly flowWorker: FlowWorker,
    private readonly knowledgeWorker: KnowledgeWorker,
  ) {}

  async onModuleDestroy() {
    await this.flowWorker.close();
    await this.knowledgeWorker.close();
  }
}
