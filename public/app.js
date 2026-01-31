// State
let currentUser = null;
let currentPage = 'home';
let currentCategory = null;
let currentTopic = null;

// API Helper
async function api(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

// Auth
async function checkAuth() {
  try {
    const data = await api('/api/auth/me');
    currentUser = data.user;
    updateUserArea();
  } catch (error) {
    currentUser = null;
    updateUserArea();
  }
}

function updateUserArea() {
  const userArea = document.getElementById('userArea');
  
  if (!currentUser) {
    userArea.innerHTML = `
      <button class="btn-primary" onclick="openModal('authModal')">Login / Register</button>
    `;
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

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.username.value;
  const password = form.password.value;
  
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    currentUser = data.user;
    closeModal('authModal');
    updateUserArea();
    showToast('Welcome back, ' + currentUser.username + '!', 'success');
    loadPage();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.username.value;
  const email = form.email.value;
  const password = form.password.value;
  
  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    
    currentUser = data.user;
    closeModal('authModal');
    updateUserArea();
    showToast('Welcome to Black House, ' + currentUser.username + '!', 'success');
    loadPage();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    updateUserArea();
    showToast('Logged out successfully', 'success');
    navigate('home');
  } catch (error) {
    showToast(error.message, 'error');
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
async function loadCategories() {
  try {
    const data = await api('/api/categories');
    
    document.getElementById('categoriesGrid').innerHTML = data.categories.map(cat => `
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
    
    // Update sidebar in category page
    const categorySidebar = document.getElementById('categorySidebar');
    if (categorySidebar) {
      categorySidebar.innerHTML = data.categories.map(cat => `
        <div class="category-row" onclick="navigate('category', ${cat.id})" style="margin-bottom: 0.5rem;">
          <span class="category-icon">${cat.icon}</span>
          <span class="category-name">${cat.name}</span>
        </div>
      `).join('');
    }
    
    // Update category select
    const select = document.getElementById('topicCategory');
    if (select && select.children.length <= 1) {
      select.innerHTML = '<option value="">Select Category</option>' +
        data.categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadCategory(id) {
  try {
    const [categoriesData, topicsData] = await Promise.all([
      api('/api/categories'),
      api('/api/topics?category_id=' + id)
    ]);
    
    const category = categoriesData.categories.find(c => c.id === id);
    
    document.getElementById('categoryTitle').innerHTML = `${category.icon} ${category.name}`;
    
    document.getElementById('categoryInfo').innerHTML = `
      <div style="font-size: 0.9rem; color: var(--text-secondary);">
        <p style="margin-bottom: 0.75rem;">${category.description}</p>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div>📝 <strong>${category.topics_count}</strong> topics</div>
          <div>💬 <strong>${category.messages_count}</strong> messages</div>
        </div>
      </div>
    `;
    
    renderTopicsTable(topicsData.topics, 'categoryTopics');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Topics - Table rendering
function renderTopicsTable(topics, containerId) {
  const container = document.getElementById(containerId);
  
  if (topics.length === 0) {
    container.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No topics yet</td></tr>';
    return;
  }
  
  container.innerHTML = topics.map(topic => `
    <tr>
      <td>
        <div class="topic-cell">
          <div class="topic-title">
            <a href="#" onclick="navigate('topic', ${topic.id})">${topic.title}</a>
            ${topic.is_closed ? '<span class="badge badge-closed">Closed</span>' : ''}
            ${topic.is_pinned ? '<span class="badge badge-pinned">Pinned</span>' : ''}
          </div>
          <div class="topic-meta">
            in ${topic.category_icon} ${topic.category_name}
          </div>
        </div>
      </td>
      <td>
        <div class="author-cell">
          <div class="author-avatar-small">${topic.author_name.charAt(0).toUpperCase()}</div>
          <span>${topic.author_name} <span class="level-badge" style="font-size: 0.75rem;">Lv.${topic.author_level}</span></span>
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
  `).join('');
}

async function loadRecentTopics() {
  try {
    const data = await api('/api/topics?limit=15');
    renderTopicsTable(data.topics, 'recentTopics');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadTopic(id) {
  try {
    const [topicData, messagesData] = await Promise.all([
      api('/api/topics/' + id),
      api('/api/topics/' + id + '/messages')
    ]);
    
    const topic = topicData.topic;
    const isMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
    
    document.getElementById('topicHeader').innerHTML = `
      <div class="category-breadcrumb">
        ${topic.category_icon} ${topic.category_name}
      </div>
      <h1 style="margin-top: 0.5rem; font-size: 1.25rem;">
        ${topic.title}
        ${topic.is_closed ? '<span class="badge badge-closed">Closed</span>' : ''}
        ${topic.is_pinned ? '<span class="badge badge-pinned">Pinned</span>' : ''}
      </h1>
      <div class="topic-header-meta">
        <span>by <a href="#" onclick="navigate('profile', ${topic.author_id})">${topic.author_name}</a></span>
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
    
    renderMessages(messagesData.messages, id);
    
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
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderMessages(messages, topicId) {
  const container = document.getElementById('messagesContainer');
  
  if (messages.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">No messages yet</p>';
    return;
  }
  
  const isMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
  const isTopicAuthor = currentUser && currentUser.id === messages[0].author_id;
  
  container.innerHTML = messages.map(msg => `
    <div class="message ${msg.is_solution ? 'solution' : ''}">
      <div class="message-header">
        <div class="message-author">
          <div class="author-avatar" onclick="navigate('profile', ${msg.author_id})">${msg.author_name.charAt(0).toUpperCase()}</div>
          <div class="author-info">
            <span class="author-name">
              ${msg.author_name}
              ${msg.author_role === 'admin' ? '👑' : ''}
              ${msg.author_role === 'moderator' ? '🛡️' : ''}
            </span>
            <span class="author-level">Level ${msg.author_level}</span>
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
  `).join('');
}

async function handleReply(topicId) {
  const content = document.getElementById('replyContent').value;
  if (!content.trim()) return;
  
  try {
    await api('/api/topics/' + topicId + '/messages', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    
    showToast('Reply posted! (+5 XP)', 'success');
    loadTopic(topicId);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function markSolution(messageId, topicId) {
  try {
    await api('/api/messages/' + messageId + '/solution', {
      method: 'PUT',
      body: JSON.stringify({ topicId })
    });
    showToast('Marked as solution! (+25 XP)', 'success');
    loadTopic(topicId);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function toggleTopicStatus(topicId, action) {
  try {
    await api('/api/topics/' + topicId + '/' + action, { method: 'PUT' });
    showToast('Topic ' + (action === 'close' ? 'closed' : 'opened'), 'success');
    loadTopic(topicId);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function togglePin(topicId) {
  try {
    await api('/api/topics/' + topicId + '/pin', { method: 'PUT' });
    showToast('Pin status updated', 'success');
    loadTopic(topicId);
  } catch (error) {
    showToast(error.message, 'error');
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

async function handleCreateTopic(event) {
  event.preventDefault();
  const title = document.getElementById('topicTitle').value;
  const category_id = document.getElementById('topicCategory').value;
  const content = document.getElementById('topicContent').value;
  
  try {
    const data = await api('/api/topics', {
      method: 'POST',
      body: JSON.stringify({ title, category_id, content })
    });
    
    closeModal('createTopicModal');
    showToast('Topic created! (+15 XP)', 'success');
    navigate('topic', data.topicId);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Profile
async function loadProfile(userId) {
  try {
    const [userData, topicsData] = await Promise.all([
      api('/api/users/' + userId),
      api('/api/users/' + userId + '/topics')
    ]);
    
    const { user, level, achievements } = userData;
    
    document.getElementById('profileHeader').innerHTML = `
      <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
      <div class="profile-info">
        <h1>${user.username} ${user.role === 'admin' ? '👑' : ''} ${user.role === 'moderator' ? '🛡️' : ''}</h1>
        <div class="profile-level">
          <span class="level-badge" style="background: ${level.color}">Lv.${user.level} - ${level.title}</span>
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
    
    document.getElementById('achievementsSection').innerHTML = achievements.map(a => `
      <div class="achievement-item ${a.earned ? '' : 'achievement-locked'}">
        <span class="achievement-icon">${a.icon}</span>
        <div class="achievement-info">
          <div class="achievement-name">${a.name}</div>
        </div>
        ${a.earned ? '<span>✓</span>' : '<span>🔒</span>'}
      </div>
    `).join('');
    
    renderUserTopics(topicsData.topics);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderUserTopics(topics) {
  const container = document.getElementById('userTopics');
  
  if (topics.length === 0) {
    container.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No topics yet</td></tr>';
    return;
  }
  
  container.innerHTML = topics.map(topic => `
    <tr>
      <td>
        <a href="#" onclick="navigate('topic', ${topic.id})">${topic.title}</a>
      </td>
      <td>${topic.category_icon} ${topic.category_name}</td>
      <td style="text-align: center;">${topic.reply_count || 0}</td>
      <td>${formatDate(topic.created_at)}</td>
    </tr>
  `).join('');
}

// Leaderboard
async function loadLeaderboard(type = 'xp') {
  try {
    const data = await api('/api/leaderboard?type=' + type);
    
    document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase().includes(type));
    });
    
    const typeLabel = { xp: 'XP', messages: 'Messages', topics: 'Topics' };
    const typeValue = { xp: 'xp', messages: 'messages_count', topics: 'topics_count' };
    
    document.getElementById('leaderboardList').innerHTML = data.users.map((user, index) => `
      <tr class="${currentUser && currentUser.id === user.id ? 'current-user' : ''}">
        <td><span class="rank rank-${index + 1}">#${index + 1}</span></td>
        <td>
          <div class="author-cell">
            <div class="leaderboard-avatar" onclick="navigate('profile', ${user.id})">${user.username.charAt(0).toUpperCase()}</div>
            <span>${user.username}</span>
          </div>
        </td>
        <td><span class="level-badge" style="background: ${getLevelColor(user.level)}">Lv.${user.level}</span></td>
        <td style="text-align: right;"><strong>${user[typeValue[type]]}</strong> ${typeLabel[type]}</td>
      </tr>
    `).join('');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Sidebar Stats
async function loadSidebarStats() {
  try {
    const [categories, leaderboard] = await Promise.all([
      api('/api/categories'),
      api('/api/leaderboard?limit=5')
    ]);
    
    const totalTopics = categories.categories.reduce((sum, c) => sum + c.topics_count, 0);
    const totalMessages = categories.categories.reduce((sum, c) => sum + c.messages_count, 0);
    const totalUsers = leaderboard.users.length;
    
    document.getElementById('forumStats').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
        <div style="display: flex; justify-content: space-between;">
          <span>Categories:</span>
          <strong>${categories.categories.length}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Topics:</span>
          <strong>${totalTopics}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Messages:</span>
          <strong>${totalMessages}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Members:</span>
          <strong>${totalUsers}+</strong>
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById('forumStats').innerHTML = '<p style="color: var(--text-secondary);">Loading stats...</p>';
  }
}

async function loadSidebarLeaderboard() {
  try {
    const data = await api('/api/leaderboard?limit=5');
    
    document.getElementById('sidebarLeaderboard').innerHTML = data.users.map((user, index) => `
      <div class="leaderboard-item" style="margin-bottom: 0.5rem; padding: 0.5rem;">
        <span class="rank rank-${index + 1}">#${index + 1}</span>
        <div class="leaderboard-avatar" onclick="navigate('profile', ${user.id})" style="width: 28px; height: 28px; font-size: 0.75rem;">${user.username.charAt(0).toUpperCase()}</div>
        <span class="leaderboard-name" style="font-size: 0.85rem;">${user.username}</span>
        <span class="leaderboard-value" style="font-size: 0.85rem;">${user.xp} XP</span>
      </div>
    `).join('');
  } catch (error) {
    document.getElementById('sidebarLeaderboard').innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">Loading...</p>';
  }
}

// Search
async function handleSearch(event) {
  if (event.key === 'Enter') {
    search();
  }
}

async function search() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query || query.length < 2) return;
  
  try {
    const data = await api('/api/search?q=' + encodeURIComponent(query));
    
    navigate('search');
    const results = document.getElementById('searchResults');
    
    results.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div>
          <h3>Topics (${data.results.topics.length})</h3>
          ${data.results.topics.length === 0 
            ? '<p style="color: var(--text-secondary);">No topics found</p>'
            : data.results.topics.map(t => `
                <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem;">
                  <a href="#" onclick="navigate('topic', ${t.id})" style="font-weight: 600;">${t.title}</a>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    by ${t.author_name} in ${t.category_name}
                  </div>
                </div>
              `).join('')
          }
        </div>
        <div>
          <h3>Users (${data.results.users.length})</h3>
          ${data.results.users.length === 0
            ? '<p style="color: var(--text-secondary);">No users found</p>'
            : data.results.users.map(u => `
                <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                  <div class="leaderboard-avatar" onclick="navigate('profile', ${u.id})" style="width: 32px; height: 32px; font-size: 0.85rem;">${u.username.charAt(0).toUpperCase()}</div>
                  <a href="#" onclick="navigate('profile', ${u.id})" style="font-weight: 600;">${u.username}</a>
                  <span style="font-size: 0.85rem; color: var(--text-secondary);">Lv.${u.level}</span>
                </div>
              `).join('')
          }
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Utilities
function getLevelColor(level) {
  const colors = {
    1: '#808080', 2: '#4CAF50', 3: '#2196F3', 4: '#9C27B0',
    5: '#FF9800', 6: '#E91E63', 7: '#00BCD4', 8: '#FFEB3B',
    9: '#F44336', 10: '#FFD700'
  };
  return colors[level] || colors[1];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + 'm';
  if (hours < 24) return hours + 'h';
  if (days < 7) return days + 'd';
  
  return date.toLocaleDateString();
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadPage();
});

// Close modal on outside click
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
  }
};
