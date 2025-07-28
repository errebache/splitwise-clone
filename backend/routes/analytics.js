const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user analytics overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    // Get total expenses
    const [totalExpenses] = await pool.execute(`
      SELECT COALESCE(SUM(e.amount), 0) as total
      FROM expenses e
      JOIN group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = ?
    `, [req.user.id]);

    // Get total groups
    const [totalGroups] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM group_members
      WHERE user_id = ?
    `, [req.user.id]);

    // Get net balance
    const [netBalance] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN e.paid_by = ? THEN e.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN ep.user_id = ? AND ep.is_paid = FALSE THEN ep.amount_owed ELSE 0 END), 0) as balance
      FROM expenses e
      LEFT JOIN expense_participants ep ON e.id = ep.expense_id
      JOIN group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = ? AND e.is_settled = FALSE
    `, [req.user.id, req.user.id, req.user.id]);

    // Get pending reimbursements
    const [pendingReimbursements] = await pool.execute(`
      SELECT COALESCE(SUM(ep.amount_owed), 0) as total
      FROM expense_participants ep
      JOIN expenses e ON ep.expense_id = e.id
      JOIN group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = ? AND ep.user_id = ? AND ep.is_paid = FALSE AND e.is_settled = FALSE
    `, [req.user.id, req.user.id]);

    res.json({
      overview: {
        totalExpenses: totalExpenses[0].total,
        totalGroups: totalGroups[0].total,
        netBalance: netBalance[0].balance,
        pendingReimbursements: pendingReimbursements[0].total
      }
    });

  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expenses by category
router.get('/expenses-by-category', authenticateToken, async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT 
        e.category,
        SUM(e.amount) as total,
        COUNT(*) as count
      FROM expenses e
      JOIN group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = ?
      GROUP BY e.category
      ORDER BY total DESC
    `, [req.user.id]);

    res.json({ categories });

  } catch (error) {
    console.error('Get expenses by category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly trends
router.get('/monthly-trends', authenticateToken, async (req, res) => {
  try {
    const [trends] = await pool.execute(`
      SELECT 
        DATE_FORMAT(e.date, '%Y-%m') as month,
        SUM(e.amount) as total,
        COUNT(*) as count
      FROM expenses e
      JOIN group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = ? AND e.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(e.date, '%Y-%m')
      ORDER BY month ASC
    `, [req.user.id]);

    res.json({ trends });

  } catch (error) {
    console.error('Get monthly trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top spenders in user's groups
router.get('/top-spenders', authenticateToken, async (req, res) => {
  try {
    const [spenders] = await pool.execute(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        SUM(e.amount) as total_spent,
        COUNT(*) as expense_count
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      JOIN group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = ?
      GROUP BY u.id, u.full_name, u.email
      ORDER BY total_spent DESC
      LIMIT 10
    `, [req.user.id]);

    res.json({ spenders });

  } catch (error) {
    console.error('Get top spenders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group analytics
router.get('/groups/:groupId', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Check if user is member of the group
    const [membership] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // Get group expenses summary
    const [summary] = await pool.execute(`
      SELECT 
        COUNT(*) as total_expenses,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        COUNT(CASE WHEN is_settled = FALSE THEN 1 END) as pending_expenses
      FROM expenses
      WHERE group_id = ?
    `, [groupId]);

    // Get expenses by category for this group
    const [categories] = await pool.execute(`
      SELECT 
        category,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses
      WHERE group_id = ?
      GROUP BY category
      ORDER BY total DESC
    `, [groupId]);

    // Get member spending
    const [memberSpending] = await pool.execute(`
      SELECT 
        u.id,
        u.full_name,
        SUM(e.amount) as total_paid,
        COUNT(*) as expense_count
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = ?
      GROUP BY u.id, u.full_name
      ORDER BY total_paid DESC
    `, [groupId]);

    res.json({
      groupAnalytics: {
        summary: summary[0],
        categories,
        memberSpending
      }
    });

  } catch (error) {
    console.error('Get group analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;