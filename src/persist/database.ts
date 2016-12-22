import * as pgpromise from 'pg-promise';

import createLogger from '../common/logging';

const logger = createLogger('parsist', 'database');
const createDb = pgpromise();

export type ConnectionFactory = () => Promise<pgpromise.IConnected<any>>;

export async function setupDatabase(
  connectionConfig: any,
  dropExisting: boolean = false
): Promise<ConnectionFactory> {
  let database = await createDb(connectionConfig);
  let connectionFactory = async () =>
    await database.connect(connectionConfig);

  let conn = await connectionFactory();
  logger.info(`Connected to database`, connectionConfig);

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