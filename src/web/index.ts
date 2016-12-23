import createLogger from '../common/logging';
import env from '../common/env';

import { setupDatabase } from '../common/database';
import { startWebServer } from './server';

const logger = createLogger('web', 'index');

if (!process.env[env.DATABASE_URL]) {
  logger.error(`No database configured. Please provide database configuration by setting ` +
    `${env.DATABASE_URL} environmental variable`);

  process.exit(-1);
}

export async function main() {
  let dbOpen = await setupDatabase(process.env[env.DATABASE_URL], process.env[env.DATABASE_DROP_EXISTING_TABLES] === "true");

  let webPort = parseInt(process.env[env.WEB_HTTP_PORT]);
  await startWebServer(dbOpen, !isNaN(webPort) ? webPort : undefined);
}

export default main;