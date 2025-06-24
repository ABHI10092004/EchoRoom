import { io, Socket } from 'socket.io-client';

export interface User {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface Room {
  id: string;
  name: string;
  admin: string;
  users: User[];
  currentTrack?: {
    url: string;
    name: string;
    currentTime: number;
    isPlaying: boolean;
    timestamp: number;
  };
}

export interface AudioSyncData {
  currentTime: number;
  isPlaying: boolean;
  timestamp: number;
  trackUrl?: string;
  trackName?: string;
}

class SocketManager {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;
  private currentUser: User | null = null;

  connect() {
    if (!this.socket) {
      // Determine the correct server URL based on the current environment
      let serverUrl = '';

      if (process.env.NODE_ENV === 'production') {
        // In production, use environment variable or fallback
        serverUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ||
                   process.env.NEXT_PUBLIC_VERCEL_URL ?
                   `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` :
                   window.location.origin;
      } else {
        // In development, try to connect to the server on the same host
        const currentHost = window.location.hostname;
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
          serverUrl = 'http://localhost:3001';
        } else {
          // If accessing via network IP, use the same IP for socket connection
          serverUrl = `http://${currentHost}:3001`;
        }
      }

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  createRoom(roomName: string, userName: string): Promise<{ roomId: string; user: User }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('create-room', { roomName, userName }, (response: any) => {
        if (response.success) {
          this.currentRoom = response.roomId;
          this.currentUser = response.user;
          resolve({ roomId: response.roomId, user: response.user });
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  joinRoom(roomId: string, userName: string): Promise<{ room: Room; user: User }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('join-room', { roomId, userName }, (response: any) => {
        if (response.success) {
          this.currentRoom = roomId;
          this.currentUser = response.user;
          resolve({ room: response.room, user: response.user });
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  leaveRoom() {
    if (this.socket && this.currentRoom) {
      this.socket.emit('leave-room', { roomId: this.currentRoom });
      this.currentRoom = null;
      this.currentUser = null;
    }
  }

  syncAudio(audioData: AudioSyncData) {
    if (this.socket && this.currentRoom) {
      this.socket.emit('sync-audio', {
        roomId: this.currentRoom,
        audioData: {
          ...audioData,
          timestamp: Date.now()
        }
      });
    }
  }

  loadTrack(trackUrl: string, trackName: string) {
    if (this.socket && this.currentRoom) {
      this.socket.emit('load-track', {
        roomId: this.currentRoom,
        trackUrl,
        trackName
      });
    }
  }

  startSystemAudioStream() {
    if (this.socket && this.currentRoom) {
      this.socket.emit('start-system-audio', {
        roomId: this.currentRoom
      });
    }
  }

  stopSystemAudioStream() {
    if (this.socket && this.currentRoom) {
      this.socket.emit('stop-system-audio', {
        roomId: this.currentRoom
      });
    }
  }

  streamAudioChunk(audioData: string) {
    if (this.socket && this.currentRoom) {
      this.socket.emit('audio-chunk', {
        roomId: this.currentRoom,
        audioData,
        timestamp: Date.now()
      });
    }
  }

  onRoomUpdate(callback: (room: Room) => void) {
    if (this.socket) {
      this.socket.on('room-updated', callback);
    }
  }

  onAudioSync(callback: (audioData: AudioSyncData) => void) {
    if (this.socket) {
      this.socket.on('audio-sync', callback);
    }
  }

  onTrackLoad(callback: (trackUrl: string, trackName: string) => void) {
    if (this.socket) {
      this.socket.on('track-load', callback);
    }
  }

  onUserJoined(callback: (user: User) => void) {
    if (this.socket) {
      this.socket.on('user-joined', callback);
    }
  }

  onUserLeft(callback: (userId: string) => void) {
    if (this.socket) {
      this.socket.on('user-left', callback);
    }
  }

  onSystemAudioStart(callback: () => void) {
    if (this.socket) {
      this.socket.on('system-audio-started', callback);
    }
  }

  onSystemAudioStop(callback: () => void) {
    if (this.socket) {
      this.socket.on('system-audio-stopped', callback);
    }
  }

  onAudioChunk(callback: (audioData: string, timestamp: number) => void) {
    if (this.socket) {
      this.socket.on('audio-chunk', callback);
    }
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getSocket() {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
