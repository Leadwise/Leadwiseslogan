import * as express from 'express';
import createLogger from '../common/logging';

const logger = createLogger('web', 'server');
const app = express();

import { setupDatabase, ConnectionFactory } from '../common/database';

export async function startWebServer(dbOpen: ConnectionFactory, port: number = 80) {
  //app.use('/static', express.static('web-resources'));

  app.get('/', (req: express.Request, res: express.Response) => {
    res.redirect('/slogan');
    res.end();
  })

  app.get('/slogan', async (req: express.Request, res: express.Response) => {
    let dbConnection = await dbOpen();
    try {
      let keyRow = await dbConnection.oneOrNone(
        'SELECT key FROM slogans OFFSET floor( random() * (SELECT COUNT(*) FROM slogans)) LIMIT 1'
      );
      if (!keyRow) {
        res.writeHead(404, `Not Found: No slogans avaliable`);
        return res.end();
      }

      res.redirect(`/slogan/${keyRow.key}`);
      return res.end();
    } finally {
      dbConnection.done();
    }
  });

  app.get('/slogan/:sloganId', async (req: express.Request, res: express.Response) => {
    let { sloganId } = req.params;
    if (!sloganId) {
      res.writeHead(400, 'Bad Request: No slogan id specified');
      return res.end();
    }
    if (sloganId.length != 64) {
      res.writeHead(400, `Bad Request: Expected 32 characters long slogan id, but got ${sloganId.length} characters long one instead`);
      return res.end();
    }

    let dbConnection = await dbOpen();
    try {
      let sloganRow = await dbConnection.oneOrNone('SELECT key, text FROM slogans WHERE key = $1', [sloganId]);
      if (!sloganRow) {
        res.writeHead(404, `Not Found: Could not find slogan with id ${sloganId}`);
        return res.end();
      }
      res.json(sloganRow);
      return res.end();
    } finally {
      dbConnection.done();
    }
  });

  return new Promise<void>((resolve, reject) => {
    app.listen(port, err => {
      if (err) {
        return reject(err);
      }
      logger.info(`Web server started: http://localhost:${port}/`)
      resolve();
    });
  });
}



