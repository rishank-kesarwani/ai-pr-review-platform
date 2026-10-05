'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GitPullRequest, Search, Filter, ArrowRight, Clock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../lib/api';
import { PullRequestReview, ReviewStatus } from '../../lib/types';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<PullRequestReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchReviews() {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.repoFullName = searchQuery;

      const data = await api.get<{ reviews: PullRequestReview[]; pagination: { totalPages: number } }>(
        '/reviews',
        params,
      );
      setReviews(data.reviews || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const statuses: { label: string; value: string }[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Analyzing / In Progress', value: 'ANALYZING' },
    { label: 'Queued', value: 'QUEUED' },
    { label: 'Failed', value: 'FAILED' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Review Explorer</h1>
          <p className="text-xs sm:text-sm text-dark-300">
            Browse, inspect, and filter automated AI code reviews across public and connected repositories
          </p>
        </div>
        <button
          onClick={() => fetchReviews()}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-dark-200 border border-dark-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by repository (e.g. facebook/react)..."
            className="w-full bg-dark-800 border border-dark-600 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-dark-400 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-dark-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-5 space-y-4 animate-pulse border border-dark-600">
              <div className="h-4 bg-dark-700 rounded w-2/3" />
              <div className="h-3 bg-dark-700 rounded w-full" />
              <div className="h-6 bg-dark-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border border-dark-600">
          <GitPullRequest className="w-10 h-10 text-dark-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Pull Request Reviews Found</h3>
          <p className="text-xs text-dark-300 max-w-sm mx-auto">
            Try adjusting your search criteria or submit a new PR URL from the home page.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-colors"
          >
            <span>Trigger New Review</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review) => (
            <Link
              key={review._id}
              href={`/reviews/${review._id}`}
              className="glass-panel glass-panel-hover rounded-xl p-5 border border-dark-600 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-brand-400 font-semibold group-hover:text-brand-300">
                    {review.repoFullName} #{review.pullRequestNumber}
                  </span>
                  <StatusBadge status={review.status} />
                </div>
                <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                  {review.prTitle || 'Pull Request Review'}
                </h3>
              </div>

              <div className="space-y-3 pt-2 border-t border-dark-700 text-xs text-dark-300">
                <div className="flex items-center justify-between">
                  <span>Author: @{review.author || 'unknown'}</span>
                  <span className="font-mono text-[11px] text-dark-400">
                    {review.commitSha ? review.commitSha.substring(0, 7) : 'head'}
                  </span>
                </div>

                {review.severityCounts && (
                  <div className="flex items-center justify-between bg-dark-800/60 p-2 rounded-lg border border-dark-700 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {review.severityCounts.critical > 0 && (
                        <span className="text-red-400 font-semibold">{review.severityCounts.critical} Crit</span>
                      )}
                      {review.severityCounts.high > 0 && (
                        <span className="text-orange-400 font-semibold">{review.severityCounts.high} High</span>
                      )}
                      {review.severityCounts.medium > 0 && (
                        <span className="text-amber-400">{review.severityCounts.medium} Med</span>
                      )}
                      {review.severityCounts.low > 0 && (
                        <span className="text-blue-400">{review.severityCounts.low} Low</span>
                      )}
                    </div>
                    <span className="font-semibold text-white">{review.severityCounts.total} findings</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 disabled:opacity-40 text-xs font-semibold text-white border border-dark-600 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-dark-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 disabled:opacity-40 text-xs font-semibold text-white border border-dark-600 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
