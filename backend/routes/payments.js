const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

// Get user payments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [payments] = await pool.execute(`
      SELECT * FROM payments 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ payments });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payment
router.post('/', authenticateToken, validateRequest(schemas.createPayment), async (req, res) => {
  try {
    const { amount, currency, method, description } = req.body;

    // Generate mock transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment
    const [result] = await pool.execute(`
      INSERT INTO payments (user_id, amount, currency, method, description, transaction_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, amount, currency, method, description, transactionId, 'completed']);

    // Get created payment
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Payment processed successfully',
      payment: payments[0]
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user refunds
router.get('/refunds', authenticateToken, async (req, res) => {
  try {
    const [refunds] = await pool.execute(`
      SELECT r.*, p.transaction_id, p.method as payment_method
      FROM refunds r
      LEFT JOIN payments p ON r.payment_id = p.id
      WHERE r.user_id = ? 
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json({ refunds });

  } catch (error) {
    console.error('Get refunds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create refund request
router.post('/refunds', authenticateToken, validateRequest(schemas.createRefund), async (req, res) => {
  try {
    const { amount, currency, reason, description, payment_id } = req.body;

    // If payment_id is provided, verify it belongs to the user
    if (payment_id) {
      const [payments] = await pool.execute(
        'SELECT id, amount, currency FROM payments WHERE id = ? AND user_id = ?',
        [payment_id, req.user.id]
      );

      if (payments.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const payment = payments[0];

      // Check if refund amount doesn't exceed payment amount
      if (amount > payment.amount) {
        return res.status(400).json({ error: 'Refund amount cannot exceed payment amount' });
      }

      // Check if currency matches
      if (currency !== payment.currency) {
        return res.status(400).json({ error: 'Refund currency must match payment currency' });
      }
    }

    // Create refund request
    const [result] = await pool.execute(`
      INSERT INTO refunds (user_id, payment_id, amount, currency, reason, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, payment_id || null, amount, currency, reason, description]);

    // Get created refund
    const [refunds] = await pool.execute(
      'SELECT * FROM refunds WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Refund request submitted successfully',
      refund: refunds[0]
    });

  } catch (error) {
    console.error('Create refund error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update refund status (admin only - for demo purposes, any user can update)
router.put('/refunds/:id', authenticateToken, async (req, res) => {
  try {
    const refundId = req.params.id;
    const { status } = req.body;

    if (!['requested', 'approved', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if refund belongs to user
    const [refunds] = await pool.execute(
      'SELECT id FROM refunds WHERE id = ? AND user_id = ?',
      [refundId, req.user.id]
    );

    if (refunds.length === 0) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    // Update refund status
    await pool.execute(
      'UPDATE refunds SET status = ? WHERE id = ?',
      [status, refundId]
    );

    res.json({ message: 'Refund status updated successfully' });

  } catch (error) {
    console.error('Update refund error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;