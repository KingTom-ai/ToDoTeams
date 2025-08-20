const request = require('supertest');
const app = require('../index');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let token;
let mongoServer;

describe('Tasks API', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    token = res.body.token;
  });

  it('should get all tasks', async () => {
    const res = await request(app).get('/api/tasks').set('x-auth-token', token);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
});

// Add more tests for create, update, delete