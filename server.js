const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const httpServer = createServer((req, res) => {
  // Add a simple debug endpoint to check rooms
  if (req.url === '/debug/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const roomsInfo = Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      name: room.name,
      userCount: room.users.size,
      users: Array.from(room.users.values()).map(u => ({ name: u.name, isAdmin: u.isAdmin }))
    }));
    res.end(JSON.stringify({ rooms: roomsInfo, totalRooms: rooms.size }, null, 2));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.12.163:3000",
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/,
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// In-memory storage for rooms and users
const rooms = new Map();
const users = new Map();

// Helper function to generate room codes
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper function to get room info
function getRoomInfo(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  return {
    id: room.id,
    name: room.name,
    admin: room.admin,
    users: Array.from(room.users.values()),
    currentTrack: room.currentTrack
  };
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', ({ roomName, userName }, callback) => {
    try {
      const roomId = generateRoomCode();
      const userId = uuidv4();
      
      const user = {
        id: userId,
        name: userName,
        isAdmin: true,
        socketId: socket.id
      };

      const room = {
        id: roomId,
        name: roomName,
        admin: userId,
        users: new Map([[userId, user]]),
        currentTrack: null
      };

      rooms.set(roomId, room);
      users.set(socket.id, { userId, roomId });
      
      socket.join(roomId);
      
      callback({
        success: true,
        roomId,
        user: { id: userId, name: userName, isAdmin: true }
      });

      console.log(`Room created: ${roomId} by ${userName}`);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('join-room', ({ roomId, userName }, callback) => {
    try {
      // Convert roomId to uppercase for consistency
      const normalizedRoomId = roomId.toUpperCase();
      const room = rooms.get(normalizedRoomId);

      console.log(`Join room attempt: ${normalizedRoomId} by ${userName}`);
      console.log(`Available rooms: ${Array.from(rooms.keys()).join(', ')}`);

      if (!room) {
        callback({ success: false, error: `Room '${normalizedRoomId}' not found. Available rooms: ${Array.from(rooms.keys()).join(', ')}` });
        return;
      }

      const userId = uuidv4();
      const user = {
        id: userId,
        name: userName,
        isAdmin: false,
        socketId: socket.id
      };

      room.users.set(userId, user);
      users.set(socket.id, { userId, roomId: normalizedRoomId });

      socket.join(normalizedRoomId);
      
      // Notify other users in the room
      socket.to(normalizedRoomId).emit('user-joined', { id: userId, name: userName, isAdmin: false });

      // Send room info to the joining user
      callback({
        success: true,
        room: getRoomInfo(normalizedRoomId),
        user: { id: userId, name: userName, isAdmin: false }
      });

      // Send updated room info to all users
      io.to(normalizedRoomId).emit('room-updated', getRoomInfo(normalizedRoomId));

      console.log(`User ${userName} joined room ${normalizedRoomId}`);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('leave-room', ({ roomId }) => {
    try {
      const userInfo = users.get(socket.id);
      if (!userInfo) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(userInfo.userId);
      if (user) {
        room.users.delete(userInfo.userId);
        users.delete(socket.id);
        
        socket.leave(roomId);
        
        // Notify other users
        socket.to(roomId).emit('user-left', userInfo.userId);
        
        // If room is empty or admin left, clean up
        if (room.users.size === 0 || user.isAdmin) {
          rooms.delete(roomId);
          io.to(roomId).emit('room-closed');
        } else {
          // Send updated room info
          io.to(roomId).emit('room-updated', getRoomInfo(roomId));
        }

        console.log(`User ${user.name} left room ${roomId}`);
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  socket.on('sync-audio', ({ roomId, audioData }) => {
    try {
      const userInfo = users.get(socket.id);
      if (!userInfo) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(userInfo.userId);
      if (!user || !user.isAdmin) return; // Only admin can sync audio

      // Update room's current track info
      room.currentTrack = {
        url: audioData.trackUrl || room.currentTrack?.url,
        name: audioData.trackName || room.currentTrack?.name,
        currentTime: audioData.currentTime,
        isPlaying: audioData.isPlaying,
        timestamp: audioData.timestamp
      };

      // Broadcast to all other users in the room
      socket.to(roomId).emit('audio-sync', audioData);
      
      console.log(`Audio synced in room ${roomId}:`, audioData);
    } catch (error) {
      console.error('Error syncing audio:', error);
    }
  });

  socket.on('load-track', ({ roomId, trackUrl, trackName }) => {
    try {
      const userInfo = users.get(socket.id);
      if (!userInfo) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(userInfo.userId);
      if (!user || !user.isAdmin) return; // Only admin can load tracks

      // Update room's current track
      room.currentTrack = {
        url: trackUrl,
        name: trackName,
        currentTime: 0,
        isPlaying: false,
        timestamp: Date.now()
      };

      // Broadcast to all users in the room
      io.to(roomId).emit('track-load', trackUrl, trackName);
      io.to(roomId).emit('room-updated', getRoomInfo(roomId));

      console.log(`Track loaded in room ${roomId}: ${trackName}`);
    } catch (error) {
      console.error('Error loading track:', error);
    }
  });

  socket.on('start-system-audio', ({ roomId }) => {
    try {
      const userInfo = users.get(socket.id);
      if (!userInfo) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(userInfo.userId);
      if (!user || !user.isAdmin) return; // Only admin can start system audio

      // Mark room as using system audio
      room.isSystemAudio = true;
      room.currentTrack = {
        url: 'system-audio',
        name: 'System Audio',
        currentTime: 0,
        isPlaying: true,
        timestamp: Date.now()
      };

      // Notify all users that system audio started
      io.to(roomId).emit('system-audio-started');
      io.to(roomId).emit('room-updated', getRoomInfo(roomId));

      console.log(`System audio started in room ${roomId}`);
    } catch (error) {
      console.error('Error starting system audio:', error);
    }
  });

  socket.on('stop-system-audio', ({ roomId }) => {
    try {
      const userInfo = users.get(socket.id);
      if (!userInfo) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(userInfo.userId);
      if (!user || !user.isAdmin) return; // Only admin can stop system audio

      // Mark room as not using system audio
      room.isSystemAudio = false;
      room.currentTrack = null;

      // Notify all users that system audio stopped
      io.to(roomId).emit('system-audio-stopped');
      io.to(roomId).emit('room-updated', getRoomInfo(roomId));

      console.log(`System audio stopped in room ${roomId}`);
    } catch (error) {
      console.error('Error stopping system audio:', error);
    }
  });

  socket.on('audio-chunk', ({ roomId, audioData, timestamp }) => {
    try {
      const userInfo = users.get(socket.id);
      if (!userInfo) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(userInfo.userId);
      if (!user || !user.isAdmin) return; // Only admin can stream audio

      // Broadcast audio chunk to all other users in the room
      socket.to(roomId).emit('audio-chunk', audioData, timestamp);

    } catch (error) {
      console.error('Error streaming audio chunk:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      const userInfo = users.get(socket.id);
      if (userInfo) {
        const { userId, roomId } = userInfo;
        const room = rooms.get(roomId);
        
        if (room) {
          const user = room.users.get(userId);
          if (user) {
            room.users.delete(userId);
            
            // Notify other users
            socket.to(roomId).emit('user-left', userId);
            
            // If room is empty or admin disconnected, clean up
            if (room.users.size === 0 || user.isAdmin) {
              rooms.delete(roomId);
              io.to(roomId).emit('room-closed');
            } else {
              // Send updated room info
              io.to(roomId).emit('room-updated', getRoomInfo(roomId));
            }

            console.log(`User ${user.name} disconnected from room ${roomId}`);
          }
        }
        
        users.delete(socket.id);
      }
    } catch (error) {
      console.error('Error on disconnect:', error);
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

httpServer.listen(PORT, HOST, () => {
  console.log(`Socket.IO server running on ${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.12.163:${PORT}`);
});
