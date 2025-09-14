const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const inviteUserSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  role: Joi.string().valid('admin', 'member').default('member')
});

const acceptInvitationSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required()
});

// POST /users/invite - Invite a user (Admin only)
router.post('/invite', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate input
    const { error, value } = inviteUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, role } = value;

    // Check if user already exists in this tenant
    const existingUser = await User.findOne({ 
      email, 
      tenantId: req.tenant._id 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists in this tenant'
      });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await Invitation.findOne({
      email,
      tenantId: req.tenant._id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'Invitation already sent to this email'
      });
    }

    // Generate unique invitation token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invitation
    const invitation = new Invitation({
      email,
      tenantId: req.tenant._id,
      invitedBy: req.user._id,
      role,
      token
    });

    await invitation.save();
    await invitation.populate('tenantId invitedBy', 'name slug email');

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          tenant: invitation.tenantId.name,
          invitedBy: invitation.invitedBy.email,
          expiresAt: invitation.expiresAt,
          invitationLink: `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`
        }
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invitation'
    });
  }
});

// GET /users/my-invitations - Get invitations for current user's email
router.get('/my-invitations', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    const invitations = await Invitation.find({
      email: userEmail,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
    .populate('tenantId invitedBy', 'name slug email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        invitations: invitations.map(inv => ({
          id: inv._id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          tenant: {
            id: inv.tenantId._id,
            name: inv.tenantId.name,
            slug: inv.tenantId.slug
          },
          invitedBy: inv.invitedBy.email,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          token: inv.token,
          acceptLink: `${process.env.FRONTEND_URL}/invite/${inv.token}`
        }))
      }
    });

  } catch (error) {
    console.error('Get user invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invitations'
    });
  }
});

// GET /users/invitations - List pending invitations (Admin only)
router.get('/invitations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const invitations = await Invitation.find({
      tenantId: req.tenant._id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
    .populate('invitedBy', 'email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        invitations: invitations.map(inv => ({
          id: inv._id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          invitedBy: inv.invitedBy.email,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt
        }))
      }
    });

  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invitations'
    });
  }
});

// DELETE /users/invitations/:id - Cancel invitation (Admin only)
router.delete('/invitations/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const invitation = await Invitation.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'pending'
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling invitation'
    });
  }
});

// GET /users/accept-invitation/:token - Get invitation details
router.get('/accept-invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('tenantId invitedBy', 'name slug email');

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation'
      });
    }

    res.json({
      success: true,
      data: {
        invitation: {
          email: invitation.email,
          role: invitation.role,
          tenant: {
            name: invitation.tenantId.name,
            slug: invitation.tenantId.slug
          },
          invitedBy: invitation.invitedBy.email,
          expiresAt: invitation.expiresAt
        }
      }
    });

  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invitation'
    });
  }
});

// POST /users/accept-invitation - Accept invitation and create account
router.post('/accept-invitation', async (req, res) => {
  try {
    // Validate input
    const { error, value } = acceptInvitationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { token, password, confirmPassword } = value;

    // Check password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Find valid invitation
    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('tenantId');

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: invitation.email 
    });

    let user;
    
    if (existingUser) {
      // User already exists - just update their role and tenant if needed
      // This handles cases where users are invited to join different tenants
      user = existingUser;
      
      // Update user's role if the invitation specifies a different role
      if (user.role !== invitation.role) {
        user.role = invitation.role;
      }
      
      // Update tenant if different (cross-tenant invitation)
      if (user.tenantId.toString() !== invitation.tenantId._id.toString()) {
        user.tenantId = invitation.tenantId._id;
      }
      
      await user.save();
    } else {
      // Create new user
      user = new User({
        email: invitation.email,
        password,
        role: invitation.role,
        tenantId: invitation.tenantId._id
      });

      await user.save();
    }

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    // Populate user with tenant info for response
    await user.populate('tenantId');

    // Generate JWT token
    const authToken = jwt.sign(
      { 
        userId: user._id,
        tenantId: user.tenantId._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token: authToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          tenant: {
            id: user.tenantId._id,
            name: user.tenantId.name,
            slug: user.tenantId.slug,
            plan: user.tenantId.plan
          }
        }
      }
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting invitation'
    });
  }
});

module.exports = router;
