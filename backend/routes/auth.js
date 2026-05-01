const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

function signToken(id, role) {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, adminCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    // Admin registration requires a secret code
    const finalRole = role === 'admin' ? 'admin' : 'student';
    if (finalRole === 'admin' && adminCode !== process.env.ADMIN_CODE) {
      return res.status(403).json({ message: 'Invalid admin registration code.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, password, role: finalRole });
    const token = signToken(user._id, user.role);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id, user.role);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users (admin only)
router.get('/users', protect, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const users = await User.find().select('-password').sort('-createdAt');
    res.json({ users, total: users.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
