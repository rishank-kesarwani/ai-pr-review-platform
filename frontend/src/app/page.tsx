'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldAlert,
  Cpu,
  GitBranch,
  Layers,
  Zap,
  CheckCircle2,
  ArrowRight,
  Code2,
  GitPullRequest,
  Check,
  Chrome,
} from 'lucide-react';
import PrReviewForm from '../components/PrReviewForm';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import { api } from '../lib/api';
import { PullRequestReview } from '../lib/types';

export default function HomePage() {
  const [recentReviews, setRecentReviews] = useState<PullRequestReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        const data = await api.get<{ reviews: PullRequestReview[] }>('/reviews', { limit: 5 });
        setRecentReviews(data.reviews || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  const features = [
    {
      icon: ShieldAlert,
      title: 'Deep AST & Static Analysis',
      desc: 'Pre-screens code using sandboxed AST parsers, ESLint rules, and TypeScript compilers to detect syntax flaws, floating promises, and dangerous dynamic code.',
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
    },
    {
      icon: Cpu,
      title: 'Context-Aware AI Review',
      desc: 'Invokes the centralized AI Platform with complete diff context, repository rules, and static signals to uncover complex logic bugs and concurrency traps.',
      color: 'from-brand-500/20 to-purple-500/20 text-brand-400 border-brand-500/30',
    },
    {
      icon: Layers,
      title: 'Finding Arbitration & Calibration',
      desc: 'Eliminates duplicate issues across static & AI engines, verifies diff evidence to prevent hallucinations, and strictly calibrates severity levels.',
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      icon: GitPullRequest,
      title: 'GitHub Checks & PR Comments',
      desc: 'Integrates natively via GitHub App to publish granular check run annotations and configurable line-by-line review comments with zero PR spam.',
      color: 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
    },
    {
      icon: Zap,
      title: 'BullMQ Distributed Processing',
      desc: 'Processes reviews asynchronously via resilient Redis queues with automatic exponential backoff retries, timeouts, and live job cancellation.',
      color: 'from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30',
    },
    {
      icon: Chrome,
      title: 'Manifest V3 Chrome Extension',
      desc: 'Review any PR with a single click directly inside GitHub. View real-time findings, severity breakdowns, and jump directly to the dashboard.',
      color: 'from-violet-500/20 to-indigo-500/20 text-violet-400 border-violet-500/30',
    },
  ];

  return (
    <div className="space-y-20 py-4">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8 pb-4 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold tracking-wide animate-pulse-slow">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Next-Generation Autonomous Pull Request Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Supercharge Code Reviews with{' '}
          <span className="gradient-text">Deterministic AI & AST Analysis</span>
        </h1>

        <p className="text-base sm:text-lg text-dark-300 max-w-2xl mx-auto leading-relaxed">
          Automate PR quality gates with multi-stage static analysis, hallucination-controlled AI code inspection,
          and seamless GitHub check annotations.
        </p>

        {/* PR URL Input Form */}
        <div className="pt-4">
          <PrReviewForm />
        </div>
      </section>

      {/* Feature Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Engineered for Production Reliability</h2>
          <p className="text-xs sm:text-sm text-dark-300">
            A hardened distributed architecture designed to replace superficial code linters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-3.5 border border-dark-600"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center border ${feat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">{feat.title}</h3>
                <p className="text-xs text-dark-300 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Reviews Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Recent Pull Request Reviews</h2>
            <p className="text-xs text-dark-300">Live feed of public and repository PR reviews processed by the platform</p>
          </div>
          <Link
            href="/reviews"
            className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="glass-panel rounded-2xl border border-dark-600 overflow-hidden divide-y divide-dark-700">
          {loading ? (
            <div className="p-8 text-center text-xs text-dark-300 animate-pulse">Loading recent reviews...</div>
          ) : recentReviews.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Code2 className="w-8 h-8 text-dark-400 mx-auto" />
              <p className="text-sm text-dark-200 font-medium">No reviews recorded yet.</p>
              <p className="text-xs text-dark-400">Paste any public GitHub Pull Request URL above to start your first review!</p>
            </div>
          ) : (
            recentReviews.map((rev) => (
              <Link
                key={rev._id}
                href={`/reviews/${rev._id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-dark-700/50 transition-colors gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white hover:text-brand-400 transition-colors">
                      {rev.repoFullName} #{rev.pullRequestNumber}
                    </span>
                    <StatusBadge status={rev.status} />
                  </div>
                  <p className="text-xs text-dark-300 line-clamp-1">{rev.prTitle}</p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {rev.severityCounts && (
                    <div className="flex items-center gap-1.5">
                      {rev.severityCounts.critical > 0 && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                          {rev.severityCounts.critical} Crit
                        </span>
                      )}
                      {rev.severityCounts.high > 0 && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {rev.severityCounts.high} High
                        </span>
                      )}
                      <span className="text-dark-400">
                        {rev.severityCounts.total} findings
                      </span>
                    </div>
                  )}
                  <span className="text-dark-400 hidden md:inline">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                  <ArrowRight className="w-4 h-4 text-dark-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
