'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [userName, setUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !userName.trim()) return;

    setIsCreating(true);
    router.push(`/room?action=create&roomName=${encodeURIComponent(roomName)}&userName=${encodeURIComponent(userName)}`);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !userName.trim()) return;

    setIsJoining(true);
    router.push(`/room?action=join&roomCode=${roomCode.toUpperCase()}&userName=${encodeURIComponent(userName)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">SyncIt</h1>
          <p className="text-gray-300">Synchronize audio playback across multiple devices</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 space-y-6">
          {/* Create Room Section */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Create a Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isCreating || !roomName.trim() || !userName.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </button>
            </form>
          </div>

          <div className="border-t border-white/20 pt-6">
            <h2 className="text-xl font-semibold text-white mb-4">Join a Room</h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Room code (e.g., ABC123)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isJoining || !roomCode.trim() || !userName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          </div>
        </div>

        <div className="text-center text-gray-400 text-sm">
          <p>Create a room to become the admin and control playback,</p>
          <p>or join an existing room to sync with others.</p>
        </div>
      </div>
    </div>
  );
}
