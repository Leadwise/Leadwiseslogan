import { Observable } from 'rxjs';

import createLogger from '../common/logging'
import { QueueConnection, ChannelMessage, OutputQueue, InputQueue } from '../common/queue';
import { SlogansRequest, SloganResponse } from '../common/messages';

export interface GeneratorQueue {
  input: InputQueue<SlogansRequest>,
  output: OutputQueue<SloganResponse>
}

export async function setupQueue(
  queueUrl: string,
  requestsQueueName: string,
  slogansQueueName: string
): Promise<GeneratorQueue> {
  if (!queueUrl) {
    throw new Error(`No queue url specified`);
  }

  let connection = await QueueConnection.create(queueUrl);
  let [input, output] = await Promise.all([
    connection.createInputQueue(requestsQueueName),
    connection.createOutputQueue(slogansQueueName)
  ]);

  return { input, output };
}