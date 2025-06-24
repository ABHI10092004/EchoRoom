# 🎵 SyncIt - Synchronized Audio Streaming

A real-time audio synchronization platform that allows you to stream audio from one device to multiple connected devices simultaneously. Perfect for listening parties, collaborative music sessions, and synchronized audio experiences.

![SyncIt Demo](https://img.shields.io/badge/Status-Live-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Features

### 🎤 **System Audio Capture**
- Stream any audio playing on your computer (Spotify, YouTube, games, etc.)
- High-quality real-time audio transmission
- Perfect synchronization across all connected devices

### 🎙️ **Microphone Streaming**
- Fallback option for devices without system audio support
- Works on all browsers and network configurations
- Great for voice communication and live audio

### 🏠 **Room Management**
- Create rooms with unique 6-character codes
- Admin controls for audio playback
- Real-time user management and status updates

### 🌐 **Multi-Device Support**
- Works across phones, tablets, computers
- Cross-platform compatibility
- Network and localhost access

### 🔄 **Real-Time Synchronization**
- WebSocket-based instant communication
- Automatic latency compensation
- Seamless audio streaming experience

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Modern web browser (Chrome/Edge recommended)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ABHI10092004/syncit.git
   cd syncit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start both servers**
   ```bash
   # Start both Next.js and Socket.IO servers
   npm run dev:full

   # Or start them separately:
   npm run server  # Socket.IO server (port 3001)
   npm run dev     # Next.js app (port 3000)
   ```

4. **Access the application**
   - **Local**: http://localhost:3000
   - **Network**: http://YOUR_IP:3000

## 🌐 Deployment

### Option 1: Vercel + Railway (Recommended)

#### Deploy Frontend to Vercel:
1. **Fork this repository**
2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Deploy automatically

#### Deploy Backend to Railway:
1. **Create Railway account**: [railway.app](https://railway.app)
2. **Deploy server.js**:
   ```bash
   # In Railway dashboard
   # Connect GitHub repository
   # Set start command: node server.js
   # Set port: 3001
   ```

3. **Set environment variables in Vercel**:
   ```
   NEXT_PUBLIC_SOCKET_SERVER_URL=https://your-app.railway.app
   ```

### Option 2: Full Vercel Deployment
- Deploy the entire app to Vercel
- Socket.IO will run as serverless functions
- May have limitations for real-time features

## 📱 How to Use

### Creating a Room (Admin)
1. **Open the app** in your browser
2. **Enter your name** and **room name**
3. **Click "Create Room"**
4. **Share the room code** with others
5. **Choose audio source**:
   - **System Audio**: Stream computer audio (requires HTTPS/localhost)
   - **Microphone**: Stream microphone input (works everywhere)

### Joining a Room (Participant)
1. **Open the app** on any device
2. **Enter your name** and the **room code**
3. **Click "Join Room"**
4. **Listen to synchronized audio** from the admin

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
# Socket.IO Server URL (for production)
NEXT_PUBLIC_SOCKET_SERVER_URL=https://your-socket-server.com

# Optional: Custom configuration
NODE_ENV=development
```

### Browser Permissions

For optimal experience:
1. **Allow microphone access** when prompted
2. **Allow camera access** for system audio (screen sharing)
3. **Use HTTPS** for full system audio support

## 🛠️ Development

### Project Structure
```
syncit/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── page.tsx        # Home page
│   │   ├── room/           # Room interface
│   │   └── debug/          # Debug tools
│   └── lib/
│       ├── socket.ts       # Socket.IO client
│       └── audioCapture.ts # Audio capture utilities
├── server.js               # Socket.IO server
├── vercel.json            # Vercel configuration
└── README.md
```

### Available Scripts

```bash
# Development
npm run dev              # Start Next.js only
npm run server          # Start Socket.IO server only
npm run dev:full        # Start both servers
npm run dev:https       # Start with HTTPS

# Production
npm run build           # Build for production
npm run start           # Start production server

# Utilities
npm run lint            # Run ESLint
```

## 🔍 Troubleshooting

### Common Issues

#### "Room not found" error
- Ensure both devices are on the same network
- Check that the Socket.IO server is running
- Verify the room code is correct

#### System audio not working
- Use **localhost** instead of IP address
- Enable **HTTPS** or use **Chrome flags**
- Try **microphone option** as fallback

#### Connection issues
- Check firewall settings (port 3001)
- Disable VPN if active
- Use Chrome or Edge browser

### Debug Tools

Access debug information at:
- **Debug page**: `/debug`
- **Server status**: `http://localhost:3001/debug/rooms`

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** for the amazing React framework
- **Socket.IO** for real-time communication
- **Tailwind CSS** for beautiful styling
- **Vercel** for seamless deployment

## 📞 Support

If you encounter any issues or have questions:

1. **Check the troubleshooting section** above
2. **Open an issue** on GitHub
3. **Contact**: [Your contact information]

---

**Made with ❤️ by [ABHI10092004](https://github.com/ABHI10092004)**

⭐ **Star this repository** if you found it helpful!
