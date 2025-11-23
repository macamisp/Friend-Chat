// Stories Functionality

// DOM Elements
const storyElements = {
    storiesContainer: document.getElementById('storiesContainer'),
    storyViewer: document.getElementById('storyViewer'),
    storyMedia: document.getElementById('storyMedia'),
    storyUserName: document.getElementById('storyUserName'),
    storyUserAvatar: document.getElementById('storyUserAvatar'),
    storyTime: document.getElementById('storyTime'),
    storyProgress: document.getElementById('storyProgress'),
    closeStoryBtn: document.getElementById('closeStoryBtn'),
    prevStory: document.getElementById('prevStory'),
    nextStory: document.getElementById('nextStory'),
    uploadStoryModal: document.getElementById('uploadStoryModal'),
    uploadArea: document.getElementById('uploadArea'),
    storyFileInput: document.getElementById('storyFileInput'),
    uploadStoryBtn: document.getElementById('uploadStoryBtn'),
    cancelStoryBtn: document.getElementById('cancelStoryBtn')
};

let currentStoryIndex = 0;
let currentUserStories = [];
let storyProgressInterval = null;
let selectedStoryFile = null;

// Setup stories event listeners
function setupStoriesListeners() {
    // Upload area click
    storyElements.uploadArea.addEventListener('click', () => {
        storyElements.storyFileInput.click();
    });

    // File input change
    storyElements.storyFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleStoryFileSelect(file);
        }
    });

    // Drag and drop
    storyElements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        storyElements.uploadArea.style.borderColor = 'var(--primary)';
    });

    storyElements.uploadArea.addEventListener('dragleave', () => {
        storyElements.uploadArea.style.borderColor = 'var(--border-color)';
    });

    storyElements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        storyElements.uploadArea.style.borderColor = 'var(--border-color)';

        const file = e.dataTransfer.files[0];
        if (file) {
            handleStoryFileSelect(file);
        }
    });

    // Upload button
    storyElements.uploadStoryBtn.addEventListener('click', uploadStory);

    // Cancel button
    storyElements.cancelStoryBtn.addEventListener('click', closeUploadStoryModal);

    // Close story viewer
    storyElements.closeStoryBtn.addEventListener('click', closeStoryViewer);

    // Story navigation
    storyElements.prevStory.addEventListener('click', showPreviousStory);
    storyElements.nextStory.addEventListener('click', showNextStory);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (storyElements.storyViewer.classList.contains('active')) {
            if (e.key === 'ArrowLeft') showPreviousStory();
            if (e.key === 'ArrowRight') showNextStory();
            if (e.key === 'Escape') closeStoryViewer();
        }
    });
}

// Render stories
function renderStories() {
    storyElements.storiesContainer.innerHTML = '';

    // Add "Your Story" button
    const yourStoryBtn = createYourStoryButton();
    storyElements.storiesContainer.appendChild(yourStoryBtn);

    // Group stories by user
    const storiesByUser = {};
    state.stories.forEach(story => {
        if (!storiesByUser[story.userId]) {
            storiesByUser[story.userId] = [];
        }
        storiesByUser[story.userId].push(story);
    });

    // Create story items for each user
    Object.keys(storiesByUser).forEach(userId => {
        const user = state.users.find(u => u.id === userId);
        if (user) {
            const storyItem = createStoryItem(user, storiesByUser[userId]);
            storyElements.storiesContainer.appendChild(storyItem);
        }
    });
}

// Create "Your Story" button
function createYourStoryButton() {
    const div = document.createElement('div');
    div.className = 'story-item';

    const userStories = state.stories.filter(s => s.userId === state.currentUser.id);
    const hasStory = userStories.length > 0;

    const avatar = state.currentUser.avatar || createAvatarWithInitials(state.currentUser.username);

    div.innerHTML = `
    <div class="story-avatar-container">
      <img src="${avatar}" alt="Your Story" class="story-avatar">
      ${!hasStory ? '<div class="story-add-btn">+</div>' : ''}
    </div>
    <div class="story-name">Your Story</div>
  `;

    div.addEventListener('click', () => {
        if (hasStory) {
            viewStories(state.currentUser, userStories);
        } else {
            openUploadStoryModal();
        }
    });

    return div;
}

// Create story item
function createStoryItem(user, stories) {
    const div = document.createElement('div');
    div.className = 'story-item';

    const avatar = user.avatar || createAvatarWithInitials(user.username);
    const latestStory = stories[stories.length - 1];
    const timeAgo = formatStoryTime(latestStory.createdAt);

    div.innerHTML = `
    <div class="story-avatar-container">
      <img src="${avatar}" alt="${escapeHtml(user.username)}" class="story-avatar">
    </div>
    <div class="story-name">${escapeHtml(user.username)}</div>
  `;

    div.addEventListener('click', () => {
        viewStories(user, stories);
    });

    return div;
}

