import * as os from 'os';

export function getWorkersCount(envVarName) {
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

export default getWorkersCount;