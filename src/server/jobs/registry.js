import { searchIndexingConsumer } from './searchIndexing.js';
import { aiEnrichmentConsumer } from './aiEnrichment.js';
import { batchEmailConsumer } from './batchEmail.js';
import { deadLetterConsumer } from './deadLetter.js';

const consumers = new Map([
  [searchIndexingConsumer.jobName, searchIndexingConsumer],
  [aiEnrichmentConsumer.jobName, aiEnrichmentConsumer],
  [batchEmailConsumer.jobName, batchEmailConsumer],
  [deadLetterConsumer.jobName, deadLetterConsumer],
]);

export function getJobConsumer(jobName) {
  return consumers.get(jobName);
}

export function listJobConsumers() {
  return Array.from(consumers.values());
}

export { consumers as jobConsumers };

