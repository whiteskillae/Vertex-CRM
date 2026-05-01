const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({});
    console.log('Total Users:', users.length);
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}) | ID: ${u._id} | Role: ${u.role} | Status: ${u.status} | Deleted: ${u.isDeleted}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
