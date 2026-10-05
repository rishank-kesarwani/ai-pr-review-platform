'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderGit2, Plus, ExternalLink, ShieldCheck, Settings, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { RepositoryItem } from '../../lib/types';

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<RepositoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRepos() {
      try {
        const data = await api.get<RepositoryItem[]>('/repositories');
        setRepositories(data || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadRepos();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Connected Repositories</h1>
          <p className="text-xs sm:text-sm text-dark-300">
            Configure automated GitHub App webhooks, static analyzers, and review policies
          </p>
        </div>

        <a
          href="https://github.com/apps/ai-pr-review-assistant/installations/new"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Install GitHub App</span>
          <ExternalLink className="w-3 h-3 text-brand-200" />
        </a>
      </div>

      {/* Repositories List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-5 space-y-3 animate-pulse border border-dark-600">
              <div className="h-4 bg-dark-700 rounded w-1/2" />
              <div className="h-3 bg-dark-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : repositories.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-4 border border-dark-600">
          <FolderGit2 className="w-10 h-10 text-dark-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Connected GitHub Repositories Yet</h3>
          <p className="text-xs text-dark-300 max-w-md mx-auto">
            Install our GitHub App on your organization or user account to automatically trigger reviews on every pull request.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-xs font-semibold text-white border border-dark-500 transition-colors"
            >
              <span>Review Public PR Without App</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {repositories.map((repo) => (
            <div
              key={repo._id}
              className="glass-panel rounded-xl p-5 border border-dark-600 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-brand-400 font-semibold">{repo.fullName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">{repo.name}</h3>
                <p className="text-xs text-dark-300">Default branch: <span className="font-mono text-dark-200">{repo.defaultBranch}</span></p>
              </div>

              <div className="pt-3 border-t border-dark-700 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-dark-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                  <span>Analyzers: ESLint, TypeScript, AI</span>
                </div>
                <Link
                  href={`/repositories/${repo._id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
