import * as cluster from 'cluster';

import env from './common/env';
import createLogger from './common/logging';
import getWorkersCount from './common/cluster';
import { main as startWebWorker } from './web/index';

const logger = createLogger('web');

let webWorkersCount = getWorkersCount(env.WEB_WORKERS_NUMBER);


if (cluster.isMaster) {
  let activeWorkers = 0;
  logger.info(`Starting ${webWorkersCount} web workers`);

  for(let i = 0; i < webWorkersCount; i++) {
    activeWorkers += 1;
    cluster.fork();
  }

  cluster.on('exit', () => {
    activeWorkers -= 1;
    if (activeWorkers === 0) {
      logger.info('All workers finished, exiting.')
      process.exit(0);
    }
  });
} else {
  logger.info(`Starting web worker ${cluster.worker.id}`);
  startWebWorker();
}