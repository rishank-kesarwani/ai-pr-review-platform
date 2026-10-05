import React from 'react';
import { Severity } from '../lib/types';
import { AlertOctagon, AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

interface SeverityBadgeProps {
  severity: Severity;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function SeverityBadge({ severity, showIcon = true, size = 'md' }: SeverityBadgeProps) {
  const styles: Record<Severity, { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
    CRITICAL: {
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      border: 'border-red-500/30',
      icon: AlertOctagon,
    },
    HIGH: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      icon: AlertTriangle,
    },
    MEDIUM: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: AlertCircle,
    },
    LOW: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      icon: Info,
    },
    INFO: {
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      icon: Info,
    },
  };

  const current = styles[severity] || styles.INFO;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{severity}</span>
    </span>
  );
}
