const express = require('express');
const Tenant = require('../models/Tenant');
const Note = require('../models/Note');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /tenants/:slug/upgrade - Upgrade tenant subscription (Admin only)
router.post('/:slug/upgrade', requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;

    // Ensure admin can only upgrade their own tenant
    if (req.tenant.slug !== slug) {
      return res.status(403).json({
        success: false,
        message: 'You can only upgrade your own tenant'
      });
    }

    const tenant = await Tenant.findOneAndUpdate(
      { slug },
      { plan: 'pro' },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'Tenant upgraded to Pro plan successfully',
      data: { tenant }
    });

  } catch (error) {
    console.error('Upgrade tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error upgrading tenant'
    });
  }
});

// GET /tenants/stats - Get tenant statistics
router.get('/stats', async (req, res) => {
  try {
    const noteCount = await Note.countDocuments({ tenantId: req.tenant._id });
    
    res.json({
      success: true,
      data: {
        tenant: {
          id: req.tenant._id,
          name: req.tenant.name,
          slug: req.tenant.slug,
          plan: req.tenant.plan
        },
        noteCount,
        noteLimit: req.tenant.plan === 'free' ? 3 : null,
        canCreateMore: req.tenant.plan === 'pro' || noteCount < 3
      }
    });

  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenant statistics'
    });
  }
});

module.exports = router;
