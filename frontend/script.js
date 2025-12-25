let currentUser = JSON.parse(localStorage.getItem('taskFlowUser')) || null;
let tasks = [];
let notifications = [];
let editingTaskId = null;
let currentFilter = 'all';
let currentCategory = null;
let reminderSettings = {
  browserNotify: true,
  emailNotify: true,
  whatsappNotify: true,
  autoRemindHigh: true,
  defaultHighReminder: 1440,
  dailySummary: true,
  summaryTime: '08:00',
  quietHours: false,
  quietStart: '22:00',
  quietEnd: '07:00'
};

// ==================== DOM ELEMENTS ====================
const authContainer = document.getElementById('authContainer');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const taskModal = document.getElementById('taskModal');
const reminderSettingsModal = document.getElementById('reminderSettingsModal');
const notificationPanel = document.getElementById('notificationPanel');
const taskList = document.getElementById('taskList');
const toast = document.getElementById('toast');

// ==================== API CONFIG ====================
// Yahan maine fix kiya hai: /tasks hata diya hai taaki auth aur tasks dono sahi chalein
const API_BASE_URL = 'https://taskflow-backend-grrr.onrender.com/api';

// ==================== API-READY FUNCTIONS ====================

async function fetchTasks() {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks?userId=${currentUser.id}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    const data = await response.json();
    return data.map(task => ({ ...task, id: task._id }));
  } catch (error) {
    console.error("Fetch Tasks Error:", error);
    return [];
  }
}

async function createTask(taskData) {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...taskData,
      userId: currentUser.id
    })
  });
  if (!response.ok) throw new Error('Failed to create task');
  const data = await response.json();
  return { ...data, id: data._id };
}

async function updateTask(id, updates) {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update task');
  const data = await response.json();
  return { ...data, id: data._id };
}

async function deleteTask(id) {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete task');
  return true;
}

async function registerUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Registration failed');
  return { ...data, id: data._id };
}

async function loginUser(identifier, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Login failed');
  
  return { ...data, id: data._id };
}

