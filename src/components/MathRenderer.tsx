import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
}

export const MathRenderer = ({ content }: MathRendererProps) => {
  // Handle empty or undefined content
  if (!content) {
    return <span>No content</span>;
  }

  // Split content by display math ($$...$$) and inline math ($...$)
  const parts: Array<{ type: 'text' | 'inline' | 'display'; content: string }> = [];
  
  let remaining = content;
  
  while (remaining.length > 0) {
    // Look for display math
    const displayMatch = remaining.match(/\$\$(.*?)\$\$/s);
    const inlineMatch = remaining.match(/\$([^\$]+?)\$/);
    
    if (displayMatch && (!inlineMatch || displayMatch.index! < inlineMatch.index!)) {
      // Found display math first
      if (displayMatch.index! > 0) {
        parts.push({ type: 'text', content: remaining.slice(0, displayMatch.index) });
      }
      parts.push({ type: 'display', content: displayMatch[1] });
      remaining = remaining.slice(displayMatch.index! + displayMatch[0].length);
    } else if (inlineMatch) {
      // Found inline math
      if (inlineMatch.index! > 0) {
        parts.push({ type: 'text', content: remaining.slice(0, inlineMatch.index) });
      }
      parts.push({ type: 'inline', content: inlineMatch[1] });
      remaining = remaining.slice(inlineMatch.index! + inlineMatch[0].length);
    } else {
      // No more math
      parts.push({ type: 'text', content: remaining });
      remaining = '';
    }
  }
  
  return (
    <div className="math-content">
      {parts.map((part, i) => {
        if (part.type === 'display') {
          return (
            <div key={i} className="my-4">
              <BlockMath math={part.content} />
            </div>
          );
        } else if (part.type === 'inline') {
          return (
            <span key={i} className="katex-inline">
              <InlineMath math={part.content} />
            </span>
          );
        } else {
          // Render text content with line breaks
          return (
            <span key={i}>
              {part.content.split('\n').map((line, lineIdx, arr) => (
                <span key={`${i}-${lineIdx}`}>
                  {line}
                  {lineIdx < arr.length - 1 && <br />}
                </span>
              ))}
            </span>
          );
        }
      })}
    </div>
  );
};