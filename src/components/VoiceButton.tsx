import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  onToggleListen: () => void;
  onStopSpeaking: () => void;
}

export const VoiceButton = ({
  isListening,
  isSpeaking,
  isSupported,
  onToggleListen,
  onStopSpeaking
}: VoiceButtonProps) => {
  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {isSpeaking && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onStopSpeaking}
              className="h-[60px] w-[60px] text-destructive hover:bg-destructive/10"
            >
              <VolumeX className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop speaking</TooltipContent>
        </Tooltip>
      )}
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={onToggleListen}
            className={cn(
              "h-[60px] w-[60px] transition-all",
              isListening && "animate-pulse"
            )}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isListening ? "Stop listening" : "Voice input"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
