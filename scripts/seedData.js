const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Note = require('../models/Note');
const Invitation = require('../models/Invitation');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-saas', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await Note.deleteMany({});
    await Invitation.deleteMany({});

    console.log('Cleared existing data...');

    // Create tenants
    const acmeTenant = await Tenant.create({
      name: 'Acme Corporation',
      slug: 'acme',
      plan: 'free'
    });

    const globexTenant = await Tenant.create({
      name: 'Globex Corporation',
      slug: 'globex',
      plan: 'free'
    });

    console.log('Created tenants...');

    // Create users
    const users = [
      {
        email: 'admin@acme.test',
        password: 'password',
        role: 'admin',
        tenantId: acmeTenant._id
      },
      {
        email: 'user@acme.test',
        password: 'password',
        role: 'member',
        tenantId: acmeTenant._id
      },
      {
        email: 'admin@globex.test',
        password: 'password',
        role: 'admin',
        tenantId: globexTenant._id
      },
      {
        email: 'user@globex.test',
        password: 'password',
        role: 'member',
        tenantId: globexTenant._id
      },
      // Invitable test accounts - these will be used to test invitation system
      {
        email: 'invitable.user1@testmail.com',
        password: 'password',
        role: 'member',
        tenantId: acmeTenant._id
      },
      {
        email: 'invitable.user2@testmail.com',
        password: 'password',
        role: 'member',
        tenantId: globexTenant._id
      },
      // John and Joe test accounts for invitation testing
      {
        email: 'member1@example.com',
        password: 'password',
        role: 'member',
        tenantId: acmeTenant._id
      },
      {
        email: 'member2@example.com',
        password: 'password',
        role: 'member',
        tenantId: globexTenant._id
      }
    ];

    const createdUsers = await User.create(users);
    console.log('Created users...');

    // Create sample notes
    const notes = [
      {
        title: 'Welcome to Acme Notes',
        content: 'This is your first note in the Acme tenant. You can create, edit, and delete notes here.',
        userId: createdUsers[0]._id, // admin@acme.test
        tenantId: acmeTenant._id
      },
      {
        title: 'Meeting Notes - Q4 Planning',
        content: 'Discussed quarterly goals and objectives. Key focus areas: customer retention, product development, and market expansion.',
        userId: createdUsers[1]._id, // user@acme.test
        tenantId: acmeTenant._id
      },
      {
        title: 'Globex Project Ideas',
        content: 'Brainstorming session for new product initiatives. Consider sustainability focus and emerging market opportunities.',
        userId: createdUsers[2]._id, // admin@globex.test
        tenantId: globexTenant._id
      }
    ];

    await Note.create(notes);
    console.log('Created sample notes...');

    console.log('✅ Database seeded successfully!');
    console.log('\nTest accounts created:');
    console.log('- admin@acme.test (password: password) - Admin, Acme tenant');
    console.log('- user@acme.test (password: password) - Member, Acme tenant');
    console.log('- admin@globex.test (password: password) - Admin, Globex tenant');
    console.log('- user@globex.test (password: password) - Member, Globex tenant');
    console.log('\nInvitable test accounts (can check their invitations):');
    console.log('- invitable.user1@testmail.com (password: password) - Member, Acme tenant');
    console.log('- invitable.user2@testmail.com (password: password) - Member, Globex tenant');
    console.log('- member1@example.com (password: password) - Member, Acme tenant');
    console.log('- member2@example.com (password: password) - Member, Globex tenant');
    console.log('\n📧 How to test invitations:');
    console.log('1. Login as admin (admin@acme.test)');
    console.log('2. Go to Users tab and invite: member1@example.com or member2@example.com');
    console.log('3. Login as Member 1 (member1@example.com) or Member 2 (member2@example.com)');
    console.log('4. Check Invitations tab to see pending invitations');
    console.log('\n📧 Admin invitation endpoints:');
    console.log('POST /users/invite - Invite users');
    console.log('GET /users/invitations - View pending invitations');
    console.log('DELETE /users/invitations/:id - Cancel invitations');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
