const t = require('tap');
const https = require('https');
require('../index.js');

const PORT = 3000 + parseInt(process.env.TAP_CHILD_ID || 0);

// server
const server = https.createServer((req, res) => {
  res.end('random ' + Math.random());
}).listen(PORT, function () {
  setTimeout(() => this.close(), 100);
});

// client
https.get('https://127.0.0.1:' + PORT, {
  agent: new https.Agent({ keepAlive: true })
}).on('error', (err) => {
  // excepted error due missing certificates but is ok
  if (err.code !== 'EPROTO') {
    throw err;
  }
});

// test
server.on('connection', (c) => {
  t.pass('');
});
