const redis = require('ioredis');

const client = redis.createClient({
  port: Number(process.env.REDIS_PORT) || 6379,
  host: process.env.REDIS_HOST,
  ...(process.env.NODE_ENV === 'production' && { password: process.env.REDIS_PASSWORD }),
});

if (process.env.NODE_ENV !== 'test') {
  // client.on('connect', () => console.log('Connected to Redis 🔫'));
  client.on('ready', () => console.log('Connected to Redis and ready to use... ♥️'));
  client.on('error', (err) => console.log(err.message));
  client.on('end', () => console.log('Client disconnected from Redis'));
}
// process.on('SIGINT', () => client.quit());

module.exports = client;
