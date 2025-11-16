import { Flame } from "lucide-react";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export const StreakWidget = ({ currentStreak, longestStreak, className }: StreakWidgetProps) => {
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className={cn(
            "w-6 h-6",
            currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"
          )} />
          <div>
            <p className="text-2xl font-bold">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Best: {longestStreak} days</p>
        </div>
      </div>
      
      <div className="flex justify-between gap-1">
        {daysOfWeek.map((day, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all",
              index < currentStreak % 7
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {day}
          </div>
        ))}
      </div>
    </Card>
  );
};