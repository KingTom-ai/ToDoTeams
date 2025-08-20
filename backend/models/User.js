const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
// remove encrypt import

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: false, unique: true },
  phone: { type: String, required: false, unique: true },
  password: { type: String, required: true },
  publicKey: { type: String },
  avatarUrl: { type: String },
  theme: { type: String, default: 'system' },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  createdAt: { type: Date, default: Date.now },
  role: { type: String, enum: ['user', 'admin'], default: 'user' } // For RBAC
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// remove encryption plugin

module.exports = mongoose.model('User', userSchema);