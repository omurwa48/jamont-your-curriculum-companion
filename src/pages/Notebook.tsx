import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface NotebookEntry {
  id: string;
  title: string;
  content: string;
  topic: string | null;
  sources: string[] | null;
  created_at: string;
  updated_at: string;
}

const Notebook = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    topic: "",
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('notebook_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast({
        title: "Error",
        description: "Failed to load notebook entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) {
      toast({
        title: "Error",
        description: "Please provide both title and content",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('save-notebook-entry', {
        body: {
          title: newEntry.title,
          content: newEntry.content,
          topic: newEntry.topic || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Your note has been saved",
      });

      setDialogOpen(false);
      setNewEntry({ title: "", content: "", topic: "" });
      loadEntries();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('notebook_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: `"${title}" has been removed`,
      });

      loadEntries();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const exportAll = () => {
    const content = entries
      .map(
        (entry) =>
          `# ${entry.title}\n${entry.topic ? `Topic: ${entry.topic}\n` : ""}${entry.content}\n\n---\n\n`
      )
      .join("");

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jamont-notebook.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Notebook</h1>
            <p className="text-muted-foreground">
              Save important explanations and summaries
            </p>
          </div>
          <div className="flex gap-2">
            {entries.length > 0 && (
              <Button variant="outline" onClick={exportAll}>
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newEntry.title}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, title: e.target.value })
                      }
                      placeholder="Note title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="topic">Topic (optional)</Label>
                    <Input
                      id="topic"
                      value={newEntry.topic}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, topic: e.target.value })
                      }
                      placeholder="e.g., Mathematics, Biology"
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={newEntry.content}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, content: e.target.value })
                      }
                      placeholder="Write your notes here..."
                      rows={10}
                    />
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? "Saving..." : "Save Note"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Entries List */}
        {entries.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No notes yet. Create your first note to get started!
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold">{entry.title}</h3>
                    {entry.topic && (
                      <span className="text-sm text-primary">
                        {entry.topic}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(entry.id, entry.title)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {entry.content}
                </p>
                {entry.sources && entry.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Sources: {entry.sources.join(", ")}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notebook;
