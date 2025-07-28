const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();
const safe = val => val === undefined ? null : val;

// Get all groups for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [groups] = await pool.execute(`
      SELECT g.*, u.full_name as created_by_name,
             COUNT(DISTINCT gm.user_id) as member_count
      FROM groups_table g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
      GROUP BY g.id
      ORDER BY g.updated_at DESC
    `, [req.user.id]);

    res.json({ groups });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single group
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;

    // Check if user is member of the group
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // Get group details
    const [groups] = await pool.execute(`
      SELECT g.*, u.full_name as created_by_name
      FROM groups_table g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.id = ?
    `, [groupId]);

    if (groups.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get group members
    const [members] = await pool.execute(`
      SELECT gm.*, u.full_name, u.email, u.avatar_url
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.role DESC, gm.joined_at ASC
    `, [groupId]);

    res.json({
      group: groups[0],
      members,
      userRole: membership[0].role
    });

  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create group
router.post('/', authenticateToken, validateRequest(schemas.createGroup), async (req, res) => {
  try {
    const { name, description, currency } = req.body;

    // Create group
    const [result] = await pool.execute(
      'INSERT INTO groups_table (name, description, created_by, currency) VALUES (?, ?, ?, ?)',
      [safe(name), safe(description), safe(req.user.id), safe(currency) || 'EUR']
    );

    const groupId = result.insertId;

    // Add creator as admin member
    await pool.execute(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, req.user.id, 'admin']
    );

    // Add other default users as members for testing
    // try {
    //   await pool.execute(
    //     'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
    //     [groupId, 2, 'member']
    //   );
    //   await pool.execute(
    //     'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
    //     [groupId, 3, 'member']
    //   );
    // } catch (err) {
    //   // Ignore if users don't exist
    //   console.log('Could not add default members:', err.message);
    // }
    // // Get created group
    // const [groups] = await pool.execute(
    //   'SELECT * FROM groups_table WHERE id = ?',
    //   [groupId]
    // );

    const [createdGroupRows] = await pool.execute(
      'SELECT * FROM groups_table WHERE id = ?',
      [groupId]
    );
    
    res.status(201).json({
      message: 'Group created successfully',
      group: createdGroupRows[0]
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update group
router.put('/:id', authenticateToken, validateRequest(schemas.updateGroup), async (req, res) => {
  try {
    const groupId = req.params.id;
    const { name, description, currency } = req.body;

    // Check if user is admin of the group
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can update group details' });
    }

    // Update group
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (currency !== undefined) {
      updateFields.push('currency = ?');
      updateValues.push(currency);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(groupId);

    await pool.execute(
      `UPDATE groups_table SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated group
    const [groups] = await pool.execute(
      'SELECT * FROM groups_table WHERE id = ?',
      [groupId]
    );

    res.json({
      message: 'Group updated successfully',
      group: groups[0]
    });

  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete group
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;

    // Check if user is admin of the group
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can delete the group' });
    }

    // Delete group (cascade will handle related records)
    await pool.execute('DELETE FROM groups_table WHERE id = ?', [groupId]);

    res.json({ message: 'Group deleted successfully' });

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member to group
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { email, user_id, temporary_name, phone } = req.body;

    // Check if user is admin of the group
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    let newMember;
    let isPendingMember = false;
    
    if (email) {
      // Find user by email
      const [users] = await pool.execute(
        'SELECT id, full_name, email FROM users WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        // User exists, add them directly
        newMember = users[0];
      } else {
        // User doesn't exist, create pending member
        const tempName = temporary_name || email.split('@')[0];
        
        // Check if already pending in this group
        const [existingPending] = await pool.execute(
          'SELECT id FROM pending_members WHERE group_id = ? AND email = ?',
          [groupId, email]
        );
        
        if (existingPending.length > 0) {
          return res.status(400).json({ error: 'Cette personne est déjà invitée dans ce groupe' });
        }
        
        // Create pending member
        const [pendingResult] = await pool.execute(
          'INSERT INTO pending_members (group_id, email, temporary_name, phone, invited_by) VALUES (?, ?, ?, ?, ?)',
          [groupId, email, tempName, phone || null, req.user.id]
        );
        
        return res.status(201).json({
          message: 'Membre invité avec succès. Il rejoindra automatiquement le groupe lors de son inscription.',
          pendingMember: {
            id: pendingResult.insertId,
            email,
            temporary_name: tempName,
            phone,
            status: 'pending'
          }
        });
      }
      
    } else if (user_id) {
      // Find user by ID
      const [users] = await pool.execute(
        'SELECT id, full_name, email FROM users WHERE id = ?',
        [user_id]
      );
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      newMember = users[0];
    } else {
      return res.status(400).json({ error: 'Email or user_id is required' });
    }


    // Check if user is already a member
    const [existingMembership] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, newMember.id]
    );

    if (existingMembership.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Add member
    await pool.execute(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, newMember.id, 'member']
    );

    res.status(201).json({
      message: 'Member added successfully',
      member: newMember
    });

  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from group
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.params.userId;

    // Check if user is admin of the group
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can remove members' });
    }

    // Cannot remove the group creator
    const [group] = await pool.execute(
      'SELECT created_by FROM groups_table WHERE id = ?',
      [groupId]
    );

    if (group[0].created_by == userId) {
      return res.status(400).json({ error: 'Cannot remove the group creator' });
    }

    // Remove member
    const [result] = await pool.execute(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    res.json({ message: 'Member removed successfully' });

  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;