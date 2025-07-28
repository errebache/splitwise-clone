const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

const safe = val => val === undefined ? null : val;

// Get expenses for a group
router.get('/group/:groupId', authenticateToken, async (req, res) => {
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

    // Get expenses with participants
    const [expenses] = await pool.execute(`
      SELECT e.*, 
             u1.full_name as created_by_name,
             u2.full_name as paid_by_name
      FROM expenses e
      LEFT JOIN users u1 ON e.created_by = u1.id
      LEFT JOIN users u2 ON e.paid_by = u2.id
      WHERE e.group_id = ?
      ORDER BY e.created_at DESC
    `, [groupId]);

    // Get participants for each expense
    console.log('Found expenses:', expenses.length);

    for (let expense of expenses) {
      const [participants] = await pool.execute(`
        SELECT ep.*, 
               COALESCE(u.full_name, pm.temporary_name) as full_name, 
               COALESCE(u.email, pm.email) as email, 
               ep.user_id,
               CASE WHEN u.id IS NOT NULL THEN 'registered' ELSE 'pending' END as member_type
        FROM expense_participants ep
        LEFT JOIN users u ON ep.user_id = u.id
        LEFT JOIN pending_members pm ON ep.user_id = pm.id AND pm.group_id = ?
        WHERE ep.expense_id = ?
      `, [groupId, expense.id]);
      
      console.log(`Participants for expense ${expense.id}:`, participants);
      
      expense.participants = participants.map(p => ({
        id: p.id,
        expense_id: p.expense_id,
        user_id: p.user_id,
        amount_owed: parseFloat(p.amount_owed),
        is_paid: Boolean(p.is_paid),
        member_type: p.member_type,
        user: {
          id: p.user_id,
          full_name: p.full_name,
          email: p.email
        }
      }));
    }

    console.log('Returning expenses with participants:', expenses);
    res.json({ expenses });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create expense
router.post('/', authenticateToken, validateRequest(schemas.createExpense), async (req, res) => {
  try {
    const {
      group_id,
      description,
      amount,
      currency,
      category,
      date,
      split_type,
      paid_by,
      participants
    } = req.body;

    console.log('Received expense data:', {
      group_id,
      description,
      amount,
      currency,
      category,
      date,
      split_type,
      paid_by,
      participants
    });

    // Convert string IDs to integers for database
    const groupIdInt = parseInt(group_id);
    const paidByInt = parseInt(paid_by);
    const userIdInt = parseInt(req.user.id);

    console.log('Creating expense with data:', {
      group_id,
      description,
      amount,
      currency,
      category,
      date,
      split_type,
      paid_by,
      participants
    });

    // Check if user is member of the group
    const [membership] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [safe(groupIdInt), safe(userIdInt)]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // Validate that paid_by user is a member of the group
    const [paidByMembership] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [safe(groupIdInt), safe(paidByInt)]
    );

    if (paidByMembership.length === 0) {
      return res.status(400).json({ error: 'Paid by user is not a member of this group' });
    }

    // Validate participants are members of the group
    const participantIds = participants.map(p => parseInt(p.user_id));
    
    if (participantIds.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }
    
    const [validParticipants] = await pool.execute(
      `SELECT user_id FROM group_members WHERE group_id = ? AND user_id IN (${participantIds.map(() => '?').join(',')})`,
      [safe(groupIdInt), ...participantIds.map(safe)]
    );

    if (validParticipants.length !== participants.length) {
      console.log('Validation failed:', {
        validParticipants: validParticipants.map(p => p.user_id),
        requestedParticipants: participantIds
      });
      console.log('Valid participants:', validParticipants);
      console.log('Requested participants:', participantIds);
      return res.status(400).json({ 
        error: 'Some participants are not members of this group',
        validParticipants: validParticipants.map(p => p.user_id),
        requestedParticipants: participantIds
      });
    }

    // Validate total amount for custom split
    if (split_type === 'custom') {
      const totalOwed = participants.reduce((sum, p) => sum + p.amount_owed, 0);
      if (Math.abs(totalOwed - amount) > 0.01) {
        return res.status(400).json({ error: 'Total participant amounts must equal expense amount' });
      }
    }

    // Create expense
    const [expenseResult] = await pool.execute(`
      INSERT INTO expenses (group_id, created_by, description, amount, currency, category, date, split_type, paid_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [safe(groupIdInt), safe(userIdInt), description, amount, currency, category, date, split_type, safe(paidByInt)]);

    const expenseId = expenseResult.insertId;

    // Add participants
    for (const participant of participants) {
      const amountOwed = split_type === 'equal' 
        ? amount / participants.length 
        : participant.amount_owed;
      
      const participantIdInt = parseInt(participant.user_id);
      const isPaid = participantIdInt === paidByInt;

      await pool.execute(`
        INSERT INTO expense_participants (expense_id, user_id, amount_owed, is_paid)
        VALUES (?, ?, ?, ?)
      `, [expenseId, safe(participantIdInt), amountOwed, isPaid]);
    }

    // Update group total expenses
    await pool.execute(
      'UPDATE groups_table SET total_expenses = total_expenses + ? WHERE id = ?',
      [safe(amount), safe(groupIdInt)]
    );

    // Get created expense with details
    const [createdExpense] = await pool.execute(`
      SELECT e.*, 
             u1.full_name as created_by_name,
             u2.full_name as paid_by_name
      FROM expenses e
      LEFT JOIN users u1 ON e.created_by = u1.id
      LEFT JOIN users u2 ON e.paid_by = u2.id
      WHERE e.id = ?
    `, [expenseId]);

    console.log('Expense created successfully:', createdExpense[0]);

    res.status(201).json({
      message: 'Expense created successfully',
      expense: createdExpense[0]
    });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const expenseId = req.params.id;
    const { description, amount, category, date, is_settled } = req.body;

    // Check if expense exists and user has access
    const [expenses] = await pool.execute(`
      SELECT e.*, gm.user_id
      FROM expenses e
      JOIN group_members gm ON e.group_id = gm.group_id
      WHERE e.id = ? AND gm.user_id = ?
    `, [expenseId, req.user.id]);

    if (expenses.length === 0) {
      return res.status(404).json({ error: 'Expense not found or access denied' });
    }

    const expense = expenses[0];

    // Only creator can update expense details
    if (expense.created_by !== req.user.id && is_settled === undefined) {
      return res.status(403).json({ error: 'Only expense creator can update details' });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (amount !== undefined) {
      updateFields.push('amount = ?');
      updateValues.push(amount);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (date !== undefined) {
      updateFields.push('date = ?');
      updateValues.push(date);
    }
    if (is_settled !== undefined) {
      updateFields.push('is_settled = ?');
      updateValues.push(is_settled);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(expenseId);

    await pool.execute(
      `UPDATE expenses SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Expense updated successfully' });

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const expenseId = req.params.id;

    // Check if expense exists and user is creator
    const [expenses] = await pool.execute(
      'SELECT group_id, amount, created_by FROM expenses WHERE id = ? AND created_by = ?',
      [expenseId, req.user.id]
    );

    if (expenses.length === 0) {
      return res.status(404).json({ error: 'Expense not found or access denied' });
    }

    const expense = expenses[0];

    // Delete expense (cascade will handle participants)
    await pool.execute('DELETE FROM expenses WHERE id = ?', [expenseId]);

    // Update group total expenses
    await pool.execute(
      'UPDATE groups_table SET total_expenses = total_expenses - ? WHERE id = ?',
      [expense.amount, expense.group_id]
    );

    res.json({ message: 'Expense deleted successfully' });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get balances for a group
router.get('/group/:groupId/balances', authenticateToken, async (req, res) => {
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

    // Calculate balances
    const [balances] = await pool.execute(`
      SELECT 
        u.id as user_id,
        u.full_name,
        u.email,
        COALESCE(paid.total_paid, 0) - COALESCE(owed.total_owed, 0) as amount
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      LEFT JOIN (
        SELECT paid_by as user_id, SUM(amount) as total_paid
        FROM expenses 
        WHERE group_id = ? AND is_settled = FALSE
        GROUP BY paid_by
      ) paid ON u.id = paid.user_id
      LEFT JOIN (
        SELECT ep.user_id, SUM(ep.amount_owed) as total_owed
        FROM expense_participants ep
        JOIN expenses e ON ep.expense_id = e.id
        WHERE e.group_id = ? AND e.is_settled = FALSE AND ep.is_paid = FALSE
        GROUP BY ep.user_id
      ) owed ON u.id = owed.user_id
      WHERE gm.group_id = ?
    `, [groupId, groupId, groupId]);

    res.json({ balances });

  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;