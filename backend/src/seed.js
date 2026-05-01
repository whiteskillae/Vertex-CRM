const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db';
    await mongoose.connect(MONGODB_URI);
    
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
        isVerified: true
      });
      console.log('Admin user created');
    }

    const managerExists = await User.findOne({ email: 'manager@example.com' });
    if (!managerExists) {
      await User.create({
        name: 'Manager One',
        email: 'manager@example.com',
        password: 'manager123',
        role: 'manager',
        isVerified: true
      });
      console.log('Manager user created: manager@example.com / manager123');
    }
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedAdmin();
