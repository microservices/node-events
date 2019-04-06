#!/usr/bin/env node
// iterate over all payloads and run them

const assert = require('assert').strict;
const { readdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const payloadDir = join(__dirname, 'payloads');
const runner = join(__dirname, 'runner.js');

readdirSync(payloadDir).forEach(payload => {
  const file = join(payloadDir, payload);
  console.log(`Testing: ${payload}`);
  const omg = spawnSync('node', [runner, file], {
    stdio: [process.stdin, process.stdout, process.stderr],
  });
  assert(omg.status === 0);
  assert(omg.error === undefined);
});
