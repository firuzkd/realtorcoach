import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (transcript: string) => void;
  isAnalyzing?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, isAnalyzing = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Reset state
      setAudioBlob(null);
      setTranscript("");
      audioChunksRef.current = [];
      setRecordingDuration(0);

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Start transcription
        transcribeAudio(audioBlob);
      };

      // Setup Web Speech API as backup
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscript(finalTranscript + interimTranscript);
        };

        recognition.start();
      }

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      // Start duration timer
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('Stop recording called, isRecording:', isRecording);
    
    if (mediaRecorderRef.current) {
      console.log('Stopping MediaRecorder');
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      console.log('Stopping speech recognition');
      recognitionRef.current.stop();
    }

    if (durationIntervalRef.current) {
      console.log('Clearing duration interval');
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    setIsRecording(false);
    console.log('Recording stopped');
  }, [isRecording]);

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // If we have a transcript from Web Speech API, use it
      if (transcript.trim()) {
        onRecordingComplete(transcript.trim());
        setIsTranscribing(false);
        return;
      }

      // Fallback: Use a simple transcription message
      // In a real implementation, you could send the audio to your backend
      // for transcription using Whisper API
      const fallbackTranscript = "Voice recording completed. Please implement server-side transcription for full functionality.";
      setTranscript(fallbackTranscript);
      onRecordingComplete(fallbackTranscript);
      
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscript("Transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const playRecording = useCallback(() => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
      setIsPlaying(true);
    }
  }, [audioBlob, isPlaying]);

  const pausePlayback = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const toggleRecording = () => {
    console.log('Toggle recording called, current state:', isRecording);
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (isAnalyzing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 bg-secondary/20 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 bg-secondary/40 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-secondary rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-600 mb-2">Analyzing your response...</p>
          <div className="text-sm text-slate-500">This may take a few moments</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
      {/* Recording Button */}
      <div className="relative">
        <Button
          onClick={toggleRecording}
          disabled={isTranscribing}
          className={`w-24 h-24 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${
            isRecording 
              ? 'bg-destructive hover:bg-destructive/90' 
              : 'bg-gradient-to-br from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70'
          }`}
        >
          {isRecording ? (
            <Square className="text-white w-8 h-8" />
          ) : (
            <Mic className="text-white w-8 h-8" />
          )}
        </Button>
        
        {isRecording && (
          <div className="absolute inset-0 w-24 h-24 border-4 border-destructive/30 rounded-full animate-pulse"></div>
        )}
      </div>

      {/* Waveform Animation */}
      {isRecording && (
        <div className="waveform">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="wave-bar" />
          ))}
        </div>
      )}

      {/* Recording Status */}
      <div className="text-center">
        {isRecording ? (
          <>
            <p className="text-slate-600 mb-2">Recording your response...</p>
            <div className="text-2xl font-mono text-destructive">{formatDuration(recordingDuration)}</div>
          </>
        ) : isTranscribing ? (
          <>
            <p className="text-slate-600 mb-2">Processing recording...</p>
            <div className="text-sm text-slate-500">Converting speech to text</div>
          </>
        ) : audioBlob ? (
          <>
            <p className="text-slate-600 mb-2">Recording complete!</p>
            <div className="text-2xl font-mono text-slate-400">{formatDuration(recordingDuration)}</div>
          </>
        ) : (
          <>
            <p className="text-slate-600 mb-2">Tap to start recording</p>
            <div className="text-2xl font-mono text-slate-400">00:00</div>
          </>
        )}
      </div>

      {/* Playback Controls */}
      {audioBlob && !isTranscribing && (
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={isPlaying ? pausePlayback : playRecording}
            className="flex items-center space-x-2"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Play</span>
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAudioBlob(null);
              setTranscript("");
              setRecordingDuration(0);
            }}
          >
            Record Again
          </Button>
        </div>
      )}

      {/* Transcript Preview */}
      {transcript && !isTranscribing && (
        <div className="w-full max-w-sm bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-900 mb-2">Transcript:</h4>
          <p className="text-sm text-slate-700 italic">"{transcript}"</p>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !audioBlob && (
        <div className="text-center max-w-sm">
          <p className="text-sm text-slate-500">
            Record your response as if you're leaving a WhatsApp voice note. 
            Speak clearly and naturally for best results.
          </p>
        </div>
      )}
    </div>
  );
}
