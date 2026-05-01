const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const checkAllUsers = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm_db';
    console.log('Connecting to:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    
    const User = require('./backend/src/models/User');
    const allUsers = await User.find({});
    
    console.log(`Total Users found: ${allUsers.length}`);
    allUsers.forEach(u => {
      console.log(`- ${u.name} (${u.email}) | Role: ${u.role} | Status: ${u.status} | Verified: ${u.isVerified} | Deleted: ${u.isDeleted}`);
    });
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkAllUsers();
