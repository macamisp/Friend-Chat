require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create necessary directories
const dirs = ['uploads', 'uploads/stories', 'uploads/avatars', 'uploads/media'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'media';
    const uploadPath = `uploads/${type}`;
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Connected users
const connectedUsers = new Map();

// API Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password: hashedPassword,
        avatar: '/uploads/avatars/default.png',
        status: 'Hey there! I am using Friend Chat'
      }])
      .select()
      .single();

    if (error) throw error;

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (for friends list)
app.get('/api/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, avatar, status, bio, profile_picture, last_seen, created_at');

    if (error) throw error;

    // Format users with profile pictures and online status
    const formattedUsers = (users || []).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.profile_picture || user.avatar,
      status: user.status,
      bio: user.bio,
      lastSeen: user.last_seen,
      online: user.last_seen && (new Date() - new Date(user.last_seen)) < 5 * 60 * 1000,
      createdAt: user.created_at
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages between two users
app.get('/api/messages/:userId/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Convert snake_case to camelCase for frontend compatibility
    const formattedMessages = (messages || []).map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      content: msg.content,
      type: msg.type,
      mediaUrl: msg.media_url,
      timestamp: msg.timestamp,
      status: msg.status,
      pinned: msg.pinned,
      deleted: msg.deleted,
      deletedFor: msg.deleted_for || []
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/${req.file.path.replace(/\\/g, '/')}`;
    res.json({ url: fileUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stories
app.get('/api/stories', async (req, res) => {
  try {
    // Get stories that haven't expired (created within last 24 hours)
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert snake_case to camelCase
    const formattedStories = (stories || []).map(story => ({
      id: story.id,
      userId: story.user_id,
      mediaUrl: story.media_url,
      type: story.type,
      views: story.views || [],
      createdAt: story.created_at
    }));

    res.json(formattedStories);
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add story
app.post('/api/stories', async (req, res) => {
  try {
    const { userId, mediaUrl, type } = req.body;

    const { data: newStory, error } = await supabase
      .from('stories')
      .insert([{
        user_id: userId,
        media_url: mediaUrl,
        type,
        views: []
      }])
      .select()
      .single();

    if (error) throw error;

    // Convert to camelCase
    const formattedStory = {
      id: newStory.id,
      userId: newStory.user_id,
      mediaUrl: newStory.media_url,
      type: newStory.type,
      views: newStory.views || [],
      createdAt: newStory.created_at
    };

    res.json(formattedStory);
  } catch (error) {
    console.error('Add story error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's own stories
app.get('/api/stories/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert snake_case to camelCase
    const formattedStories = (stories || []).map(story => ({
      id: story.id,
      userId: story.user_id,
      mediaUrl: story.media_url,
      type: story.type,
      views: story.views || [],
      createdAt: story.created_at,
      expiresAt: story.expires_at
    }));

    res.json(formattedStories);
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete story
app.delete('/api/stories/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { userId } = req.body;

    // Get story to verify ownership
    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .single();

    if (fetchError) throw fetchError;

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Verify ownership
    if (story.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this story' });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (deleteError) throw deleteError;

    // Try to delete file from filesystem (optional, may fail if file doesn't exist)
    if (story.media_url) {
      const filePath = path.join(__dirname, 'public', story.media_url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error deleting file:', err);
          // Don't fail the request if file deletion fails
        }
      }
    }

    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== VERSION 2.0 - PROFILE & SEARCH ENDPOINTS =====

// Get user profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, avatar, status, bio, profile_picture, last_seen, privacy_settings, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Format response
    const profile = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.profile_picture || user.avatar,
      status: user.status,
      bio: user.bio,
      lastSeen: user.last_seen,
      privacySettings: user.privacy_settings,
      createdAt: user.created_at
    };

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, bio, status, privacySettings } = req.body;

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (bio !== undefined) updates.bio = bio.substring(0, 150); // Max 150 chars
    if (status !== undefined) updates.status = status;
    if (privacySettings !== undefined) updates.privacy_settings = privacySettings;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, username, email, avatar, status, bio, profile_picture, privacy_settings')
      .single();

    if (error) throw error;

    const profile = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.profile_picture || updatedUser.avatar,
      status: updatedUser.status,
      bio: updatedUser.bio,
      privacySettings: updatedUser.privacy_settings
    };

    res.json({ success: true, user: profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload profile avatar
app.post('/api/profile/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.body;
    const avatarUrl = `/${req.file.path.replace(/\\/g, '/')}`;

    // Update user's profile_picture in database
    const { error } = await supabase
      .from('users')
      .update({ profile_picture: avatarUrl })
      .eq('id', userId);

    if (error) throw error;

    res.json({ success: true, url: avatarUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search users
app.get('/api/search/users', async (req, res) => {
  try {
    const { q: query, filter = 'all' } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json([]);
    }

    let queryBuilder = supabase
      .from('users')
      .select('id, username, email, avatar, bio, profile_picture, status, last_seen');

    // Search by username or email using full-text search
    queryBuilder = queryBuilder.or(`username.ilike.%${query}%,email.ilike.%${query}%`);

    // Apply filters
    if (filter === 'online') {
      // Users active in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      queryBuilder = queryBuilder.gte('last_seen', fiveMinutesAgo);
    }

    queryBuilder = queryBuilder.limit(20);

    const { data: users, error } = await queryBuilder;

    if (error) throw error;

    // Format results
    const results = (users || []).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.profile_picture || user.avatar,
      bio: user.bio,
      status: user.status,
      online: user.last_seen && (new Date() - new Date(user.last_seen)) < 5 * 60 * 1000
    }));

    res.json(results);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Change password
app.put('/api/user/password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get current user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins
  socket.on('user:join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;

    // Broadcast online status
    io.emit('user:online', { userId, online: true });

    // Send list of online users
    const onlineUsers = Array.from(connectedUsers.keys());
    socket.emit('users:online', onlineUsers);
  });

  // Send message
  socket.on('message:send', async (data) => {
    try {
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: data.senderId,
          receiver_id: data.receiverId,
          content: data.content,
          type: data.type || 'text',
          media_url: data.mediaUrl || null,
          status: 'sent',
          pinned: false,
          deleted: false,
          deleted_for: []
        }])
        .select()
        .single();

      if (error) throw error;

      // Format message
      const formattedMessage = {
        id: newMessage.id,
        senderId: newMessage.sender_id,
        receiverId: newMessage.receiver_id,
        content: newMessage.content,
        type: newMessage.type,
        mediaUrl: newMessage.media_url,
        timestamp: newMessage.timestamp,
        status: newMessage.status,
        pinned: newMessage.pinned,
        deleted: newMessage.deleted,
        deletedFor: newMessage.deleted_for || []
      };

      // Send to receiver if online
      const receiverSocketId = connectedUsers.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:receive', formattedMessage);

        // Update status to delivered
        await supabase
          .from('messages')
          .update({ status: 'delivered' })
          .eq('id', newMessage.id);

        formattedMessage.status = 'delivered';
      }

      // Confirm to sender
      socket.emit('message:sent', formattedMessage);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing:start', (data) => {
    const receiverSocketId = connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:show', { userId: data.senderId });
    }
  });

  socket.on('typing:stop', (data) => {
    const receiverSocketId = connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:hide', { userId: data.senderId });
    }
  });

  // Message read
  socket.on('message:read', async (data) => {
    try {
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('id', data.messageId);

      // Get message to find sender
      const { data: message } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', data.messageId)
        .single();

      if (message) {
        const senderSocketId = connectedUsers.get(message.sender_id);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read', { messageId: data.messageId });
        }
      }
    } catch (error) {
      console.error('Message read error:', error);
    }
  });

  // Pin message
  socket.on('message:pin', async (data) => {
    try {
      // Get current pinned status
      const { data: message } = await supabase
        .from('messages')
        .select('pinned, sender_id, receiver_id')
        .eq('id', data.messageId)
        .single();

      if (message) {
        const newPinnedStatus = !message.pinned;

        await supabase
          .from('messages')
          .update({ pinned: newPinnedStatus })
          .eq('id', data.messageId);

        // Notify both users
        [message.sender_id, message.receiver_id].forEach(userId => {
          const socketId = connectedUsers.get(userId);
          if (socketId) {
            io.to(socketId).emit('message:pinned', {
              messageId: data.messageId,
              pinned: newPinnedStatus
            });
          }
        });
      }
    } catch (error) {
      console.error('Pin message error:', error);
    }
  });

  // Delete message
  socket.on('message:delete', async (data) => {
    try {
      const { data: message } = await supabase
        .from('messages')
        .select('*')
        .eq('id', data.messageId)
        .single();

      if (message) {
        if (data.deleteForEveryone && message.sender_id === data.userId) {
          // Delete for everyone
          await supabase
            .from('messages')
            .update({
              deleted: true,
              content: 'This message was deleted'
            })
            .eq('id', data.messageId);

          // Notify both users
          [message.sender_id, message.receiver_id].forEach(userId => {
            const socketId = connectedUsers.get(userId);
            if (socketId) {
              io.to(socketId).emit('message:deleted', {
                messageId: data.messageId,
                forEveryone: true
              });
            }
          });
        } else {
          // Delete for me only
          const deletedFor = message.deleted_for || [];
          deletedFor.push(data.userId);

          await supabase
            .from('messages')
            .update({ deleted_for: deletedFor })
            .eq('id', data.messageId);

          socket.emit('message:deleted', {
            messageId: data.messageId,
            forEveryone: false
          });
        }
      }
    } catch (error) {
      console.error('Delete message error:', error);
    }
  });

  // New story
  socket.on('story:new', (story) => {
    io.emit('story:added', story);
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      io.emit('user:online', { userId: socket.userId, online: false });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Friend Chat server running on http://localhost:${PORT}`);
  console.log(`📊 Connected to Supabase: ${process.env.SUPABASE_URL}`);
});
