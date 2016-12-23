import * as fs from 'fs';
import * as path from 'path';
import { Observable } from 'rxjs';
import * as express from 'express';
import * as expressWinston from 'express-winston';
import createLogger from '../common/logging';
import * as mustacheExpress from 'mustache-express';
import { sample } from 'lodash';

const logger = createLogger('web', 'server');
const app = express();

const viewsDir = path.join(__dirname, '..', '..', 'views');
const assetsDir = path.join(__dirname, '..', '..', 'assets');

import { setupDatabase, ConnectionFactory } from '../common/database';

const fsReadDir = Observable.bindNodeCallback<string, string[]>(fs.readdir);

export async function startWebServer(dbOpen: ConnectionFactory, port: number = 80) {
  logger.info('Using following directories', { viewsDir, assetsDir });

  app.engine('mustache', mustacheExpress());
  app.set('view engine', 'mustache');
  app.set('views', viewsDir);

  app.use("/assets", express.static(assetsDir));

  app.get('/', (req: express.Request, res: express.Response) => {
    res.redirect('/slogan');
    res.end();
  });

  app.use(expressWinston.logger({
    winstonInstance: logger
  }));

  const backgrounds = await fsReadDir('assets').map(files => 
    files.filter(f => 
      f.startsWith('propaganda') && f.endsWith('jpg')
    )
  ).toPromise();
  logger.info(`Found ${backgrounds.length} avaliable backgrounds`);

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

      return res.render("index", {
        sloganKey: sloganRow.key,
        slogan: sloganRow.text,
        bg: sample(backgrounds)
      });
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



