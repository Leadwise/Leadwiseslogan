import * as cluster from 'cluster';
import * as os from 'os';

import env from './common/env';
import createLogger from './common/logging';
import startGeneratorWorker from './generator';
import startPersistanceWorker from './persist';

const logger = createLogger('worker');

function getWorkersCount(envVarName) {
  let setting = process.env[envVarName];
  let workers = 1;
  if (setting === 'cpu') {
    workers = os.cpus.length;
  } else if (typeof setting !== 'undefined') {
    let count = parseInt(setting, 10);
    workers = !isNaN(count) 
      ? count
      : workers;
  }
  return workers;
}
let persistWorkersCount = getWorkersCount(env.PERSIST_WORKERS_NUMBER);
let generationWorkerCount = getWorkersCount(env.GENERATION_WORKERS_NUMBER);

if (cluster.isMaster) {
  let activeWorkers = 0;
  logger.info(`Starting ${persistWorkersCount} persistence workers and ${generationWorkerCount} generation workers`);

  for(let i = 0; i < persistWorkersCount; i++) {
    cluster.fork({ 'GLEADER_WORKER_MODE': 'persist' })
    activeWorkers += 1;
  }

  for(let i = 0; i < generationWorkerCount; i++) {
    cluster.fork({ 'GLEADER_WORKER_MODE': 'generate' })
    activeWorkers += 1;
  }

  cluster.on('exit', () => {
    activeWorkers -= 1;
    if (activeWorkers === 0) {
      logger.info('All workers finished, exiting.')
      process.exit(0);
    }
  });
} else {
  switch (process.env[env.WORKER_MODE]) {
    case 'persist':
      startPersistanceWorker();
      logger.info('Started persistance worker');
      break;

    case 'generate':
      startGeneratorWorker();
      logger.info('Started generator worker');
      break;

    default:
      throw new Error(`Unknown worker mode: ${process.env[env.WORKER_MODE]}`);
  }
}
