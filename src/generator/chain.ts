import * as path from 'path';
import * as fs from 'fs'
import { Observable } from 'rxjs';
import * as MarkovChain from 'markovchain';
import { sample } from 'lodash';

import createLogger from '../common/logging';

const logger = createLogger('generator', 'chain');

const fsExists = Observable.bindCallback<string, boolean>(fs.exists);
const fsReadFile = Observable.bindNodeCallback<string, Buffer>(fs.readFile);

export type SloganGenerator = () => string;
export function setupGenerator(inputFile: string, startWords: string): Observable<SloganGenerator> {
  const chainSetup = Observable.of(inputFile).flatMap(infile => {
    if (!infile) {
      throw new Error(`Input file path has not been set`);
    }
    logger.info(`Using input file: ${infile}`);

    return fsExists(infile).flatMap(infileExists => {  
      if (!infileExists) {
        throw new Error(`Expected input file ${infile} to exist`);
      }

      return fsReadFile(infile).do(buffer => {
        logger.info(`Read ${buffer.length} bytes from input file: ${infile}`);
      }).map(buffer => 
        buffer.toString()
      );
    });
  }).map(input => {
    return new MarkovChain(input);
  }).do(() => {
    logger.info("Markov chain ready");
  });

  const startWordsSetup = Observable.of(startWords).map(startWords => {
    if (!startWords || !startWords.length) {
      throw new Error(`No starting words provided.`);
    }

    return startWords.split(" ");
  }).do(startWords => {
    logger.info(`Found ${startWords.length} slogan starting words`);
    logger.debug(`Using the following slogan starting words: ${startWords.join(', ')}`)
  });

  return Observable.zip(chainSetup, startWordsSetup, (chain, startwords) => {
    return function generator() {
      const startWord = sample(startwords);
      logger.info(`Picked start word: ${startWord}`);
      return chain.start(startWord).end().process();
    }
  });
}