const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
// Optional: use nodemailer for sending real invitation emails
let nodemailer;
try {
  // Dynamically import nodemailer to avoid issues when not installed
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

// Optional: use Twilio for sending SMS invitations
let twilioClient;
try {
  const Twilio = require('twilio');
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } else {
    twilioClient = null;
  }
} catch (e) {
  twilioClient = null;
}
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

// Generate invitation code and link for a group
router.post('/groups/:groupId/generate', authenticateToken, async (req, res) => {
    try {
      const groupId = req.params.groupId;
      const { maxUses = 1, expiresInDays = 7 } = req.body;
  
      // Check admin rights
      const [membership] = await pool.execute(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, req.user.id]
      );
  
      if (membership.length === 0 || membership[0].role !== 'admin') {
        return res.status(403).json({ error: 'Only group admins can generate invitations' });
      }
  
      // Generate code & link
      const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationLink = `${process.env.FRONTEND_URL}/join/${invitationToken}`;
  
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
      // Insert
      await pool.execute(`
        INSERT INTO group_invitations (group_id, invitation_code, invitation_link, created_by, expires_at, max_uses)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [groupId, invitationCode, invitationLink, req.user.id, expiresAt, maxUses]);
  
      res.json({
        invitationCode,
        invitationLink,
        expiresAt: expiresAt.toISOString()
      });
  
    } catch (error) {
      console.error('Generate invitation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

// Add participant to group
router.post('/groups/:groupId/participants', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { name, email, phone } = req.body;

    // Check if user is member of the group
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Add participant
    const [result] = await pool.execute(`
      INSERT INTO participants (group_id, name, email, phone, invitation_token, invited_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [groupId, name, email || null, phone || null, invitationToken, req.user.id]);

    console.log('Participant added:', result);
    // Get created participant
    const [participants] = await pool.execute(
      'SELECT * FROM participants WHERE id = ?',
      [result.insertId]
    );

    // Prepare to optionally send email and/or SMS
    let emailSent = false;
    let smsSent = false;
    const invitationLink = `${process.env.FRONTEND_URL}/join/${invitationToken}`;
    try {
      // Fetch group name for message personalization
      const [groups] = await pool.execute('SELECT name FROM groups_table WHERE id = ?', [groupId]);
      const groupName = groups[0]?.name || '';
      // Send email if email provided and smtp configured
      if (email && nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        const mailOptions = {
          from: process.env.SMTP_FROM || 'no-reply@splitwise-clone.local',
          to: email,
          subject: `Invitation à rejoindre ${groupName}`,
          text: `Bonjour ${name},\n\nVous avez été invité·e à rejoindre le groupe ${groupName}. Cliquez sur ce lien pour rejoindre : ${invitationLink}\n\nÀ bientôt !`,
          html: `<p>Bonjour ${name},</p><p>Vous avez été invité·e à rejoindre le groupe <strong>${groupName}</strong>.</p><p>Cliquez sur ce lien pour rejoindre : <a href="${invitationLink}">${invitationLink}</a></p><p>À bientôt !</p>`,
        };
        try {
          await transporter.sendMail(mailOptions);
          emailSent = true;
        } catch (mailErr) {
          console.error('Failed to send participant invitation email:', mailErr);
        }
      }
      // Send SMS if phone provided and Twilio configured
      if (phone && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        try {
          await twilioClient.messages.create({
            body: `Bonjour ${name}, vous avez été invité·e à rejoindre le groupe ${groupName} sur SplitWise. Utilisez ce lien : ${invitationLink}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
          });
          smsSent = true;
        } catch (smsErr) {
          console.error('Failed to send participant invitation SMS:', smsErr);
        }
      }
    } catch (msgError) {
      console.error('Error while sending participant invitation notifications:', msgError);
    }

    res.status(201).json({
      message: 'Participant added successfully',
      participant: participants[0],
      invitationLink,
      emailSent,
      smsSent,
    });

  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group participants
router.get('/groups/:groupId/participants', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Check if user is member of the group
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // Get participants
    const [participants] = await pool.execute(`
      SELECT p.*, u.full_name as registered_name, u.email as registered_email
      FROM participants p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.group_id = ?
      ORDER BY p.created_at DESC
    `, [groupId]);

    res.json({ participants });

  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join group via invitation link
router.get('/join/:token', optionalAuth, async (req, res) => {
  try {
    const token = req.params.token;

    // Check if it's a group invitation
    const [groupInvitations] = await pool.execute(`
      SELECT gi.*, g.name as group_name, g.description, u.full_name as invited_by_name
      FROM group_invitations gi
      JOIN groups_table g ON gi.group_id = g.id
      JOIN users u ON gi.created_by = u.id
      WHERE gi.invitation_link LIKE ? AND gi.is_active = TRUE AND gi.expires_at > NOW()
    `, [`%${token}%`]);

    if (groupInvitations.length > 0) {
      const invitation = groupInvitations[0];
      
      // Check usage limits
      if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
        return res.status(400).json({ error: 'Invitation has reached maximum usage limit' });
      }

      return res.json({
        type: 'group',
        group: {
          id: invitation.group_id,
          name: invitation.group_name,
          description: invitation.description,
          invitedBy: invitation.invited_by_name
        }
      });
    }

    // Check if it's a participant invitation
    const [participants] = await pool.execute(`
      SELECT p.*, g.name as group_name, g.description, u.full_name as invited_by_name
      FROM participants p
      JOIN groups_table g ON p.group_id = g.id
      JOIN users u ON p.invited_by = u.id
      WHERE p.invitation_token = ? AND p.status = 'pending'
    `, [token]);

    if (participants.length > 0) {
      const participant = participants[0];
      
      return res.json({
        type: 'participant',
        participant: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          groupId: participant.group_id,
          groupName: participant.group_name,
          groupDescription: participant.description,
          invitedBy: participant.invited_by_name
        }
      });
    }

    res.status(404).json({ error: 'Invalid or expired invitation' });

  } catch (error) {
    console.error('Join invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join group via code
router.post('/join-by-code', optionalAuth, async (req, res) => {
  try {
    const { code } = req.body;

    console.log('Join by code request:', { code, hasUser: !!req.user });

    if (!code) {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    // Find invitation by code
    const [invitations] = await pool.execute(`
      SELECT gi.*, g.name as group_name, g.description, u.full_name as invited_by_name
      FROM group_invitations gi
      JOIN groups_table g ON gi.group_id = g.id
      JOIN users u ON gi.created_by = u.id
      WHERE gi.invitation_code = ? AND gi.is_active = TRUE AND gi.expires_at > NOW()
    `, [code.toUpperCase()]);

    console.log('Found invitations:', invitations.length);
    if (invitations.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation code' });
    }

    const invitation = invitations[0];

    // Check usage limits
    if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
      return res.status(400).json({ error: 'Invitation code has reached maximum usage limit' });
    }

    console.log('Returning invitation info:', {
      type: 'group',
      group: {
        id: invitation.group_id,
        name: invitation.group_name,
        description: invitation.description,
        invitedBy: invitation.invited_by_name
      }
    });

    res.json({
      type: 'group',
      group: {
        id: invitation.group_id,
        name: invitation.group_name,
        description: invitation.description,
        invitedBy: invitation.invited_by_name
      }
    });

  } catch (error) {
    console.error('Join by code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept group invitation
router.post('/accept/:groupId', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { invitationCode, participantId } = req.body;

    console.log('Accept invitation request:', { groupId, invitationCode, participantId, userId: req.user.id });

    // If accepting as a participant
    if (participantId) {
      // Update participant with user ID
      await pool.execute(
        'UPDATE participants SET user_id = ?, status = "registered" WHERE id = ? AND group_id = ?',
        [req.user.id, participantId, groupId]
      );

      /**
       * When a pending participant (without user_id) is converted into a registered user,
       * we need to update historical expense records:
       *   1) Update any expense_participants rows that reference the pending participant
       *      to now reference the newly registered user.
       *   2) For any expenses where that pending participant paid (is_paid = 1), update the
       *      expense's paid_by field to point to the new user. During expense creation
       *      we temporarily stored paid_by as the creator's user_id when a pending
       *      participant was selected to pay, so this update reassigns it correctly.
       */
      try {
        // Update expense_participants user_id for all expenses in this group
        await pool.execute(
          `UPDATE expense_participants ep
           JOIN expenses e ON ep.expense_id = e.id
           SET ep.user_id = ?
           WHERE ep.user_id = ? AND e.group_id = ?`,
          [req.user.id, participantId, groupId]
        );

        // Update expenses.paid_by where the pending participant paid the expense
        await pool.execute(
          `UPDATE expenses
           SET paid_by = ?
           WHERE group_id = ?
             AND id IN (
               SELECT expense_id FROM expense_participants
               WHERE user_id = ? AND is_paid = 1
             )`,
          [req.user.id, groupId, participantId]
        );
      } catch (updateErr) {
        console.error('Error updating expense records for registered participant:', updateErr);
      }
    }

    // Check if user is already a member
    const [existingMembership] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (existingMembership.length === 0) {
      // Add user as group member
      await pool.execute(
        'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, req.user.id, 'member']
      );
      console.log('User added to group successfully');
    }

    // Update invitation usage if code was used
    if (invitationCode) {
      await pool.execute(
        'UPDATE group_invitations SET current_uses = current_uses + 1 WHERE invitation_code = ?',
        [invitationCode]
      );
      console.log('Invitation usage updated');
    }

    res.json({ message: 'Successfully joined the group' });

  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send email invitation
router.post('/groups/:groupId/invite-email', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { email, name } = req.body;

    // Check if user is member of the group
    const [membership] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // Get group info
    const [groups] = await pool.execute(
      'SELECT name FROM groups_table WHERE id = ?',
      [groupId]
    );

    if (groups.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationLink = `${process.env.FRONTEND_URL}/join/${invitationToken}`;

    // Add participant
    await pool.execute(`
      INSERT INTO participants (group_id, name, email, invitation_token, invited_by)
      VALUES (?, ?, ?, ?, ?)
    `, [groupId, name, email, invitationToken, req.user.id]);

    // Optionally send a real email invitation if SMTP configuration is provided
    let mailSent = false;
    if (nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: process.env.SMTP_FROM || 'no-reply@splitwise-clone.local',
          to: email,
          subject: `Invitation à rejoindre ${groups[0].name}`,
          text: `Bonjour ${name},\n\nVous avez été invité·e à rejoindre le groupe ${groups[0].name}. Cliquez sur ce lien pour rejoindre : ${invitationLink}\n\nÀ bientôt !`,
          html: `<p>Bonjour ${name},</p><p>Vous avez été invité·e à rejoindre le groupe <strong>${groups[0].name}</strong>.</p><p>Cliquez sur ce lien pour rejoindre : <a href="${invitationLink}">${invitationLink}</a></p><p>À bientôt !</p>`,
        };

        await transporter.sendMail(mailOptions);
        mailSent = true;
      } catch (mailErr) {
        console.error('Failed to send invitation email:', mailErr);
      }
    }

    // Respond with whether the email was sent and include the link for verification
    res.json({
      message: 'Invitation sent successfully',
      invitationLink,
      mailSent,
      // Include debug info only in development for manual sending or testing
      debug: {
        to: email,
        subject: `Invitation à rejoindre ${groups[0].name}`,
        invitationLink,
      },
    });

  } catch (error) {
    console.error('Send email invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;