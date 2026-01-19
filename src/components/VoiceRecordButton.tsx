import { useState, useCallback, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface VoiceRecordButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceRecordButton({ onTranscription, disabled }: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (disabled || isTranscribing) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Find the best supported mime type
      const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg']
        .find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "MICROPHONE ACCESS DENIED",
        description: "please allow microphone access to record",
        variant: "destructive",
      });
    }
  }, [disabled, isTranscribing]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const mediaRecorder = mediaRecorderRef.current;
    const mimeType = mediaRecorder.mimeType;
    
    // Stop all tracks
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    // Wait for the final data
    await new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve();
      mediaRecorder.stop();
    });

    const recordingDuration = recordingTime;
    setRecordingTime(0);

    if (audioChunksRef.current.length === 0 || recordingDuration < 1) {
      toast({
        title: "RECORDING TOO SHORT",
        description: "hold the button longer to record",
        variant: "destructive",
      });
      return;
    }

    // Combine audio chunks
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    
    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      
      setIsTranscribing(true);
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ 
              audio: base64Audio,
              mimeType: mimeType 
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Transcription failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        if (data.text && data.text.trim()) {
          onTranscription(data.text.toLowerCase());
        } else {
          toast({
            title: "NO SPEECH DETECTED",
            description: "try speaking more clearly",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Transcription error:", error);
        toast({
          title: "TRANSCRIPTION FAILED",
          description: "could not process audio. try again.",
          variant: "destructive",
        });
      } finally {
        setIsTranscribing(false);
      }
    };
  }, [isRecording, recordingTime, onTranscription]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        disabled={disabled || isTranscribing}
        className={cn(
          "record-button w-full h-16 no-select",
          isRecording && "recording",
          (disabled || isTranscribing) && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
          {isTranscribing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-mono font-bold uppercase tracking-tighter-custom">
                TRANSCRIBING...
              </span>
            </>
          ) : (
            <>
              <Mic 
                className={cn(
                  "w-5 h-5",
                  isRecording && "animate-pulse-recording"
                )} 
              />
              <span className="font-mono font-bold uppercase tracking-tighter-custom">
                {isRecording ? "RECORDING..." : "HOLD TO RECORD"}
              </span>
              {isRecording && (
                <span className="font-mono text-sm">
                  {formatTime(recordingTime)}
                </span>
              )}
            </>
          )}
        </div>
      </button>
      
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent animate-pulse-recording" />
          <span className="font-mono text-xs uppercase text-muted-foreground">
            release to stop
          </span>
        </div>
      )}
    </div>
  );
}
