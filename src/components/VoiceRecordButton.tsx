import { useState, useCallback, useRef } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecordButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceRecordButton({ onTranscription, disabled }: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(() => {
    if (disabled) return;
    
    setIsRecording(true);
    setRecordingTime(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, [disabled]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Simulate transcription (will be replaced with Whisper API)
    if (recordingTime > 0) {
      const simulatedTranscriptions = [
        "i was standing in the kitchen when the phone rang. it was 3am.",
        "everything felt different after that conversation.",
        "i didn't know what to say. so i said nothing.",
        "that was the moment everything changed.",
      ];
      const randomTranscription = simulatedTranscriptions[Math.floor(Math.random() * simulatedTranscriptions.length)];
      onTranscription(randomTranscription);
    }
    
    setRecordingTime(0);
  }, [recordingTime, onTranscription]);

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
        disabled={disabled}
        className={cn(
          "record-button w-full h-16 no-select",
          isRecording && "recording",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
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
