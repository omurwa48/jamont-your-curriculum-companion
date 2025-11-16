import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ProgressCircle } from "./ProgressCircle";
import { BookOpen, Clock } from "lucide-react";

interface CourseCardProps {
  title: string;
  description?: string;
  totalLessons: number;
  completedLessons: number;
  difficulty: string;
  estimatedHours: number;
  thumbnailUrl?: string;
  onContinue: () => void;
}

export const CourseCard = ({
  title,
  description,
  totalLessons,
  completedLessons,
  difficulty,
  estimatedHours,
  thumbnailUrl,
  onContinue,
}: CourseCardProps) => {
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt={title} className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>
          <ProgressCircle progress={progress} size={60} strokeWidth={6} />
        </div>

        <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{completedLessons}/{totalLessons} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{estimatedHours}h</span>
          </div>
          <Badge variant={difficulty === 'beginner' ? 'secondary' : difficulty === 'advanced' ? 'default' : 'outline'}>
            {difficulty}
          </Badge>
        </div>

        <Button onClick={onContinue} className="w-full">
          {completedLessons > 0 ? 'Continue' : 'Start Course'}
        </Button>
      </div>
    </Card>
  );
};