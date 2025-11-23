// Main Application Logic

// Global state
const state = {
    currentUser: null,
    socket: null,
    currentChat: null,
    users: [],
    messages: [],
    stories: [],
    onlineUsers: []
};

// DOM Elements
const elements = {
    authModal: document.getElementById('authModal'),
    appContainer: document.getElementById('app'),
    loginForm: document.getElementById('loginForm'),
    signupForm: document.getElementById('signupForm'),
    authError: document.getElementById('authError'),
    authTabs: document.querySelectorAll('.auth-tab'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    chatsList: document.getElementById('chatsList'),
    searchInput: document.getElementById('searchInput'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    chatWindow: document.getElementById('chatWindow'),
    storiesBtn: document.getElementById('storiesBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    menuBtn: document.getElementById('menuBtn')
};

// Initialize app
function init() {
    // Check if user is logged in
    const savedUser = storage.get('currentUser');
    if (savedUser) {
        state.currentUser = savedUser;
        showApp();
        connectSocket();
    } else {
        showAuthModal();
    }

    // Setup event listeners
    setupAuthListeners();
    setupAppListeners();

    // Request notification permission
    requestNotificationPermission();
}

// Show auth modal
function showAuthModal() {
    elements.authModal.classList.add('active');
    elements.appContainer.classList.remove('active');
}

// Show main app
function showApp() {
    elements.authModal.classList.remove('active');
    elements.appContainer.classList.add('active');

    // Update UI with user info
    elements.userName.textContent = state.currentUser.username;
    elements.userAvatar.src = state.currentUser.avatar || createAvatarWithInitials(state.currentUser.username);

    // Load data
    loadUsers();
    loadStories();
}

// Setup auth listeners
function setupAuthListeners() {
    // Tab switching
    elements.authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update active tab
            elements.authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding form
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.remove('active');
            });

            if (tabName === 'login') {
                elements.loginForm.classList.add('active');
            } else {
                elements.signupForm.classList.add('active');
            }

            // Clear error
            hideError();
        });
    });

    // Login form
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                state.currentUser = data.user;
                storage.set('currentUser', data.user);
                showApp();
                connectSocket();
                elements.loginForm.reset();
            } else {
                showError(data.error || 'Login failed');
            }
        } catch (error) {
            showError('Connection error. Please try again.');
        }
    });

    // Signup form
    elements.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                state.currentUser = data.user;
                storage.set('currentUser', data.user);
                showApp();
                connectSocket();
                elements.signupForm.reset();
            } else {
                showError(data.error || 'Signup failed');
            }
        } catch (error) {
            showError('Connection error. Please try again.');
        }
    });
}

// Setup app listeners
function setupAppListeners() {
    // Search
    elements.searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.toLowerCase();
        filterChats(query);
    }, 300));

    // Stories button
    elements.storiesBtn.addEventListener('click', () => {
        openUploadStoryModal();
    });

    // New chat button
    elements.newChatBtn.addEventListener('click', () => {
        showNewChatDialog();
    });

    // Menu button
    elements.menuBtn.addEventListener('click', () => {
        showMenu();
    });
}

