import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Channel } from '@platform/database';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Inject } from '@nestjs/common';
import { env } from '../config/env';
import { ConversationsService } from '../conversations/conversations.service';
import { INBOUND_EVENTS_QUEUE, REDIS_CONNECTION } from './queues.tokens';

export interface InboundEventJob {
  organizationId: string;
  botId: string;
  channel: Channel;
  text: string;
  conversationId?: string;
  contactExternalId?: string;
  idempotencyKey?: string;
}

/**
 * Flow worker (plan §6.5 "Flow execution must happen asynchronously through
 * workers"). Consumes normalized inbound events and drives the engine. Jobs
 * are idempotent: the message idempotency key dedupes webhook redeliveries.
 */
@Injectable()
export class FlowWorker implements OnModuleInit {
  private readonly logger = new Logger(FlowWorker.name);
  private worker?: Worker<InboundEventJob>;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly connection: IORedis,
    private readonly conversations: ConversationsService,
  ) {}

  onModuleInit() {
    if (!env.WORKER_ENABLED) {
      this.logger.log('Flow worker disabled (WORKER_ENABLED=false)');
      return;
    }
    this.worker = new Worker<InboundEventJob>(
      INBOUND_EVENTS_QUEUE,
      async (job: Job<InboundEventJob>) => {
        const result = await this.conversations.processInbound(job.data);
        return { conversationId: result.conversationId, status: result.status };
      },
      {
        connection: this.connection,
        concurrency: 10,
      },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Inbound job ${job?.id} failed: ${error.message}`);
    });
  }

  async close() {
    await this.worker?.close();
    this.connection.disconnect();
  }
}
