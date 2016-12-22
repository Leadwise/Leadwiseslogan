import * as winston from 'winston';

export type Logger = winston.LoggerInstance;

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
        label: component.join('/')
      })
    ]
  });
}

export default createLogger;