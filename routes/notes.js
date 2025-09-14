const express = require('express');
const Joi = require('joi');
const Note = require('../models/Note');
const { checkNoteLimit } = require('../middleware/subscription');

const router = express.Router();

// Validation schemas
const createNoteSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  content: Joi.string().trim().min(1).max(10000).required()
});

const updateNoteSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200),
  content: Joi.string().trim().min(1).max(10000)
}).min(1);

// GET /notes - List all notes for the current tenant
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query with tenant isolation
    const query = { tenantId: req.tenant._id };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const notes = await Note.find(query)
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Note.countDocuments(query);

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notes'
    });
  }
});

// GET /notes/:id - Get a specific note
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id // Ensure tenant isolation
    }).populate('userId', 'email');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      data: { note }
    });

  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching note'
    });
  }
});

// POST /notes - Create a new note
router.post('/', checkNoteLimit, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createNoteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { title, content } = value;

    const note = new Note({
      title,
      content,
      userId: req.user._id,
      tenantId: req.tenant._id
    });

    await note.save();

    // Populate user info for response
    await note.populate('userId', 'email');

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note }
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating note'
    });
  }
});

// PUT /notes/:id - Update a note
router.put('/:id', async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateNoteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenant._id // Ensure tenant isolation
      },
      value,
      { new: true, runValidators: true }
    ).populate('userId', 'email');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note }
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating note'
    });
  }
});

// DELETE /notes/:id - Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant._id // Ensure tenant isolation
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting note'
    });
  }
});

module.exports = router;
