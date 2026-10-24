process.env.NODE_ENV = 'test';

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import fs from 'node:fs';
import path from 'node:path';

const testsDir = __dirname;
const files = fs.readdirSync(testsDir)
  .filter(f => f.endsWith('.test.ts'))
  .map(f => path.join(testsDir, f));

const testStream = run({ files });

testStream
  .on('test:fail', () => {
    process.exitCode = 1;
  })
  .on('error', (err) => {
    console.error('[TestRunner] Test stream encountered an error:', err);
    process.exitCode = 1;
  });

testStream
  .compose(new spec())
  .pipe(process.stdout);
