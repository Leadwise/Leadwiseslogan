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
  async function getSlogan(key?: string) {
    logger.info('Opening database connection');
    let dbConnection = await dbOpen();
    try {
      return (!!key)
        ? await dbConnection.oneOrNone('SELECT key, text FROM slogans WHERE key = $1', [key])
        : await dbConnection.oneOrNone('SELECT key, text FROM slogans OFFSET floor( random() * (SELECT COUNT(*) FROM slogans)) LIMIT 1');
    }
    finally{
      logger.info('Closing database connection');
      dbConnection.done();
    }
  }
  
  function getBackground(key: string) {
    let hash = (
      parseInt(key.substr(0, 2), 16)
      + 7 * parseInt(key.substr(2, 2), 16)
      + 11 * parseInt(key.substr(4, 2), 16)
    ) % backgrounds.length;

    return backgrounds[hash];
  }

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
    let slogan = await getSlogan();
    if (!slogan) {
        res.writeHead(404, `Not Found: No slogans avaliable`);
        return res.end();
    }
    
    return res.redirect(`/slogan/${slogan.key}`, 303);
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

    let slogan = await getSlogan(sloganId);
    if (!slogan) {
      res.writeHead(404, `Not Found: Could not find slogan with id ${sloganId}`);
      return res.end();
    }

    return res.render("index", {
      sloganKey: slogan.key,
      slogan: slogan.text,
      bg: getBackground(slogan.key),
      baseUrl: 'http://new-glorious-leader.herokuapp.com'
    });
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



