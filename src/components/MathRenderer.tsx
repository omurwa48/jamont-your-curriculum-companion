import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
}

export const MathRenderer = ({ content }: MathRendererProps) => {
  if (!content) {
    return <span className="text-muted-foreground italic">No content</span>;
  }

  // Process markdown and math
  const processContent = (text: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let keyCounter = 0;

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);

    paragraphs.forEach((paragraph, pIdx) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return;

      // Check for headers
      if (trimmed.startsWith('### ')) {
        result.push(
          <h3 key={`h3-${pIdx}`} className="text-lg font-bold text-foreground mt-4 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            {processInline(trimmed.slice(4))}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        result.push(
          <h2 key={`h2-${pIdx}`} className="text-xl font-bold text-foreground mt-5 mb-3 border-b border-primary/20 pb-2">
            {processInline(trimmed.slice(3))}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith('# ')) {
        result.push(
          <h1 key={`h1-${pIdx}`} className="text-2xl font-bold text-foreground mt-6 mb-3">
            {processInline(trimmed.slice(2))}
          </h1>
        );
        return;
      }

      // Check for bullet lists
      if (trimmed.match(/^[-*]\s/m)) {
        const items = trimmed.split(/\n/).filter(line => line.trim());
        result.push(
          <ul key={`ul-${pIdx}`} className="space-y-2 my-3">
            {items.map((item, idx) => {
              const cleanItem = item.replace(/^[-*]\s+/, '');
              return (
                <li key={idx} className="flex items-start gap-3 text-foreground">
                  <span className="mt-2 w-2 h-2 rounded-full bg-gradient-to-br from-primary to-secondary shrink-0"></span>
                  <span className="flex-1">{processInline(cleanItem)}</span>
                </li>
              );
            })}
          </ul>
        );
        return;
      }

      // Check for numbered lists
      if (trimmed.match(/^\d+\.\s/m)) {
        const items = trimmed.split(/\n/).filter(line => line.trim());
        result.push(
          <ol key={`ol-${pIdx}`} className="space-y-2 my-3">
            {items.map((item, idx) => {
              const cleanItem = item.replace(/^\d+\.\s+/, '');
              return (
                <li key={idx} className="flex items-start gap-3 text-foreground">
                  <span className="mt-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{processInline(cleanItem)}</span>
                </li>
              );
            })}
          </ol>
        );
        return;
      }

      // Check for code blocks
      if (trimmed.startsWith('```')) {
        const codeMatch = trimmed.match(/```(\w*)\n?([\s\S]*?)```/);
        if (codeMatch) {
          result.push(
            <div key={`code-${pIdx}`} className="my-4 rounded-xl overflow-hidden border border-border/50">
              <div className="bg-muted/80 px-4 py-2 text-xs text-muted-foreground font-mono border-b border-border/50">
                {codeMatch[1] || 'code'}
              </div>
              <pre className="bg-muted/30 p-4 overflow-x-auto">
                <code className="text-sm font-mono text-foreground">{codeMatch[2].trim()}</code>
              </pre>
            </div>
          );
          return;
        }
      }

      // Check for display math
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
        const mathContent = trimmed.slice(2, -2).trim();
        result.push(
          <div key={`display-math-${pIdx}`} className="my-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
            <BlockMath math={mathContent} />
          </div>
        );
        return;
      }

      // Check for blockquotes
      if (trimmed.startsWith('>')) {
        const quoteContent = trimmed.split('\n').map(l => l.replace(/^>\s*/, '')).join('\n');
        result.push(
          <blockquote key={`quote-${pIdx}`} className="my-4 pl-4 border-l-4 border-primary bg-primary/5 py-3 pr-4 rounded-r-lg italic text-muted-foreground">
            {processInline(quoteContent)}
          </blockquote>
        );
        return;
      }

      // Regular paragraph
      result.push(
        <p key={`p-${pIdx}`} className="text-foreground leading-relaxed my-2">
          {processInline(trimmed)}
        </p>
      );
    });

    return result;
  };

  // Process inline elements (bold, italic, code, math, highlights)
  const processInline = (text: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let remaining = text;
    let keyCounter = 0;

    while (remaining.length > 0) {
      // Look for different patterns
      const patterns = [
        { regex: /\*\*\*(.+?)\*\*\*/, type: 'bolditalic' },
        { regex: /\*\*(.+?)\*\*/, type: 'bold' },
        { regex: /\*(.+?)\*/, type: 'italic' },
        { regex: /__(.+?)__/, type: 'bold' },
        { regex: /_(.+?)_/, type: 'italic' },
        { regex: /`([^`]+)`/, type: 'code' },
        { regex: /\$\$(.+?)\$\$/, type: 'displaymath' },
        { regex: /\$([^\$]+?)\$/, type: 'inlinemath' },
        { regex: /\[\[(.+?)\]\]/, type: 'highlight' },
        { regex: /==(.+?)==/, type: 'highlight' },
      ];

      let earliestMatch: { index: number; length: number; content: string; type: string } | null = null;

      for (const { regex, type } of patterns) {
        const match = remaining.match(regex);
        if (match && match.index !== undefined) {
          if (!earliestMatch || match.index < earliestMatch.index) {
            earliestMatch = {
              index: match.index,
              length: match[0].length,
              content: match[1],
              type,
            };
          }
        }
      }

      if (earliestMatch) {
        // Add text before match
        if (earliestMatch.index > 0) {
          result.push(
            <span key={`text-${keyCounter++}`}>{remaining.slice(0, earliestMatch.index)}</span>
          );
        }

        // Add formatted content
        switch (earliestMatch.type) {
          case 'bolditalic':
            result.push(
              <strong key={`bolditalic-${keyCounter++}`} className="font-bold italic text-foreground">
                {earliestMatch.content}
              </strong>
            );
            break;
          case 'bold':
            result.push(
              <strong key={`bold-${keyCounter++}`} className="font-semibold text-foreground bg-gradient-to-r from-primary/10 to-secondary/10 px-1 rounded">
                {earliestMatch.content}
              </strong>
            );
            break;
          case 'italic':
            result.push(
              <em key={`italic-${keyCounter++}`} className="italic text-muted-foreground">
                {earliestMatch.content}
              </em>
            );
            break;
          case 'code':
            result.push(
              <code key={`code-${keyCounter++}`} className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono text-primary">
                {earliestMatch.content}
              </code>
            );
            break;
          case 'displaymath':
            result.push(
              <span key={`dmath-${keyCounter++}`} className="block my-2">
                <BlockMath math={earliestMatch.content} />
              </span>
            );
            break;
          case 'inlinemath':
            result.push(
              <span key={`imath-${keyCounter++}`} className="inline-flex items-center px-1 bg-primary/10 rounded">
                <InlineMath math={earliestMatch.content} />
              </span>
            );
            break;
          case 'highlight':
            result.push(
              <mark key={`highlight-${keyCounter++}`} className="px-1.5 py-0.5 bg-gradient-to-r from-secondary/30 to-primary/30 rounded text-foreground font-medium">
                {earliestMatch.content}
              </mark>
            );
            break;
        }

        remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
      } else {
        // No more patterns, add remaining text
        result.push(<span key={`text-${keyCounter++}`}>{remaining}</span>);
        remaining = '';
      }
    }

    return result;
  };

  return (
    <div className="math-content space-y-1">
      {processContent(content)}
    </div>
  );
};
