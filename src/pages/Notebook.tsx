import { BookmarkCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Note {
  id: string;
  title: string;
  content: string;
  topic: string;
  savedAt: string;
}

const Notebook = () => {
  const notes: Note[] = [
    {
      id: "1",
      title: "Example Summary",
      content: "This is where your saved explanations and summaries will appear once you start learning with Jamont.",
      topic: "Getting Started",
      savedAt: new Date().toLocaleDateString(),
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">My Notebook</h1>
            <p className="text-muted-foreground">
              Review your saved summaries and explanations
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>

        {/* Notes Grid */}
        <div className="grid gap-4">
          {notes.map((note) => (
            <Card key={note.id} className="p-6 hover:shadow-card transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <BookmarkCheck className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{note.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {note.topic} • Saved {note.savedAt}
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-2">{note.content}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State Helper */}
        {notes.length <= 1 && (
          <Card className="p-8 text-center border-2 border-dashed">
            <BookmarkCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Start Building Your Notebook</h3>
            <p className="text-muted-foreground mb-4">
              As you chat with Jamont, save important explanations and summaries here for quick reference.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Notebook;
