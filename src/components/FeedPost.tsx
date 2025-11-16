import { useState } from "react";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface FeedPostProps {
  id: string;
  userName: string;
  userAvatar?: string;
  postType: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

export const FeedPost = ({
  id,
  userName,
  userAvatar,
  postType,
  content,
  imageUrl,
  likesCount,
  commentsCount,
  createdAt,
  isLiked = false,
  onLike,
  onComment,
  onShare,
}: FeedPostProps) => {
  const [liked, setLiked] = useState(isLiked);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);

  const handleLike = () => {
    setLiked(!liked);
    setLocalLikesCount(liked ? localLikesCount - 1 : localLikesCount + 1);
    onLike(id);
  };

  const getPostTypeBadge = () => {
    const badges = {
      achievement: { label: '🏆 Achievement', variant: 'default' as const },
      milestone: { label: '🎯 Milestone', variant: 'secondary' as const },
      certificate: { label: '📜 Certificate', variant: 'default' as const },
      study_update: { label: '📚 Study Update', variant: 'outline' as const },
    };
    return badges[postType as keyof typeof badges] || badges.study_update;
  };

  const badge = getPostTypeBadge();

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </Avatar>
            <div>
              <p className="font-semibold">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        {/* Content */}
        <p className="mb-3 text-sm">{content}</p>

        {/* Image */}
        {imageUrl && (
          <img src={imageUrl} alt="Post content" className="w-full rounded-lg mb-3" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-2", liked && "text-red-500")}
            onClick={handleLike}
          >
            <Heart className={cn("w-5 h-5", liked && "fill-current")} />
            <span>{localLikesCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => onComment(id)}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentsCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => onShare(id)}
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};