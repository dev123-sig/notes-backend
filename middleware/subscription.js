const Note = require('../models/Note');

const checkNoteLimit = async (req, res, next) => {
  try {
    if (req.tenant.plan === 'pro') {
      return next(); // No limit for pro users
    }

    // Check note count for free plan
    const noteCount = await Note.countDocuments({ tenantId: req.tenant._id });
    
    if (noteCount >= 3) {
      return res.status(403).json({
        success: false,
        message: 'Note limit reached. Upgrade to Pro plan for unlimited notes.',
        code: 'NOTE_LIMIT_REACHED'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking note limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking note limit'
    });
  }
};

module.exports = {
  checkNoteLimit
};
