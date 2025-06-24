'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
  users: { name: string; isAdmin: boolean }[];
}

interface DebugData {
  rooms: RoomInfo[];
  totalRooms: number;
}

export default function DebugPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    try {
      setLoading(true);
      const currentHost = window.location.hostname;
      const serverUrl = currentHost === 'localhost' || currentHost === '127.0.0.1' 
        ? 'http://localhost:3001' 
        : `http://${currentHost}:3001`;
      
      const response = await fetch(`${serverUrl}/debug/rooms`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setDebugData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debug data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchDebugData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !debugData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading debug information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white">🔧 Debug Information</h1>
            <div className="flex space-x-2">
              <button
                onClick={fetchDebugData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <Link
                href="/"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
          
          <div className="text-gray-300 text-sm">
            <p>Server Status: <span className="text-green-400">Connected</span></p>
            <p>Auto-refresh: Every 5 seconds</p>
            <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <h3 className="text-red-400 font-semibold mb-2">❌ Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Rooms Information */}
        {debugData && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              🏠 Active Rooms ({debugData.totalRooms})
            </h2>
            
            {debugData.totalRooms === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-300 text-lg">No active rooms</p>
                <p className="text-gray-400 text-sm mt-2">Create a room to see it appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {debugData.rooms.map((room) => (
                  <div key={room.id} className="bg-white/5 rounded-lg p-4 border border-white/20">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                        <p className="text-gray-300">Room Code: <span className="font-mono text-yellow-400">{room.id}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Users: {room.userCount}</p>
                      </div>
                    </div>
                    
                    {room.users.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Connected Users:</h4>
                        <div className="flex flex-wrap gap-2">
                          {room.users.map((user, index) => (
                            <div
                              key={index}
                              className={`px-3 py-1 rounded-full text-sm ${
                                user.isAdmin 
                                  ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30' 
                                  : 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                              }`}
                            >
                              {user.name} {user.isAdmin && '(Admin)'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Troubleshooting Tips */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🛠️ Troubleshooting Tips</h2>
          
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">"Room not found" error:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Check if the room code is typed correctly (case-insensitive)</li>
                <li>Ensure the room creator hasn&apos;t left (rooms close when admin leaves)</li>
                <li>Verify both devices are connected to the same network</li>
                <li>Try refreshing both devices and creating a new room</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-2">Connection issues:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Check if both devices are on the same WiFi network</li>
                <li>Disable VPN if active</li>
                <li>Try using a different browser</li>
                <li>Check firewall settings (port 3001 should be accessible)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-2">System audio not working:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Ensure you check &quot;Share audio&quot; when prompted</li>
                <li>Use Chrome or Edge for best compatibility</li>
                <li>Make sure audio is actually playing on your computer</li>
                <li>Try restarting the system audio stream</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