// ISKO REPLACE KARO SCRIPT.JS MEIN
// ==================== UPDATED REMINDER TRIGGER ====================
async function sendReminder(task, channels) {
  console.log('Processing reminder for:', task.title);
  
  const taskId = task._id || task.id;

  // 1. Browser Notification (Local)
  if (channels.browser && Notification.permission === 'granted') {
    new Notification('Task Flow Reminder', {
      body: `"${task.title}" is due ${formatRelativeTime(task.date, task.time)}`,
      icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png', // Task icon
      tag: taskId
    });
  }
  
  // 2. Email Notification (Backend Trigger)
  // Ye part ab tere taskRoutes.js wale naye route ko hit karega
  if (channels.email) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/reminders/trigger`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          taskId: taskId,
          userId: currentUser.id || currentUser._id
        })
      });

      const result = await response.json();
      if (response.ok) {
        console.log('✅ Email reminder sent successfully');
      } else {
        console.error('❌ Server error:', result.message);
      }
    } catch (err) {
      console.error('❌ Network error while sending email:', err);
    }
  }
}
// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', init);

function init() {
  loadSession();
  setupEventListeners();
  requestNotificationPermission();
  startReminderChecker();
}

function loadSession() {
  // Use the same key we set in the Auth actions (taskFlowUser)
  const session = localStorage.getItem('taskFlowUser');
  if (session) {
    currentUser = JSON.parse(session);
    showMainApp();
  }
}

function saveTasks() {
  // Logic disabled: Tasks are now saved to MongoDB via API calls
  console.log('Syncing tasks with MongoDB...');
}

function saveSession() {
  // Consistent with Part 1 and handleLogin/Signup
  localStorage.setItem('taskFlowUser', JSON.stringify(currentUser));
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  // Auth links
  document.querySelectorAll('[data-switch]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab(link.dataset.switch);
    });
  });

  // Login form
  loginForm.addEventListener('submit', handleLogin);

  // Signup form
  signupForm.addEventListener('submit', handleSignup);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Add task
  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('closeModal').addEventListener('click', closeTaskModal);
  document.getElementById('cancelTask').addEventListener('click', closeTaskModal);
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);

  // Reminder toggle in task form
  document.getElementById('enableTaskReminder').addEventListener('change', (e) => {
    document.getElementById('reminderDetails').classList.toggle('hidden', !e.target.checked);
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      currentCategory = null;
      document.querySelectorAll('.category-btn').forEach(c => c.classList.remove('active'));
      updateFilterTitle();
      renderTasks();
    });
  });

  // Categories
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      currentFilter = 'all';
      document.querySelectorAll('.filter-btn').forEach(f => f.classList.remove('active'));
      updateFilterTitle();
      renderTasks();
    });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', renderTasks);

  // Sort
  document.getElementById('sortSelect').addEventListener('change', renderTasks);

  // Notifications
  document.getElementById('notificationBtn').addEventListener('click', toggleNotificationPanel);
  document.getElementById('clearAllNotifications').addEventListener('click', clearNotifications);

  // Reminder settings
  document.getElementById('reminderSettingsBtn').addEventListener('click', openReminderSettings);
  document.getElementById('closeReminderSettings').addEventListener('click', closeReminderSettings);
  document.getElementById('saveReminderSettings').addEventListener('click', saveReminderSettingsHandler);

  // Reminder banner
  document.getElementById('dismissBanner').addEventListener('click', () => {
    document.getElementById('reminderBanner').classList.add('hidden');
  });

  // Suggestions collapse
  document.getElementById('collapseSuggestions').addEventListener('click', () => {
    const content = document.getElementById('suggestionsContent');
    const btn = document.getElementById('collapseSuggestions');
    content.classList.toggle('hidden');
    btn.textContent = content.classList.contains('hidden') ? '+' : '−';
  });
}
// Close modals on outside click
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeTaskModal();
  });
  reminderSettingsModal.addEventListener('click', (e) => {
    if (e.target === reminderSettingsModal) closeReminderSettings();
  });

  // Close notification panel on outside click
  document.addEventListener('click', (e) => {
    if (!notificationPanel.classList.contains('hidden') && 
        !notificationPanel.contains(e.target) && 
        !document.getElementById('notificationBtn').contains(e.target)) {
      notificationPanel.classList.add('hidden');
    }
  });


// ==================== AUTH HANDLERS ====================
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    currentUser = await loginUser(identifier, password);
    saveSession();
    await showMainApp(); // Added await to ensure tasks load before UI shows
    showToast('Welcome back, ' + currentUser.name + '!');
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const enableReminders = document.getElementById('enableReminders').checked;

  if (password !== confirm) {
    showToast('Passwords do not match', true);
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', true);
    return;
  }

  try {
    currentUser = await registerUser({ name, email, phone, password, enableReminders });
    saveSession();
    await showMainApp(); // Added await for backend sync
    showToast('Account created successfully!');
  } catch (error) {
    showToast(error.message, true);
  }
}

function handleLogout(e) {
  e.preventDefault();
  currentUser = null;
  tasks = [];
  // Updated to match the 'taskFlowUser' key used in Parts 1 & 2
  localStorage.removeItem('taskFlowUser'); 
  authContainer.classList.remove('hidden');
  mainApp.classList.add('hidden');
  loginForm.reset();
  signupForm.reset();
  showToast('Logged out successfully');
}

async function showMainApp() {
  authContainer.classList.add('hidden');
  mainApp.classList.remove('hidden');
  
  // Update user info
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userAvatar').textContent = getInitials(currentUser.name);
  
  // Load tasks from MongoDB
  try {
      tasks = await fetchTasks();
  } catch (err) {
      console.error("Failed to load tasks during init:", err);
      tasks = [];
  }
  
  // Load reminder settings (Keeping localStorage for settings as they are local to the device)
  const savedSettings = localStorage.getItem(`reminderSettings_${currentUser.id}`);
  if (savedSettings) {
    reminderSettings = JSON.parse(savedSettings);
  }
  
  renderTasks();
  updateStats();
  renderSuggestions();
  checkUpcomingReminders();
}
// ==================== TASK HANDLERS ====================
function openTaskModal(taskId = null) {
  editingTaskId = taskId;
  document.getElementById('modalTitle').textContent = taskId ? 'Edit Task' : 'Add New Task';
  
  if (taskId) {
    // Search using both MongoDB _id and local id formats
    const task = tasks.find(t => (t._id || t.id) === taskId);
    if (task) {
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDate').value = task.date;
      document.getElementById('taskTime').value = task.time || '';
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskCategory').value = task.category;
      document.getElementById('taskDescription').value = task.description || '';
      document.getElementById('enableTaskReminder').checked = task.reminder?.enabled || false;
      
      if (task.reminder?.enabled) {
        document.getElementById('reminderDetails').classList.remove('hidden');
        document.getElementById('reminderTime').value = task.reminder.beforeMinutes || 0;
        document.getElementById('notifyBrowser').checked = task.reminder.browser !== false;
        document.getElementById('notifyEmail').checked = task.reminder.email || false;
        document.getElementById('notifyWhatsapp').checked = task.reminder.whatsapp || false;
        document.getElementById('reminderRepeat').value = task.reminder.repeat || 'none';
      }
    }
  } else {
    document.getElementById('taskForm').reset();
    document.getElementById('taskDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('reminderDetails').classList.add('hidden');
    
    if (reminderSettings.autoRemindHigh) {
      const prioritySelect = document.getElementById('taskPriority');
      prioritySelect.addEventListener('change', function handler(e) {
        if (e.target.value === 'high') {
          document.getElementById('enableTaskReminder').checked = true;
          document.getElementById('reminderDetails').classList.remove('hidden');
          document.getElementById('reminderTime').value = reminderSettings.defaultHighReminder;
        }
        e.target.removeEventListener('change', handler);
      });
    }
  }
  
  taskModal.classList.remove('hidden');
}

function closeTaskModal() {
  taskModal.classList.add('hidden');
  editingTaskId = null;
  document.getElementById('taskForm').reset();
  document.getElementById('reminderDetails').classList.add('hidden');
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  
  const taskData = {
    title: document.getElementById('taskTitle').value.trim(),
    date: document.getElementById('taskDate').value,
    time: document.getElementById('taskTime').value || null,
    priority: document.getElementById('taskPriority').value,
    category: document.getElementById('taskCategory').value,
    description: document.getElementById('taskDescription').value.trim(),
    reminder: {
      enabled: document.getElementById('enableTaskReminder').checked,
      beforeMinutes: parseInt(document.getElementById('reminderTime').value) || 0,
      browser: document.getElementById('notifyBrowser').checked,
      email: document.getElementById('notifyEmail').checked,
      whatsapp: document.getElementById('notifyWhatsapp').checked,
      repeat: document.getElementById('reminderRepeat').value
    }
  };

  try {
    if (editingTaskId) {
      const updated = await updateTask(editingTaskId, taskData);
      // Sync local array with the backend response
      const index = tasks.findIndex(t => (t._id || t.id) === editingTaskId);
      if (index !== -1) tasks[index] = { ...updated, id: updated._id };
      showToast('Task updated successfully');
    } else {
      const newTask = await createTask(taskData);
      // Push the new task with mapped ID
      tasks.push({ ...newTask, id: newTask._id });
      showToast('Task created successfully');
      
      if (taskData.reminder.enabled) {
        addNotification({
          type: 'reminder_set',
          title: 'Reminder Set',
          message: `You'll be reminded about "${taskData.title}"`,
          taskId: newTask._id
        });
      }
    }

    closeTaskModal();
    renderTasks();
    updateStats();
    renderSuggestions();
  } catch (error) {
    showToast("Error: " + error.message, true);
  }
}

