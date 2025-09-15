const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const tenantRoutes = require('./routes/tenants');
const userRoutes = require('./routes/users');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting - only in production
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
}

// CORS configuration - Allow all origins for automated testing
app.use(cors({
  origin: true,  // Allow all origins for automated scripts and dashboards
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-saas', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Notes Backend API',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/auth/*',
      notes: '/notes/*',
      tenants: '/tenants/*',
      users: '/users/*'
    }
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Admin endpoint to clear all data (use with caution!)
app.post('/admin/clear-all-data', async (req, res) => {
  try {
    // Security check - only allow in development or with special key
    const adminKey = req.headers['x-admin-key'];
    if (process.env.NODE_ENV === 'production' && adminKey !== process.env.ADMIN_CLEAR_KEY) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const User = require('./models/User');
    const Tenant = require('./models/Tenant');
    const Note = require('./models/Note');
    const Invitation = require('./models/Invitation');

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Tenant.deleteMany({}),
      Note.deleteMany({}),
      Invitation.deleteMany({})
    ]);

    res.json({ 
      success: true, 
      message: 'All data cleared successfully',
      cleared: ['users', 'tenants', 'notes', 'invitations']
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ success: false, message: 'Error clearing data' });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/notes', authenticateToken, notesRoutes);
app.use('/tenants', authenticateToken, tenantRoutes);
app.use('/users', userRoutes); // Some routes need auth, some don't

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

const PORT = process.env.PORT || 5000;

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
