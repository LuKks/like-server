const t = require('tap');
const http = require('http');
require('../index.js');

const PORT = 3000 + parseInt(process.env.TAP_CHILD_ID || 0);

// server
const server = http.createServer((req, res) => {
  res.end('random ' + Math.random());
}).listen(PORT, function () {
  setTimeout(() => this.close(), 100);
});

// client
http.get('http://127.0.0.1:' + PORT, {
  agent: new http.Agent({ keepAlive: true })
});

// test
let started = Date.now();
server.on('close', () => {
  if (Date.now() - started > 1500) {
    throw new Error('the server took too much time to close');
  }

  t.pass('');
});
