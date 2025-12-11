import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, Trash2, Loader2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  upload_status: string;
  total_chunks: number;
  created_at: string;
}

interface UploadProgress {
  fileName: string;
  status: 'uploading' | 'extracting_text' | 'chunking' | 'generating_embeddings' | 'storing_chunks' | 'completed' | 'error';
  progress: number;
  message: string;
}

const UPLOAD_STEPS = [
  { key: 'uploading', label: 'Uploading file', progress: 10 },
  { key: 'extracting_text', label: 'Extracting text', progress: 30 },
  { key: 'chunking', label: 'Creating chunks', progress: 50 },
  { key: 'generating_embeddings', label: 'Generating AI embeddings', progress: 70 },
  { key: 'storing_chunks', label: 'Storing data', progress: 90 },
  { key: 'completed', label: 'Complete!', progress: 100 },
];

const Curriculum = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Poll for document status updates during upload
  useEffect(() => {
    if (!uploadProgress || uploadProgress.status === 'completed' || uploadProgress.status === 'error') {
      return;
    }

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('documents')
        .select('upload_status')
        .eq('file_name', uploadProgress.fileName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data?.upload_status) {
        const step = UPLOAD_STEPS.find(s => s.key === data.upload_status);
        if (step) {
          setUploadProgress(prev => prev ? {
            ...prev,
            status: data.upload_status as UploadProgress['status'],
            progress: step.progress,
            message: step.label
          } : null);
        }

        if (data.upload_status === 'completed') {
          clearInterval(interval);
          loadDocuments();
          setTimeout(() => setUploadProgress(null), 2000);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [uploadProgress, loadDocuments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !session) return;

    for (const file of Array.from(files)) {
      setUploadProgress({
        fileName: file.name,
        status: 'uploading',
        progress: 10,
        message: 'Uploading file...'
      });

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);

        const { data, error } = await supabase.functions.invoke('process-document', {
          body: formData,
        });

        if (error) throw error;

        if (data.success) {
          setUploadProgress({
            fileName: file.name,
            status: 'completed',
            progress: 100,
            message: `Processed ${data.chunksProcessed} chunks in ${(data.processingTimeMs / 1000).toFixed(1)}s`
          });

          toast({
            title: "Document processed!",
            description: `${file.name} is ready for AI learning`,
          });
        } else {
          throw new Error(data.error || 'Processing failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadProgress({
          fileName: file.name,
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : 'Upload failed'
        });
        
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }

    event.target.value = '';
    loadDocuments();
  };

  const handleDelete = async (id: string, fileName: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Document removed",
        description: `${fileName} has been deleted`,
      });

      loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-destructive';
      default: return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />;
    }
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Curriculum Library</h1>
          <p className="text-muted-foreground">
            Upload your textbooks and study materials for Jamont to learn from
          </p>
        </div>

        {/* Upload Card */}
        <Card className="p-8 border-2 border-dashed hover:border-primary transition-colors relative overflow-hidden">
          <AnimatePresence>
            {uploadProgress && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10"
              >
                <div className="w-full max-w-md space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Processing {uploadProgress.fileName}</h3>
                    <p className="text-sm text-muted-foreground">{uploadProgress.message}</p>
                  </div>

                  <Progress value={uploadProgress.progress} className="h-2" />

                  {/* Step indicators */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {UPLOAD_STEPS.slice(0, 6).map((step, index) => {
                      const currentStepIndex = UPLOAD_STEPS.findIndex(s => s.key === uploadProgress.status);
                      const isComplete = index < currentStepIndex;
                      const isCurrent = step.key === uploadProgress.status;
                      
                      return (
                        <div 
                          key={step.key}
                          className={`flex items-center gap-1 ${
                            isComplete ? 'text-green-600 dark:text-green-400' : 
                            isCurrent ? 'text-primary font-medium' : 
                            'text-muted-foreground'
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Circle className="w-3 h-3" />
                          )}
                          <span className="truncate">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {uploadProgress.status === 'completed' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex justify-center"
                    >
                      <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </motion.div>
                  )}

                  {uploadProgress.status === 'error' && (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-12 h-12 text-destructive" />
                      <Button variant="outline" onClick={() => setUploadProgress(null)}>
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, DOCX, or TXT files up to 50MB
              </p>
            </div>
            <label htmlFor="file-upload">
              <Button asChild disabled={!!uploadProgress}>
                <span>{uploadProgress ? "Processing..." : "Choose Files"}</span>
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                multiple
                onChange={handleFileUpload}
                disabled={!!uploadProgress}
              />
            </label>
          </div>
        </Card>

        {/* Documents List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Uploaded Documents ({documents.length})</h2>
          {documents.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No documents uploaded yet. Upload your first document to get started.
            </Card>
          ) : (
            <div className="grid gap-4">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 flex items-center justify-between hover:shadow-card transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{doc.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{doc.total_chunks} chunks</span>
                          <span>•</span>
                          <span className={`flex items-center gap-1 ${getStatusColor(doc.upload_status)}`}>
                            {getStatusIcon(doc.upload_status)}
                            {doc.upload_status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Curriculum;
