const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, address, coordinates, organizationName, animalType, industryType } =
      req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'User already exists with this email'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
      organizationName,
      animalType,
      industryType,
      isVerified: role === 'restaurant',
      location: {
        type: 'Point',
        coordinates: Array.isArray(coordinates) && coordinates.length === 2 ? coordinates : [0, 0]
      }
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          ...user.toObject(),
          password: undefined
        }
      },
      message: 'Registration successful'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to register user'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Invalid email or password'
      });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      data: {
        token,
        user: {
          ...user.toObject(),
          password: undefined
        }
      },
      message: 'Login successful'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to login'
    });
  }
});

router.get('/me', auth, async (req, res) => {
  return res.json({
    success: true,
    data: req.user,
    message: 'Current user fetched successfully'
  });
});

module.exports = router;

