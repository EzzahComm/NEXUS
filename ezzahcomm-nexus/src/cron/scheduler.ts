import cron from 'node-cron';
import pino from 'pino';
import { runPoller } from './mpesa-pending-poller';

const logger = pino({ name: 'nexus:mpesa-poller' });

export function startMpesaPollerScheduler(): void {
  const enabled = (process.env.MPESA_POLLER_ENABLED ?? 'true').toLowerCase() !== 'false';
  if (!enabled) {
    logger.info('MPESA poller disabled via MPESA_POLLER_ENABLED=false');
    return;
  }

  const cronExpr = process.env.MPESA_POLLER_CRON || '*/1 * * * *'; // default: every minute
  logger.info({ cron: cronExpr }, 'Starting MPESA poller scheduler');

  try {
    const task = cron.schedule(cronExpr, async () => {
      try {
        await runPoller();
      } catch (err) {
        logger.error({ err }, 'MPESA poller run failed');
      }
    }, { scheduled: true });

    task.start();
  } catch (err) {
    logger.error({ err }, 'Failed to schedule MPESA poller');
  }
}

export default startMpesaPollerScheduler;
