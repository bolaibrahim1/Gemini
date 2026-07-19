import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { KNOWLEDGE_INGESTION_QUEUE, REDIS_CONNECTION } from './queues.tokens';

export interface IngestionJob {
  organizationId: string;
  sourceId: string;
}

/** Knowledge-ingestion worker (plan §13.1): extract → chunk → embed → store. */
@Injectable()
export class KnowledgeWorker implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeWorker.name);
  private worker?: Worker<IngestionJob>;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly connection: IORedis,
    private readonly knowledge: KnowledgeService,
  ) {}

  onModuleInit() {
    if (!env.WORKER_ENABLED) return;
    this.worker = new Worker<IngestionJob>(
      KNOWLEDGE_INGESTION_QUEUE,
      async (job: Job<IngestionJob>) => {
        await this.knowledge.ingestSource(job.data.organizationId, job.data.sourceId);
      },
      { connection: this.connection, concurrency: 2 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Ingestion job ${job?.id} failed: ${error.message}`);
    });
  }

  async close() {
    await this.worker?.close();
  }
}
