import http from 'node:http';
import { URL } from 'node:url';

import { getJobConfig } from './config.js';
import { getJobConsumer } from './registry.js';
import { enqueueDeadLetterJob } from './deadLetter.js';
import {
  recordJobCompleted,
  recordJobFailed,
  recordJobStarted,
} from './instrumentation.js';

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

function createSignalHandler(close) {
  return signal => {
    console.info(`[jobs] Received ${signal}. Initiating graceful shutdown.`);
    close()
      .then(() => {
        console.info('[jobs] Shutdown complete.');
        process.exit(0);
      })
      .catch(error => {
        console.error('[jobs] Failed to shutdown gracefully', error);
        process.exit(1);
      });
  };
}

export function createJobRunner(options = {}) {
  const port = options.port || Number(process.env.JOB_RUNNER_PORT || 8080);
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      if (req.method === 'GET' && requestUrl.pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
      }

      if (req.method !== 'POST' || !requestUrl.pathname.startsWith('/tasks/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
        return;
      }

      const jobName = requestUrl.pathname.replace('/tasks/', '').trim();
      const consumer = getJobConsumer(jobName);
      if (!consumer) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Unknown job ${jobName}` }));
        return;
      }

      const payload = await parseBody(req);
      const taskName = req.headers['x-cloudtasks-taskname'];
      const retryCount = Number.parseInt(req.headers['x-cloudtasks-taskretrycount'] || '0', 10);

      recordJobStarted({ jobName, payload, taskName, retryCount });

      try {
        await consumer.handler(payload, {
          headers: req.headers,
          taskName,
          retryCount,
        });
        recordJobCompleted({ jobName, payload, taskName, retryCount });
        res.writeHead(204);
        res.end();
      } catch (error) {
        recordJobFailed({ jobName, payload, taskName, retryCount, error });

        const config = getJobConfig();
        const queueSettings = config.queues[jobName];
        if (
          queueSettings?.deadLetterQueue &&
          retryCount + 1 >= queueSettings.maxRetriesBeforeDeadLetter
        ) {
          await enqueueDeadLetterJob({
            originalJobName: jobName,
            payload,
            taskName,
            retryCount,
            error: error?.message,
          });
          res.writeHead(204);
          res.end();
          return;
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Job failed' }));
      }
    } catch (error) {
      console.error('[jobs] Unhandled runner error', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Runner failure' }));
    }
  });

  const close = () =>
    new Promise((resolve, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

  const start = () =>
    new Promise((resolve, reject) => {
      server.listen(port, () => {
        console.info(`[jobs] Runner listening on port ${port}`);
        resolve();
      });
      server.on('error', reject);
    });

  const signalHandler = createSignalHandler(close);
  process.once('SIGINT', signalHandler);
  process.once('SIGTERM', signalHandler);

  return {
    server,
    start,
    close,
  };
}

