const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkHardik() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'hardikyadaven@gmail.com' });
    console.log('Hardik User:', JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkHardik();
