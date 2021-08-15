const redisClient = require('./redis-client');
const aedesPersistenceRedis = require('aedes-persistence-redis');

const persistence = aedesPersistenceRedis({
  conn: redisClient,
  maxSessionDelivery: 100, // maximum offline messages deliverable on client CONNECT, default is 1000
  packetTTL: function (packet) {
    // offline message TTL, default is disabled
    return 10; //seconds
  },
});

const aedes = require('aedes')({
  persistence,
});
const httpServer = require('http').createServer();
const ws = require('websocket-stream');
const port = 8888;

const server = ws.createServer({ server: httpServer }, aedes.handle);

// aedes.publish({ topic: 'aedes/hello', payload: "I'm broker " + aedes.id });

server.on('client', function (client) {
  console.log(
    'Client Connected: \x1b[33m' + (client ? client.id : client) + '\x1b[0m',
    'to broker',
    aedes.id,
  );

  client.on('message', () => console.log('data'));
});

// aedes.subscribe('#', function (packet, cb) {
//   console.log('payload:', packet.payload.toString());
//   console.log('topic:', packet.topic);
// });

aedes.on('message', () => {
  console.log('message');
});

httpServer.listen(port, function () {
  console.log('websocket server listening on port ', port);
});
