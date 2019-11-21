/*
 like-server (https://npmjs.com/package/like-server)
 Copyright 2019 Lucas Barrena
 Licensed under MIT (https://github.com/LuKks/like-server)
*/

'use strict';

if (!extendSocket(require('net'))) {
  extendHttp(require('http'));
  extendHttp(require('https'), true);
}

function extendSocket (base) {
  if (typeof base.Socket.prototype.terminated !== 'undefined') return true;

  base.Socket.prototype.requests = 0;
  base.Socket.prototype.terminated = false;
  base.Socket.prototype.terminate = function () {
    this.terminated = true;
    return this.requests ? this.emit('terminate') : this.end(this.destroy);
  }

  let create = base.createServer;
  base.createServer = function (options, listener) {
    return create.call(base, options, listener).prependListener('connection', connection);
  }

  base.Server.prototype.terminated = false;

  let close = base.Server.prototype.close;
  base.Server.prototype.close = function (callback) {
    close.call(this, callback);
    this.terminated = true;
    return this.emit('terminate');
  }
}

function connection (socket) {
  let term = () => socket.terminate();
  this.once('terminate', term);
  socket.once('close', () => this.removeListener('terminate', term));
}

function extendHttp (base, secure) {
  let create = base.createServer;
  base.createServer = function (options, listener) {
    return create.call(base, options, listener)
    .prependListener(secure ? 'secureConnection' : 'connection', connection)
    .prependListener('request', function (req, res) {
      req.connection.requests++;
      res.on('finish', () => !--req.connection.requests && this.terminated && req.connection.end(req.connection.destroy));
    });
  }
}
