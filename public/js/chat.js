// Chat Functionality

// DOM Elements
const chatElements = {
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    attachBtn: document.getElementById('attachBtn'),
    typingIndicator: document.getElementById('typingIndicator'),
    pinnedMessages: document.getElementById('pinnedMessages'),
    pinnedMessagesList: document.getElementById('pinnedMessagesList'),
    contextMenu: document.getElementById('contextMenu')
};

let typingTimeout = null;
let currentContextMessage = null;

// Setup chat event listeners
function setupChatListeners() {
    // Send message on button click
    chatElements.sendBtn.addEventListener('click', sendMessage);

    // Send message on Enter key
    chatElements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Typing indicator
    chatElements.messageInput.addEventListener('input', () => {
        if (!state.currentChat) return;

        // Emit typing start
        state.socket.emit('typing:start', {
            senderId: state.currentUser.id,
            receiverId: state.currentChat.id
        });

        // Clear previous timeout
        clearTimeout(typingTimeout);

        // Set timeout to stop typing
        typingTimeout = setTimeout(() => {
            state.socket.emit('typing:stop', {
                senderId: state.currentUser.id,
                receiverId: state.currentChat.id
            });
        }, 1000);
    });

    // Attach button
    chatElements.attachBtn.addEventListener('click', () => {
        selectAndUploadMedia();
    });

    // Context menu
    document.addEventListener('click', (e) => {
        if (!chatElements.contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    // Context menu actions
    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            handleContextMenuAction(action);
        });
    });
}

