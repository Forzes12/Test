const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'blackhouse.db');

let db = null;

// Helper functions for sql.js
function run(sql, params = []) {
  db.run(sql, params);
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getUserLevel(xp) {
  const level = get('SELECT * FROM levels WHERE xp_required <= ? ORDER BY xp_required DESC LIMIT 1', [xp]);
  return level || { level_number: 1, title: 'Newbie', color: '#808080' };
}

function addXP(userId, amount) {
  const user = get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return;
  
  const newXP = user.xp + amount;
  const levelInfo = getUserLevel(newXP);
  
  run('UPDATE users SET xp = ?, level = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?', [newXP, levelInfo.level_number, userId]);
  
  return { newXP, level: levelInfo };
}

function checkAchievements(userId) {
  const user = get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return;
  
  const earnedPerfects = all('SELECT perfect_id FROM user_perfects WHERE user_id = ?', [userId]);
  const earnedIds = earnedPerfects.map(p => p.perfect_id);
  
  const perfects = all('SELECT * FROM perfects');
  
  perfects.forEach(perfect => {
    if (earnedIds.includes(perfect.id)) return;
    
    let shouldAward = false;
    
    switch(perfect.name) {
      case 'First Post':
        shouldAward = user.messages_count >= 1;
        break;
      case 'Topic Starter':
        shouldAward = user.topics_count >= 1;
        break;
      case 'Social Butterfly':
        shouldAward = user.messages_count >= 50;
        break;
      case 'Conversation Starter':
        shouldAward = user.topics_count >= 10;
        break;
      case 'Rising Star':
        shouldAward = user.level >= 5;
        break;
      case 'Veteran':
        shouldAward = user.level >= 10;
        break;
    }
    
    if (shouldAward) {
      run('INSERT INTO user_perfects (user_id, perfect_id) VALUES (?, ?)', [userId, perfect.id]);
      addXP(userId, perfect.xp_reward);
      
      run('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
        [userId, 'achievement', `You earned: ${perfect.name} (+${perfect.xp_reward} XP)`, '/profile']);
    }
  });
}

async function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (error) {
      console.log('Creating new database...');
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT '/assets/default-avatar.png',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      xp_to_next_level INTEGER DEFAULT 100,
      messages_count INTEGER DEFAULT 0,
      topics_count INTEGER DEFAULT 0,
      perfects_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      role TEXT DEFAULT 'user'
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_number INTEGER UNIQUE NOT NULL,
      xp_required INTEGER NOT NULL,
      title TEXT NOT NULL,
      color TEXT DEFAULT '#ffffff'
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS perfects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      xp_reward INTEGER DEFAULT 10,
      category TEXT DEFAULT 'general'
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS user_perfects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      perfect_id INTEGER NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, perfect_id)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      order_index INTEGER DEFAULT 0
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      is_closed INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      replies_count INTEGER DEFAULT 0,
      last_reply_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_solution INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Insert default levels
  const existingLevels = all('SELECT * FROM levels');
  if (existingLevels.length === 0) {
    const levelData = [
      [1, 0, 'Newbie', '#808080'],
      [2, 100, 'Beginner', '#4CAF50'],
      [3, 250, 'Member', '#2196F3'],
      [4, 500, 'Regular', '#9C27B0'],
      [5, 1000, 'Active', '#FF9800'],
      [6, 2000, 'Veteran', '#E91E63'],
      [7, 4000, 'Elite', '#00BCD4'],
      [8, 8000, 'Champion', '#FFEB3B'],
      [9, 16000, 'Legend', '#F44336'],
      [10, 32000, 'Grandmaster', '#FFD700']
    ];
    levelData.forEach(l => {
      db.run('INSERT INTO levels (level_number, xp_required, title, color) VALUES (?, ?, ?, ?)', l);
    });
  }
  
  // Insert default categories
  const existingCategories = all('SELECT * FROM categories');
  if (existingCategories.length === 0) {
    const categoryData = [
      ['General Discussion', 'General gaming discussions', '📁', '#2196F3', 1],
      ['Game Strategies', 'Tips, tricks and strategies', '🎮', '#4CAF50', 2],
      ['Clans & Teams', 'Find teammates and clans', '👥', '#9C27B0', 3],
      ['Tech Support', 'Technical help and issues', '🔧', '#FF9800', 4],
      ['Off-Topic', 'Non-gaming discussions', '🎲', '#607D8B', 5]
    ];
    categoryData.forEach(c => {
      db.run('INSERT INTO categories (name, description, icon, color, order_index) VALUES (?, ?, ?, ?, ?)', c);
    });
  }
  
  // Insert default achievements
  const existingPerfects = all('SELECT * FROM perfects');
  if (existingPerfects.length === 0) {
    const perfectsData = [
      ['First Post', 'Create your first message', '📝', 10, 'activity'],
      ['Topic Starter', 'Create your first topic', '🌟', 20, 'activity'],
      ['Social Butterfly', 'Reach 50 messages', '🦋', 50, 'social'],
      ['Conversation Starter', 'Create 10 topics', '💡', 100, 'activity'],
      ['Helpful Hand', 'Have your answer marked as solution', '✅', 30, 'community'],
      ['Rising Star', 'Reach level 5', '⭐', 100, 'progression'],
      ['Veteran', 'Reach level 10', '🏆', 500, 'progression'],
      ['Perfect 10', 'Earn 10 achievements', '🎯', 200, 'achievement']
    ];
    perfectsData.forEach(p => {
      db.run('INSERT INTO perfects (name, description, icon, xp_reward, category) VALUES (?, ?, ?, ?, ?)', p);
    });
  }
  
  // Create demo users
  const existingUsers = all('SELECT * FROM users WHERE username = ?', ['DemoUser']);
  if (existingUsers.length === 0) {
    const demoPassword = bcrypt.hashSync('demo123', 10);
    db.run('INSERT INTO users (username, email, password, level, xp, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['DemoUser', 'demo@blackhouse.com', demoPassword, 5, 1500, 'admin']);
    db.run('INSERT INTO users (username, email, password, level, xp, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['GameMaster', 'master@blackhouse.com', demoPassword, 10, 35000, 'moderator']);
  }
  
  await saveDatabase();
  console.log('Database initialized');
  
  // Auto-save periodically (every 30 seconds)
  setInterval(saveDatabase, 30000);
}

module.exports = {
  initDatabase,
  run,
  get,
  all,
  addXP,
  getUserLevel,
  checkAchievements,
  saveDatabase
};
