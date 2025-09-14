// Test script to verify John and Joe can receive invitations
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Tenant = require('./models/Tenant');
const Invitation = require('./models/Invitation');

async function testJohnJoeInvitations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Find tenants
    const acmeTenant = await Tenant.findOne({ slug: 'acme' });
    const globexTenant = await Tenant.findOne({ slug: 'globex' });
    
    // Find admin users
    const acmeAdmin = await User.findOne({ email: 'admin@acme.test' });
    const globexAdmin = await User.findOne({ email: 'admin@globex.test' });
    
    // Find John and Joe
    const john = await User.findOne({ email: 'member1@example.com' });
    const joe = await User.findOne({ email: 'member2@example.com' });
    
    console.log('\n📋 Account Status:');
    console.log('Acme Tenant:', acmeTenant ? '✅ Found' : '❌ Not found');
    console.log('Globex Tenant:', globexTenant ? '✅ Found' : '❌ Not found');
    console.log('Acme Admin:', acmeAdmin ? '✅ Found' : '❌ Not found');
    console.log('Globex Admin:', globexAdmin ? '✅ Found' : '❌ Not found');
    console.log('Member 1:', john ? '✅ Found' : '❌ Not found');
    console.log('Member 2:', joe ? '✅ Found' : '❌ Not found');

    if (john && joe && acmeAdmin && globexAdmin) {
      // Clear existing invitations for John and Joe
      await Invitation.deleteMany({ 
        $or: [
          { email: 'member1@example.com' },
          { email: 'member2@example.com' }
        ]
      });

      // Create test invitations
      const johnInvitation = await Invitation.create({
        email: 'member1@example.com',
        role: 'member',
        invitedBy: acmeAdmin._id,
        tenantId: acmeTenant._id,
        token: 'member1-test-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      const joeInvitation = await Invitation.create({
        email: 'member2@example.com',
        role: 'member',
        invitedBy: globexAdmin._id,
        tenantId: globexTenant._id,
        token: 'member2-test-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      console.log('\n📧 Test invitations created:');
      console.log('✅ Member 1 invitation created by Acme admin');
      console.log('✅ Member 2 invitation created by Globex admin');
      
      // Find all invitations for John and Joe
      const johnInvitations = await Invitation.find({ email: 'member1@example.com' })
        .populate('invitedBy', 'email')
        .populate('tenantId', 'name');
      
      const joeInvitations = await Invitation.find({ email: 'member2@example.com' })
        .populate('invitedBy', 'email')
        .populate('tenantId', 'name');

      console.log('\n📋 Member 1\'s Invitations:');
      johnInvitations.forEach(inv => {
        console.log(`- From: ${inv.invitedBy.email} (${inv.tenantId.name})`);
        console.log(`  Role: ${inv.role}, Status: ${inv.status}`);
      });

      console.log('\n📋 Member 2\'s Invitations:');
      joeInvitations.forEach(inv => {
        console.log(`- From: ${inv.invitedBy.email} (${inv.tenantId.name})`);
        console.log(`  Role: ${inv.role}, Status: ${inv.status}`);
      });

      console.log('\n🧪 Test Instructions:');
      console.log('1. Go to http://localhost:3000');
      console.log('2. Login as member1@example.com / password');
      console.log('3. Click on "Invitations" tab to see pending invitations');
      console.log('4. Login as member2@example.com / password');
      console.log('5. Click on "Invitations" tab to see pending invitations');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testJohnJoeInvitations();
