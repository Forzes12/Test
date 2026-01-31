// Black House Forum - Static Version for GitHub Pages
// Uses localStorage for data storage (demo mode)

// Simple bcrypt-like hash functions for localStorage demo
function bcryptHashSync(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return '$2a$10$' + Math.abs(hash).toString(16).padStart(22, '0');
}

function bcryptCompare(password, hash) {
  return bcryptHashSync(password) === hash;
}

// State
let currentUser = null;
let currentPage = 'home';
let currentCategory = null;
let currentTopic = null;

// Initialize data storage
function initStorage() {
  if (!localStorage.getItem('blackhouse_initialized')) {
    // Initialize default data
    const defaultData = {
      users: [
        { id: 1, username: 'DemoUser', email: 'demo@blackhouse.com', password: '$2a$10$demo', level: 5, xp: 1500, messages_count: 25, topics_count: 3, perfects_count: 4, created_at: new Date().toISOString(), last_active: new Date().toISOString(), role: 'admin' },
        { id: 2, username: 'GameMaster', email: 'master@blackhouse.com', password: '$2a$10$demo', level: 10, xp: 35000, messages_count: 150, topics_count: 20, perfects_count: 8, created_at: new Date().toISOString(), last_active: new Date().toISOString(), role: 'moderator' }
      ],
      categories: [
        { id: 1, name: 'General Discussion', description: 'General gaming discussions', icon: '📁', color: '#2196F3', order_index: 1, topics_count: 3, messages_count: 15 },
        { id: 2, name: 'Game Strategies', description: 'Tips, tricks and strategies', icon: '🎮', color: '#4CAF50', order_index: 2, topics_count: 2, messages_count: 8 },
        { id: 3, name: 'Clans & Teams', description: 'Find teammates and clans', icon: '👥', color: '#9C27B0', order_index: 3, topics_count: 1, messages_count: 5 },
        { id: 4, name: 'Tech Support', description: 'Technical help and issues', icon: '🔧', color: '#FF9800', order_index: 4, topics_count: 2, messages_count: 12 },
        { id: 5, name: 'Off-Topic', description: 'Non-gaming discussions', icon: '🎲', color: '#607D8B', order_index: 5, topics_count: 1, messages_count: 3 }
      ],
      topics: [
        { id: 1, title: 'Welcome to Black House Forum!', category_id: 1, author_id: 1, is_pinned: 1, is_closed: 0, views: 156, replies_count: 12, last_reply_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: 2, title: 'Best gaming setup for 2024?', category_id: 1, author_id: 2, is_pinned: 0, is_closed: 0, views: 89, replies_count: 8, last_reply_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 3, title: 'Elden Ring boss strategies', category_id: 2, author_id: 2, is_pinned: 0, is_closed: 0, views: 234, replies_count: 15, last_reply_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000 * 2).toISOString() }
      ],
      messages: [
        { id: 1, topic_id: 1, author_id: 1, content: 'Welcome to our new gaming forum! Feel free to introduce yourself and start creating topics.', is_solution: 0, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: 2, topic_id: 1, author_id: 2, content: 'Great to be here! Looking forward to great discussions.', is_solution: 0, created_at: new Date(Date.now() - 86400000 * 4).toISOString(), updated_at: new Date(Date.now() - 86400000 * 4).toISOString() },
        { id: 3, topic_id: 2, author_id: 1, content: 'What games are you all playing these days?', is_solution: 0, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 4, topic_id: 3, author_id: 2, content: 'For Malenia, I recommend using a bleed build with Rivers of Blood. Stay mobile and dodge her waterfowl dance!', is_solution: 1, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date(Date.now() - 86400000 * 2).toISOString() }
      ],
      levels: [
        { id: 1, level_number: 1, xp_required: 0, title: 'Newbie', color: '#808080' },
        { id: 2, level_number: 2, xp_required: 100, title: 'Beginner', color: '#4CAF50' },
        { id: 3, level_number: 3, xp_required: 250, title: 'Member', color: '#2196F3' },
        { id: 4, level_number: 4, xp_required: 500, title: 'Regular', color: '#9C27B0' },
        { id: 5, level_number: 5, xp_required: 1000, title: 'Active', color: '#FF9800' },
        { id: 6, level_number: 6, xp_required: 2000, title: 'Veteran', color: '#E91E63' },
        { id: 7, level_number: 7, xp_required: 4000, title: 'Elite', color: '#00BCD4' },
        { id: 8, level_number: 8, xp_required: 8000, title: 'Champion', color: '#FFEB3B' },
        { id: 9, level_number: 9, xp_required: 16000, title: 'Legend', color: '#F44336' },
        { id: 10, level_number: 10, xp_required: 32000, title: 'Grandmaster', color: '#FFD700' }
      ],
      perfects: [
        { id: 1, name: 'First Post', description: 'Create your first message', icon: '📝', xp_reward: 10, category: 'activity' },
        { id: 2, name: 'Topic Starter', description: 'Create your first topic', icon: '🌟', xp_reward: 20, category: 'activity' },
        { id: 3, name: 'Social Butterfly', description: 'Reach 50 messages', icon: '🦋', xp_reward: 50, category: 'social' },
        { id: 4, name: 'Conversation Starter', description: 'Create 10 topics', icon: '💡', xp_reward: 100, category: 'activity' },
        { id: 5, name: 'Helpful Hand', description: 'Have your answer marked as solution', icon: '✅', xp_reward: 30, category: 'community' },
        { id: 6, name: 'Rising Star', description: 'Reach level 5', icon: '⭐', xp_reward: 100, category: 'progression' },
        { id: 7, name: 'Veteran', description: 'Reach level 10', icon: '🏆', xp_reward: 500, category: 'progression' },
        { id: 8, name: 'Perfect 10', description: 'Earn 10 achievements', icon: '🎯', xp_reward: 200, category: 'achievement' }
      ],
      user_perfects: [
        { id: 1, user_id: 1, perfect_id: 1, earned_at: new Date(Date.now() - 86400000 * 4).toISOString() },
        { id: 2, user_id: 1, perfect_id: 2, earned_at: new Date(Date.now() - 86400000 * 4).toISOString() },
        { id: 3, user_id: 2, perfect_id: 1, earned_at: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: 4, user_id: 2, perfect_id: 2, earned_at: new Date(Date.now() - 86400000 * 5).toISOString() }
      ],
      notifications: []
    };
    
    localStorage.setItem('blackhouse_users', JSON.stringify(defaultData.users));
    localStorage.setItem('blackhouse_categories', JSON.stringify(defaultData.categories));
    localStorage.setItem('blackhouse_topics', JSON.stringify(defaultData.topics));
    localStorage.setItem('blackhouse_messages', JSON.stringify(defaultData.messages));
    localStorage.setItem('blackhouse_levels', JSON.stringify(defaultData.levels));
    localStorage.setItem('blackhouse_perfects', JSON.stringify(defaultData.perfects));
    localStorage.setItem('blackhouse_user_perfects', JSON.stringify(defaultData.user_perfects));
    localStorage.setItem('blackhouse_notifications', JSON.stringify(defaultData.notifications));
    localStorage.setItem('blackhouse_initialized', 'true');
  }
}

