import React from 'react';
import { ReviewStatus } from '../lib/types';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ReviewStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const configs: Record<ReviewStatus, { bg: string; text: string; border: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
    QUEUED: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      label: 'Queued',
      icon: Clock,
    },
    FETCHING: {
      bg: 'bg-sky-500/15',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
      label: 'Fetching PR',
      icon: RefreshCw,
    },
    ANALYZING: {
      bg: 'bg-purple-500/15',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      label: 'Static Analysis',
      icon: RefreshCw,
    },
    AI_REVIEW: {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      label: 'AI Inspection',
      icon: RefreshCw,
    },
    AGGREGATING: {
      bg: 'bg-yellow-500/15',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      label: 'Arbitrating',
      icon: RefreshCw,
    },
    PUBLISHING: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      label: 'Publishing',
      icon: RefreshCw,
    },
    COMPLETED: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      label: 'Completed',
      icon: CheckCircle2,
    },
    PARTIAL: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      label: 'Partial',
      icon: AlertCircle,
    },
    FAILED: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      label: 'Failed',
      icon: XCircle,
    },
    CANCELLED: {
      bg: 'bg-zinc-500/15',
      text: 'text-zinc-400',
      border: 'border-zinc-500/30',
      label: 'Cancelled',
      icon: XCircle,
    },
  };

  const current = configs[status] || configs.QUEUED;
  const Icon = current.icon;
  const isSpinning = ['FETCHING', 'ANALYZING', 'AI_REVIEW', 'AGGREGATING', 'PUBLISHING'].includes(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${current.bg} ${current.text} ${current.border}`}
    >
      <Icon className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
      <span>{current.label}</span>
    </span>
  );
}
