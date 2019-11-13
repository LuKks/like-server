const t = require('tap');
const net = require('net');
require('../index.js');

net.Socket.prototype.requests = 1;

delete require.cache[require.resolve('../index.js')];
require('../index.js');

if (net.Socket.prototype.requests === 0) {
  throw new Error('the prototype was overwritten twice');
}

t.pass('');
