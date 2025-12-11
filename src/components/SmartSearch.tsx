import { useState } from "react";
import { Search, BookOpen, FileText, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";

interface SearchResult {
  id: string;
  chunk_text: string;
  page_number: number | null;
  document_title: string;
  relevance_score: number;
}

interface SmartSearchProps {
  onSelectResult?: (result: SearchResult) => void;
}

export const SmartSearch = ({ onSelectResult }: SmartSearchProps) => {
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || !session?.user?.id) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Fetch all chunks and perform client-side semantic matching
      const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select('id, chunk_text, page_number, document_id, documents(title)')
        .eq('user_id', session.user.id);

      if (error) throw error;

      if (!chunks || chunks.length === 0) {
        setResults([]);
        return;
      }

      // Simple keyword-based relevance scoring with TF-IDF-like approach
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      const scoredResults = chunks.map(chunk => {
        const text = chunk.chunk_text.toLowerCase();
        let score = 0;
        
        // Exact phrase match bonus
        if (text.includes(query.toLowerCase())) {
          score += 10;
        }
        
        // Word frequency scoring
        for (const word of queryWords) {
          const regex = new RegExp(word, 'gi');
          const matches = text.match(regex);
          if (matches) {
            // TF: term frequency
            const tf = matches.length;
            // IDF approximation: rarer words get higher weight
            const idf = Math.log(chunks.length / (chunks.filter(c => c.chunk_text.toLowerCase().includes(word)).length || 1));
            score += tf * Math.max(idf, 1);
          }
        }

        const docData = chunk.documents as any;
        const docTitle = Array.isArray(docData) ? docData[0]?.title : docData?.title;

        return {
          id: chunk.id,
          chunk_text: chunk.chunk_text,
          page_number: chunk.page_number,
          document_title: docTitle || 'Untitled Document',
          relevance_score: score,
        };
      });

      // Filter and sort by relevance
      const filteredResults = scoredResults
        .filter(r => r.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 5);

      setResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Escape HTML special characters to prevent XSS
  const escapeHtml = (text: string): string => {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
  };

  // Escape regex special characters to prevent regex injection
  const escapeRegex = (text: string): string => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const highlightText = (text: string, query: string) => {
    // First escape the text to prevent any HTML injection from the content
    const escapedText = escapeHtml(text);
    
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let highlightedText = escapedText;
    
    for (const word of queryWords) {
      // Escape special regex characters in the search word
      const escapedWord = escapeRegex(word);
      const regex = new RegExp(`(${escapedWord})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
    }
    
    // Sanitize the final HTML output with DOMPurify
    return DOMPurify.sanitize(highlightedText, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: ['class'] });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your curriculum..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-4"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8"
          >
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Searching your curriculum...</span>
            </div>
          </motion.div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No results found for "{query}"</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try different keywords or upload more materials</p>
          </motion.div>
        )}

        {!isSearching && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground">
              Found {results.length} relevant sections
            </p>
            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/30"
                  onClick={() => onSelectResult?.(result)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{result.document_title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.page_number && (
                        <Badge variant="outline" className="text-xs">
                          Page {result.page_number}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(result.relevance_score * 10)}% match
                      </Badge>
                    </div>
                  </div>
                  <p 
                    className="text-sm text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(truncateText(result.chunk_text), query) 
                    }}
                  />
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