async function toggleTaskComplete(id) {
  const task = tasks.find(t => (t._id || t.id) === id);
  if (task) {
    try {
      const updated = await updateTask(id, { completed: !task.completed });
      const index = tasks.findIndex(t => (t._id || t.id) === id);
      if (index !== -1) tasks[index] = { ...updated, id: updated._id };
      
      renderTasks();
      updateStats();
      renderSuggestions();
      showToast(tasks[index].completed ? 'Task completed!' : 'Task marked as pending');
    } catch (error) {
      showToast("Could not update task status", true);
    }
  }
}

async function handleDeleteTask(id) {
  if (confirm('Are you sure you want to delete this task?')) {
    try {
      await deleteTask(id);
      // Filter out using the backend ID format
      tasks = tasks.filter(t => (t._id || t.id) !== id);
      renderTasks();
      updateStats();
      renderSuggestions();
      showToast('Task deleted');
    } catch (error) {
      showToast("Failed to delete task", true);
    }
  }
}
// ==================== RENDERING ====================
function renderTasks() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const sortBy = document.getElementById('sortSelect').value;
  
  let filtered = [...tasks];

  // Apply search
  if (searchTerm) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(searchTerm) ||
      (t.description && t.description.toLowerCase().includes(searchTerm))
    );
  }

  // Apply category filter
  if (currentCategory) {
    filtered = filtered.filter(t => t.category === currentCategory);
  }

  // Apply filter
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  switch (currentFilter) {
    case 'today':
      filtered = filtered.filter(t => {
        const taskDate = new Date(t.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });
      break;
    case 'week':
      filtered = filtered.filter(t => {
        const taskDate = new Date(t.date);
        return taskDate >= today && taskDate <= endOfWeek;
      });
      break;
    case 'month':
      filtered = filtered.filter(t => {
        const taskDate = new Date(t.date);
        return taskDate >= today && taskDate <= endOfMonth;
      });
      break;
    case 'overdue':
      filtered = filtered.filter(t => {
        const taskDate = new Date(t.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate < today && !t.completed;
      });
      break;
    case 'upcoming':
      filtered = filtered.filter(t => {
        const taskDate = new Date(t.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate > today && !t.completed;
      });
      break;
    case 'high':
      filtered = filtered.filter(t => t.priority === 'high' && !t.completed);
      break;
    case 'reminders':
      filtered = filtered.filter(t => t.reminder?.enabled);
      break;
    case 'completed':
      filtered = filtered.filter(t => t.completed);
      break;
    case 'pending':
      filtered = filtered.filter(t => !t.completed);
      break;
  }

  // Apply sort
  switch (sortBy) {
    case 'date-asc':
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'date-desc':
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'priority':
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      break;
    case 'name':
      filtered.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  // Render
  if (filtered.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
        <h3 style="margin-bottom: 8px; color: var(--text-secondary);">No tasks found</h3>
        <p>Create a new task to get started</p>
      </div>
    `;
    return;
  }

  taskList.innerHTML = filtered.map(task => {
    // Ensure we use the MongoDB _id for all frontend operations
    const taskId = task._id || task.id;
    const isOverdue = isTaskOverdue(task);
    const priorityIcon = { high: '🔴', medium: '🟡', low: '🟢' }[task.priority];
    const categoryIcon = { work: '💼', personal: '🏠', health: '💪', finance: '💰', learning: '📚' }[task.category];
    
    return `
      <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${taskId}">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTaskComplete('${taskId}')"></div>
        <div class="task-content">
          <div class="task-title">
            ${task.title}
            ${task.reminder?.enabled ? '<span title="Reminder set">🔔</span>' : ''}
          </div>
          ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
          <div class="task-meta">
            <span class="priority-${task.priority}">${priorityIcon} ${task.priority}</span>
            <span>${categoryIcon} ${task.category}</span>
            <span>📅 ${formatDate(task.date)}${task.time ? ' ' + formatTime(task.time) : ''}</span>
            ${isOverdue ? '<span class="overdue-badge">⚠️ Overdue</span>' : ''}
            ${task.reminder?.enabled ? '<span class="reminder-badge">🔔 Reminder</span>' : ''}
          </div>
        </div>
        <div class="task-actions-menu">
          <button class="task-action-btn" onclick="openTaskModal('${taskId}')" title="Edit">✏️</button>
          <button class="task-action-btn delete" onclick="handleDeleteTask('${taskId}')" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}
// ==================== RENDERING ====================
function renderSuggestions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayTasks = tasks.filter(t => {
    const taskDate = new Date(t.date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime() && !t.completed;
  }).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }).slice(0, 5);

  const container = document.getElementById('suggestionCards');
  
  if (todayTasks.length === 0) {
    container.innerHTML = `
      <div class="suggestion-card" style="text-align: center;">
        <div class="suggestion-title">✨ No tasks for today</div>
        <div class="suggestion-meta">Enjoy your free day or plan ahead!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = todayTasks.map(task => {
    // Correctly reference the ID for the onclick event
    const taskId = task._id || task.id;
    return `
      <div class="suggestion-card ${task.priority}-priority" onclick="openTaskModal('${taskId}')">
        <div class="suggestion-title">
          ${{ high: '🔴', medium: '🟡', low: '🟢' }[task.priority]}
          ${task.title}
        </div>
        <div class="suggestion-meta">
          <span class="suggestion-time">⏰ ${task.time ? formatTime(task.time) : 'No time set'}</span>
          <span>${{ work: '💼', personal: '🏠', health: '💪', finance: '💰', learning: '📚' }[task.category]}</span>
          ${task.reminder?.enabled ? '<span>🔔</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  // Show reminder banner for high priority tasks
  const highPriorityToday = todayTasks.filter(t => t.priority === 'high');
  if (highPriorityToday.length > 0) {
    document.getElementById('reminderText').textContent = 
      `You have ${highPriorityToday.length} high priority task${highPriorityToday.length > 1 ? 's' : ''} due today!`;
    document.getElementById('reminderBanner').classList.remove('hidden');
  } else {
    document.getElementById('reminderBanner').classList.add('hidden');
  }
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed).length;
  const urgent = tasks.filter(t => t.priority === 'high' && !t.completed).length;

  document.getElementById('totalTasks').textContent = total;
  document.getElementById('completedTasks').textContent = completed;
  document.getElementById('pendingTasks').textContent = pending;
  document.getElementById('urgentTasks').textContent = urgent;
}

function updateFilterTitle() {
  const titles = {
    all: 'All Tasks',
    today: "Today's Tasks",
    week: 'This Week',
    month: 'This Month',
    overdue: 'Overdue Tasks',
    upcoming: 'Upcoming Tasks',
    high: 'High Priority',
    reminders: 'Tasks with Reminders',
    completed: 'Completed Tasks',
    pending: 'Pending Tasks'
  };
  
  const categoryTitles = {
    work: '💼 Work Tasks',
    personal: '🏠 Personal Tasks',
    health: '💪 Health Tasks',
    finance: '💰 Finance Tasks',
    learning: '📚 Learning Tasks'
  };
  
  document.getElementById('currentFilter').textContent = 
    currentCategory ? categoryTitles[currentCategory] : titles[currentFilter];
}

// ==================== NOTIFICATIONS ====================
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function addNotification(notification) {
  notifications.unshift({
    id: Date.now().toString(),
    ...notification,
    read: false,
    time: new Date().toISOString()
  });
  updateNotificationBadge();
  renderNotifications();
}

function updateNotificationBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notificationBadge');
  if (badge) {
      badge.textContent = unread;
      badge.classList.toggle('hidden', unread === 0);
  }
}

function toggleNotificationPanel() {
  notificationPanel.classList.toggle('hidden');
  if (!notificationPanel.classList.contains('hidden')) {
    renderNotifications();
  }
}

function renderNotifications() {
  const list = document.getElementById('notificationList');
  if (!list) return;
  
  if (notifications.length === 0) {
    list.innerHTML = `
      <div class="empty-notifications">
        <p>No notifications yet</p>
      </div>
    `;
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')">
      <div class="notification-icon">${getNotificationIcon(n.type)}</div>
      <div class="notification-content">
        <div class="notification-title">${n.title}</div>
        <div class="notification-message">${n.message}</div>
        <div class="notification-time">${formatRelativeTimeShort(n.time)}</div>
      </div>
    </div>
  `).join('');
}

function markNotificationRead(id) {
  const notification = notifications.find(n => n.id === id);
  if (notification) {
    notification.read = true;
    updateNotificationBadge();
    renderNotifications();
    
    if (notification.taskId) {
      // Use the taskId stored in the notification object
      openTaskModal(notification.taskId);
    }
  }
}

function clearNotifications() {
  notifications = [];
  updateNotificationBadge();
  renderNotifications();
}

function getNotificationIcon(type) {
  const icons = {
    reminder: '🔔',
    reminder_set: '✅',
    overdue: '⚠️',
    completed: '🎉'
  };
  return icons[type] || '📌';
}

// ==================== REMINDER SYSTEM ====================
function startReminderChecker() {
  setInterval(checkReminders, 60000);
  setTimeout(checkReminders, 1000);
}

function checkReminders() {
  if (!currentUser) return;
  
  const now = new Date();
  
  tasks.forEach(task => {
    if (task.completed || !task.reminder?.enabled) return;
    
    const taskDateTime = new Date(task.date);
    if (task.time) {
      const [hours, minutes] = task.time.split(':');
      taskDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      taskDateTime.setHours(9, 0, 0, 0);
    }
    
    const reminderTime = new Date(taskDateTime.getTime() - (task.reminder.beforeMinutes * 60 * 1000));
    const timeDiff = reminderTime.getTime() - now.getTime();
    
    if (timeDiff >= 0 && timeDiff < 60000) {
      if (reminderSettings.quietHours) {
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [quietStartH, quietStartM] = reminderSettings.quietStart.split(':').map(Number);
        const [quietEndH, quietEndM] = reminderSettings.quietEnd.split(':').map(Number);
        const quietStart = quietStartH * 60 + quietStartM;
        const quietEnd = quietEndH * 60 + quietEndM;
        
        if (quietStart < quietEnd) {
          if (currentTime >= quietStart && currentTime <= quietEnd) return;
        } else {
          if (currentTime >= quietStart || currentTime <= quietEnd) return;
        }
      }
      
      triggerReminder(task);
    }
  });
}

function triggerReminder(task) {
  const taskId = task._id || task.id;
  const channels = {
    browser: task.reminder.browser && reminderSettings.browserNotify,
    email: task.reminder.email && reminderSettings.emailNotify,
    whatsapp: task.reminder.whatsapp && reminderSettings.whatsappNotify
  };
  
  sendReminder(task, channels);
  
  addNotification({
    type: 'reminder',
    title: 'Task Reminder',
    message: `"${task.title}" is due ${formatRelativeTime(task.date, task.time)}`,
    taskId: taskId
  });
}

function checkUpcomingReminders() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const upcomingHighPriority = tasks.filter(task => {
    if (task.completed || task.priority !== 'high') return false;
    const taskDate = new Date(task.date);
    return taskDate >= now && taskDate <= in24Hours;
  });
  
  if (upcomingHighPriority.length > 0) {
    addNotification({
      type: 'reminder',
      title: 'Upcoming High Priority Tasks',
      message: `You have ${upcomingHighPriority.length} high priority task${upcomingHighPriority.length > 1 ? 's' : ''} in the next 24 hours`
    });
  }
}
// ==================== REMINDER SETTINGS ====================
function openReminderSettings() {
  document.getElementById('globalBrowserNotify').checked = reminderSettings.browserNotify;
  document.getElementById('globalEmailNotify').checked = reminderSettings.emailNotify;
  document.getElementById('globalWhatsappNotify').checked = reminderSettings.whatsappNotify;
  document.getElementById('autoRemindHigh').checked = reminderSettings.autoRemindHigh;
  document.getElementById('defaultHighReminder').value = reminderSettings.defaultHighReminder;
  document.getElementById('dailySummary').checked = reminderSettings.dailySummary;
  document.getElementById('summaryTime').value = reminderSettings.summaryTime;
  document.getElementById('quietHours').checked = reminderSettings.quietHours;
  document.getElementById('quietStart').value = reminderSettings.quietStart;
  document.getElementById('quietEnd').value = reminderSettings.quietEnd;
  
  reminderSettingsModal.classList.remove('hidden');
}

function closeReminderSettings() {
  reminderSettingsModal.classList.add('hidden');
}

function saveReminderSettingsHandler() {
  reminderSettings = {
    browserNotify: document.getElementById('globalBrowserNotify').checked,
    emailNotify: document.getElementById('globalEmailNotify').checked,
    whatsappNotify: document.getElementById('globalWhatsappNotify').checked,
    autoRemindHigh: document.getElementById('autoRemindHigh').checked,
    defaultHighReminder: parseInt(document.getElementById('defaultHighReminder').value),
    dailySummary: document.getElementById('dailySummary').checked,
    summaryTime: document.getElementById('summaryTime').value,
    quietHours: document.getElementById('quietHours').checked,
    quietStart: document.getElementById('quietStart').value,
    quietEnd: document.getElementById('quietEnd').value
  };
  
  // Settings remain in localStorage as they are device-specific preferences
  localStorage.setItem(`reminderSettings_${currentUser.id}`, JSON.stringify(reminderSettings));
  closeReminderSettings();
  showToast('Reminder settings saved');
}

// ==================== UTILITIES ====================
function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const taskDate = new Date(dateStr);
  taskDate.setHours(0, 0, 0, 0);
  
  if (taskDate.getTime() === today.getTime()) return 'Today';
  if (taskDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatRelativeTime(dateStr, timeStr) {
  const taskDate = new Date(dateStr);
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':');
    taskDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }
  
  const now = new Date();
  const diffMs = taskDate - now;
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  
  if (diffMins < 0) return 'overdue';
  if (diffMins < 60) return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

function formatRelativeTimeShort(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function isTaskOverdue(task) {
  if (task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(task.date);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today;
}

function showToast(message, isError = false) {
  const toastEl = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastMessage = document.getElementById('toastMessage');
  
  if (!toastEl || !toastMessage) return;

  toastMessage.textContent = message;
  if (toastIcon) toastIcon.textContent = isError ? '✕' : '✓';
  toastEl.classList.toggle('error', isError);
  toastEl.classList.remove('hidden');
  
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3000);
}

// ==================== GLOBAL EXPOSURE ====================
// Essential for HTML onclick events to work
window.toggleTaskComplete = toggleTaskComplete;
window.handleDeleteTask = handleDeleteTask;
window.openTaskModal = openTaskModal;
window.markNotificationRead = markNotificationRead;
window.handleLogout = handleLogout;
