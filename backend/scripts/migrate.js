const { pool } = require('../config/database');

const createTables = async () => {
  try {
    console.log('🚀 Starting database migration...');

    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        subscription_status ENUM('free', 'premium', 'trial') DEFAULT 'trial',
        trial_ends_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert default users for testing
    await pool.execute(`
      INSERT IGNORE INTO users (id, email, password, full_name, subscription_status) VALUES
      (1, 'john@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'John Doe', 'trial'),
      (2, 'marie@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Marie Martin', 'trial'),
      (3, 'thomas@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Thomas Dubois', 'trial')
    `);
    
    console.log('✅ Default users created (password: "password123" for all)');
    console.log('   - john@example.com');
    console.log('   - marie@example.com'); 
    console.log('   - thomas@example.com');
    // Create groups table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS groups_table (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT NOT NULL,
        currency VARCHAR(3) DEFAULT 'EUR',
        total_expenses DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create group_members table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('admin', 'member') DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_group_user (group_id, user_id)
      )
    `);

    // Create expenses table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        created_by INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        is_settled BOOLEAN DEFAULT FALSE,
        split_type ENUM('equal', 'custom') DEFAULT 'equal',
        paid_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create expense_participants table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS expense_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        expense_id INT NOT NULL,
        user_id INT NOT NULL,
        amount_owed DECIMAL(10,2) NOT NULL,
        is_paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create payments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        method ENUM('paypal', 'card') NOT NULL,
        status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        description TEXT,
        transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create refunds table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS refunds (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        payment_id INT,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        status ENUM('requested', 'approved', 'completed', 'rejected') DEFAULT 'requested',
        reason VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
      )
    `);

    // Create participants table (for non-registered users)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        status ENUM('pending', 'registered', 'declined') DEFAULT 'pending',
        invitation_token VARCHAR(255) UNIQUE,
        invited_by INT NOT NULL,
        user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create group_invitations table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS group_invitations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        invitation_code VARCHAR(10) UNIQUE NOT NULL,
        invitation_link VARCHAR(500) UNIQUE NOT NULL,
        created_by INT NOT NULL,
        expires_at DATETIME NOT NULL,
        max_uses INT DEFAULT NULL,
        current_uses INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ All tables created successfully!');
    console.log('📊 Database migration completed!');
    
    // Create pending_members table for non-registered users
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pending_members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        temporary_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        invited_by INT NOT NULL,
        status ENUM('pending', 'registered') DEFAULT 'pending',
        user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_group_email (group_id, email)
      )
    `);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

createTables();