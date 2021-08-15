const redisClient = require('./redis-client');
const aedesPersistenceRedis = require('aedes-persistence-redis');
const { createServer } = require('aedes-server-factory');
const http = require('http');
const _aedes = require('aedes');
const ws = require('websocket-stream');

const MQTT_PORT = 1883;
const HTTP_PORT = 8888;

const persistence = aedesPersistenceRedis({
  conn: redisClient,
  maxSessionDelivery: 100, // maximum offline messages deliverable on client CONNECT, default is 1000
  packetTTL: function (packet) {
    // offline message TTL, default is disabled
    return 10; //seconds
  },
});

const aedes = _aedes({
  persistence,
});

const createMqttServer = createServer(aedes);
const createHttpServer = http.createServer();

const httpServer = ws.createServer({ server: createHttpServer }, aedes.handle);

// aedes.publish({ topic: 'aedes/hello', payload: "I'm broker " + aedes.id });

createMqttServer.listen(MQTT_PORT, function () {
  console.log('MQTT Server started and listening on port ', MQTT_PORT);
});

httpServer.on('client', function (client) {
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

createHttpServer.listen(HTTP_PORT, function () {
  console.log('websocket server listening on port ', HTTP_PORT);
});
