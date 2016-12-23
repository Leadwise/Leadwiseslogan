import createLogger from './common/logging';
import env from './common/env';

import { setupDatabase } from './common/database';
import { startWebServer } from './web/index';

const logger = createLogger('web');

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

async function main() {
  let dbOpen = await setupDatabase({
      host: process.env[env.DATABASE_HOST],
      port: process.env[env.DATABASE_PORT],
      database: process.env[env.DATABASE_NAME],
      user: process.env[env.DATABASE_USER],
      password: process.env[env.DATABASE_PASSWORD]
  }, process.env[env.DATABASE_DROP_EXISTING_TABLES] === "true")

  let webPort = parseInt(process.env[env.WEB_HTTP_PORT]);
  await startWebServer(dbOpen, !isNaN(webPort) ? webPort : undefined);
}

main();