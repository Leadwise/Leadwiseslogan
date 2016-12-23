import * as cluster from 'cluster';
import * as winston from 'winston';

export type Logger = winston.LoggerInstance;

function getWorkerPrefix() {
  if (cluster.isMaster) {
    return 'master';
  } else {
    return `worker:${cluster.worker.id}`;
  }
}

function createLogger (...component: string[]): Logger {
  return new winston.Logger({
    transports: [
      new winston.transports.File({
        name: 'logfile',
        filename: `${process.argv0}.log`
      }),
      new winston.transports.Console({
        name: 'console',
        colorize: true,
        timestamp: function() {
          return new Date().toISOString();
        },
        label: [getWorkerPrefix()].concat(component).join("/")
      })
    ]
  });
}

export default createLogger;