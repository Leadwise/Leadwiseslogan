import { Observable } from 'rxjs';

import createLogger from '../common/logging';
import env from '../common/env';
import { setupGenerator } from './chain';
import { setupQueue, GeneratorQueue } from './queue';

const logger = createLogger('generator');

if (!process.env[env.INFILE]) {
  logger.error(`No input file configuration have been specified. Provide an input file ` +
    `by setting ${env.INFILE} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.STARTING_WORDS]) {
  logger.error(`No slogan starting words configuration have been specified. Provide starting `+
    `words by setting ${env.STARTING_WORDS} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.RABBITMQ_URL]) {
  logger.error(`No RabbitMQ url configured. Please provide RabbitMQ url by setting ` +
    `${env.RABBITMQ_URL} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.RABBITMQ_QUEUE_SLOGANS_REQUESTS]) {
  logger.error(`No RabbitMQ queue for generation requests configured. Please provide queue name ` +
    `${env.RABBITMQ_QUEUE_SLOGANS_REQUESTS} environmental variable`);

  process.exit(-1);
}

if (!process.env[env.RABBITMQ_QUEUE_SLOGANS_SINK]) {
  logger.error(`No RabbitMQ queue for generation responses configured. Please provide queue name ` +
    `${env.RABBITMQ_QUEUE_SLOGANS_SINK} environmental variable`);

  process.exit(-1);
}

export async function startGeneratorWorker () {
  let [queue, generateSlogan] = await Promise.all([
    setupQueue(
      process.env[env.RABBITMQ_URL],
      process.env[env.RABBITMQ_QUEUE_SLOGANS_REQUESTS],
      process.env[env.RABBITMQ_QUEUE_SLOGANS_SINK]
    ),
    setupGenerator(
      process.env[env.INFILE],
      process.env[env.STARTING_WORDS]
    ).take(1).toPromise()
  ]);

  async function generateSlogans(size: number) {
      await Observable.range(0, size).map(() => 
        generateSlogan()
      ).do(slogan => {
        logger.info(`Slogan: ${slogan}`);
        let submited = queue.output.submit({ text: slogan });
        if (!submited) {
          throw new Error(`Slogan could not be submitted`);
        }
      }).toPromise();

      logger.info(`Finished generating ${size} slogans`);
  }

  async function handleMessage() {
    let message = await queue.input.getNextMessage();
    if (message) {
      await generateSlogans(message.content.size || 1); 
      message.ack();
    } else {
      await Observable.timer(1000, 0).take(1).toPromise();
    }

    handleMessage();
  }

  logger.info('Awaiting generation requests');
  handleMessage();
}

export default startGeneratorWorker;