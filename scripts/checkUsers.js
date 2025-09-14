const mongoose = require('mongoose');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
require('dotenv').config();

const checkUsers = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({}).populate('tenantId');
    const tenants = await Tenant.find({});

    console.log('\n📊 Database Status:');
    console.log(`Total Tenants: ${tenants.length}`);
    console.log(`Total Users: ${users.length}`);

    console.log('\n🏢 Tenants:');
    tenants.forEach(tenant => {
      console.log(`- ${tenant.name} (${tenant.slug})`);
    });

    console.log('\n👥 All Users in Database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - ${user.tenantId?.name || 'No Tenant'}`);
    });

    console.log('\n🔑 All Login Credentials:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email} | Password: password | Role: ${user.role} | Tenant: ${user.tenantId?.name || 'None'}`);
    });

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

checkUsers();
