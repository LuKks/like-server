const t = require('tap');
const net = require('net');
require('../index.js');

const PORT = 3000 + parseInt(process.env.TAP_CHILD_ID || 0);

// server
const server = net.createServer((c) => {
  c.write('random ' + Math.random());
}).listen(PORT, function () {
  setTimeout(() => this.close(), 100);
});

// client
const client = net.createConnection({ port: PORT }).setKeepAlive(true);

// test
let started = Date.now();
server.on('close', () => {
  if (Date.now() - started > 1500) {
    throw new Error('the server took too much time to close');
  }

  t.pass('');
});
