const t = require('tap');
const http = require('http');
require('../index.js');

const PORT = 3000 + parseInt(process.env.TAP_CHILD_ID || 0);

// server
const server = http.createServer((req, res) => {
  let count = 0;
  let interval = setInterval(() => {
    if (req.connection.terminated) {
      clearInterval(interval);
      res.end('term');
      return;
    }

    if(++count >= 3000) {
      clearInterval(interval);
      res.end('random ' + Math.random());
    }
  }, 1);
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
