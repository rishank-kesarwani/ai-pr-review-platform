import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = '', size = 36, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>

          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <linearGradient id="logoSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>

          <linearGradient id="logoBranchGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
        </defs>

        {/* Container Squircle Background */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          fill="#0f172a"
          stroke="rgba(99, 102, 241, 0.45)"
          strokeWidth="1.5"
        />
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="15"
          fill="url(#logoBgGrad)"
          fillOpacity="0.28"
        />

        {/* Inner Ambient Glow */}
        <circle cx="32" cy="32" r="22" fill="#6366f1" fillOpacity="0.15" filter="url(#logoGlow)" />

        {/* Base Trunk Branch Line */}
        <line
          x1="22"
          y1="16"
          x2="22"
          y2="48"
          stroke="url(#logoBranchGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* PR Merge Curve */}
        <path
          d="M 22 44 C 22 32, 42 36, 42 26 V 18"
          stroke="url(#logoSparkGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pull Request Nodes */}
        <circle cx="22" cy="18" r="4.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
        <circle cx="22" cy="46" r="4.5" fill="#0f172a" stroke="#818cf8" strokeWidth="3" />
        <circle cx="42" cy="20" r="4.5" fill="#0f172a" stroke="#f43f5e" strokeWidth="3" />

        {/* AI Intelligence Sparkle Star */}
        <path
          d="M 45 10 C 45 14, 49 14, 49 14 C 49 14, 45 14, 45 18 C 45 14, 41 14, 41 14 C 41 14, 45 14, 45 10 Z"
          fill="#38bdf8"
          filter="url(#logoGlow)"
        />
        <circle cx="45" cy="14" r="1.5" fill="#ffffff" />

        {/* Subtle Accent Glow */}
        <path
          d="M 31 31 C 31 33.5, 33.5 33.5, 33.5 33.5 C 33.5 33.5, 31 33.5, 31 36 C 31 33.5, 28.5 33.5, 28.5 33.5 C 28.5 33.5, 31 33.5, 31 31 Z"
          fill="#a855f7"
        />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-tight text-white group-hover:text-brand-400 transition-colors">
            AI PR Review
          </span>
          <span className="text-[10px] text-dark-300 font-mono tracking-wider">
            ENTERPRISE PLATFORM
          </span>
        </div>
      )}
    </div>
  );
}
