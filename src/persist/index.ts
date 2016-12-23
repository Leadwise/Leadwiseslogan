import * as crypto from 'crypto';
import { Observable } from 'rxjs';

import { setupDatabase } from '../common/database';
import { setupQueue } from './queue'

import env from '../common/env';
import createLogger from '../common/logging';
import { SloganResponse } from '../common/messages';
import { ChannelMessage } from '../common/queue';

let logger = createLogger('persist');

if (!process.env[env.RABBITMQ_URL]) {
  logger.error(`No RabbitMQ url configured. Please provide RabbitMQ url by setting ` +
    `${env.RABBITMQ_URL} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.RABBITMQ_QUEUE_SLOGANS_SINK]) {
  logger.error(`No RabbitMQ queue for generation responses configured. Please provide queue name ` +
    `${env.RABBITMQ_QUEUE_SLOGANS_SINK} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.DATABASE_URL]) {
  logger.error(`No database configured. Please provide database configuration by setting ` +
    `${env.DATABASE_URL} environmental variable`);

  process.exit(-1);
}

export async function startPersistanceWorker () {
  let [queue, createDatabaseConnection] = await Promise.all([
    setupQueue(
      process.env[env.RABBITMQ_URL],
      process.env[env.RABBITMQ_QUEUE_SLOGANS_SINK]
    ),
    setupDatabase(process.env[env.DATABASE_URL], process.env[env.DATABASE_DROP_EXISTING_TABLES] === "true")
  ]);

  async function saveMessage(message: ChannelMessage<SloganResponse>) {
    let connection = await createDatabaseConnection();
    let hash = crypto.createHash('sha256');
    hash.update(message.content.text);
    let key = hash.digest("hex");
    try {
      await connection.query({
        text: "INSERT INTO slogans (key, text) VALUES ($1, $2)",
        name : "insert-slogan"
      }, [key, message.content.text]);
      logger.info(`Slogan persisted`, { key, text: message.content.text });
    } catch(err) {
      logger.error(`Slogan persistance failed: ${err.message}`, { key, text: message.content.text, error: err });
    } finally {
      connection.done();
      message.ack();
    }
  }

  async function handleMessage() {
    let message = await queue.input.getNextMessage();
    if (message) {
      await saveMessage(message);
    } else {
      await Observable.timer(1000, 0).take(1).toPromise();
    }
    setImmediate(handleMessage);
  }

  logger.info('Awaiting persist requests');
  handleMessage();
}

export default startPersistanceWorker;