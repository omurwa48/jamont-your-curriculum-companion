import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Trophy, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  rank: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard = ({ entries }: LeaderboardProps) => {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-yellow-500";
      case 2: return "text-gray-400";
      case 3: return "text-amber-600";
      default: return "text-muted-foreground";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Trophy className={`w-5 h-5 ${getRankColor(rank)}`} />;
    }
    return null;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Top Learners
      </h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 w-12">
              {getRankIcon(entry.rank) || (
                <span className={`font-semibold ${getRankColor(entry.rank)}`}>
                  #{entry.rank}
                </span>
              )}
            </div>
            
            <Avatar className="w-10 h-10">
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt={entry.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {entry.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{entry.display_name}</p>
              <p className="text-xs text-muted-foreground">Level {entry.level}</p>
            </div>

            <Badge variant="secondary" className="shrink-0">
              {entry.total_xp} XP
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};