const amqp = require('amqplib');

async function connect() {
  if (process.env.NODE_ENV === 'test') {
    return { sendToQueue: () => Promise.resolve() };
  }
  const conn = await amqp.connect('amqp://localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue('task_updates');
  return channel;
}

module.exports = connect;