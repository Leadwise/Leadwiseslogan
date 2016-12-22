import { Observable } from 'rxjs';

import createLogger from '../common/logging'
import { QueueConnection, InputQueue } from '../common/queue';
import { SloganResponse } from '../common/messages';

export interface PersistQueue {
  input: InputQueue<SloganResponse>
}

export async function setupQueue(
  queueUrl: string,
  slogansQueueName: string
): Promise<PersistQueue> {
  if (!queueUrl) {
    throw new Error(`No queue url specified`);
  }
  if (!slogansQueueName) {
    throw new Error(`No slogans queue specified`);
  }

  let connection = await QueueConnection.create(queueUrl);
  let input = await connection.createInputQueue<SloganResponse>(slogansQueueName);

  return { input };
}