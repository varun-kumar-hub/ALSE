import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, AlertCircle, Copy, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface MermaidDiagramProps {
  chart: string;
}

export function sanitizeMermaidChart(rawChart: string): string {
  if (!rawChart) return '';
  let chart = rawChart.trim();

  // Strip wrapping ```mermaid and ``` backticks if present
  chart = chart.replace(/^```(?:mermaid)?\s*\n?/i, '').replace(/\n?```$/i, '').trim();

  // Replace unicode and stylized arrows with standard mermaid arrows
  chart = chart
    .replace(/[—–-]{2,}>/g, '-->')
    .replace(/—>/g, '-->')
    .replace(/⟶/g, '-->')
    .replace(/→/g, '-->')
    .replace(/->/g, '-->');

  // Strip markdown bold / italics inside node text: e.g. **text** -> text
  chart = chart.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

  // Auto-quote square bracket node labels: A[Source Code (.py)] -> A["Source Code (.py)"]
  chart = chart.replace(/([a-zA-Z0-9_]+)\[\s*([^"\]\n][^\]\n]*?)\s*\]/g, (_match, id, label) => {
    const cleanLabel = label.replace(/"/g, "'").trim();
    return `${id}["${cleanLabel}"]`;
  });

  // Auto-quote parentheses node labels: A(Some text) -> A("Some text")
  chart = chart.replace(/([a-zA-Z0-9_]+)\(\s*([^"\)\n(][^\)\n]*?)\s*\)/g, (_match, id, label) => {
    const cleanLabel = label.replace(/"/g, "'").trim();
    return `${id}("${cleanLabel}")`;
  });

  // Auto-quote curly braces / diamond decision labels: A{Decision?} -> A{"Decision?"}
  chart = chart.replace(/([a-zA-Z0-9_]+)\{\s*([^"\}\n][^\}\n]*?)\s*\}/g, (_match, id, label) => {
    const cleanLabel = label.replace(/"/g, "'").trim();
    return `${id}{"${cleanLabel}"}`;
  });

  // Ensure diagram type header exists (default to flowchart TD if not present)
  const headerMatch = chart.match(/^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|pie|gantt|mindmap|gitGraph|C4Context)\b/i);
  if (!headerMatch) {
    chart = `flowchart TD\n${chart}`;
  }

  return chart;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { theme } = useAppStore();

  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'neutral',
        securityLevel: 'loose',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        themeVariables: {
          primaryColor: theme === 'dark' ? '#27272a' : '#f4f4f5',
          primaryTextColor: theme === 'dark' ? '#fafafa' : '#09090b',
          primaryBorderColor: theme === 'dark' ? '#3f3f46' : '#e4e4e7',
          lineColor: theme === 'dark' ? '#a1a1aa' : '#71717a',
          secondaryColor: theme === 'dark' ? '#18181b' : '#ffffff',
          tertiaryColor: theme === 'dark' ? '#18181b' : '#ffffff',
        },
      });
    } catch {
      // Ignore if already initialized
    }
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!chart.trim()) return;
      const sanitized = sanitizeMermaidChart(chart);
      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

      try {
        setError(null);
        const { svg } = await mermaid.render(id, sanitized);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (firstErr: any) {
        // Fallback pass: clean unescaped delimiters and re-render
        try {
          const fallbackId = `mermaid-fb-${Math.random().toString(36).substring(2, 9)}`;
          const aggressive = sanitized
            .replace(/[()]/g, '')
            .replace(/—>/g, '-->')
            .replace(/→/g, '-->');
          const finalClean = sanitizeMermaidChart(aggressive);
          const { svg } = await mermaid.render(fallbackId, finalClean);
          if (isMounted) {
            setSvgContent(svg);
            setError(null);
          }
        } catch (finalErr: any) {
          if (isMounted) {
            setError(firstErr?.message || finalErr?.message || 'Failed to render scientific diagram.');
          }
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [chart, theme]);

  const handleCopySource = async () => {
    await navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (error) {
    return (
      <div className="my-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-xs font-mono">
        <div className="flex items-center justify-between text-zinc-500 pb-2">
          <span className="flex items-center gap-1.5 text-rose-500 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" /> Diagram Syntax Notice
          </span>
          <button
            type="button"
            onClick={handleCopySource}
            className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            {copied ? 'Copied' : 'Copy Code'}
          </button>
        </div>
        <pre className="text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xs overflow-hidden select-none group/mermaid">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 text-[11px] font-mono text-zinc-500">
        <span className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
          <Network className="w-3.5 h-3.5 text-zinc-500" />
          <span>Scientific Visual Diagram</span>
        </span>
        <button
          type="button"
          onClick={handleCopySource}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer text-[10px]"
          title="Copy Mermaid Source"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Source'}</span>
        </button>
      </div>

      <div
        ref={containerRef}
        className="p-4 flex items-center justify-center overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
