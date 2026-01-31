const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDatabase, run, get, all, addXP, getUserLevel, checkAchievements, saveDatabase } = require('./database');

const app = express();

// Glitch uses environment PORT, or default to 3000
const PORT = process.env.PORT || process.env.GLITCH_APP_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for Glitch
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Session middleware - using memory for Glitch
app.use(session({
  secret: process.env.SESSION_SECRET || 'blackhouse-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireModerator(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const user = get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Moderator access required' });
  }
  next();
}

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existingUser = get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    
    const user = get('SELECT * FROM users WHERE username = ?', [username]);
    req.session.userId = user.id;
    
    res.json({ 
      success: true,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        level: user.level,
        xp: user.xp,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    
    res.json({ 
      success: true,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        level: user.level,
        xp: user.xp,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  if (!user) {
    return res.json({ user: null });
  }
  
  res.json({ 
    user: { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      avatar: user.avatar,
      level: user.level,
      xp: user.xp,
      messages_count: user.messages_count,
      topics_count: user.topics_count,
      perfects_count: user.perfects_count,
      role: user.role
    } 
  });
});

// User Routes
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const perfectsCount = get('SELECT COUNT(*) as count FROM user_perfects WHERE user_id = ?', [req.params.id]);
    user.perfects_count = perfectsCount ? perfectsCount.count : 0;
    
    const levelInfo = getUserLevel(user.xp);
    const achievements = all(`
      SELECT p.*, up.earned_at 
      FROM perfects p 
      LEFT JOIN user_perfects up ON p.id = up.perfect_id AND up.user_id = ?
    `, [req.params.id]);
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        xp: user.xp,
        messages_count: user.messages_count,
        topics_count: user.topics_count,
        perfects_count: user.perfects_count,
        created_at: user.created_at,
        last_active: user.last_active,
        role: user.role
      },
      level: levelInfo,
      achievements: achievements.map(a => ({
        ...a,
        earned: !!a.earned_at
      }))
    });
  } catch (error) {
    console.error('User error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id/topics', async (req, res) => {
  try {
    const topics = all(`
      SELECT t.*, c.name as category_name, c.icon as category_icon,
        (SELECT COUNT(*) FROM messages WHERE topic_id = t.id) as reply_count
      FROM topics t
      JOIN categories c ON t.category_id = c.id
      WHERE t.author_id = ?
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [req.params.id]);
    
    res.json({ topics });
  } catch (error) {
    console.error('User topics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Categories Routes
app.get('/api/categories', (req, res) => {
  try {
    const categories = all(`
      SELECT c.*,
        (SELECT COUNT(*) FROM topics WHERE category_id = c.id) as topics_count,
        (SELECT COUNT(*) FROM messages m JOIN topics t ON m.topic_id = t.id WHERE t.category_id = c.id) as messages_count
      FROM categories c
      ORDER BY c.order_index
    `);
    
    res.json({ categories });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Topics Routes
app.get('/api/topics', (req, res) => {
  try {
    const { category_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let topics;
    let total;
    
    if (category_id) {
      topics = all(`
        SELECT t.*, u.username as author_name, u.level as author_level, u.avatar as author_avatar,
               c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM topics t
        JOIN users u ON t.author_id = u.id
        JOIN categories c ON t.category_id = c.id
        WHERE t.category_id = ?
        ORDER BY t.is_pinned DESC, t.last_reply_at DESC LIMIT ? OFFSET ?
      `, [category_id, limit, offset]);
      
      const totalResult = get('SELECT COUNT(*) as total FROM topics WHERE category_id = ?', [category_id]);
      total = totalResult ? totalResult.total : 0;
    } else {
      topics = all(`
        SELECT t.*, u.username as author_name, u.level as author_level, u.avatar as author_avatar,
               c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM topics t
        JOIN users u ON t.author_id = u.id
        JOIN categories c ON t.category_id = c.id
        ORDER BY t.is_pinned DESC, t.last_reply_at DESC LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      const totalResult = get('SELECT COUNT(*) as total FROM topics');
      total = totalResult ? totalResult.total : 0;
    }
    
    res.json({ topics, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Topics error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/topics/:id', (req, res) => {
  try {
    const topic = get(`
      SELECT t.*, u.username as author_name, u.level as author_level, u.avatar as author_avatar,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM topics t
      JOIN users u ON t.author_id = u.id
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [req.params.id]);
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Increment views
    run('UPDATE topics SET views = views + 1 WHERE id = ?', [req.params.id]);
    
    res.json({ topic });
  } catch (error) {
    console.error('Topic error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/topics', requireAuth, async (req, res) => {
  try {
    const { title, content, category_id } = req.body;
    
    if (!title || !content || !category_id) {
      return res.status(400).json({ error: 'Title, content and category are required' });
    }
    
    if (title.length < 5) {
      return res.status(400).json({ error: 'Title must be at least 5 characters' });
    }
    
    run('INSERT INTO topics (title, category_id, author_id) VALUES (?, ?, ?)', [title, category_id, req.session.userId]);
    
    const topicId = get('SELECT last_insert_rowid() as id').id;
    
    run('INSERT INTO messages (topic_id, author_id, content) VALUES (?, ?, ?)', [topicId, req.session.userId, content]);
    
    run('UPDATE users SET topics_count = topics_count + 1 WHERE id = ?', [req.session.userId]);
    
    // Add XP and check achievements
    addXP(req.session.userId, 15);
    checkAchievements(req.session.userId);
    await saveDatabase();
    
    res.json({ success: true, topicId });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/topics/:id/close', requireModerator, async (req, res) => {
  try {
    run('UPDATE topics SET is_closed = 1 WHERE id = ?', [req.params.id]);
    await saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Close topic error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/topics/:id/open', requireModerator, async (req, res) => {
  try {
    run('UPDATE topics SET is_closed = 0 WHERE id = ?', [req.params.id]);
    await saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Open topic error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/topics/:id/pin', requireModerator, async (req, res) => {
  try {
    const topic = get('SELECT is_pinned FROM topics WHERE id = ?', [req.params.id]);
    run('UPDATE topics SET is_pinned = ? WHERE id = ?', [topic.is_pinned ? 0 : 1, req.params.id]);
    await saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Pin topic error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/topics/:id', requireModerator, async (req, res) => {
  try {
    run('DELETE FROM topics WHERE id = ?', [req.params.id]);
    await saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Messages Routes
app.get('/api/topics/:topicId/messages', (req, res) => {
  try {
    const messages = all(`
      SELECT m.*, u.username as author_name, u.level as author_level, u.avatar as author_avatar, u.role as author_role
      FROM messages m
      JOIN users u ON m.author_id = u.id
      WHERE m.topic_id = ?
      ORDER BY m.created_at ASC
    `, [req.params.topicId]);
    
    res.json({ messages });
  } catch (error) {
    console.error('Messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/topics/:topicId/messages', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const topic = get('SELECT * FROM topics WHERE id = ?', [req.params.topicId]);
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    if (topic.is_closed) {
      return res.status(400).json({ error: 'Topic is closed' });
    }
    
    if (!content || content.trim().length < 2) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    run('INSERT INTO messages (topic_id, author_id, content) VALUES (?, ?, ?)', [req.params.topicId, req.session.userId, content]);
    
    const messageId = get('SELECT last_insert_rowid() as id').id;
    
    run(`
      UPDATE topics 
      SET replies_count = replies_count + 1,
          last_reply_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [req.params.topicId]);
    
    run('UPDATE users SET messages_count = messages_count + 1 WHERE id = ?', [req.session.userId]);
    
    // Add XP and check achievements
    addXP(req.session.userId, 5);
    checkAchievements(req.session.userId);
    await saveDatabase();
    
    const message = get(`
      SELECT m.*, u.username as author_name, u.level as author_level, u.avatar as author_avatar, u.role as author_role
      FROM messages m
      JOIN users u ON m.author_id = u.id
      WHERE m.id = ?
    `, [messageId]);
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const message = get('SELECT * FROM messages WHERE id = ?', [req.params.id]);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.author_id !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    run('UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, req.params.id]);
    await saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/messages/:id/solution', requireAuth, async (req, res) => {
  try {
    const topic = get('SELECT * FROM topics WHERE id = ?', [req.body.topicId]);
    
    if (!topic || (topic.author_id !== req.session.userId && req.session.userRole !== 'admin')) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    run('UPDATE messages SET is_solution = 0 WHERE topic_id = ?', [req.body.topicId]);
    run('UPDATE messages SET is_solution = 1 WHERE id = ?', [req.params.id]);
    
    // Award XP to solution author
    const solutionMessage = get('SELECT author_id FROM messages WHERE id = ?', [req.params.id]);
    addXP(solutionMessage.author_id, 25);
    await saveDatabase();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Solution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notifications
app.get('/api/notifications', requireAuth, (req, res) => {
  try {
    const notifications = all(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [req.session.userId]);
    
    const unreadCount = get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [req.session.userId]);
    
    res.json({ notifications, unreadCount: unreadCount ? unreadCount.count : 0 });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
    await saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.userId]);
    await saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Read all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const { type = 'xp', limit = 10 } = req.query;
    
    let orderBy = 'xp DESC';
    if (type === 'messages') orderBy = 'messages_count DESC';
    if (type === 'topics') orderBy = 'topics_count DESC';
    
    const users = all(`
      SELECT id, username, level, xp, messages_count, topics_count, avatar
      FROM users 
      ORDER BY ${orderBy}
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json({ users });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search
app.get('/api/search', (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query too short' });
    }
    
    const results = { topics: [], users: [] };
    const searchTerm = `%${q}%`;
    
    if (type === 'all' || type === 'topics') {
      results.topics = all(`
        SELECT t.id, t.title, t.views, t.replies_count, t.created_at,
               u.username as author_name, c.name as category_name
        FROM topics t
        JOIN users u ON t.author_id = u.id
        JOIN categories c ON t.category_id = c.id
        WHERE t.title LIKE ?
        ORDER BY t.created_at DESC
        LIMIT 10
      `, [searchTerm]);
    }
    
    if (type === 'all' || type === 'users') {
      results.users = all(`
        SELECT id, username, level, xp, avatar
        FROM users
        WHERE username LIKE ?
        ORDER BY xp DESC
        LIMIT 10
      `, [searchTerm]);
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint for Glitch
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Black House Forum API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      categories: '/api/categories',
      topics: '/api/topics',
      messages: '/api/topics/:id/messages',
      leaderboard: '/api/leaderboard',
      search: '/api/search'
    }
  });
});

// Serve main page for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🏠 Black House Forum running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
