import { Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { ConversationsModule } from '../conversations/conversations.module';
import { FlowWorker } from './flow.worker';
import { INBOUND_EVENTS_QUEUE, INBOUND_QUEUE, REDIS_CONNECTION } from './queues.tokens';


/**
 * Queue foundation (plan §13). The API enqueues inbound channel events; the
 * flow worker consumes them. The worker runs in-process for now (modular
 * monolith, plan §8.1) and can be split into apps/worker-flow by booting the
 * same module in a separate deployment with WORKER_ENABLED=true.
 */
@Module({
  imports: [ConversationsModule],
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
        new Queue(INBOUND_EVENTS_QUEUE, {
          connection,
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        }),
    },
    FlowWorker,
  ],
  exports: [INBOUND_QUEUE],
})
export class QueuesModule implements OnModuleDestroy {
  constructor(private readonly flowWorker: FlowWorker) {}

  async onModuleDestroy() {
    await this.flowWorker.close();
  }
}