// Connect to Socket.IO
function connectSocket() {
    state.socket = io();

    // Join with user ID
    state.socket.emit('user:join', state.currentUser.id);

    // Listen for events
    state.socket.on('user:online', (data) => {
        updateUserOnlineStatus(data.userId, data.online);
    });

    state.socket.on('users:online', (userIds) => {
        state.onlineUsers = userIds;
        updateAllOnlineStatuses();
    });

    state.socket.on('message:receive', (message) => {
        handleIncomingMessage(message);
    });

    state.socket.on('message:sent', (message) => {
        // Message sent confirmation
        console.log('Message sent:', message);
    });

    state.socket.on('message:read', (data) => {
        updateMessageStatus(data.messageId, 'read');
    });

    state.socket.on('message:pinned', (data) => {
        updateMessagePinStatus(data.messageId, data.pinned);
    });

    state.socket.on('message:deleted', (data) => {
        handleMessageDeleted(data);
    });

    state.socket.on('typing:show', (data) => {
        showTypingIndicator(data.userId);
    });

    state.socket.on('typing:hide', (data) => {
        hideTypingIndicator(data.userId);
    });

    state.socket.on('story:added', (story) => {
        addStoryToUI(story);
    });

    state.socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    state.socket.on('connect', () => {
        console.log('Connected to server');
    });
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        state.users = users.filter(u => u.id !== state.currentUser.id);
        renderChatsList();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load stories
async function loadStories() {
    try {
        const response = await fetch('/api/stories');
        const stories = await response.json();

        state.stories = stories;
        renderStories();
    } catch (error) {
        console.error('Error loading stories:', error);
    }
}

// Render chats list
function renderChatsList() {
    elements.chatsList.innerHTML = '';

    if (state.users.length === 0) {
        elements.chatsList.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
        <p>No users found</p>
        <p style="font-size: 12px; margin-top: 8px;">Invite friends to start chatting!</p>
      </div>
    `;
        return;
    }

    state.users.forEach(user => {
        const chatItem = createChatItem(user);
        elements.chatsList.appendChild(chatItem);
    });
}

// Create chat item
function createChatItem(user) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.userId = user.id;

    const isOnline = state.onlineUsers.includes(user.id);
    const avatar = user.avatar || createAvatarWithInitials(user.username);

    div.innerHTML = `
    <img src="${avatar}" alt="${escapeHtml(user.username)}" class="avatar">
    <div class="chat-item-content">
      <div class="chat-item-header">
        <span class="chat-item-name">${escapeHtml(user.username)}</span>
        <span class="chat-item-time"></span>
      </div>
      <div class="chat-item-message">
        <span class="user-status ${isOnline ? 'online' : ''}">${isOnline ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  `;

    div.addEventListener('click', () => {
        openChat(user);
    });

    return div;
}

// Open chat
function openChat(user) {
    state.currentChat = user;

    // Update active state
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-user-id="${user.id}"]`)?.classList.add('active');

    // Show chat window
    elements.welcomeScreen.style.display = 'none';
    elements.chatWindow.style.display = 'flex';

    // Update chat header
    document.getElementById('chatUserName').textContent = user.username;
    document.getElementById('chatUserAvatar').src = user.avatar || createAvatarWithInitials(user.username);

    const isOnline = state.onlineUsers.includes(user.id);
    const statusEl = document.getElementById('chatUserStatus');
    statusEl.textContent = isOnline ? 'Online' : 'Offline';
    statusEl.className = `user-status ${isOnline ? 'online' : ''}`;

    // Load messages
    loadMessages(user.id);
}

// Filter chats
function filterChats(query) {
    const chatItems = document.querySelectorAll('.chat-item');

    chatItems.forEach(item => {
        const name = item.querySelector('.chat-item-name').textContent.toLowerCase();
        if (name.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Update user online status
function updateUserOnlineStatus(userId, online) {
    if (online) {
        if (!state.onlineUsers.includes(userId)) {
            state.onlineUsers.push(userId);
        }
    } else {
        state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
    }

    // Update UI
    const chatItem = document.querySelector(`[data-user-id="${userId}"]`);
    if (chatItem) {
        const statusEl = chatItem.querySelector('.user-status');
        if (statusEl) {
            statusEl.textContent = online ? 'Online' : 'Offline';
            statusEl.className = `user-status ${online ? 'online' : ''}`;
        }
    }

    // Update chat header if this is the current chat
    if (state.currentChat && state.currentChat.id === userId) {
        const headerStatus = document.getElementById('chatUserStatus');
        if (headerStatus) {
            headerStatus.textContent = online ? 'Online' : 'Offline';
            headerStatus.className = `user-status ${online ? 'online' : ''}`;
        }
    }
}

// Update all online statuses
function updateAllOnlineStatuses() {
    state.users.forEach(user => {
        const isOnline = state.onlineUsers.includes(user.id);
        updateUserOnlineStatus(user.id, isOnline);
    });
}

// Show error message
function showError(message) {
    elements.authError.textContent = message;
    elements.authError.classList.add('active');

    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    elements.authError.classList.remove('active');
}

// Show new chat dialog
function showNewChatDialog() {
    // For now, just scroll to search
    elements.searchInput.focus();
}

// Show menu
function showMenu() {
    const menu = confirm('Logout?');
    if (menu) {
        logout();
    }
}

// Logout
function logout() {
    storage.remove('currentUser');
    state.currentUser = null;
    state.currentChat = null;

    if (state.socket) {
        state.socket.disconnect();
    }

    showAuthModal();
    elements.chatsList.innerHTML = '';
    elements.welcomeScreen.style.display = 'flex';
    elements.chatWindow.style.display = 'none';
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
