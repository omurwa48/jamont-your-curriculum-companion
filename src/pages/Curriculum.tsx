import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, FileText, Trash2, Loader2, CheckCircle2, Circle, AlertCircle, RefreshCw } from "lucide-react";
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
  status: 'uploading' | 'extracting_text' | 'chunking' | 'storing_chunks' | 'completed' | 'error';
  progress: number;
  message: string;
  documentId?: string;
}

const UPLOAD_STEPS = [
  { key: 'uploading', label: 'Uploading', progress: 15 },
  { key: 'extracting_text', label: 'Extracting text', progress: 35 },
  { key: 'chunking', label: 'Processing', progress: 60 },
  { key: 'storing_chunks', label: 'Saving', progress: 85 },
  { key: 'completed', label: 'Done!', progress: 100 },
];

const Curriculum = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !session) return;

    for (const file of Array.from(files)) {
      // Clear any existing poll interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

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

        // Start the upload
        const uploadPromise = supabase.functions.invoke('process-document', {
          body: formData,
        });

        // Start polling for status updates after a brief delay
        setTimeout(() => {
          pollIntervalRef.current = setInterval(async () => {
            const { data } = await supabase
              .from('documents')
              .select('upload_status, total_chunks')
              .eq('file_name', file.name)
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
                  message: `${step.label}${data.total_chunks ? ` (${data.total_chunks} chunks)` : '...'}`
                } : null);
              }
            }
          }, 300);
        }, 500);

        const { data, error } = await uploadPromise;

        // Clear polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        if (error) throw error;

        if (data.success) {
          setUploadProgress({
            fileName: file.name,
            status: 'completed',
            progress: 100,
            message: data.message || 'Document processed!'
          });

          toast({
            title: "Document ready!",
            description: `${file.name} is now available for AI learning`,
          });

          // Auto-clear after success
          setTimeout(() => setUploadProgress(null), 2000);
        } else {
          throw new Error(data.error || 'Processing failed');
        }
      } catch (error) {
        // Clear polling on error
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        console.error('Upload error:', error);
        setUploadProgress({
          fileName: file.name,
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : 'Upload failed'
        });
        
        toast({
          title: "Upload failed",
          description: `Failed to process ${file.name}`,
          variant: "destructive",
        });
      }
    }

    event.target.value = '';
    loadDocuments();
  };

  const handleDelete = async (id: string, fileName: string) => {
    try {
      // Delete chunks first (cascade should handle this, but be explicit)
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', id);

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

  const handleRetryFailed = async (doc: Document) => {
    // Delete the failed document and its chunks
    await handleDelete(doc.id, doc.title);
    
    toast({
      title: "Document removed",
      description: "Please try uploading the file again",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed': 
        return { color: 'text-green-600 dark:text-green-400', label: 'Ready', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'error':
      case 'failed': 
        return { color: 'text-destructive', label: 'Failed', icon: <AlertCircle className="w-4 h-4" /> };
      case 'processing':
      case 'extracting_text':
      case 'chunking':
      case 'storing_chunks':
        return { color: 'text-yellow-600 dark:text-yellow-400', label: 'Processing', icon: <Loader2 className="w-4 h-4 animate-spin" /> };
      default: 
        return { color: 'text-muted-foreground', label: status, icon: <Circle className="w-4 h-4" /> };
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
                    <h3 className="text-lg font-semibold truncate max-w-xs mx-auto">
                      {uploadProgress.fileName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{uploadProgress.message}</p>
                  </div>

                  <div className="space-y-2">
                    <Progress value={uploadProgress.progress} className="h-3" />
                    <p className="text-center text-sm font-medium text-primary">
                      {uploadProgress.progress}%
                    </p>
                  </div>

                  {/* Step indicators */}
                  <div className="flex justify-between text-xs px-2">
                    {UPLOAD_STEPS.map((step, index) => {
                      const currentStepIndex = UPLOAD_STEPS.findIndex(s => s.key === uploadProgress.status);
                      const isComplete = index < currentStepIndex;
                      const isCurrent = step.key === uploadProgress.status;
                      
                      return (
                        <div 
                          key={step.key}
                          className={`flex flex-col items-center gap-1 ${
                            isComplete ? 'text-green-600 dark:text-green-400' : 
                            isCurrent ? 'text-primary font-medium' : 
                            'text-muted-foreground/50'
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isCurrent ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                          <span className="text-[10px]">{step.label}</span>
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Uploaded Documents ({documents.length})</h2>
            <Button variant="ghost" size="sm" onClick={loadDocuments}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {documents.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No documents uploaded yet. Upload your first document to get started.
            </Card>
          ) : (
            <div className="grid gap-4">
              {documents.map((doc, index) => {
                const status = getStatusDisplay(doc.upload_status);
                const isFailed = doc.upload_status === 'error' || doc.upload_status === 'failed';
                
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className="p-4 flex items-center justify-between hover:shadow-card transition-shadow">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">{doc.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <span>{formatFileSize(doc.file_size)}</span>
                            {doc.total_chunks > 0 && (
                              <>
                                <span>•</span>
                                <span>{doc.total_chunks} chunks</span>
                              </>
                            )}
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isFailed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryFailed(doc)}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Retry
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Curriculum;
