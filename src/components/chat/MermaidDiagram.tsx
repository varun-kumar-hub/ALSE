import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, Copy, Check, Code2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface MermaidDiagramProps {
  chart: string;
}

/**
 * Removes any stray DOM error containers Mermaid might have injected into document.body
 */
function cleanStrayMermaidErrors() {
  try {
    const strayElements = document.querySelectorAll(
      'body > [id^="dmermaid"], body > [id^="mermaid-"], body > svg.error-icon, body > svg[aria-roledescription="error"]'
    );
    strayElements.forEach((el) => {
      el.remove();
    });
  } catch {
    // Ignore DOM cleanup errors
  }
}

/**
 * Deeply sanitizes and repairs Mermaid diagram syntax to ensure flawless rendering.
 */
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
    .replace(/->/g, '-->')
    .replace(/<—/g, '<--')
    .replace(/←/g, '<--');

  // Strip markdown bold / italics inside node text: e.g. **text** -> text
  chart = chart.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

  // Fix HTML line breaks <br> / <br/> inside labels
  chart = chart.replace(/<br\s*\/?>/gi, ' ');

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

  // Clean lines and ensure diagram header exists
  const lines = chart.split('\n').map((l) => l.trimEnd()).filter(Boolean);
  if (lines.length === 0) return '';

  const headerMatch = lines[0].match(
    /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|pie|gantt|mindmap|gitGraph|C4Context)\b/i
  );

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
  const [viewSource, setViewSource] = useState(false);
  const { theme } = useAppStore();

  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        securityLevel: 'loose',
        fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
        theme: theme === 'dark' ? 'dark' : 'neutral',
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
      // Ignore initialization errors
    }
  }, [theme]);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (!chart || !chart.trim()) return;

      const sanitized = sanitizeMermaidChart(chart);
      const uniqueId = `mermaid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      cleanStrayMermaidErrors();

      try {
        // First validate syntax with parse
        await mermaid.parse(sanitized);

        // If parse succeeds, render clean SVG
        const { svg } = await mermaid.render(uniqueId, sanitized);
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch {
        // Fallback Pass: aggressive repair
        try {
          cleanStrayMermaidErrors();

          const fallbackId = `mermaid_fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const aggressive = sanitized
            .replace(/[()]/g, '')
            .replace(/—>/g, '-->')
            .replace(/→/g, '-->');
          const finalClean = sanitizeMermaidChart(aggressive);

          await mermaid.parse(finalClean);
          const { svg } = await mermaid.render(fallbackId, finalClean);

          if (isMounted) {
            setSvgContent(svg);
            setError(null);
          }
        } catch {
          cleanStrayMermaidErrors();
          if (isMounted) {
            setError('Diagram rendered as structured code view');
          }
        }
      } finally {
        cleanStrayMermaidErrors();
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
      cleanStrayMermaidErrors();
    };
  }, [chart, theme]);

  const handleCopySource = async () => {
    await navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (error || !svgContent) {
    return (
      <div className="my-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden text-xs font-mono shadow-2xs">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-100/70 dark:bg-zinc-850/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
          <span className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
            <Code2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Workflow & Process Diagram</span>
          </span>
          <button
            type="button"
            onClick={handleCopySource}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer text-[10px]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-3 text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs overflow-hidden select-none group/mermaid">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 text-[11px] font-mono text-zinc-500">
        <span className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200">
          <Network className="w-4 h-4 text-blue-500" />
          <span>Scientific Visual Diagram</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewSource(!viewSource)}
            className="px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer text-[10px] font-medium"
          >
            {viewSource ? 'Hide Source' : 'View Source'}
          </button>
          <button
            type="button"
            onClick={handleCopySource}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer text-[10px] font-medium"
            title="Copy Mermaid Source"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {viewSource && (
        <div className="p-3 bg-zinc-950 text-zinc-200 border-b border-zinc-800 text-xs font-mono overflow-x-auto">
          <pre>{chart}</pre>
        </div>
      )}

      {/* SVG Container */}
      <div
        ref={containerRef}
        className="p-5 flex items-center justify-center overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
