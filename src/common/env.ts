import { config as configureEnvironment } from 'dotenv';

import createLogger from './logging';

const logger = createLogger('common', 'env');

const env = {
  SUPRESS_ENV_DUMP: 'GLEADER_SUPPRESS_ENVDUMP',
  INFILE: 'GLEADER_INPUT_FILE',
  STARTING_WORDS: 'GLEADER_STARTING_WORDS',
  RABBITMQ_URL: 'GLEADER_RABBITMQ_URL',
  RABBITMQ_EXCHANGE: 'GLEADER_RABBITMQ_EXHCHANGE',
  RABBITMQ_QUEUE_SLOGANS_REQUESTS: 'GLEADER_QUEUE_REQUESTS',
  RABBITMQ_QUEUE_SLOGANS_SINK: 'GLEADER_QUEUE_SLOGANS',
  DATABASE_HOST: 'GLEADER_DATABASE_HOST',
  DATABASE_USER: 'GLEADER_DATABASE_USER',
  DATABASE_PASSWORD: 'GLEADER_DATABASE_PASSWORD',
  DATABASE_PORT: 'GLEADER_DATABASE_PORT',
  DATABASE_NAME: 'GLEADER_DATABASE_NAME',
  DATABASE_DROP_EXISTING_TABLES: 'GLEADER_DATABASE_DROP_EXISTING_TABLES',
  PERSIST_WORKERS_NUMBER: 'GLEADER_PERSIST_WORKERS',
  GENERATION_WORKERS_NUMBER: 'GLEADER_GENERATION_WORKERS',
  WEB_WORKERS_NUMBER: 'GLEADER_WEB_WORKERS',
  WORKER_MODE: 'GLEADER_WORKER_MODE',
  WEB_HTTP_PORT: 'PORT',
  SKIP_ENVFILE: 'GLEADER_SKIP_ENVFILE'
};

if (process.env[env.SKIP_ENVFILE] !== 'true') {
  configureEnvironment();
}

if (!process.env[env.SUPRESS_ENV_DUMP]) {
  let currentEnv = Object.keys(env).map(k => 
    env[k]
  ).reduce((acc, envName) => {
    let envVal = process.env[envName];
    acc[envName] = envVal || "";
    return acc; 
  }, {});

  logger.info(`Environment`, currentEnv);
}

export default env;