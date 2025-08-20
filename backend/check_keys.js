require('dotenv').config();
const encKey = process.env.ENC_KEY;
const sigKey = process.env.SIG_KEY;
console.log('ENC_KEY length:', Buffer.from(encKey, 'base64').length);
console.log('SIG_KEY length:', Buffer.from(sigKey, 'base64').length);