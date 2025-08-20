const crypto = require('crypto');
const fs = require('fs');
const encKey = crypto.randomBytes(32).toString('base64');
const sigKey = crypto.randomBytes(64).toString('base64');
console.log(`ENC_KEY=${encKey}`);
console.log(`SIG_KEY=${sigKey}`);