import * as pgpromise from 'pg-promise';

import createLogger from './logging';

const logger = createLogger('parsist', 'database');
const createDb = pgpromise();

export type ConnectionFactory = () => Promise<pgpromise.IConnected<any>>;

export async function setupDatabase(
  databaseUrl: string,
  dropExisting: boolean = false
): Promise<ConnectionFactory> {
  let database = await createDb(databaseUrl);
  let connectionFactory = async () =>
    await database.connect(databaseUrl);

  let conn = await connectionFactory();
  logger.info(`Connected to database`, { databaseUrl: databaseUrl });

  if (dropExisting) {
    logger.info(`Dropping existing database`);
    await conn.query(`DROP TABLE slogans`);
  }

  logger.info(`Ensuring database exists`);
  let setupQuery = await conn.query(`
    CREATE TABLE IF NOT EXISTS slogans (
      key CHAR(64) PRIMARY KEY NOT NULL,
      text TEXT NOT NULL
    );
  `);

  conn.done();

  return connectionFactory;
}