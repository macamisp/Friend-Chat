const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

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
const dirs = ['data', 'uploads', 'uploads/stories', 'uploads/avatars', 'uploads/media'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize data files
const initDataFile = (filename, defaultData) => {
  const filepath = path.join('data', filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(defaultData, null, 2));
  }
};

initDataFile('users.json', []);
initDataFile('messages.json', []);
initDataFile('stories.json', []);

// Helper functions to read/write data
const readData = (filename) => {
  try {
    const data = fs.readFileSync(path.join('data', filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeData = (filename, data) => {
  fs.writeFileSync(path.join('data', filename), JSON.stringify(data, null, 2));
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'media';
    const uploadPath = `uploads/${type}`;
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
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
    const users = readData('users.json');
    
    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      avatar: '/uploads/avatars/default.png',
      status: 'Hey there! I am using Friend Chat',
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeData('users.json', users);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readData('users.json');
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (for friends list)
app.get('/api/users', (req, res) => {
  try {
    const users = readData('users.json');
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages between two users
app.get('/api/messages/:userId/:friendId', (req, res) => {
  try {
    const { userId, friendId } = req.params;
    const messages = readData('messages.json');
    
    const conversation = messages.filter(msg => 
      (msg.senderId === userId && msg.receiverId === friendId) ||
      (msg.senderId === friendId && msg.receiverId === userId)
    );
    
    res.json(conversation);
  } catch (error) {
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
app.get('/api/stories', (req, res) => {
  try {
    const stories = readData('stories.json');
    const now = new Date();
    
    // Filter out expired stories (older than 24 hours)
    const activeStories = stories.filter(story => {
      const storyTime = new Date(story.createdAt);
      const hoursDiff = (now - storyTime) / (1000 * 60 * 60);
      return hoursDiff < 24;
    });
    
    // Update stories file if any were expired
    if (activeStories.length !== stories.length) {
      writeData('stories.json', activeStories);
    }
    
    res.json(activeStories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add story
app.post('/api/stories', (req, res) => {
  try {
    const { userId, mediaUrl, type } = req.body;
    const stories = readData('stories.json');
    
    const newStory = {
      id: uuidv4(),
      userId,
      mediaUrl,
      type,
      createdAt: new Date().toISOString(),
      views: []
    };
    
    stories.push(newStory);
    writeData('stories.json', stories);
    
    res.json(newStory);
  } catch (error) {
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
  socket.on('message:send', (data) => {
    const messages = readData('messages.json');
    
    const newMessage = {
      id: uuidv4(),
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content,
      type: data.type || 'text',
      mediaUrl: data.mediaUrl || null,
      timestamp: new Date().toISOString(),
      status: 'sent',
      pinned: false,
      deleted: false,
      deletedFor: []
    };
    
    messages.push(newMessage);
    writeData('messages.json', messages);
    
    // Send to receiver if online
    const receiverSocketId = connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:receive', newMessage);
      
      // Update status to delivered
      newMessage.status = 'delivered';
      writeData('messages.json', messages);
    }
    
    // Confirm to sender
    socket.emit('message:sent', newMessage);
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
  socket.on('message:read', (data) => {
    const messages = readData('messages.json');
    const message = messages.find(m => m.id === data.messageId);
    
    if (message) {
      message.status = 'read';
      writeData('messages.json', messages);
      
      // Notify sender
      const senderSocketId = connectedUsers.get(message.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message:read', { messageId: data.messageId });
      }
    }
  });
  
  // Pin message
  socket.on('message:pin', (data) => {
    const messages = readData('messages.json');
    const message = messages.find(m => m.id === data.messageId);
    
    if (message) {
      message.pinned = !message.pinned;
      writeData('messages.json', messages);
      
      // Notify both users
      [message.senderId, message.receiverId].forEach(userId => {
        const socketId = connectedUsers.get(userId);
        if (socketId) {
          io.to(socketId).emit('message:pinned', { messageId: data.messageId, pinned: message.pinned });
        }
      });
    }
  });
  
  // Delete message
  socket.on('message:delete', (data) => {
    const messages = readData('messages.json');
    const message = messages.find(m => m.id === data.messageId);
    
    if (message) {
      if (data.deleteForEveryone && message.senderId === data.userId) {
        message.deleted = true;
        message.content = 'This message was deleted';
        
        // Notify both users
        [message.senderId, message.receiverId].forEach(userId => {
          const socketId = connectedUsers.get(userId);
          if (socketId) {
            io.to(socketId).emit('message:deleted', { messageId: data.messageId, forEveryone: true });
          }
        });
      } else {
        // Delete for me only
        if (!message.deletedFor) message.deletedFor = [];
        message.deletedFor.push(data.userId);
        
        socket.emit('message:deleted', { messageId: data.messageId, forEveryone: false });
      }
      
      writeData('messages.json', messages);
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
});
