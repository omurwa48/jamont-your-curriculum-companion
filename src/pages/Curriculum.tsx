import { useState } from "react";
import { Upload, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
}

const Curriculum = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const newDoc: Document = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
        uploadedAt: new Date().toLocaleString(),
      };
      
      setDocuments((prev) => [...prev, newDoc]);
      
      toast({
        title: "Document uploaded",
        description: `${file.name} has been added to your curriculum`,
      });
    });
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    toast({
      title: "Document removed",
      description: "The document has been deleted from your curriculum",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Curriculum Library</h1>
          <p className="text-muted-foreground">
            Upload your textbooks and study materials for Jamont to learn from
          </p>
        </div>

        {/* Upload Card */}
        <Card className="p-8 border-2 border-dashed hover:border-primary transition-colors">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
              <p className="text-sm text-muted-foreground mb-4">
                PDF or DOCX files up to 50MB
              </p>
            </div>
            <label htmlFor="file-upload">
              <Button asChild>
                <span>Choose Files</span>
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                multiple
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </Card>

        {/* Documents List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Uploaded Documents</h2>
          {documents.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No documents uploaded yet. Upload your first document to get started.
            </Card>
          ) : (
            <div className="grid gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4 flex items-center justify-between hover:shadow-card transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{doc.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {doc.size} • Uploaded {doc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Curriculum;
