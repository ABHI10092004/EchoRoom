export class SystemAudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isCapturing = false;
  private onAudioDataCallback: ((audioData: Float32Array) => void) | null = null;

  constructor() {
    // Initialize audio context when needed
  }

  // Check if system audio capture is supported
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  }

  // Alternative: Microphone capture as fallback
  async startMicrophoneCapture(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 2
        }
      });

      this.mediaStream = stream;
      this.setupAudioProcessing(stream);
      this.isCapturing = true;

      return stream;
    } catch (error) {
      console.error('Error starting microphone capture:', error);
      throw new Error('Failed to access microphone. Please grant microphone permissions.');
    }
  }

  async startCapture(): Promise<MediaStream> {
    try {
      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture with audio is not supported in this browser or requires HTTPS. Please use Chrome/Edge with HTTPS or access via localhost.');
      }

      // Request screen capture with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 2
        } as MediaStreamConstraints['audio']
      });

      // Check if audio track is available
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('No audio track found. Please ensure you check "Share audio" when prompted.');
      }

      this.mediaStream = stream;
      this.setupAudioProcessing(stream);
      this.isCapturing = true;

      // Handle stream end
      audioTracks.forEach(track => {
        track.onended = () => {
          this.stopCapture();
        };
      });

      return stream;
    } catch (error) {
      console.error('Error starting system audio capture:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to capture system audio. Please ensure you select "Share audio" when prompted and use a supported browser.');
    }
  }

  private setupAudioProcessing(stream: MediaStream) {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      
      // Create a script processor for audio data
      this.processorNode = this.audioContext.createScriptProcessor(4096, 2, 2);
      
      this.processorNode.onaudioprocess = (event) => {
        if (this.onAudioDataCallback) {
          const inputBuffer = event.inputBuffer;
          const leftChannel = inputBuffer.getChannelData(0);
          this.onAudioDataCallback(leftChannel);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error setting up audio processing:', error);
    }
  }

  stopCapture() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isCapturing = false;
    this.onAudioDataCallback = null;
  }

  onAudioData(callback: (audioData: Float32Array) => void) {
    this.onAudioDataCallback = callback;
  }

  getIsCapturing(): boolean {
    return this.isCapturing;
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }
}

// Alternative approach using Web Audio API with system audio
export class SystemAudioStreamer {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private onDataCallback: ((audioBlob: Blob) => void) | null = null;

  async startStreaming(): Promise<void> {
    try {
      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture with audio is not supported in this browser or requires HTTPS. Please use Chrome/Edge with HTTPS or access via localhost.');
      }

      // Request system audio capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        } as MediaStreamConstraints['audio']
      });

      // Check if audio track is available
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('No audio track found. Please ensure you check "Share audio" when prompted.');
      }

      // Check MediaRecorder support
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          throw new Error('Audio recording is not supported in this browser.');
        }
      }

      // Create MediaRecorder for streaming
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          if (this.onDataCallback) {
            this.onDataCallback(event.data);
          }
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
      };

      // Start recording in small chunks for real-time streaming
      this.mediaRecorder.start(100); // 100ms chunks
      this.isRecording = true;

      // Handle stream end
      audioTracks.forEach(track => {
        track.onended = () => {
          this.stopStreaming();
        };
      });

    } catch (error) {
      console.error('Error starting audio streaming:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to start audio streaming. Please ensure you select "Share audio" when prompted and use a supported browser.');
    }
  }

  stopStreaming() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  onAudioData(callback: (audioBlob: Blob) => void) {
    this.onDataCallback = callback;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getRecordedAudio(): Blob {
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }
}

// Utility function to convert audio blob to base64 for transmission
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Utility function to convert base64 back to blob
export function base64ToBlob(base64: string, mimeType: string = 'audio/webm'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