// Open upload story modal
function openUploadStoryModal() {
    storyElements.uploadStoryModal.classList.add('active');
    selectedStoryFile = null;
    storyElements.uploadStoryBtn.disabled = true;
    storyElements.uploadArea.classList.remove('has-file');
    storyElements.uploadArea.querySelector('p').textContent = 'Click or drag image/video here';
}

// Close upload story modal
function closeUploadStoryModal() {
    storyElements.uploadStoryModal.classList.remove('active');
    storyElements.storyFileInput.value = '';
    selectedStoryFile = null;
}

// Handle story file select
function handleStoryFileSelect(file) {
    if (!validateFile(file, ['image', 'video'])) {
        alert('Please select an image or video file');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    selectedStoryFile = file;
    storyElements.uploadStoryBtn.disabled = false;
    storyElements.uploadArea.classList.add('has-file');
    storyElements.uploadArea.querySelector('p').textContent = `Selected: ${file.name}`;
}

// Upload story
async function uploadStory() {
    if (!selectedStoryFile) return;

    storyElements.uploadStoryBtn.disabled = true;
    storyElements.uploadStoryBtn.textContent = 'Uploading...';

    try {
        // Upload file
        const formData = new FormData();
        formData.append('file', selectedStoryFile);
        formData.append('type', 'stories');

        const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
            throw new Error(uploadData.error || 'Upload failed');
        }

        // Create story
        const storyData = {
            userId: state.currentUser.id,
            mediaUrl: uploadData.url,
            type: selectedStoryFile.type.startsWith('video') ? 'video' : 'image'
        };

        const storyResponse = await fetch('/api/stories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storyData)
        });

        const story = await storyResponse.json();

        if (storyResponse.ok) {
            // Add to state
            state.stories.push(story);

            // Notify other users
            state.socket.emit('story:new', story);

            // Update UI
            renderStories();

            // Close modal
            closeUploadStoryModal();

            // Show success message
            alert('Story uploaded successfully!');
        } else {
            throw new Error(story.error || 'Failed to create story');
        }
    } catch (error) {
        alert('Error uploading story: ' + error.message);
    } finally {
        storyElements.uploadStoryBtn.disabled = false;
        storyElements.uploadStoryBtn.textContent = 'Upload';
    }
}

// View stories
function viewStories(user, stories) {
    currentUserStories = stories;
    currentStoryIndex = 0;

    // Update user info
    const avatar = user.avatar || createAvatarWithInitials(user.username);
    storyElements.storyUserAvatar.src = avatar;
    storyElements.storyUserName.textContent = user.username;

    // Show viewer
    storyElements.storyViewer.classList.add('active');

    // Show first story
    showStory(0);
}

// Show story at index
function showStory(index) {
    if (index < 0 || index >= currentUserStories.length) {
        closeStoryViewer();
        return;
    }

    currentStoryIndex = index;
    const story = currentUserStories[index];

    // Update time
    storyElements.storyTime.textContent = formatStoryTime(story.createdAt);

    // Update media
    if (story.type === 'video') {
        storyElements.storyMedia.outerHTML = `<video id="storyMedia" src="${story.mediaUrl}" class="story-media" autoplay></video>`;
    } else {
        storyElements.storyMedia.outerHTML = `<img id="storyMedia" src="${story.mediaUrl}" alt="Story">`;
    }

    // Re-get element reference
    storyElements.storyMedia = document.getElementById('storyMedia');

    // Start progress
    startStoryProgress();

    // Auto-advance after 5 seconds (or video duration)
    const duration = story.type === 'video' ? null : 5000;
    if (duration) {
        setTimeout(() => {
            showNextStory();
        }, duration);
    } else {
        // For videos, advance when video ends
        storyElements.storyMedia.addEventListener('ended', showNextStory);
    }
}

// Start story progress animation
function startStoryProgress() {
    storyElements.storyProgress.style.width = '0%';

    let progress = 0;
    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;

    clearInterval(storyProgressInterval);

    storyProgressInterval = setInterval(() => {
        progress += increment;
        storyElements.storyProgress.style.width = progress + '%';

        if (progress >= 100) {
            clearInterval(storyProgressInterval);
        }
    }, interval);
}

// Show previous story
function showPreviousStory() {
    clearInterval(storyProgressInterval);
    showStory(currentStoryIndex - 1);
}

// Show next story
function showNextStory() {
    clearInterval(storyProgressInterval);
    showStory(currentStoryIndex + 1);
}

// Close story viewer
function closeStoryViewer() {
    clearInterval(storyProgressInterval);
    storyElements.storyViewer.classList.remove('active');
    currentUserStories = [];
    currentStoryIndex = 0;
}

// Add story to UI (when received from socket)
function addStoryToUI(story) {
    // Check if story already exists
    const exists = state.stories.find(s => s.id === story.id);
    if (!exists) {
        state.stories.push(story);
        renderStories();
    }
}

// Clean up expired stories periodically
setInterval(() => {
    const now = new Date();
    state.stories = state.stories.filter(story => {
        return !isStoryExpired(story.createdAt);
    });
    renderStories();
}, 60000); // Check every minute

// Initialize stories listeners
setupStoriesListeners();