// Storage helpers
function getData(key) {
  const data = localStorage.getItem('blackhouse_' + key);
  return data ? JSON.parse(data) : null;
}

function setData(key, value) {
  localStorage.setItem('blackhouse_' + key, JSON.stringify(value));
}

function generateId(key) {
  const data = getData(key);
  if (!data || data.length === 0) return 1;
  return Math.max(...data.map(item => item.id)) + 1;
}

// Auth
function checkAuth() {
  const userData = localStorage.getItem('blackhouse_currentUser');
  if (userData) {
    currentUser = JSON.parse(userData);
  }
  updateUserArea();
}

function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.username.value;
  const password = form.password.value;
  
  const users = getData('users');
  const user = users.find(u => u.username === username || u.email === username);
  
  // For demo, accept any password for demo users
  if (user && (user.password === '$2a$10$demo' || bcryptCompare(password, user.password))) {
    currentUser = user;
    localStorage.setItem('blackhouse_currentUser', JSON.stringify(user));
    closeModal('authModal');
    updateUserArea();
    showToast('Welcome back, ' + user.username + '!', 'success');
    loadPage();
  } else {
    showToast('Invalid credentials', 'error');
  }
}

function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.username.value;
  const email = form.email.value;
  const password = form.password.value;
  
  const users = getData('users');
  
  if (users.find(u => u.username === username || u.email === email)) {
    showToast('Username or email already exists', 'error');
    return;
  }
  
  const newUser = {
    id: generateId('users'),
    username,
    email,
    password: bcryptHashSync(password),
    avatar: '/assets/default-avatar.png',
    level: 1,
    xp: 0,
    xp_to_next_level: 100,
    messages_count: 0,
    topics_count: 0,
    perfects_count: 0,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    role: 'user'
  };
  
  users.push(newUser);
  setData('users', users);
  
  currentUser = newUser;
  localStorage.setItem('blackhouse_currentUser', JSON.stringify(newUser));
  closeModal('authModal');
  updateUserArea();
  showToast('Welcome to Black House, ' + username + '!', 'success');
  loadPage();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('blackhouse_currentUser');
  updateUserArea();
  showToast('Logged out successfully', 'success');
  navigate('home');
}

