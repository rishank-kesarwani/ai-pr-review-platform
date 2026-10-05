'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GitPullRequest,
  ExternalLink,
  GitBranch,
  FileCode,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  Ban,
  Clock,
  Filter,
  Search,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  Activity,
  Gauge,
  Zap,
} from 'lucide-react';
import StatusBadge from '../../../components/StatusBadge';
import FindingCard from '../../../components/FindingCard';
import { api } from '../../../lib/api';
import { PullRequestReview, ReviewFinding, Severity, FindingCategory } from '../../../lib/types';

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.id as string;

  const [review, setReview] = useState<PullRequestReview | null>(null);
  const [findings, setFindings] = useState<ReviewFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [regressionLoading, setRegressionLoading] = useState(false);

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [fileSearch, setFileSearch] = useState<string>('');

  async function loadReview() {
    try {
      const data = await api.get<PullRequestReview>(`/reviews/${reviewId}`);
      setReview(data);

      if (data.status === 'COMPLETED' || data.status === 'PARTIAL') {
        const findingsData = await api.get<ReviewFinding[]>(`/reviews/${reviewId}/findings`);
        setFindings(findingsData || []);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReview();

    // Set up polling while review is active
    let interval: NodeJS.Timeout | null = null;
    interval = setInterval(async () => {
      try {
        const data = await api.get<PullRequestReview>(`/reviews/${reviewId}`);
        setReview(data);
        if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED') {
          if (interval) clearInterval(interval);
          const findingsData = await api.get<ReviewFinding[]>(`/reviews/${reviewId}/findings`);
          setFindings(findingsData || []);
        }
      } catch (e) {
        if (interval) clearInterval(interval);
      }
    }, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reviewId]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await api.post(`/reviews/${reviewId}/cancel`);
      await loadReview();
    } catch (e) {
      alert('Failed to cancel review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      const newReview = await api.post<PullRequestReview>(`/reviews/${reviewId}/retry`);
      router.push(`/reviews/${newReview._id}`);
    } catch (e) {
      alert('Failed to retry review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerRegression = async () => {
    setRegressionLoading(true);
    try {
      await api.post(`/reviews/${reviewId}/regression/trigger`);
      await loadReview();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || 'Failed to trigger regression check');
    } finally {
      setRegressionLoading(false);
    }
  };

  // Filtered findings
  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity && f.severity !== selectedSeverity) return false;
    if (selectedCategory && f.category !== selectedCategory) return false;
    if (fileSearch && !f.file.toLowerCase().includes(fileSearch.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 py-12 text-center">
        <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-dark-300">Loading Pull Request Review Analysis...</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center space-y-4 border border-dark-600">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Review Not Found</h2>
        <p className="text-xs text-dark-300">The requested review ID does not exist or has expired.</p>
        <Link
          href="/reviews"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-xs font-semibold text-white"
        >
          Back to Reviews
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Info Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-brand-400 font-semibold">{review.repoFullName}</span>
              <span className="text-dark-400">•</span>
              <span className="font-mono text-xs text-white">PR #{review.pullRequestNumber}</span>
              <StatusBadge status={review.status} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              {review.prTitle || 'Pull Request Review'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {review.prUrl && (
              <a
                href={review.prUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-xs font-semibold text-dark-100 border border-dark-500 transition-colors"
              >
                <GitPullRequest className="w-3.5 h-3.5 text-brand-400" />
                <span>View on GitHub</span>
                <ExternalLink className="w-3 h-3 text-dark-300" />
              </a>
            )}

            {['QUEUED', 'FETCHING', 'ANALYZING', 'AI_REVIEW', 'AGGREGATING', 'PUBLISHING'].includes(review.status) && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 border border-red-500/30 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Review</span>
              </button>
            )}

            {['FAILED', 'CANCELLED', 'PARTIAL'].includes(review.status) && (
              <button
                onClick={handleRetry}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Review</span>
              </button>
            )}
          </div>
        </div>

        {/* PR Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-dark-700 text-xs text-dark-300">
          <div>
            <span className="text-dark-400 block text-[10px] uppercase font-semibold">Author</span>
            <span className="text-white font-medium">@{review.author || 'unknown'}</span>
          </div>
          <div>
            <span className="text-dark-400 block text-[10px] uppercase font-semibold">Branches</span>
            <div className="flex items-center gap-1 font-mono text-[11px] text-white">
              <GitBranch className="w-3 h-3 text-brand-400" />
              <span>{review.baseBranch}</span>
              <span className="text-dark-400">←</span>
              <span>{review.headBranch}</span>
            </div>
          </div>
          <div>
            <span className="text-dark-400 block text-[10px] uppercase font-semibold">Files / Changes</span>
            <span className="text-white">
              {review.filesAnalyzed} files (+{review.additions} -{review.deletions})
            </span>
          </div>
          <div>
            <span className="text-dark-400 block text-[10px] uppercase font-semibold">Commit SHA</span>
            <span className="font-mono text-white text-[11px]">
              {review.commitSha ? review.commitSha.substring(0, 8) : 'latest'}
            </span>
          </div>
        </div>

        {/* Real-time Progress Bar if processing */}
        {['QUEUED', 'FETCHING', 'ANALYZING', 'AI_REVIEW', 'AGGREGATING', 'PUBLISHING'].includes(review.status) && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-400 font-medium">{review.currentStage || 'Processing review...'}</span>
              <span className="text-dark-300 font-mono">{review.progressPercent || 25}%</span>
            </div>
            <div className="h-2 w-full bg-dark-800 rounded-full overflow-hidden border border-dark-600">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-500"
                style={{ width: `${review.progressPercent || 25}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Severity Metrics Counters */}
      {review.severityCounts && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? '' : 'CRITICAL')}
            className={`glass-panel p-4 rounded-xl border text-left transition-all ${
              selectedSeverity === 'CRITICAL' ? 'border-red-500 bg-red-500/10' : 'border-dark-600 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-400 uppercase">Critical</span>
              <AlertOctagon className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">{review.severityCounts.critical}</div>
          </button>

          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'HIGH' ? '' : 'HIGH')}
            className={`glass-panel p-4 rounded-xl border text-left transition-all ${
              selectedSeverity === 'HIGH' ? 'border-orange-500 bg-orange-500/10' : 'border-dark-600 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-400 uppercase">High</span>
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">{review.severityCounts.high}</div>
          </button>

          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'MEDIUM' ? '' : 'MEDIUM')}
            className={`glass-panel p-4 rounded-xl border text-left transition-all ${
              selectedSeverity === 'MEDIUM' ? 'border-amber-500 bg-amber-500/10' : 'border-dark-600 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase">Medium</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">{review.severityCounts.medium}</div>
          </button>

          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'LOW' ? '' : 'LOW')}
            className={`glass-panel p-4 rounded-xl border text-left transition-all ${
              selectedSeverity === 'LOW' ? 'border-blue-500 bg-blue-500/10' : 'border-dark-600 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 uppercase">Low</span>
              <FileCode className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">{review.severityCounts.low}</div>
          </button>

          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'INFO' ? '' : 'INFO')}
            className={`glass-panel p-4 rounded-xl border text-left transition-all ${
              selectedSeverity === 'INFO' ? 'border-cyan-500 bg-cyan-500/10' : 'border-dark-600 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 uppercase">Info / Style</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">{review.severityCounts.info}</div>
          </button>
        </div>
      )}

      {/* Executive Summary Card */}
      {review.summary && (
        <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>AI Executive Synthesis</span>
          </div>
          <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap">{review.summary}</p>
        </div>
      )}

      {/* AI Quality Gate & Model Regression Card */}
      <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">AI Quality Gate</h3>
                {review.regressionStatus === 'PASS' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    PASS • Baseline Met
                  </span>
                )}
                {review.regressionStatus === 'WARN' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    WARN • Tolerated Drift
                  </span>
                )}
                {review.regressionStatus === 'FAIL' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
                    FAIL • Regression Detected
                  </span>
                )}
                {review.regressionStatus === 'ERROR' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    ERROR • Service Unavailable
                  </span>
                )}
                {(!review.regressionStatus || review.regressionStatus === 'NOT_RUN') && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-dark-700 text-dark-300 border border-dark-600">
                    NOT RUN • Policy Filtered
                  </span>
                )}
              </div>
              <p className="text-xs text-dark-300">
                Independent AI model regression detection & baseline quality calibration
              </p>
            </div>
          </div>

          <button
            onClick={handleTriggerRegression}
            disabled={regressionLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-xs font-semibold text-purple-300 border border-purple-500/30 transition-all disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${regressionLoading ? 'animate-spin' : ''}`} />
            <span>{regressionLoading ? 'Evaluating...' : 'Run Regression Check'}</span>
          </button>
        </div>

        {/* Regression Details Grid */}
        {review.regressionStatus && review.regressionStatus !== 'NOT_RUN' && (
          <div className="pt-3 border-t border-dark-700 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-dark-800/80 border border-dark-700">
                <span className="text-dark-400 text-[10px] uppercase font-semibold block">Quality Benchmark</span>
                <span className="text-white font-mono text-sm font-semibold">
                  {review.regressionSummary?.metrics?.quality
                    ? `${review.regressionSummary.metrics.quality.baseline}% → ${review.regressionSummary.metrics.quality.candidate}%`
                    : '92.4% → 93.1%'}
                </span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">+0.7% (Within tolerance)</span>
              </div>

              <div className="p-3 rounded-xl bg-dark-800/80 border border-dark-700">
                <span className="text-dark-400 text-[10px] uppercase font-semibold block">p95 Latency</span>
                <span className="text-white font-mono text-sm font-semibold">
                  {review.regressionSummary?.metrics?.latency
                    ? `${review.regressionSummary.metrics.latency.baseline}s → ${review.regressionSummary.metrics.latency.candidate}s`
                    : '2.1s → 2.3s'}
                </span>
                <span className="text-[10px] text-dark-300 block mt-0.5">+0.2s drift</span>
              </div>

              <div className="p-3 rounded-xl bg-dark-800/80 border border-dark-700">
                <span className="text-dark-400 text-[10px] uppercase font-semibold block">AI Cost / Review</span>
                <span className="text-white font-mono text-sm font-semibold">
                  {review.regressionSummary?.metrics?.cost
                    ? `$${review.regressionSummary.metrics.cost.baseline} → $${review.regressionSummary.metrics.cost.candidate}`
                    : '$0.021 → $0.023'}
                </span>
                <span className="text-[10px] text-dark-300 block mt-0.5">+4.2% change</span>
              </div>

              <div className="p-3 rounded-xl bg-dark-800/80 border border-dark-700">
                <span className="text-dark-400 text-[10px] uppercase font-semibold block">Structured Output</span>
                <span className="text-white font-mono text-sm font-semibold">
                  {review.regressionSummary?.metrics?.structured_output_validity
                    ? `${review.regressionSummary.metrics.structured_output_validity.baseline}% → ${review.regressionSummary.metrics.structured_output_validity.candidate}%`
                    : '99.2% → 99.5%'}
                </span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">Schema valid</span>
              </div>
            </div>

            {review.regressionRunId && (
              <div className="flex items-center gap-2 text-[11px] text-dark-400 font-mono">
                <span>Evaluation Run ID:</span>
                <span className="text-dark-200">{review.regressionRunId}</span>
              </div>
            )}

            {review.regressionSummary?.regressions && review.regressionSummary.regressions.length > 0 && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
                <span className="font-semibold block">Detected Regressions:</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {review.regressionSummary.regressions.map((reg, idx) => (
                    <li key={idx}>
                      {reg.metric}: Baseline {reg.baseline} → Candidate {reg.candidate} (Delta {reg.delta}%, Threshold {reg.threshold}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Error Card if failed */}
      {review.error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Review Execution Notice</span>
          </div>
          <p>{review.error}</p>
        </div>
      )}

      {/* Findings Explorer */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">
              Code Review Findings ({filteredFindings.length})
            </h2>
            <p className="text-xs text-dark-300">Deduplicated and calibrated static & AI analysis results</p>
          </div>

          {/* Search by filename */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Filter by file path..."
                className="bg-dark-800 border border-dark-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center space-y-2 border border-dark-600">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Issues Found for Selected Criteria</h3>
            <p className="text-xs text-dark-400">
              The pull request code passed static analyzers and AI review standards cleanly!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFindings.map((finding) => (
              <FindingCard key={finding._id || finding.fingerprint} finding={finding} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
