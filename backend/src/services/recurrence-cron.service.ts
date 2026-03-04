import { processRecurringTasks } from './recurrence.service.js';
import { logger } from '../utils/logger.js';

let intervalId: ReturnType<typeof setInterval> | null = null;

const RECURRENCE_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

export function startRecurrenceCron() {
  logger.info('Starting recurrence cron job (every 60s)');
  // Run immediately on startup
  processRecurringTasks().catch((err) => {
    logger.error({ error: err }, 'Recurrence cron initial run failed');
  });

  intervalId = setInterval(async () => {
    try {
      await processRecurringTasks();
    } catch (err) {
      logger.error({ error: err }, 'Recurrence cron run failed');
    }
  }, RECURRENCE_CHECK_INTERVAL_MS);
}

export function stopRecurrenceCron() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Recurrence cron job stopped');
  }
}
