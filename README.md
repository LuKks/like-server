# like-server

`server.close()` and `keep-alive` done right at socket level.

![](https://img.shields.io/npm/v/like-server.svg) [![](https://img.shields.io/maintenance/yes/2019.svg?style=flat-square)](https://github.com/LuKks/like-server) ![](https://img.shields.io/github/size/lukks/like-server/index.js.svg) ![](https://img.shields.io/npm/dt/like-server.svg) ![](https://img.shields.io/badge/tested_with-tap-e683ff.svg) ![](https://img.shields.io/github/license/LuKks/like-server.svg)

```javascript
require('like-server');
const app = require('express')();

app.get('/', (req, res) => res.send('ok'));

const server = app.listen(3000, () => {
  setTimeout(() => server.close(), 100);
});

// simulate browser request
const http = require('http');
http.get('http://127.0.0.1:3000', {
  agent: new http.Agent({ keepAlive: true })
});
```

The previous code will long 0s. Try without like-server: 5s!

## Install
```
npm i like-server
```

## Features
#### Handles keep-alive connections as it should be:
- Idle connections will be ended when server want to close.
- Active connections will be ended when request end.

#### Optional handle for long requests (long-polling, etc):
- `'terminate'` event for server and socket.
- `server.terminated` and `socket.terminated` states.

#### Compatible with everything:
- net, http, https and cluster modules.
- Any framework that use them (express, etc).
- WebSocket with `socket.requests`.

## Description
Combines great with [like-process](https://github.com/LuKks/like-process).\
Built in the most efficient way based on research.\
Don't need change any code, works as expected.\
Extremely useful when you have deployment with Docker, pm2, k8s, etc.\
It provides instant close without destroying everything.

## Example keep-alive
```javascript
require('like-server');
const app = require('express')();

app.get('/', (req, res) => res.send('ok'));

const server = app.listen(3000, () => {
  console.log('listening');

  setTimeout(() => {
    console.log('closing');
    server.close();
  }, 100);
});

process.on('exit', () => console.log('exit'));

// simulate browser request
const http = require('http');
http.get('http://127.0.0.1:3000', {
  agent: new http.Agent({ keepAlive: true })
}, res => {
  res.on('data', chunk => console.log(chunk.toString()));
});
```

In 0s:
```
listening
ok
closing
exit
```

In 5s without like-server:
```
listening
ok
closing
exit +5s
```
Why the exit wait 5s? In real world would be more due doesn't actually close,\
it keep accepting requests from sockets already connected due keep-alive.\
It normally cause a timeout by Docker, pm2, etc to forcely kill the process.\
You, Docker, etc should not destroy requests in the middle of something.

## Example events
```javascript
require('like-server');
const app = require('express')();

app.get('/', (req, res) => {
  let timeout = setTimeout(() => {
    res.send('ok');
  }, 3000);

  req.connection.once('terminate', () => {
    clearTimeout(timeout);
    res.send('term ok');
  });
});

const server = app.listen(3000, () => {
  console.log('listening');

  setTimeout(() => {
    console.log('closing');
    server.close();
  }, 100);
});

server.on('terminate', () => console.log('want to terminate'));
process.on('exit', () => console.log('exit'));

// simulate browser request
const http = require('http');
http.get('http://127.0.0.1:3000', {
  agent: new http.Agent({ keepAlive: true })
}, res => {
  res.on('data', chunk => console.log(chunk.toString()));
});
```

In 0s:
```
listening
closing
want to terminate
term ok
exit
```

In 8s without like-server:
```
listening
closing
ok +3s
exit +5s
```

## Example states
```javascript
require('like-server');
const app = require('express')();

app.get('/', (req, res) => {
  let count = 0;
  let interval = setInterval(() => {
    if (req.connection.terminated) {
      clearInterval(interval);
      res.end('term ok');
      return;
    }

    if(++count >= 3000) {
      clearInterval(interval);
      res.end('ok');
    }
  }, 1);
});

const server = app.listen(3000, () => {
  console.log('listening');

  setTimeout(() => {
    console.log('closing', server.terminated);
    server.close();
    console.log('closing', server.terminated);
  }, 100);
});

process.on('exit', () => console.log('exit'));

// simulate browser request
const http = require('http');
http.get('http://127.0.0.1:3000', {
  agent: new http.Agent({ keepAlive: true })
}, res => {
  res.on('data', chunk => console.log(chunk.toString()));
});
```

In 0s:
```
listening
closing false
closing true
term ok
exit
```

In 8s without like-server:
```
listening
closing undefined
closing undefined
ok +3s
exit +5s
```

## Example for WebSocket
```javascript
// https://github.com/websockets/ws#external-https-server
require('like-server');
const WebSocket = require('ws');
const server = require('http').createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws._socket.requests = 1;

  let interval = setInterval(() => {
    ws.send('ok');
  }, 30);

  ws._socket.once('terminate', () => {
    clearInterval(interval);
    ws.close(1000, 'term ok');
  });
});

server.listen(3000, () => {
  console.log('server listening');

  setTimeout(() => {
    console.log('server closing');
    server.close();
  }, 100);
});

process.on('exit', () => console.log('exit'));

// simulate client
new WebSocket('ws://localhost:3000')
.on('open', () => console.log('client opened'))
.on('close', (code, reason) => console.log('client closed', reason))
.on('message', data => console.log('client recv', data));
```

In 0s:
```
server listening
client opened
client recv ok
client recv ok
client recv ok
server closing
client closed term ok
exit
```

In infinite seconds without like-server because never ends:
```
server listening
client opened
client recv ok
client recv ok
server closing
client recv ok
client recv ok
... continues sending ok
```

Can use `wss.close()` to abruptly close but the interval never ends,\
it becomes difficult to handle resources like timers so better use like-server.

## How it works?
Normally can listen on SIGTERM to close the server:
```javascript
process.on('SIGTERM', () => server.close());
```
I recommend use [like-process](https://github.com/LuKks/like-process) for better resource management.

The server.close() is called then:
- `server.terminated` state is setted and server `'terminate'` event is emitted
- all `socket.terminated` state are setted
- sockets with pending requests are emitted with `'terminate'` event
- sockets without pending requests are ended then destroyed
- Here we have the event loop empty so it really gracefully close

## Tests
```
npm test
```

## License
Code released under the [MIT License](https://github.com/LuKks/like-server/blob/master/LICENSE).
