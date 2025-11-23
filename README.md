# 💬 Friend Chat - WhatsApp-Like Web Application

<div align="center">

![Friend Chat Banner](https://img.shields.io/badge/Friend_Chat-Real--time_Messaging-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

**A modern, feature-rich web-based chat application inspired by WhatsApp**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 🌟 Features

### 💬 **Real-time Messaging**
- ⚡ Instant message delivery with Socket.IO
- ✅ Message status indicators (sent, delivered, read)
- 🔔 Typing indicators
- 📌 Pin important messages
- 🗑️ Delete messages (for me / for everyone)

### 📸 **Stories**
- 📤 Upload and share stories
- ⏰ 24-hour auto-expiration
- 💫 Animated story rings
- 👀 View friends' stories with auto-advance

### 👥 **User Management**
- 🔐 Secure authentication (login/signup)
- 🟢 Online/offline status indicators
- 👤 User profiles with avatars
- 🔍 Search and find friends

### 🎨 **Premium UI/UX**
- 🌓 Dark/Light theme support
- ✨ Glassmorphism design
- 🎭 Smooth animations and transitions
- 📱 Fully responsive (mobile, tablet, desktop)
- 🎨 WhatsApp-inspired color scheme

### 🚀 **Additional Features**
- 📷 Image and media sharing
- 🔔 Real-time notifications
- 💾 Message history
- 🎯 Clean, intuitive interface

---

## 🎬 Demo

### Screenshots

<div align="center">

| Chat Interface | Stories | Mobile View |
|:--------------:|:-------:|:-----------:|
| ![Chat](docs/screenshots/chat.png) | ![Stories](docs/screenshots/stories.png) | ![Mobile](docs/screenshots/mobile.png) |

</div>

### Live Demo
🔗 **[Try Friend Chat Live](#)** *(Coming Soon)*

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Grid & Flexbox
- **JavaScript (ES6+)** - Client-side logic
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - WebSocket implementation
- **Multer** - File upload handling

### Storage
- **JSON Files** - Lightweight data storage
- **File System** - Media and uploads storage

---

## 📦 Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/macamisp/Friend-Chat.git
cd Friend-Chat
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the server**
```bash
npm start
```

4. **Open your browser**
```
http://localhost:3000
```

---

## 🚀 Usage

### Running in Development Mode

```bash
# Start the server with auto-reload
npm run dev
```

### Running in Production

```bash
# Start the production server
npm start
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
```

---

## 📁 Project Structure

```
Friend-Chat/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── style.css      # Styles and design system
│   ├── js/
│   │   ├── app.js         # Main application logic
│   │   ├── chat.js        # Chat functionality
│   │   ├── stories.js     # Stories feature
│   │   └── utils.js       # Utility functions
│   └── assets/            # Images and media
├── data/                  # JSON data storage
│   ├── users.json         # User data
│   ├── messages.json      # Chat messages
│   └── stories.json       # Stories data
├── uploads/               # User uploaded files
├── server.js              # Express & Socket.IO server
├── package.json           # Dependencies
└── README.md              # This file
```

---

## 🎯 Roadmap

### Version 1.0 (Current)
- [x] Real-time messaging
- [x] Stories feature
- [x] Pin/Delete messages
- [x] User authentication
- [x] Online status

### Version 2.0 (Planned)
- [ ] Group chats
- [ ] Voice messages
- [ ] Video/Voice calls
- [ ] End-to-end encryption
- [ ] Message reactions
- [ ] File attachments (documents, PDFs)
- [ ] Message forwarding
- [ ] Chat backup/export

### Version 3.0 (Future)
- [ ] Desktop app (Electron)
- [ ] Mobile apps (React Native)
- [ ] Database migration (MongoDB/PostgreSQL)
- [ ] Cloud deployment
- [ ] Admin dashboard

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

---

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please open an issue:

- **Bug Report**: [Create Bug Report](https://github.com/macamisp/Friend-Chat/issues/new?labels=bug)
- **Feature Request**: [Request Feature](https://github.com/macamisp/Friend-Chat/issues/new?labels=enhancement)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@macamisp](https://github.com/macamisp)
- Project Link: [https://github.com/macamisp/Friend-Chat](https://github.com/macamisp/Friend-Chat)

---

## 🙏 Acknowledgments

- Inspired by [WhatsApp Web](https://web.whatsapp.com/)
- Icons from [Font Awesome](https://fontawesome.com/)
- Design inspiration from modern messaging apps
- Built with ❤️ using Node.js and Socket.IO

---

## 📞 Support

If you like this project, please give it a ⭐ on GitHub!

For questions or support, please open an issue or contact the maintainer.

---

<div align="center">

**Made with ❤️ by the Friend Chat Team**

[⬆ Back to Top](#-friend-chat---whatsapp-like-web-application)

</div>
