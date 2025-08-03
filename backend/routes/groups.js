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
      SELECT 
        g.*,
        u.full_name as created_by_name,
        COUNT(DISTINCT gm.user_id) as member_count
      FROM groups_table g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = ? OR email = ?
      )
      GROUP BY g.id, g.name, g.description, g.created_by, g.currency, g.total_expenses, g.created_at, g.updated_at, u.full_name
      ORDER BY g.updated_at DESC
    `, [req.user.id, req.user.email]);
    
    res.json({ groups });    

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single group
// router.get('/:id', authenticateToken, async (req, res) => {
//   try {
//     const groupId = req.params.id;

//     // Check if user is member of the group
//     const [membership] = await pool.execute(
//       'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
//       [groupId, req.user.id]
//     );

//     if (membership.length === 0) {
//       return res.status(403).json({ error: 'Access denied to this group' });
//     }

//     // Get group details
//     const [groups] = await pool.execute(`
//       SELECT g.*, u.full_name as created_by_name
//       FROM groups_table g
//       LEFT JOIN users u ON g.created_by = u.id
//       WHERE g.id = ?
//     `, [groupId]);

//     if (groups.length === 0) {
//       return res.status(404).json({ error: 'Group not found' });
//     }

//     // Get group members
//     const [members] = await pool.execute(`
//       SELECT gm.*, u.full_name, u.email, u.avatar_url
//       FROM group_members gm
//       JOIN users u ON gm.user_id = u.id
//       WHERE gm.group_id = ?
//       ORDER BY gm.role DESC, gm.joined_at ASC
//     `, [groupId]);

//     res.json({
//       group: groups[0],
//       members,
//       userRole: membership[0].role
//     });

//   } catch (error) {
//     console.error('Get group error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;

    // Vérifie que l'utilisateur est bien membre du groupe
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // Récupérer les infos du groupe
    const [groups] = await pool.execute(`
      SELECT g.*, u.full_name as created_by_name
      FROM groups_table g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.id = ?
    `, [groupId]);

    if (groups.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Membres enregistrés
    const [registeredMembers] = await pool.execute(`
      SELECT 
        gm.user_id, 
        u.full_name, 
        u.email, 
        u.avatar_url, 
        gm.role,
        gm.joined_at,
        true AS is_registered
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `, [groupId]);

    // Membres en attente (non enregistrés)
    const [pendingMembers] = await pool.execute(`
      SELECT 
        pm.id AS user_id,
        pm.temporary_name AS full_name,
        pm.email,
        NULL AS avatar_url,
        'pending' AS role,
        pm.created_at AS joined_at,
        false AS is_registered
      FROM pending_members pm
      WHERE pm.group_id = ?
    `, [groupId]);

    const allMembers = [...registeredMembers, ...pendingMembers];

    // Tri : admin d’abord > membres > pending > date d'ajout
    allMembers.sort((a, b) => {
      const rolePriority = {
        admin: 2,
        member: 1,
        pending: 0
      };
      return rolePriority[b.role] - rolePriority[a.role] || new Date(a.joined_at) - new Date(b.joined_at);
    });

    res.json({
      group: groups[0],
      members: allMembers,
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

// Get all members (registered + pending + participants)
router.get('/:id/all-members', authenticateToken, async (req, res) => {
  const groupId = req.params.id;

  try {
    // 1. Registered members
    const [registered] = await pool.execute(`
      SELECT u.id, u.full_name, u.email, u.avatar_url, 'registered' as status
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `, [groupId]);

    // 2. Pending members
    const [pending] = await pool.execute(`
      SELECT NULL as id, temporary_name as full_name, email, NULL as avatar_url, 'pending' as status
      FROM pending_members
      WHERE group_id = ?
    `, [groupId]);

    // 3. Participants non inscrits
    const [participants] = await pool.execute(`
      SELECT NULL as id, name as full_name, email, NULL as avatar_url, 'participant' as status
      FROM participants
      WHERE group_id = ?
    `, [groupId]);

    // Fusionner et filtrer les doublons éventuels par email
    const seen = new Set();
    const allMembers = [...registered, ...pending, ...participants].filter(member => {
      if (seen.has(member.email)) return false;
      seen.add(member.email);
      return true;
    });

    res.json({ members: allMembers });

  } catch (error) {
    console.error('Error fetching all members:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/with-members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.execute(`
      SELECT 
        g.id AS group_id,
        g.name,
        g.description,
        g.currency,
        g.total_expenses,
        g.created_by,
        g.created_at,
        g.updated_at,
        u.full_name AS created_by_name,

        gm.user_id AS member_user_id,
        m.full_name AS member_name,
        m.email AS member_email,
        gm.role AS member_role,

        pm.id AS pending_id,
        pm.temporary_name,
        pm.email AS pending_email,
        pm.status AS pending_status
      FROM groups_table g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN users m ON gm.user_id = m.id
      LEFT JOIN pending_members pm ON g.id = pm.group_id
      WHERE g.id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
        UNION
        SELECT group_id FROM pending_members WHERE email = (SELECT email FROM users WHERE id = ?)
      )
      ORDER BY g.updated_at DESC
    `, [userId, userId]);

    const grouped = {};

    for (const row of rows) {
      const gid = row.group_id;
      if (!grouped[gid]) {
        grouped[gid] = {
          id: gid,
          name: row.name,
          description: row.description,
          currency: row.currency,
          total_expenses: row.total_expenses,
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          members: [],
        };
      }

      // Membre enregistré
      if (row.member_user_id && !grouped[gid].members.find(m => m.user_id === row.member_user_id)) {
        grouped[gid].members.push({
          user_id: row.member_user_id,
          full_name: row.member_name,
          email: row.member_email,
          role: row.member_role,
          status: 'registered'
        });
      }

      // Membre pending
      if (row.pending_id && !grouped[gid].members.find(m => m.email === row.pending_email)) {
        grouped[gid].members.push({
          user_id: null,
          full_name: row.temporary_name,
          email: row.pending_email,
          role: 'member',
          status: row.pending_status || 'pending'
        });
      }
    }

    const groups = Object.values(grouped);
    res.json({ groups });

  } catch (err) {
    console.error('❌ Error fetching groups with members:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



module.exports = router;