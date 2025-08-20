const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function initUser() {
  await mongoose.connect('mongodb://localhost:27017/todolist_team', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await User.deleteOne({ email: 'admin@example.com' });

  const user = new User({
    username: 'admin',
    email: 'admin@example.com',
    password: '123456',
    role: 'admin'
  });

  await user.save();
  console.log('Admin user created');
  mongoose.connection.close();
}

initUser().catch(console.error);