function updateUserArea() {
  const userArea = document.getElementById('userArea');
  
  if (!currentUser) {
    userArea.innerHTML = '<button class="btn-primary" onclick="openModal(\'authModal\')">Login / Register</button>';
  } else {
    userArea.innerHTML = `
      <div class="user-info" onclick="navigate('profile', ${currentUser.id})">
        <div class="user-avatar">${currentUser.username.charAt(0).toUpperCase()}</div>
        <span class="user-name">${currentUser.username}</span>
        <span class="user-level">Lv.${currentUser.level}</span>
      </div>
      <button class="btn-secondary" onclick="logout()">Logout</button>
    `;
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('loginForm').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'flex' : 'none';
}

// Navigation
function navigate(page, param = null) {
  currentPage = page;
  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  
  if (page === 'category' && param) {
    currentCategory = param;
    loadCategory(param);
  } else if (page === 'topic' && param) {
    currentTopic = param;
    loadTopic(param);
  } else if (page === 'profile' && param) {
    loadProfile(param);
  } else if (page === 'leaderboard') {
    loadLeaderboard('xp');
  }
  
  window.scrollTo(0, 0);
}

function loadPage() {
  if (currentPage === 'home') {
    loadCategories();
    loadRecentTopics();
    loadSidebarStats();
    loadSidebarLeaderboard();
  }
}

// Categories
function loadCategories() {
  const categories = getData('categories');
  
  document.getElementById('categoriesGrid').innerHTML = categories.map(cat => `
    <div class="category-row" onclick="navigate('category', ${cat.id})">
      <span class="category-icon">${cat.icon}</span>
      <div class="category-info">
        <div class="category-name">${cat.name}</div>
        <div class="category-description">${cat.description}</div>
      </div>
      <div class="category-stats">
        <div>📝 ${cat.topics_count}</div>
        <div>💬 ${cat.messages_count}</div>
      </div>
    </div>
  `).join('');
  
  const categorySidebar = document.getElementById('categorySidebar');
  if (categorySidebar) {
    categorySidebar.innerHTML = categories.map(cat => `
      <div class="category-row" onclick="navigate('category', ${cat.id})" style="margin-bottom: 0.5rem;">
        <span class="category-icon">${cat.icon}</span>
        <span class="category-name">${cat.name}</span>
      </div>
    `).join('');
  }
  
  const select = document.getElementById('topicCategory');
  if (select && select.children.length <= 1) {
    select.innerHTML = '<option value="">Select Category</option>' +
      categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }
}

function loadCategory(id) {
  const categories = getData('categories');
  const topics = getData('topics');
  const messages = getData('messages');
  
  const category = categories.find(c => c.id === id);
  const categoryTopics = topics.filter(t => t.category_id === id).sort((a, b) => {
    if (b.is_pinned !== a.is_pinned) return b.is_pinned - a.is_pinned;
    return new Date(b.last_reply_at || b.created_at) - new Date(a.last_reply_at || a.created_at);
  });
  
  document.getElementById('categoryTitle').innerHTML = `${category.icon} ${category.name}`;
  
  const messagesCount = messages.filter(m => {
    const topic = topics.find(t => t.id === m.topic_id);
    return topic && topic.category_id === id;
  }).length;
  
  document.getElementById('categoryInfo').innerHTML = `
    <div style="font-size: 0.9rem; color: var(--text-secondary);">
      <p style="margin-bottom: 0.75rem;">${category.description}</p>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <div>📝 <strong>${categoryTopics.length}</strong> topics</div>
        <div>💬 <strong>${messagesCount}</strong> messages</div>
      </div>
    </div>
  `;
  
  renderTopicsTable(categoryTopics, 'categoryTopics');
}

// Topics
function renderTopicsTable(topics, containerId) {
  const container = document.getElementById(containerId);
  const users = getData('users');
  const categories = getData('categories');
  
  if (topics.length === 0) {
    container.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No topics yet</td></tr>';
    return;
  }
  
  container.innerHTML = topics.map(topic => {
    const author = users.find(u => u.id === topic.author_id);
    const category = categories.find(c => c.id === topic.category_id);
    return `
      <tr>
        <td>
          <div class="topic-cell">
            <div class="topic-title">
              <a href="#" onclick="navigate('topic', ${topic.id})">${topic.title}</a>
              ${topic.is_closed ? '<span class="badge badge-closed">Closed</span>' : ''}
              ${topic.is_pinned ? '<span class="badge badge-pinned">Pinned</span>' : ''}
            </div>
            <div class="topic-meta">
              in ${category ? category.icon : '📁'} ${category ? category.name : 'Unknown'}
            </div>
          </div>
        </td>
        <td>
          <div class="author-cell">
            <div class="author-avatar-small">${author ? author.username.charAt(0).toUpperCase() : '?'}</div>
            <span>${author ? author.username : 'Unknown'} <span class="level-badge" style="font-size: 0.75rem;">Lv.${author ? author.level : 1}</span></span>
          </div>
        </td>
        <td class="stats-cell">
          <span>${topic.replies_count || 0}</span>
          <span class="stats-label">replies</span>
        </td>
        <td class="stats-cell">
          <span>${containerId === 'categoryTopics' ? formatDate(topic.last_reply_at || topic.created_at) : topic.views}</span>
          <span class="stats-label">${containerId === 'categoryTopics' ? 'last reply' : 'views'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

function loadRecentTopics() {
  const topics = getData('topics').sort((a, b) => {
    if (b.is_pinned !== a.is_pinned) return b.is_pinned - a.is_pinned;
    return new Date(b.last_reply_at || b.created_at) - new Date(a.last_reply_at || a.created_at);
  }).slice(0, 15);
  
  renderTopicsTable(topics, 'recentTopics');
}

function loadTopic(id) {
  const topics = getData('topics');
  const messages = getData('messages');
  const users = getData('users');
  const categories = getData('categories');
  
  const topic = topics.find(t => t.id === id);
  if (!topic) {
    showToast('Topic not found', 'error');
    navigate('home');
    return;
  }
  
  const author = users.find(u => u.id === topic.author_id);
  const category = categories.find(c => c.id === topic.category_id);
  const topicMessages = messages.filter(m => m.topic_id === id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  const isMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
  
  document.getElementById('topicHeader').innerHTML = `
    <div class="category-breadcrumb">
      ${category ? category.icon : '📁'} ${category ? category.name : 'Unknown'}
    </div>
    <h1 style="margin-top: 0.5rem; font-size: 1.25rem;">
      ${topic.title}
      ${topic.is_closed ? '<span class="badge badge-closed">Closed</span>' : ''}
      ${topic.is_pinned ? '<span class="badge badge-pinned">Pinned</span>' : ''}
    </h1>
    <div class="topic-header-meta">
      <span>by <a href="#" onclick="navigate('profile', ${topic.author_id})">${author ? author.username : 'Unknown'}</a></span>
      <span>${formatDate(topic.created_at)}</span>
      <span>${topic.views} views</span>
      <span>${topic.replies_count} replies</span>
    </div>
    ${isMod ? `
      <div class="topic-actions">
        ${topic.is_closed 
          ? `<button class="btn-secondary" onclick="toggleTopicStatus(${topic.id}, 'open')">Open Topic</button>`
          : `<button class="btn-secondary" onclick="toggleTopicStatus(${topic.id}, 'close')">Close Topic</button>`
        }
        <button class="btn-secondary" onclick="togglePin(${topic.id})">
          ${topic.is_pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
    ` : ''}
  `;
  
  renderMessages(topicMessages, id);
  
  const replyForm = document.getElementById('replyForm');
  if (topic.is_closed) {
    replyForm.innerHTML = '<p style="color: var(--text-secondary);">This topic is closed for new replies.</p>';
  } else if (!currentUser) {
    replyForm.innerHTML = '<p>Please <a href="#" onclick="openModal(\'authModal\')">login</a> to reply.</p>';
  } else {
    replyForm.innerHTML = `
      <h3>Post a Reply</h3>
      <textarea id="replyContent" placeholder="Write your reply..." rows="5" required></textarea>
      <button onclick="handleReply(${topic.id})" class="btn-primary">Post Reply</button>
    `;
  }
}

function renderMessages(messages, topicId) {
  const container = document.getElementById('messagesContainer');
  const users = getData('users');
  
  if (messages.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">No messages yet</p>';
    return;
  }
  
  const isMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
  const isTopicAuthor = currentUser && currentUser.id === messages[0].author_id;
  
  container.innerHTML = messages.map(msg => {
    const author = users.find(u => u.id === msg.author_id);
    return `
      <div class="message ${msg.is_solution ? 'solution' : ''}">
        <div class="message-header">
          <div class="message-author">
            <div class="author-avatar" onclick="navigate('profile', ${msg.author_id})">${author ? author.username.charAt(0).toUpperCase() : '?'}</div>
            <div class="author-info">
              <span class="author-name">
                ${author ? author.username : 'Unknown'}
                ${author && author.role === 'admin' ? '👑' : ''}
                ${author && author.role === 'moderator' ? '🛡️' : ''}
              </span>
              <span class="author-level">Level ${author ? author.level : 1}</span>
            </div>
          </div>
          <div class="message-time">
            ${formatDate(msg.created_at)}
            ${msg.is_solution ? '<span class="badge badge-solution">Solution</span>' : ''}
          </div>
        </div>
        <div class="message-content">
          ${msg.content}
        </div>
        ${!msg.is_solution && isTopicAuthor ? `
          <div style="padding: 0.5rem 1rem; background: var(--bg-tertiary); display: flex; justify-content: flex-end;">
            <button class="btn-secondary" onclick="markSolution(${msg.id}, ${topicId})" style="font-size: 0.85rem;">
              Mark as Solution
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function handleReply(topicId) {
  const content = document.getElementById('replyContent').value;
  if (!content.trim()) return;
  
  const messages = getData('messages');
  const users = getData('users');
  const topics = getData('topics');
  
  const newMessage = {
    id: generateId('messages'),
    topic_id: topicId,
    author_id: currentUser.id,
    content: content,
    is_solution: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  messages.push(newMessage);
  setData('messages', messages);
  
  // Update topic
  const topic = topics.find(t => t.id === topicId);
  if (topic) {
    topic.replies_count = (topic.replies_count || 0) + 1;
    topic.last_reply_at = new Date().toISOString();
    setData('topics', topics);
  }
  
  // Update user stats
  const user = users.find(u => u.id === currentUser.id);
  if (user) {
    user.messages_count = (user.messages_count || 0) + 1;
    user.xp = (user.xp || 0) + 5;
    user.last_active = new Date().toISOString();
    
    // Level up check
    const levels = getData('levels');
    const newLevel = levels.reverse().find(l => l.xp_required <= user.xp);
    if (newLevel) {
      user.level = newLevel.level_number;
    }
    
    setData('users', users);
    currentUser = user;
    localStorage.setItem('blackhouse_currentUser', JSON.stringify(user));
    updateUserArea();
  }
  
  showToast('Reply posted! (+5 XP)', 'success');
  loadTopic(topicId);
}

function markSolution(messageId, topicId) {
  const messages = getData('messages');
  const users = getData('users');
  
  // Unmark all solutions for this topic
  messages.forEach(m => {
    if (m.topic_id === topicId) m.is_solution = 0;
  });
  
  // Mark new solution
  const message = messages.find(m => m.id === messageId);
  if (message) {
    message.is_solution = 1;
    setData('messages', messages);
    
    // Award XP to solution author
    const author = users.find(u => u.id === message.author_id);
    if (author) {
      author.xp = (author.xp || 0) + 25;
      setData('users', users);
    }
  }
  
  showToast('Marked as solution! (+25 XP)', 'success');
  loadTopic(topicId);
}

function toggleTopicStatus(topicId, action) {
  const topics = getData('topics');
  const topic = topics.find(t => t.id === topicId);
  if (topic) {
    topic.is_closed = action === 'close' ? 1 : 0;
    setData('topics', topics);
    showToast('Topic ' + (action === 'close' ? 'closed' : 'opened'), 'success');
    loadTopic(topicId);
  }
}

function togglePin(topicId) {
  const topics = getData('topics');
  const topic = topics.find(t => t.id === topicId);
  if (topic) {
    topic.is_pinned = topic.is_pinned ? 0 : 1;
    setData('topics', topics);
    showToast('Pin status updated', 'success');
    loadTopic(topicId);
  }
}

// Create Topic
function openCreateTopic() {
  if (!currentUser) {
    openModal('authModal');
    return;
  }
  openModal('createTopicModal');
}

function handleCreateTopic(event) {
  event.preventDefault();
  const title = document.getElementById('topicTitle').value;
  const category_id = parseInt(document.getElementById('topicCategory').value);
  const content = document.getElementById('topicContent').value;
  
  const topics = getData('topics');
  const users = getData('users');
  const messages = getData('messages');
  
  const newTopic = {
    id: generateId('topics'),
    title,
    category_id,
    author_id: currentUser.id,
    is_pinned: 0,
    is_closed: 0,
    views: 1,
    replies_count: 0,
    last_reply_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  
  topics.push(newTopic);
  setData('topics', topics);
  
  const newMessage = {
    id: generateId('messages'),
    topic_id: newTopic.id,
    author_id: currentUser.id,
    content,
    is_solution: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  messages.push(newMessage);
  setData('messages', messages);
  
  // Update user stats
  const user = users.find(u => u.id === currentUser.id);
  if (user) {
    user.topics_count = (user.topics_count || 0) + 1;
    user.xp = (user.xp || 0) + 15;
    user.last_active = new Date().toISOString();
    
    const levels = getData('levels');
    const newLevel = levels.reverse().find(l => l.xp_required <= user.xp);
    if (newLevel) {
      user.level = newLevel.level_number;
    }
    
    setData('users', users);
    currentUser = user;
    localStorage.setItem('blackhouse_currentUser', JSON.stringify(user));
    updateUserArea();
  }
  
  closeModal('createTopicModal');
  showToast('Topic created! (+15 XP)', 'success');
  navigate('topic', newTopic.id);
}

// Profile
function loadProfile(userId) {
  const users = getData('users');
  const topics = getData('topics');
  const messages = getData('messages');
  const user_perfects = getData('user_perfects');
  const perfects = getData('perfs');
  const levels = getData('levels');
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    showToast('User not found', 'error');
    navigate('home');
    return;
  }
  
  const userLevel = levels.find(l => l.level_number === user.level) || levels[0];
  const userAchievements = perfects.map(p => {
    const earned = user_perfects.find(up => up.user_id === userId && up.perfect_id === p.id);
    return { ...p, earned: !!earned, earned_at: earned ? earned.earned_at : null };
  });
  
  document.getElementById('profileHeader').innerHTML = `
    <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
    <div class="profile-info">
      <h1>${user.username} ${user.role === 'admin' ? '👑' : ''} ${user.role === 'moderator' ? '🛡️' : ''}</h1>
      <div class="profile-level">
        <span class="level-badge" style="background: ${userLevel.color}">Lv.${user.level} - ${userLevel.title}</span>
      </div>
      <div class="profile-stats">
        <div class="profile-stat">
          <div class="stat-value">${user.xp}</div>
          <div class="stat-label">XP</div>
        </div>
        <div class="profile-stat">
          <div class="stat-value">${user.messages_count}</div>
          <div class="stat-label">Messages</div>
        </div>
        <div class="profile-stat">
          <div class="stat-value">${user.topics_count}</div>
          <div class="stat-label">Topics</div>
        </div>
        <div class="profile-stat">
          <div class="stat-value">${user.perfects_count}</div>
          <div class="stat-label">Perfects</div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('achievementsSection').innerHTML = userAchievements.map(a => `
    <div class="achievement-item ${a.earned ? '' : 'achievement-locked'}">
      <span class="achievement-icon">${a.icon}</span>
      <div class="achievement-info">
        <div class="achievement-name">${a.name}</div>
      </div>
      ${a.earned ? '<span>✓</span>' : '<span>🔒</span>'}
    </div>
  `).join('');
  
  renderUserTopics(topics.filter(t => t.author_id === userId));
}

// Leaderboard
function loadLeaderboard(sortBy) {
  const users = getData('users');
  const topics = getData('topics');
  const messages = getData('messages');
  
  document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  let sortedUsers = [...users];
  
  if (sortBy === 'xp') {
    sortedUsers.sort((a, b) => b.xp - a.xp);
  } else if (sortBy === 'messages') {
    sortedUsers.sort((a, b) => b.messages_count - a.messages_count);
  } else if (sortBy === 'topics') {
    sortedUsers.sort((a, b) => b.topics_count - a.topics_count);
  }
  
  const levels = getData('levels');
  
  document.getElementById('leaderboardList').innerHTML = sortedUsers.slice(0, 20).map((user, index) => {
    const level = levels.find(l => l.level_number === user.level) || levels[0];
    let value = user.xp;
    if (sortBy === 'messages') value = user.messages_count;
    if (sortBy === 'topics') value = user.topics_count;
    
    return `
      <tr>
        <td style="text-align: center;">
          ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1)}
        </td>
        <td>
          <div class="author-cell">
            <div class="author-avatar-small">${user.username.charAt(0).toUpperCase()}</div>
            <span>${user.username} ${user.role === 'admin' ? '👑' : ''} ${user.role === 'moderator' ? '🛡️' : ''}</span>
          </div>
        </td>
        <td>
          <span class="level-badge" style="background: ${level.color}">Lv.${user.level}</span>
        </td>
        <td style="text-align: right; font-weight: bold;">
          ${sortBy === 'xp' ? value + ' XP' : value}
        </td>
      </tr>
    `;
  }).join('');
}

// Sidebar Stats
function loadSidebarStats() {
  const users = getData('users');
  const topics = getData('topics');
  const messages = getData('messages');
  
  document.getElementById('forumStats').innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <div style="display: flex; justify-content: space-between;">
        <span>👥 Users:</span>
        <strong>${users.length}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>📝 Topics:</span>
        <strong>${topics.length}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>💬 Messages:</span>
        <strong>${messages.length}</strong>
      </div>
    </div>
  `;
}

function loadSidebarLeaderboard() {
  const users = getData('users');
  const levels = getData('levels');
  
  const topUsers = users.sort((a, b) => b.xp - a.xp).slice(0, 5);
  
  document.getElementById('sidebarLeaderboard').innerHTML = topUsers.map((user, index) => {
    const level = levels.find(l => l.level_number === user.level) || levels[0];
    return `
      <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 6px; margin-bottom: 0.5rem;">
        <span style="font-size: 1.25rem;">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
        <div style="flex: 1;">
          <div style="font-weight: 500;">${user.username}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${user.xp} XP</div>
        </div>
        <span class="level-badge" style="background: ${level.color}; font-size: 0.75rem;">Lv.${user.level}</span>
      </div>
    `;
  }).join('');
}

// Search
function handleSearch(event) {
  if (event.key === 'Enter') search();
}

function search() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  if (!query) return;
  
  const topics = getData('topics');
  const messages = getData('messages');
  const users = getData('users');
  const categories = getData('categories');
  
  const matchedTopics = topics.filter(t => 
    t.title.toLowerCase().includes(query) ||
    t.author_id && users.find(u => u.id === t.author_id && u.username.toLowerCase().includes(query))
  );
  
  navigate('search');
  
  document.getElementById('searchResults').innerHTML = matchedTopics.length > 0 ? `
    <table class="forum-table">
      <thead>
        <tr>
          <th style="width: 60%;">Topic</th>
          <th style="width: 25%;">Author</th>
          <th style="width: 15%; text-align: center;">Replies</th>
        </tr>
      </thead>
      <tbody>
        ${matchedTopics.map(topic => {
          const author = users.find(u => u.id === topic.author_id);
          const category = categories.find(c => c.id === topic.category_id);
          return `
            <tr>
              <td>
                <div class="topic-cell">
                  <div class="topic-title">
                    <a href="#" onclick="navigate('topic', ${topic.id})">${topic.title}</a>
                  </div>
                  <div class="topic-meta">in ${category ? category.icon : '📁'} ${category ? category.name : 'Unknown'}</div>
                </div>
              </td>
              <td>${author ? author.username : 'Unknown'}</td>
              <td style="text-align: center;">${topic.replies_count}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  ` : '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No results found</p>';
}

// Utility functions
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  
  return date.toLocaleDateString();
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  checkAuth();
  loadPage();
});
