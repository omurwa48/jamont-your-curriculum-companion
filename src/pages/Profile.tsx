import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Loader2, Edit, Award, BookOpen, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  display_name: string;
  bio: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  courses_completed: number;
  study_streak: number;
  linkedin_url: string | null;
}

const Profile = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    bio: '',
    avatar_url: null,
    total_xp: 0,
    level: 1,
    courses_completed: 0,
    study_streak: 0,
    linkedin_url: null,
  });
  const [badges, setBadges] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileData, badgesData, certificatesData, followersData, followingData] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', session!.user.id).single(),
        supabase.from('user_badges').select('*').eq('user_id', session!.user.id),
        supabase.from('certificates').select('*').eq('user_id', session!.user.id),
        supabase.from('user_connections').select('id', { count: 'exact' }).eq('following_id', session!.user.id),
        supabase.from('user_connections').select('id', { count: 'exact' }).eq('follower_id', session!.user.id),
      ]);

      if (profileData.data) setProfile(profileData.data);
      if (badgesData.data) setBadges(badgesData.data);
      if (certificatesData.data) setCertificates(certificatesData.data);
      setFollowers(followersData.count || 0);
      setFollowing(followingData.count || 0);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: session!.user.id,
          ...profile,
        });

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Failed to update profile");
    }
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                  {(profile.display_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </Avatar>

            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <Input
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    placeholder="Display name"
                  />
                  <Textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Bio"
                  />
                  <Input
                    value={profile.linkedin_url || ''}
                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                    placeholder="LinkedIn URL"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile}>Save</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">{profile.display_name || 'Anonymous'}</h1>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                  <p className="text-muted-foreground mb-4">{profile.bio || 'No bio yet'}</p>
                  
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="font-semibold">{followers}</span>
                      <span className="text-muted-foreground ml-1">followers</span>
                    </div>
                    <div>
                      <span className="font-semibold">{following}</span>
                      <span className="text-muted-foreground ml-1">following</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Level</p>
            </div>
            <p className="text-2xl font-bold">{profile.level}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Total XP</p>
            </div>
            <p className="text-2xl font-bold">{profile.total_xp}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Courses</p>
            </div>
            <p className="text-2xl font-bold">{profile.courses_completed}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-500" />
              <p className="text-sm text-muted-foreground">Badges</p>
            </div>
            <p className="text-2xl font-bold">{badges.length}</p>
          </Card>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Achievements
            </h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.id} variant="secondary" className="p-3">
                  <div>
                    <p className="font-semibold">{badge.badge_name}</p>
                    <p className="text-xs text-muted-foreground">{badge.badge_description}</p>
                  </div>
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Certificates */}
        {certificates.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Certificates</h2>
            <div className="space-y-3">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold">{cert.title}</h3>
                  <p className="text-sm text-muted-foreground">{cert.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Issued: {new Date(cert.issued_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;