const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teamID: { type: String, required: true, unique: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['creator', 'manager', 'member'], default: 'member' },
    permissions: {
      write: { type: Boolean, default: false }
    }
  }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Removed encryption for name field to avoid unique index conflicts
// var encKey = process.env.ENC_KEY;
// var sigKey = process.env.SIG_KEY;
// teamSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey, encryptedFields: ['name'] });

module.exports = mongoose.model('Team', teamSchema);