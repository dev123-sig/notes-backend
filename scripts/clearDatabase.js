const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Note = require('../models/Note');
const Invitation = require('../models/Invitation');

const clearDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    console.log('🗑️  Clearing all collections...');
    
    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Tenant.deleteMany({}),
      Note.deleteMany({}),
      Invitation.deleteMany({})
    ]);

    console.log('✅ All data cleared successfully!');
    console.log('📊 Collections cleared:');
    console.log('   - Users');
    console.log('   - Tenants');
    console.log('   - Notes');
    console.log('   - Invitations');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

clearDatabase();
