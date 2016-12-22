import * as crypto from 'crypto';
import { Observable } from 'rxjs';

import { setupDatabase } from './database';
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

if (!process.env[env.DATABASE_HOST]) {
  logger.error(`No database host configured. Please provide host by setting ` +
    `${env.DATABASE_HOST} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.DATABASE_NAME]) {
  logger.error(`No database name configured. Please provide database name by setting ` +
    `${env.DATABASE_NAME} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.DATABASE_USER]) {
  logger.error(`No database user configured. Please provide database user by setting ` +
    `${env.DATABASE_USER} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.DATABASE_PASSWORD]) {
  logger.error(`No database password configured. Please provide database password by setting ` +
    `${env.DATABASE_PASSWORD} environmental variable`);

  process.exit(-1);
}

export async function startPersistanceWorker () {
  let [queue, createDatabaseConnection] = await Promise.all([
    setupQueue(
      process.env[env.RABBITMQ_URL],
      process.env[env.RABBITMQ_QUEUE_SLOGANS_SINK]
    ),
    setupDatabase({
      host: process.env[env.DATABASE_HOST],
      port: process.env[env.DATABASE_PORT],
      database: process.env[env.DATABASE_NAME],
      user: process.env[env.DATABASE_USER],
      password: process.env[env.DATABASE_PASSWORD]
    }, process.env[env.DATABASE_DROP_EXISTING_TABLES] === "true")
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