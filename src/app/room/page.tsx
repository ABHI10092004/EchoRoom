'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { socketManager, Room, User, AudioSyncData } from '@/lib/socket';
import { SystemAudioStreamer, blobToBase64, base64ToBlob } from '@/lib/audioCapture';

function RoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSystemAudio, setIsSystemAudio] = useState(false);
  const [systemAudioStreamer, setSystemAudioStreamer] = useState<SystemAudioStreamer | null>(null);
  const [systemAudioElement, setSystemAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const action = searchParams.get('action');
    const roomName = searchParams.get('roomName');
    const roomCode = searchParams.get('roomCode');
    const userName = searchParams.get('userName');

    if (!userName) {
      router.push('/');
      return;
    }

    const initializeRoom = async () => {
      try {
        const socket = socketManager.connect();
        
        socket.on('connect', () => {
          setIsConnected(true);
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        socket.on('room-closed', () => {
          setError('Room has been closed');
          setTimeout(() => router.push('/'), 3000);
        });

        // Set up event listeners
        socketManager.onRoomUpdate((updatedRoom) => {
          setRoom(updatedRoom);
        });

        socketManager.onAudioSync((audioData) => {
          if (currentUser?.isAdmin) return; // Admin doesn't sync to others
          syncToAudioData(audioData);
        });

        socketManager.onTrackLoad((trackUrl) => {
          if (audioRef.current) {
            audioRef.current.src = trackUrl;
            setAudioUrl(trackUrl);
          }
        });

        socketManager.onUserJoined((user) => {
          console.log('User joined:', user.name);
        });

        socketManager.onUserLeft((userId) => {
          console.log('User left:', userId);
        });

        socketManager.onSystemAudioStart(() => {
          setIsSystemAudio(true);
          if (!currentUser?.isAdmin) {
            // Create audio element for receiving system audio
            const audio = new Audio();
            audio.autoplay = true;
            setSystemAudioElement(audio);
          }
        });

        socketManager.onSystemAudioStop(() => {
          setIsSystemAudio(false);
          if (systemAudioElement) {
            systemAudioElement.pause();
            systemAudioElement.src = '';
            setSystemAudioElement(null);
          }
        });

        socketManager.onAudioChunk((audioData) => {
          if (!currentUser?.isAdmin && systemAudioElement) {
            // Convert base64 back to blob and play
            const audioBlob = base64ToBlob(audioData);
            const audioUrl = URL.createObjectURL(audioBlob);
            systemAudioElement.src = audioUrl;
          }
        });

        // Create or join room
        if (action === 'create' && roomName) {
          const { roomId, user } = await socketManager.createRoom(roomName, userName);
          setCurrentUser(user);
          setRoom({ id: roomId, name: roomName, admin: user.id, users: [user] });
        } else if (action === 'join' && roomCode) {
          const { room: joinedRoom, user } = await socketManager.joinRoom(roomCode, userName);
          setCurrentUser(user);
          setRoom(joinedRoom);
          
          // If there's a current track, load it
          if (joinedRoom.currentTrack && audioRef.current) {
            audioRef.current.src = joinedRoom.currentTrack.url;
            setAudioUrl(joinedRoom.currentTrack.url);
          }
        } else {
          router.push('/');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to room');
      }
    };

    initializeRoom();

    return () => {
      socketManager.leaveRoom();
      socketManager.disconnect();
    };
  }, [searchParams, router, currentUser?.isAdmin, systemAudioElement]);

  const syncToAudioData = (audioData: AudioSyncData) => {
    if (!audioRef.current || isSyncing) return;
    
    setIsSyncing(true);
    const audio = audioRef.current;
    const timeDiff = Date.now() - audioData.timestamp;
    const targetTime = audioData.currentTime + (timeDiff / 1000);
    
    // Sync playback state
    if (audioData.isPlaying && audio.paused) {
      audio.currentTime = targetTime;
      audio.play().catch(console.error);
    } else if (!audioData.isPlaying && !audio.paused) {
      audio.pause();
      audio.currentTime = targetTime;
    } else if (Math.abs(audio.currentTime - targetTime) > 0.5) {
      // Sync time if difference is significant
      audio.currentTime = targetTime;
    }
    
    setIsPlaying(audioData.isPlaying);
    setTimeout(() => setIsSyncing(false), 100);
  };

  const handlePlay = () => {
    if (!audioRef.current || !currentUser?.isAdmin) return;
    
    audioRef.current.play();
    setIsPlaying(true);
    broadcastAudioState();
  };

  const handlePause = () => {
    if (!audioRef.current || !currentUser?.isAdmin) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
    broadcastAudioState();
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current || !currentUser?.isAdmin) return;
    
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    broadcastAudioState();
  };

  const broadcastAudioState = () => {
    if (!audioRef.current || !currentUser?.isAdmin) return;
    
    const audioData: AudioSyncData = {
      currentTime: audioRef.current.currentTime,
      isPlaying: !audioRef.current.paused,
      timestamp: Date.now(),
      trackUrl: audioUrl,
    };
    
    socketManager.syncAudio(audioData);
  };

  const handleLoadTrack = () => {
    if (!currentUser?.isAdmin || !audioUrl.trim()) return;

    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      socketManager.loadTrack(audioUrl, 'Audio Track');
    }
  };

  const handleStartSystemAudio = async () => {
    if (!currentUser?.isAdmin) return;

    try {
      const streamer = new SystemAudioStreamer();
      await streamer.startStreaming();

      setSystemAudioStreamer(streamer);
      setIsSystemAudio(true);

      // Set up audio data streaming
      streamer.onAudioData(async (audioBlob) => {
        try {
          const base64Data = await blobToBase64(audioBlob);
          socketManager.streamAudioChunk(base64Data);
        } catch (error) {
          console.error('Error converting audio to base64:', error);
        }
      });

      socketManager.startSystemAudioStream();

    } catch (error) {
      console.error('Error starting system audio:', error);

      // Show detailed error message with solutions
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let alertMessage = `Failed to start system audio capture.\n\nError: ${errorMessage}\n\n`;

      if (errorMessage.includes('getDisplayMedia')) {
        alertMessage += `Solutions:\n`;
        alertMessage += `1. Access via HTTPS: https://localhost:3000\n`;
        alertMessage += `2. Use Chrome/Edge browser\n`;
        alertMessage += `3. Access via localhost instead of IP address\n`;
        alertMessage += `4. Try the microphone option as alternative`;
      } else {
        alertMessage += `Please ensure you:\n`;
        alertMessage += `- Select "Share audio" when prompted\n`;
        alertMessage += `- Use a supported browser (Chrome/Edge)\n`;
        alertMessage += `- Grant necessary permissions`;
      }

      alert(alertMessage);
    }
  };

  const handleStartMicrophone = async () => {
    if (!currentUser?.isAdmin) return;

    try {
      const streamer = new SystemAudioStreamer();
      // Use microphone instead of system audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });

      // Manually set up the streamer with microphone stream
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Handle audio data for streaming
          blobToBase64(event.data).then(base64Data => {
            socketManager.streamAudioChunk(base64Data);
          }).catch(console.error);
        }
      };

      mediaRecorder.start(100);

      // Store reference for cleanup
      (streamer as any).mediaRecorder = mediaRecorder;
      (streamer as any).isRecording = true;

      setSystemAudioStreamer(streamer);
      setIsSystemAudio(true);

      // Set up audio data streaming
      streamer.onAudioData(async (audioBlob) => {
        try {
          const base64Data = await blobToBase64(audioBlob);
          socketManager.streamAudioChunk(base64Data);
        } catch (error) {
          console.error('Error converting audio to base64:', error);
        }
      });

      socketManager.startSystemAudioStream();

    } catch (error) {
      console.error('Error starting microphone:', error);
      alert('Failed to access microphone. Please grant microphone permissions and try again.');
    }
  };

  const handleStopSystemAudio = () => {
    if (!currentUser?.isAdmin || !systemAudioStreamer) return;

    systemAudioStreamer.stopStreaming();
    setSystemAudioStreamer(null);
    setIsSystemAudio(false);
    socketManager.stopSystemAudioStream();
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSyncing) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!room || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Connecting to room...</p>
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
            <div>
              <h1 className="text-2xl font-bold text-white">{room.name}</h1>
              <p className="text-gray-300">Room Code: <span className="font-mono text-lg">{room.id}</span></p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-white text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
              <button
                onClick={() => {
                  socketManager.leaveRoom();
                  router.push('/');
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Leave Room
              </button>
            </div>
          </div>
          
          {/* Users */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Connected Users ({room.users.length})</h3>
            <div className="flex flex-wrap gap-2">
              {room.users.map((user) => (
                <div
                  key={user.id}
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
        </div>

        {/* Audio Controls */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Audio Player</h2>

          {currentUser.isAdmin && (
            <div className="mb-6 space-y-4">
              {/* System Audio Controls */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-3">🎵 Audio Streaming Options</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Stream audio to all connected devices in real-time
                </p>

                {!isSystemAudio ? (
                  <div className="space-y-3">
                    {/* System Audio Option */}
                    <div className="border border-white/10 rounded-lg p-3">
                      <h4 className="text-white font-medium mb-2">🖥️ System Audio (Recommended)</h4>
                      <p className="text-gray-400 text-xs mb-2">
                        Stream whatever is playing on your computer (Spotify, YouTube, etc.)
                      </p>
                      <button
                        onClick={handleStartSystemAudio}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <span>🎤</span>
                        <span>Start System Audio</span>
                      </button>
                      <p className="text-yellow-300 text-xs mt-1">
                        ⚠️ Requires HTTPS or localhost access
                      </p>
                    </div>

                    {/* Microphone Option */}
                    <div className="border border-white/10 rounded-lg p-3">
                      <h4 className="text-white font-medium mb-2">🎙️ Microphone (Fallback)</h4>
                      <p className="text-gray-400 text-xs mb-2">
                        Stream your microphone audio (speak or play audio near mic)
                      </p>
                      <button
                        onClick={handleStartMicrophone}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <span>🎙️</span>
                        <span>Start Microphone</span>
                      </button>
                      <p className="text-blue-300 text-xs mt-1">
                        ✅ Works on all devices and networks
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-green-400">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">Streaming audio</span>
                    </div>
                    <button
                      onClick={handleStopSystemAudio}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <span>⏹️</span>
                      <span>Stop Streaming</span>
                    </button>
                  </div>
                )}
              </div>

              {/* URL Audio Controls */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-3">🔗 URL Audio</h3>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    placeholder="Enter audio URL (MP3, WAV, etc.)"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    disabled={isSystemAudio}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <button
                    onClick={handleLoadTrack}
                    disabled={!audioUrl.trim() || isSystemAudio}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Load Track
                  </button>
                </div>
              </div>
            </div>
          )}

          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />

          {/* Playback Controls */}
          <div className="space-y-4">
            {isSystemAudio ? (
              <div className="text-center">
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
                  <h3 className="text-green-400 font-semibold mb-2">🎵 System Audio Active</h3>
                  {currentUser.isAdmin ? (
                    <p className="text-green-300 text-sm">
                      Your system audio is being streamed to all participants
                    </p>
                  ) : (
                    <p className="text-green-300 text-sm">
                      Receiving live audio stream from admin
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-4">
                {currentUser.isAdmin ? (
                  <>
                    <button
                      onClick={handlePause}
                      disabled={!audioUrl}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      Pause
                    </button>
                    <button
                      onClick={handlePlay}
                      disabled={!audioUrl}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      Play
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-300 mb-2">Waiting for admin to control playback</p>
                    <div className={`w-4 h-4 rounded-full mx-auto ${isPlaying ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className="text-sm text-gray-400 mt-1">{isPlaying ? 'Playing' : 'Paused'}</p>
                  </div>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {!isSystemAudio && duration > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-300">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={(e) => currentUser.isAdmin && handleSeek(Number(e.target.value))}
                    disabled={!currentUser.isAdmin}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Volume Control */}
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm">Volume:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-white text-sm w-12">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <RoomContent />
    </Suspense>
  );
}