// Load messages for a chat
async function loadMessages(friendId) {
    try {
        const response = await fetch(`/api/messages/${state.currentUser.id}/${friendId}`);
        const messages = await response.json();

        state.messages = messages;
        renderMessages();
        scrollToBottom();

        // Mark messages as read
        markMessagesAsRead(friendId);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Render messages
function renderMessages() {
    chatElements.messagesContainer.innerHTML = '';

    // Filter out messages deleted for current user
    const visibleMessages = state.messages.filter(msg => {
        return !msg.deletedFor || !msg.deletedFor.includes(state.currentUser.id);
    });

    if (visibleMessages.length === 0) {
        chatElements.messagesContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <p>No messages yet</p>
        <p style="font-size: 12px; margin-top: 8px;">Send a message to start the conversation</p>
      </div>
    `;
        return;
    }

    visibleMessages.forEach(message => {
        const messageEl = createMessageElement(message);
        chatElements.messagesContainer.appendChild(messageEl);
    });

    // Update pinned messages
    updatePinnedMessages();
}

// Create message element
function createMessageElement(message) {
    const div = document.createElement('div');
    const isSent = message.senderId === state.currentUser.id;

    div.className = `message ${isSent ? 'sent' : 'received'} ${message.pinned ? 'pinned' : ''} ${message.deleted ? 'deleted' : ''}`;
    div.dataset.messageId = message.id;

    let content = '';

    // Media
    if (message.mediaUrl) {
        const isVideo = message.type === 'video';
        content += isVideo
            ? `<video src="${message.mediaUrl}" class="message-media" controls></video>`
            : `<img src="${message.mediaUrl}" class="message-media" alt="Media">`;
    }

    // Text content
    if (message.content) {
        const linkedContent = linkify(escapeHtml(message.content));
        content += `<div class="message-content">${linkedContent}</div>`;
    }

    // Footer with time and status
    const time = formatTime(message.timestamp);
    let statusIcon = '';

    if (isSent) {
        if (message.status === 'read') {
            statusIcon = `
        <svg class="message-status read" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          <path d="M10.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 6.646-6.647a.5.5 0 0 1 .708 0z"/>
        </svg>
      `;
        } else if (message.status === 'delivered') {
            statusIcon = `
        <svg class="message-status" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          <path d="M10.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 6.646-6.647a.5.5 0 0 1 .708 0z"/>
        </svg>
      `;
        } else {
            statusIcon = `
        <svg class="message-status" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
        </svg>
      `;
        }
    }

    content += `
    <div class="message-footer">
      <span>${time}</span>
      ${statusIcon}
    </div>
  `;

    div.innerHTML = content;

    // Right-click context menu
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, message);
    });

    return div;
}

// Send message
function sendMessage() {
    const content = chatElements.messageInput.value.trim();

    if (!content || !state.currentChat) return;

    const message = {
        senderId: state.currentUser.id,
        receiverId: state.currentChat.id,
        content,
        type: 'text'
    };

    // Emit to server
    state.socket.emit('message:send', message);

    // Clear input
    chatElements.messageInput.value = '';

    // Stop typing indicator
    state.socket.emit('typing:stop', {
        senderId: state.currentUser.id,
        receiverId: state.currentChat.id
    });
}

// Handle incoming message
function handleIncomingMessage(message) {
    // Add to messages array
    state.messages.push(message);

    // If message is for current chat, render it
    if (state.currentChat &&
        (message.senderId === state.currentChat.id || message.receiverId === state.currentChat.id)) {
        const messageEl = createMessageElement(message);
        chatElements.messagesContainer.appendChild(messageEl);
        scrollToBottom();

        // Mark as read if chat is open
        if (message.senderId === state.currentChat.id) {
            state.socket.emit('message:read', { messageId: message.id });
        }
    } else {
        // Show notification
        const sender = state.users.find(u => u.id === message.senderId);
        if (sender) {
            showNotification(sender.username, message.content, sender.avatar);
            playNotificationSound();
        }
    }

    // Update chat list preview
    updateChatPreview(message);
}

// Mark messages as read
function markMessagesAsRead(friendId) {
    const unreadMessages = state.messages.filter(msg =>
        msg.senderId === friendId &&
        msg.receiverId === state.currentUser.id &&
        msg.status !== 'read'
    );

    unreadMessages.forEach(msg => {
        state.socket.emit('message:read', { messageId: msg.id });
    });
}

// Update message status
function updateMessageStatus(messageId, status) {
    const message = state.messages.find(m => m.id === messageId);
    if (message) {
        message.status = status;

        // Update UI
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            const statusEl = messageEl.querySelector('.message-status');
            if (statusEl && status === 'read') {
                statusEl.classList.add('read');
            }
        }
    }
}

// Show typing indicator
function showTypingIndicator(userId) {
    if (state.currentChat && state.currentChat.id === userId) {
        chatElements.typingIndicator.style.display = 'block';
        scrollToBottom();
    }
}

// Hide typing indicator
function hideTypingIndicator(userId) {
    if (state.currentChat && state.currentChat.id === userId) {
        chatElements.typingIndicator.style.display = 'none';
    }
}

// Scroll to bottom of messages
function scrollToBottom() {
    setTimeout(() => {
        chatElements.messagesContainer.scrollTop = chatElements.messagesContainer.scrollHeight;
    }, 100);
}

// Show context menu
function showContextMenu(event, message) {
    currentContextMessage = message;

    const menu = chatElements.contextMenu;
    menu.style.display = 'block';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';

    // Show/hide "Delete for everyone" based on sender
    const deleteForEveryoneBtn = menu.querySelector('[data-action="deleteForEveryone"]');
    if (message.senderId === state.currentUser.id) {
        deleteForEveryoneBtn.style.display = 'flex';
    } else {
        deleteForEveryoneBtn.style.display = 'none';
    }

    // Update pin text
    const pinBtn = menu.querySelector('[data-action="pin"]');
    pinBtn.querySelector('span').textContent = message.pinned ? 'Unpin Message' : 'Pin Message';
}

// Hide context menu
function hideContextMenu() {
    chatElements.contextMenu.style.display = 'none';
    currentContextMessage = null;
}

// Handle context menu actions
function handleContextMenuAction(action) {
    if (!currentContextMessage) return;

    switch (action) {
        case 'pin':
            togglePinMessage(currentContextMessage.id);
            break;
        case 'delete':
            deleteMessage(currentContextMessage.id, false);
            break;
        case 'deleteForEveryone':
            deleteMessage(currentContextMessage.id, true);
            break;
    }

    hideContextMenu();
}

// Toggle pin message
function togglePinMessage(messageId) {
    state.socket.emit('message:pin', { messageId });
}

// Update message pin status
function updateMessagePinStatus(messageId, pinned) {
    const message = state.messages.find(m => m.id === messageId);
    if (message) {
        message.pinned = pinned;

        // Update UI
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            if (pinned) {
                messageEl.classList.add('pinned');
            } else {
                messageEl.classList.remove('pinned');
            }
        }

        updatePinnedMessages();
    }
}

// Update pinned messages section
function updatePinnedMessages() {
    const pinnedMsgs = state.messages.filter(m => m.pinned &&
        ((m.senderId === state.currentUser.id && m.receiverId === state.currentChat.id) ||
            (m.senderId === state.currentChat.id && m.receiverId === state.currentUser.id))
    );

    if (pinnedMsgs.length > 0) {
        chatElements.pinnedMessages.style.display = 'block';
        chatElements.pinnedMessagesList.innerHTML = pinnedMsgs
            .map(m => `<div>${truncateText(m.content || 'Media', 50)}</div>`)
            .join('');
    } else {
        chatElements.pinnedMessages.style.display = 'none';
    }
}

// Delete message
function deleteMessage(messageId, deleteForEveryone) {
    state.socket.emit('message:delete', {
        messageId,
        userId: state.currentUser.id,
        deleteForEveryone
    });
}

// Handle message deleted
function handleMessageDeleted(data) {
    const message = state.messages.find(m => m.id === data.messageId);

    if (message) {
        if (data.forEveryone) {
            message.deleted = true;
            message.content = 'This message was deleted';

            // Update UI
            const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
            if (messageEl) {
                messageEl.classList.add('deleted');
                messageEl.querySelector('.message-content').textContent = 'This message was deleted';
            }
        } else {
            // Remove from UI
            const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
            if (messageEl) {
                messageEl.remove();
            }
        }
    }
}

// Select and upload media
async function selectAndUploadMedia() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!validateFile(file, ['image', 'video'])) {
            alert('Please select an image or video file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'media');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Send message with media
                const message = {
                    senderId: state.currentUser.id,
                    receiverId: state.currentChat.id,
                    content: '',
                    type: file.type.startsWith('video') ? 'video' : 'image',
                    mediaUrl: data.url
                };

                state.socket.emit('message:send', message);
            } else {
                alert('Upload failed: ' + data.error);
            }
        } catch (error) {
            alert('Upload error. Please try again.');
        }
    };

    input.click();
}

// Update chat preview in sidebar
function updateChatPreview(message) {
    const chatItem = document.querySelector(`[data-user-id="${message.senderId}"]`) ||
        document.querySelector(`[data-user-id="${message.receiverId}"]`);

    if (chatItem) {
        const timeEl = chatItem.querySelector('.chat-item-time');
        const messageEl = chatItem.querySelector('.chat-item-message');

        if (timeEl) timeEl.textContent = formatTime(message.timestamp);
        if (messageEl) {
            const preview = message.content || (message.mediaUrl ? '📷 Photo' : '');
            messageEl.innerHTML = `<span>${truncateText(preview, 30)}</span>`;
        }
    }
}

// Initialize chat listeners
setupChatListeners();
