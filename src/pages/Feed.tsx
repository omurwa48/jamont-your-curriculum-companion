import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FeedPost } from "@/components/FeedPost";
import { Leaderboard } from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface Post {
  id: string;
  user_id: string;
  post_type: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_profiles?: {
    display_name: string;
    avatar_url: string | null;
  };
}

const Feed = () => {
  const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadFeed();
    loadLeaderboard();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('feed_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feed_posts'
      }, () => {
        loadFeed();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('total_xp', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) {
        const ranked = data.map((entry, index) => ({ ...entry, rank: index + 1 }));
        setLeaderboard(ranked);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const loadFeed = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select(`
          *,
          user_profiles:user_id (display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setPosts(data as any);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    setPosting(true);
    try {
      const { error } = await supabase.from('feed_posts').insert({
        user_id: session!.user.id,
        post_type: 'study_update',
        content: newPost,
      });

      if (error) throw error;

      setNewPost("");
      toast.success("Posted successfully!");
      loadFeed();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error("Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const { error } = await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: session!.user.id,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (postId: string) => {
    // TODO: Implement comment modal
    toast.info("Comments coming soon!");
  };

  const handleShare = (postId: string) => {
    toast.success("Share link copied!");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-3xl font-bold">Community Feed</h1>

          {/* Create Post */}
          <Card className="p-4">
            <Textarea
              placeholder="Share your learning progress..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="mb-3 min-h-[100px]"
            />
            <Button 
              onClick={handleCreatePost} 
              disabled={!newPost.trim() || posting}
              className="w-full"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Share Update
                </>
              )}
            </Button>
          </Card>

          {/* Feed */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
              </Card>
            ) : (
              posts.map((post) => (
                <FeedPost
                  key={post.id}
                  id={post.id}
                  userName={post.user_profiles?.display_name || 'Anonymous'}
                  userAvatar={post.user_profiles?.avatar_url || undefined}
                  postType={post.post_type}
                  content={post.content}
                  imageUrl={post.image_url || undefined}
                  likesCount={post.likes_count}
                  commentsCount={post.comments_count}
                  createdAt={post.created_at}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                />
              ))
            )}
          </div>
        </div>

        {/* Sidebar with Leaderboard */}
        <div className="space-y-6">
          <Leaderboard entries={leaderboard} />
        </div>
      </div>
    </div>
  );
};

export default Feed;