import React, { useState } from 'react';
import { Copy, Check, RefreshCw, Download } from 'lucide-react';

interface ResponseActionsProps {
  content: string;
  onRegenerate?: () => void;
  onExport?: () => void;
}

export const ResponseActions: React.FC<ResponseActionsProps> = ({
  content,
  onRegenerate,
  onExport,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 hover:text-slate-200 text-xs transition-colors cursor-pointer"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          title="Regenerate response"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Regenerate</span>
        </button>
      )}

      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          title="Export markdown"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      )}
    </div>
  );
};
