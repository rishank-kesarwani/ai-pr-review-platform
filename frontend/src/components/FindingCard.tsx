'use client';

import React, { useState } from 'react';
import { ReviewFinding } from '../lib/types';
import SeverityBadge from './SeverityBadge';
import { FileCode, Check, Copy, ExternalLink, ShieldCheck, Tag, Lightbulb, AlertTriangle } from 'lucide-react';

interface FindingCardProps {
  finding: ReviewFinding;
}

export default function FindingCard({ finding }: FindingCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(finding.recommendation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidencePct = Math.round(finding.confidence * 100);

  return (
    <div className="glass-panel rounded-xl p-5 border border-dark-600 hover:border-dark-500 transition-all space-y-4">
      {/* Top row: Badges, Category, Source, Confidence */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} size="md" />
          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-dark-700 text-dark-200 border border-dark-600">
            {finding.category}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
            {finding.source}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-dark-300 bg-dark-700/50 px-2.5 py-1 rounded-md border border-dark-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">{confidencePct}%</span>
            <span>Confidence</span>
          </div>
        </div>
      </div>

      {/* Title & File Location */}
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-white tracking-tight">{finding.title}</h4>
        <div className="flex items-center gap-1.5 text-xs text-brand-400 font-mono">
          <FileCode className="w-3.5 h-3.5" />
          <span>{finding.file}</span>
          {finding.line && (
            <span className="text-dark-300">
              : lines {finding.line}{finding.endLine && finding.endLine !== finding.line ? `-${finding.endLine}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-dark-200 leading-relaxed">{finding.description}</p>

      {/* Evidence Snippet (if available) */}
      {finding.evidence && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-xs font-semibold text-dark-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Evidenced in Diff:</span>
          </div>
          <pre className="p-3 rounded-lg bg-dark-900 border border-dark-700 text-xs font-mono text-amber-300/90 overflow-x-auto">
            <code>{finding.evidence}</code>
          </pre>
        </div>
      )}

      {/* Actionable Recommendation */}
      <div className="space-y-2 pt-2 border-t border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Lightbulb className="w-4 h-4" />
            <span>Actionable Recommendation:</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-dark-300 hover:text-white bg-dark-700/60 hover:bg-dark-700 rounded border border-dark-600 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Fix</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-100/90 leading-relaxed whitespace-pre-wrap font-sans">
          {finding.recommendation}
        </div>
      </div>
    </div>
  );
}
