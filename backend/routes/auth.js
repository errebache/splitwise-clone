const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { validateRequest, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', validateRequest(schemas.register), async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Calculate trial end date (3 months from now)
    const trialEndDate = new Date();
    trialEndDate.setMonth(trialEndDate.getMonth() + 3);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, full_name, trial_ends_at) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, full_name, trialEndDate]
    );

    const userId = result.insertId;

    // Check for pending memberships and auto-join groups
    const [pendingMemberships] = await pool.execute(
      'SELECT DISTINCT group_id FROM pending_members WHERE email = ? AND status = "pending"',
      [email]
    );

    let autoJoinedGroups = 0;
    for (const pending of pendingMemberships) {
      // Add user to group
      await pool.execute(
        'INSERT IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [pending.group_id, userId, 'member']
      );
      
      // Update pending member status
      await pool.execute(
        'UPDATE pending_members SET status = "registered", user_id = ? WHERE group_id = ? AND email = ?',
        [userId, pending.group_id, email]
      );
      
      autoJoinedGroups++;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Get user data
    const [users] = await pool.execute(
      'SELECT id, email, full_name, subscription_status, trial_ends_at, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      message: autoJoinedGroups > 0 
        ? `Compte créé avec succès ! Vous avez automatiquement rejoint ${autoJoinedGroups} groupe(s).`
        : 'User created successfully',
      token,
      user: users[0],
      autoJoinedGroups
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', validateRequest(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute(
      'SELECT id, email, password, full_name, subscription_status, trial_ends_at FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    delete user.password;

    res.json({
      message: 'Login successful',
      token,
      user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, full_name, avatar_url, subscription_status, trial_ends_at, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, avatar_url } = req.body;
    
    await pool.execute(
      'UPDATE users SET full_name = ?, avatar_url = ? WHERE id = ?',
      [full_name, avatar_url, req.user.id]
    );

    const [users] = await pool.execute(
      'SELECT id, email, full_name, avatar_url, subscription_status, trial_ends_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: users[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;