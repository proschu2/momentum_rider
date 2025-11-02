/**
 * Authentication Routes
 * Handles user registration and login
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const User = require('../models/user');
const authConfig = require('../config/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { email, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if user already exists (in a real app, this would query the database)
    // For now, we'll simulate checking against an in-memory store
    const existingUser = req.app.locals.users?.find((u) => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, authConfig.bcryptRounds);

    // Create user
    const user = User.create({
      email: email.toLowerCase(),
      passwordHash,
    });

    // Validate user
    const validation = user.validate();
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid user data',
        details: validation.errors,
      });
    }

    // Store user (in a real app, save to database)
    if (!req.app.locals.users) {
      req.app.locals.users = [];
    }
    req.app.locals.users.push(user.toJSONWithPassword());

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, authConfig.secret, {
      expiresIn: authConfig.expiresIn,
    });

    // Return success response
    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user and return JWT token
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
    }

    // Find user (in a real app, this would query the database)
    const user = req.app.locals.users?.find((u) => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, authConfig.secret, {
      expiresIn: authConfig.expiresIn,
    });

    // Return success response
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed',
    });
  }
});

module.exports = router;
