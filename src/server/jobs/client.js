import { getJobConfig } from './config.js';

let clientPromise;

export async function getTasksClient() {
  if (!clientPromise) {
    clientPromise = import('@google-cloud/tasks').then(({ CloudTasksClient }) => {
      const config = getJobConfig();
      const options = {};

      if (config.apiEndpoint) {
        options.apiEndpoint = config.apiEndpoint;
      }

      if (config.credentials) {
        options.credentials = config.credentials;
      }

      return new CloudTasksClient(options);
    });
  }

  return clientPromise;
}

