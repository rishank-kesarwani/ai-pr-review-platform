'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Github, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { PullRequestReview } from '../lib/types';

export default function PrReviewForm() {
  const router = useRouter();
  const [prUrl, setPrUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const samplePrs = [
    { label: 'React #28000', url: 'https://github.com/facebook/react/pull/28000' },
    { label: 'Next.js #60000', url: 'https://github.com/vercel/next.js/pull/60000' },
    { label: 'NestJS #13000', url: 'https://github.com/nestjs/nest/pull/13000' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const review = await api.post<PullRequestReview>('/reviews', {
        prUrl: prUrl.trim(),
      });
      router.push(`/reviews/${review._id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to submit Pull Request for review',
      );
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-dark-800/90 border border-dark-600 shadow-2xl backdrop-blur-xl focus-within:border-brand-500 transition-all">
          <div className="flex-1 flex items-center gap-3 px-3">
            <Github className="w-5 h-5 text-dark-300 flex-shrink-0" />
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="Paste GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)"
              className="w-full bg-transparent text-sm text-white placeholder-dark-300 focus:outline-none"
              disabled={loading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !prUrl.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Queuing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Review PR</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sample PR buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-dark-300">
        <span className="font-medium">Try Sample PR:</span>
        {samplePrs.map((sample) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => setPrUrl(sample.url)}
            className="px-2.5 py-1 rounded-lg bg-dark-700/60 hover:bg-dark-700 text-dark-200 hover:text-brand-400 border border-dark-600 transition-colors"
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
}
