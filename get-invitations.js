const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Import models
const Invitation = require('./models/Invitation');
const Tenant = require('./models/Tenant');

async function getInvitations() {
  try {
    const invitations = await Invitation.find({ 
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('tenantId', 'name slug');
    
    console.log('\n📧 PENDING INVITATIONS:');
    console.log('========================');
    
    invitations.forEach((inv, index) => {
      console.log(`\n${index + 1}. Email: ${inv.email}`);
      console.log(`   Role: ${inv.role}`);
      console.log(`   Tenant: ${inv.tenantId.name}`);
      console.log(`   Token: ${inv.token}`);
      console.log(`   Invitation Link: http://localhost:3000/invite/${inv.token}`);
      console.log(`   Expires: ${inv.expiresAt.toLocaleString()}`);
    });
    
    if (invitations.length === 0) {
      console.log('\nNo pending invitations found.');
      console.log('Send an invitation first from the Users tab!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getInvitations();
