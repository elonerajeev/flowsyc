import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { sendMailDirect, SendMailInput } from "../utils/mailer";

// Queue names
export const EMAIL_QUEUE_NAME = "email-queue";

let redisConnection: Redis | null = null;
let emailQueue: Queue | null = null;
let emailWorker: Worker | null = null;

/**
 * Get/Initialize Redis connection
 */
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    logger.info("Initializing Redis connection for queues", { url: env.REDIS_URL });
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
    });
    
    redisConnection.on("error", (error) => {
      logger.error("Redis connection error", { error });
    });
  }
  return redisConnection;
}

/**
 * Initialize Queue and Worker (not run in tests to avoid connection requirements)
 */
export function initializeQueues() {
  if (env.NODE_ENV === "test") {
    logger.info("Skipping queue initialization in test environment");
    return;
  }

  const connection = getRedisConnection();

  // Create Email Queue
  emailQueue = new Queue(EMAIL_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  // Create Email Worker
  emailWorker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job: Job<SendMailInput>) => {
      logger.debug("Processing email job", { jobId: job.id, to: job.data.to, subject: job.data.subject });
      
      // Deserialize attachments (convert buffer-like JSON objects back to Buffer instances)
      const processedAttachments = job.data.attachments?.map((att: any) => {
        let content = att.content;
        if (content && typeof content === "object" && content.type === "Buffer" && Array.isArray(content.data)) {
          content = Buffer.from(content.data);
        }
        return {
          filename: att.filename,
          content,
          contentType: att.contentType,
        };
      });

      await sendMailDirect({
        ...job.data,
        attachments: processedAttachments,
      });
    },
    {
      connection,
      concurrency: 5,
    }
  );

  emailWorker.on("completed", (job) => {
    logger.debug("Email job completed successfully", { jobId: job.id, to: job.data.to });
  });

  emailWorker.on("failed", (job, error) => {
    logger.error("Email job failed", { jobId: job?.id, to: job?.data.to, error: error.message });
  });

  logger.info("Background queues initialized successfully");
}

/**
 * Add email job to the queue
 */
export async function queueEmail(input: SendMailInput): Promise<string | null> {
  if (env.NODE_ENV === "test") {
    // Direct send in tests, bypassing the queue
    logger.debug("Test environment: sending email directly");
    await sendMailDirect(input);
    return "test-job-id";
  }

  if (!emailQueue) {
    logger.warn("Queue not initialized, fallback to sending email directly");
    await sendMailDirect(input);
    return null;
  }

  try {
    const job = await emailQueue.add("send-email", input);
    logger.debug("Queued email job", { jobId: job.id, to: input.to });
    return job.id || null;
  } catch (error) {
    logger.error("Failed to enqueue email job, falling back to direct send", { error });
    await sendMailDirect(input);
    return null;
  }
}

/**
 * Clean up queue connections on graceful shutdown
 */
export async function closeQueues() {
  logger.info("Closing queue workers and connections...");
  if (emailWorker) {
    await emailWorker.close();
  }
  if (emailQueue) {
    await emailQueue.close();
  }
  if (redisConnection) {
    await redisConnection.quit();
  }
  logger.info("Queue services closed");
}
