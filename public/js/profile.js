// Profile Management - Version 2.0

// DOM Elements
const profileElements = {
    profileModal: document.getElementById('profileModal'),
    userProfileViewer: document.getElementById('userProfileViewer'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    saveProfileBtn: document.getElementById('saveProfileBtn'),
    cancelProfileBtn: document.getElementById('cancelProfileBtn'),
    avatarUploadInput: document.getElementById('avatarUploadInput'),
    avatarPreview: document.getElementById('avatarPreview'),
    uploadAvatarBtn: document.getElementById('uploadAvatarBtn'),
    profileUsername: document.getElementById('profileUsername'),
    profileEmail: document.getElementById('profileEmail'),
    profileBio: document.getElementById('profileBio'),
    profileStatus: document.getElementById('profileStatus'),
    bioCharCount: document.getElementById('bioCharCount'),
    changePasswordBtn: document.getElementById('changePasswordBtn'),
    passwordModal: document.getElementById('passwordModal'),
    changePasswordForm: document.getElementById('changePasswordForm'),
    closePasswordModal: document.getElementById('closePasswordModal')
};

let currentProfile = null;
let isEditingProfile = false;

// Open profile modal (own profile)
function openProfileModal() {
    if (!state.currentUser) return;

    loadUserProfile(state.currentUser.id, true);
}

// Load user profile
async function loadUserProfile(userId, isOwnProfile = false) {
    try {
        const response = await fetch(`/api/profile/${userId}`);
        const profile = await response.json();

        if (response.ok) {
            currentProfile = profile;

            if (isOwnProfile) {
                displayOwnProfile(profile);
                profileElements.profileModal.classList.add('active');
            } else {
                displayUserProfile(profile);
                profileElements.userProfileViewer.classList.add('active');
            }
        } else {
            showToast('Error loading profile', 'error');
        }
    } catch (error) {
        console.error('Load profile error:', error);
        showToast('Failed to load profile', 'error');
    }
}

// Display own profile
function displayOwnProfile(profile) {
    if (!profileElements.profileModal) return;

    // Update profile display
    document.getElementById('modalUserAvatar').src = profile.avatar || createAvatarWithInitials(profile.username);
    document.getElementById('modalUsername').textContent = profile.username;
    document.getElementById('modalEmail').textContent = profile.email;
    document.getElementById('modalBio').textContent = profile.bio || 'No bio yet';
    document.getElementById('modalStatus').textContent = profile.status || 'Hey there! I am using Friend Chat';

    // Update edit form
    if (profileElements.profileUsername) profileElements.profileUsername.value = profile.username;
    if (profileElements.profileEmail) profileElements.profileEmail.value = profile.email;
    if (profileElements.profileBio) {
        profileElements.profileBio.value = profile.bio || '';
        updateBioCharCount();
    }
    if (profileElements.profileStatus) profileElements.profileStatus.value = profile.status || '';

    // Show view mode by default
    setProfileEditMode(false);
}

// Display other user's profile
function displayUserProfile(profile) {
    if (!profileElements.userProfileViewer) return;

    document.getElementById('viewUserAvatar').src = profile.avatar || createAvatarWithInitials(profile.username);
    document.getElementById('viewUsername').textContent = profile.username;
    document.getElementById('viewEmail').textContent = profile.email;
    document.getElementById('viewBio').textContent = profile.bio || 'No bio';
    document.getElementById('viewStatus').textContent = profile.status || '';

    // Show last seen
    const lastSeenText = profile.lastSeen ? formatLastSeen(profile.lastSeen) : 'Unknown';
    document.getElementById('viewLastSeen').textContent = `Last seen: ${lastSeenText}`;
}

// Set profile edit mode
function setProfileEditMode(editing) {
    isEditingProfile = editing;

    const viewMode = document.getElementById('profileViewMode');
    const editMode = document.getElementById('profileEditMode');

    if (editing) {
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
    } else {
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
    }
}

// Save profile changes
async function saveProfile() {
    if (!state.currentUser) return;

    const username = profileElements.profileUsername.value.trim();
    const bio = profileElements.profileBio.value.trim();
    const status = profileElements.profileStatus.value.trim();

    if (!username) {
        showToast('Username cannot be empty', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/profile/${state.currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, bio, status })
        });

        const data = await response.json();

        if (response.ok) {
            // Update current user
            state.currentUser.username = data.user.username;
            state.currentUser.bio = data.user.bio;
            state.currentUser.status = data.user.status;

            // Update UI
            elements.userName.textContent = username;

            // Reload profile
            loadUserProfile(state.currentUser.id, true);

            showToast('Profile updated successfully!', 'success');
            setProfileEditMode(false);
        } else {
            showToast(data.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Save profile error:', error);
        showToast('Failed to update profile', 'error');
    }
}

// Upload avatar
async function uploadAvatar(file) {
    if (!file) return;

    // Validate file
    if (!validateFile(file, ['image'])) {
        showToast('Please select an image file', 'error');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showToast('Image size must be less than 2MB', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', state.currentUser.id);
    formData.append('type', 'avatars');

    try {
        // Show loading
        showToast('Uploading avatar...', 'info');

        const response = await fetch('/api/profile/avatar', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // Update avatar in UI
            state.currentUser.avatar = data.url;
            elements.userAvatar.src = data.url;
            document.getElementById('modalUserAvatar').src = data.url;

            showToast('Avatar updated successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to upload avatar', 'error');
        }
    } catch (error) {
        console.error('Upload avatar error:', error);
        showToast('Failed to upload avatar', 'error');
    }
}

// Change password
async function changePassword(currentPassword, newPassword) {
    if (!state.currentUser) return;

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch('/api/user/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.currentUser.id,
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Password changed successfully!', 'success');
            closePasswordModal();
            profileElements.changePasswordForm.reset();
        } else {
            showToast(data.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Change password error:', error);
        showToast('Failed to change password', 'error');
    }
}

// Update bio character count
function updateBioCharCount() {
    if (!profileElements.profileBio || !profileElements.bioCharCount) return;

    const length = profileElements.profileBio.value.length;
    const maxLength = 150;
    profileElements.bioCharCount.textContent = `${length}/${maxLength}`;

    if (length > maxLength) {
        profileElements.bioCharCount.style.color = 'var(--error)';
    } else {
        profileElements.bioCharCount.style.color = 'var(--text-secondary)';
    }
}

// Format last seen
function formatLastSeen(lastSeen) {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diff = now - lastSeenDate;

    // Less than 5 minutes = online
    if (diff < 5 * 60 * 1000) {
        return 'Online';
    }

    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // More than 24 hours
    return lastSeenDate.toLocaleDateString();
}

// Close profile modal
function closeProfileModal() {
    if (profileElements.profileModal) {
        profileElements.profileModal.classList.remove('active');
        setProfileEditMode(false);
    }
}

// Close user profile viewer
function closeUserProfileViewer() {
    if (profileElements.userProfileViewer) {
        profileElements.userProfileViewer.classList.remove('active');
    }
}

// Close password modal
function closePasswordModal() {
    if (profileElements.passwordModal) {
        profileElements.passwordModal.classList.remove('active');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Setup profile event listeners
function setupProfileListeners() {
    // Edit profile button
    if (profileElements.editProfileBtn) {
        profileElements.editProfileBtn.addEventListener('click', () => {
            setProfileEditMode(true);
        });
    }

    // Save profile button
    if (profileElements.saveProfileBtn) {
        profileElements.saveProfileBtn.addEventListener('click', saveProfile);
    }

    // Cancel edit button
    if (profileElements.cancelProfileBtn) {
        profileElements.cancelProfileBtn.addEventListener('click', () => {
            setProfileEditMode(false);
            if (currentProfile) {
                displayOwnProfile(currentProfile);
            }
        });
    }

    // Upload avatar button
    if (profileElements.uploadAvatarBtn) {
        profileElements.uploadAvatarBtn.addEventListener('click', () => {
            profileElements.avatarUploadInput.click();
        });
    }

    // Avatar file input
    if (profileElements.avatarUploadInput) {
        profileElements.avatarUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (profileElements.avatarPreview) {
                        profileElements.avatarPreview.src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);

                // Upload
                uploadAvatar(file);
            }
        });
    }

    // Bio character count
    if (profileElements.profileBio) {
        profileElements.profileBio.addEventListener('input', updateBioCharCount);
    }

    // Change password button
    if (profileElements.changePasswordBtn) {
        profileElements.changePasswordBtn.addEventListener('click', () => {
            profileElements.passwordModal.classList.add('active');
        });
    }

    // Close password modal
    if (profileElements.closePasswordModal) {
        profileElements.closePasswordModal.addEventListener('click', closePasswordModal);
    }

    // Change password form
    if (profileElements.changePasswordForm) {
        profileElements.changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }

            changePassword(currentPassword, newPassword);
        });
    }

    // Close modals on backdrop click
    [profileElements.profileModal, profileElements.userProfileViewer, profileElements.passwordModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });
}

// Initialize profile system
setupProfileListeners();

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        openProfileModal,
        loadUserProfile,
        closeProfileModal,
        closeUserProfileViewer
    };
}
