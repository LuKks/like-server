# like-server

`server.close()` and `keep-alive` done right at socket level.

![](https://img.shields.io/npm/v/like-server.svg) [![](https://img.shields.io/maintenance/yes/2019.svg?style=flat-square)](https://github.com/LuKks/like-server) ![](https://img.shields.io/github/size/lukks/like-server/index.js.svg) ![](https://img.shields.io/npm/dt/like-server.svg) ![](https://img.shields.io/github/license/LuKks/like-server.svg)

```javascript
require('like-server');

const app = require('express')();

app.get('/', (req, res) => res.send('text'));

app.listen(3000);
```

## Install
```
npm i like-server
```

## Features
#### Handles keep-alive connections as it should be:
- Idle sockets (connections) will be ended when server want to close.
- Active sockets (connections) will be ended when request end.

#### Optionally handle for long requests (long-polling, etc) with:
- `'terminate'` event for server and socket.
- `server.terminated` and `socket.terminated` states.

#### Compatible with everything:
- net, http, https and cluster modules.
- Any framework that use them (express, etc).
- WebSocket with `socket.requests` and `terminated` state or `'terminate'` event.

## Description
Combines great with [like-process](https://github.com/LuKks/like-process).\
Built in the most efficient way based on research.\
Doesn't need change any code, works as expected.\
In WS there is no way to know if it's idle or not, need to add code (1 line).\
Extremely useful when you have deployment with Docker, pm2, k8s, etc.\
It provides instant exit without destroying everything.

## Several cases in example for http/s
```javascript
//normal express app
require('like-server');

const app = require('express')();

//short request
app.get('/short', (req, res) => res.send('ok'));

//handle long request with event
app.get('/timeout-polling', (req, res) => {
  let timeout = setTimeout(() => res.send('ok'), 3000);

  req.connection.once('terminate', () => {
    clearTimeout(timeout);
    res.send('term');
  });
});

//handle long request with state
app.get('/long-polling', (req, res) => {
  let count = 0;

  let interval = setInterval(() => {
    //you are waiting for data changes, processing, etc
    if(++count >= 6000 || req.connection.terminated) {
      clearInterval(interval);
      res.send(count >= 6000 ? 'ok' : 'term');
    }
  }, 1);
});

const server = app.listen(3000, () => {
  console.log('server listening');

  //close server in 0.1s but the long request takes 6s!
  setTimeout(() => {
    console.log('server closing');
    server.close(); //cluster.disconnect() or worker.disconnect()
  }, 100);

  //simulate client requests
  const http = require('http');
  const agent = new http.Agent({ keepAlive: true });

  ['/short', '/timeout-polling', '/long-polling'].forEach(path => {
    http.get('http://127.0.0.1:3000' + path, { agent }, res => {
      res.on('data', chunk => console.log(path, chunk.toString()));
    });
  });
});

server.on('terminate', () => console.log('server want to terminate'));
process.on('exit', () => console.log('exit'));
```

In 0s:
```
server listening
/short ok
server closing
server want to terminate
/timeout-polling term
/long-polling term
exit
```

In 7s without handling terminate (expected due the long requests takes its time):
```
server listening
/short ok
server closing
server want to terminate
/timeout-polling ok +3s
/long-polling ok +4s
exit
```

In 12s without like-server:
```
server listening
/short ok
server closing
/timeout-polling ok +3s
/long-polling ok +4s
exit +5s
```
Why takes 12s instead of 7s? I mean, why the exit wait for 5 seconds?\
The 12 seconds would be a lot more in real world due doesn't really close,\
it keep accepting requests from sockets already connected due keep-alive.\
It normally cause a timeout by Docker, pm2, etc to forcely kill the process.\
If you doesn't use Docker, etc then the timeout it's you killing the process!\
You, Docker, etc should not destroy requests in the middle of something.\
However, forget the problem because like-server already fix it naturally.

## Example for WebSocket
```javascript
//normal websocket app
require('like-server');

const WebSocket = require('ws'); //https://www.npmjs.com/ws#external-https-server

const server = require('http').createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', function(ws) {
  ws._socket.requests = 1; //opposite than http, in websockets starts as active
  //switch from 1 to 0 to mark the socket as idle but useless in this example

  let count = 0;
  let interval = setInterval(() => {
    //also can with 'terminate' event, depends on your code
    //same than server.terminated or this._server.terminated
    if(ws._socket.terminated) {
      clearInterval(interval);
      ws.close(1000, 'term');
      return;
    }

    //you are sending realtime data
    if(++count % 20 === 0) {
      ws.send(count);
    }
  }, 1);
});

server.listen(8000, () => {
  console.log('server listening');

  //close server in 0.1s
  setTimeout(() => {
    console.log('server closing');
    server.close();
  }, 100);

  //simulate client
  new WebSocket('ws://localhost:8000')
  .on('open', () => console.log('client opened'))
  .on('close', (code, reason) => console.log('client closed', reason))
  .on('message', data => console.log('client recv', data));
});

server.on('terminate', () => console.log('server want to terminate'));
process.on('exit', () => console.log('exit'));
```

In 0s:
```
server listening
client opened
client recv 20 +25ms
client recv 40 +23ms
client recv 60 +23ms
server closing
server want to terminate
client closed term
exit
```

## Tests
```
There are no tests yet
```

## License
Code released under the [MIT License](https://github.com/LuKks/like-server/blob/master/LICENSE).
