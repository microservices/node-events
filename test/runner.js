#!/usr/bin/env node
/*
Takes a single payload with the expected JSON to be received from an `oms subscribe`.
Runs `oms subscribe` and compares the received output with the expected payload.
The events to be subscribed and arguments are parsed from the filename.
*/

const assert = require('assert').strict;
const { spawn } = require('child_process');
const { basename } = require('path');
const { readFileSync } = require('fs');

const payloadFile = process.argv[2];
console.log(`Opening payloadFile: ${payloadFile}`);
const payloads = JSON.parse(readFileSync(payloadFile));

// get additional CLI arguments from the payload file name
const actions = basename(payloadFile).split('.')[0].split('_');

function test(cb) {
  const args = ['oms', 'subscribe', '--silent', 'listen', ...actions];
  console.log(`Spawn: ${args.join(' ')}`);
  const oms = spawn('npx', args);
  oms.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  oms.stderr.on('data', (data) => {
    process.stdout.write(data);
  });
  cb(oms);
}

test(function(oms){
  oms.stdout.on('data', (data) => {
    const payload = JSON.parse(data);
    delete payload['time'];
    delete payload['data']['time'];
    const expected = payloads.shift();
    assert.deepEqual(payload, expected);
    if (payloads.length === 0) {
      oms.kill();
      process.exit(0);
    }
  });
});


setTimeout(function(){
  assert(0, "No event received. Timeout.");
}, 30000);
