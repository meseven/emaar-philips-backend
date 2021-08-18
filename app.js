const cluster = require('cluster');
const _aedes = require('aedes');
const aedesPersistenceRedis = require('aedes-persistence-redis');
const mqemitter = require('mqemitter-redis');
const { redisClient, config } = require('./redis-client');

const mq = mqemitter(config);

const persistence = aedesPersistenceRedis({
  conn: redisClient,
  // maxSessionDelivery: 100, // maximum offline messages deliverable on client CONNECT, default is 1000
  packetTTL: function (packet) {
    // offline message TTL, default is disabled
    return 10; //seconds
  },
});

function startAedes() {
  const port = 1883;
  const wsPort = 8888;

  const aedes = _aedes({
    id: 'BROKER_' + cluster.worker.id,
    mq,
    persistence,
  });

  // mqtt server
  const server = require('net').createServer(aedes.handle);

  // ws server
  const httpServer = require('http').createServer();
  const ws = require('websocket-stream');
  ws.createServer({ server: httpServer }, aedes.handle);

  server.listen(port, function () {
    console.log('Aedes MQTT listening on port:', port);
    aedes.publish({ topic: 'aedes/hello-mq', payload: "I'm broker " + aedes.id });
  });

  httpServer.listen(wsPort, function () {
    console.log('Aedes MQTT-WS listening on port:', wsPort);
    aedes.publish({ topic: 'aedes/hello-ws', payload: "I'm broker " + aedes.id });
  });

  aedes.on('subscribe', function (subscriptions, client) {
    console.log(
      'MQTT client \x1b[32m' +
        (client ? client.id : client) +
        '\x1b[0m subscribed to topics: ' +
        subscriptions.map((s) => s.topic).join('\n'),
      'from broker',
      aedes.id,
    );
  });

  aedes.on('unsubscribe', function (subscriptions, client) {
    console.log(
      'MQTT client \x1b[32m' +
        (client ? client.id : client) +
        '\x1b[0m unsubscribed to topics: ' +
        subscriptions.join('\n'),
      'from broker',
      aedes.id,
    );
  });

  // fired when a client connects
  aedes.on('client', function (client) {
    console.log(
      'Client Connected: \x1b[33m' + (client ? client.id : client) + '\x1b[0m',
      'to broker',
      aedes.id,
    );
  });

  // fired when a client disconnects
  aedes.on('clientDisconnect', function (client) {
    console.log(
      'Client Disconnected: \x1b[31m' + (client ? client.id : client) + '\x1b[0m',
      'to broker',
      aedes.id,
    );
  });

  // fired when a message is published
  aedes.on('publish', async function (packet, client) {
    console.log(
      'Client \x1b[31m' + (client ? client.id : 'BROKER_' + aedes.id) + '\x1b[0m has published',
      packet.payload.toString(),
      'on',
      packet.topic,
      'to broker',
      aedes.id,
    );
  });
}

if (cluster.isMaster) {
  const numWorkers = require('os').cpus().length;
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('online', function (worker) {
    console.log('Worker ' + worker.process.pid + ' is online');
  });

  cluster.on('exit', function (worker, code, signal) {
    console.log(
      'Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal,
    );
    console.log('Starting a new worker');
    cluster.fork();
  });
} else {
  startAedes();
}

// setTimeout(() => {
//   mq.on('hello world', function (message, cb) {
//     console.log(message);
//     cb();
//   });

//   var msg = {
//     topic: 'hello world',
//     payload: 'or any other fields',
//   };

//   mq.emit(msg, function () {
//     // emitter will never return an error
//     console.log('heyyy');
//   });
// }, 2000);
