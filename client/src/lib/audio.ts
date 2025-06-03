export interface AudioRecordingConfig {
  maxDuration?: number; // in milliseconds
  sampleRate?: number;
  channels?: number;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  duration?: number;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;

  async initialize(config: AudioRecordingConfig = {}): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate || 44100,
          channelCount: config.channels || 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
    } catch (error) {
      throw new Error(`Failed to access microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async startRecording(): Promise<void> {
    if (!this.stream) {
      throw new Error('Audio recorder not initialized. Call initialize() first.');
    }

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: this.getSupportedMimeType()
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.getSupportedMimeType() 
        });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  getDuration(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0;
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }
}

export class WebSpeechTranscriber {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
  }

  async startTranscription(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    if (this.isListening) {
      throw new Error('Transcription already in progress');
    }

    this.recognition.start();
    this.isListening = true;
  }

  stopTranscription(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  onTranscript(callback: (transcript: string, isFinal: boolean) => void): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        callback(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        callback(interimTranscript, false);
      }
    };
  }

  onError(callback: (error: string) => void): void {
    if (!this.recognition) return;

    this.recognition.onerror = (event) => {
      callback(event.error);
    };
  }

  onEnd(callback: () => void): void {
    if (!this.recognition) return;

    this.recognition.onend = () => {
      this.isListening = false;
      callback();
    };
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }
}

export async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
    reader.readAsDataURL(blob);
  });
}

export function createAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Audio analysis utilities
export function analyzeAudioBlob(blob: Blob): Promise<AudioAnalysis> {
  return new Promise((resolve) => {
    // Basic audio analysis - in a real implementation, you might want more sophisticated analysis
    const analysis: AudioAnalysis = {
      duration: 0, // Would need actual audio processing to get this
      size: blob.size,
      type: blob.type,
      quality: blob.size > 100000 ? 'good' : blob.size > 50000 ? 'fair' : 'poor'
    };
    resolve(analysis);
  });
}

export interface AudioAnalysis {
  duration: number;
  size: number;
  type: string;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
