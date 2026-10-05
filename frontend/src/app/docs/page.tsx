'use client';

import React from 'react';
import {
  BookOpen,
  GitBranch,
  Shield,
  Cpu,
  Layers,
  Chrome,
  Terminal,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export default function DocsPage() {
  const pipelineStages = [
    {
      stage: 'QUEUED',
      desc: 'PR review request is validated, assigned an idempotency key, and queued in BullMQ.',
    },
    {
      stage: 'FETCHING',
      desc: 'Authoritative PR metadata and file patches/diffs are fetched via GitHub REST APIs.',
    },
    {
      stage: 'ANALYZING',
      desc: 'AST and rule-based static analyzers (ESLint, TypeScript) run concurrently in sandboxed isolation.',
    },
    {
      stage: 'AI_REVIEW',
      desc: 'The centralized AI Platform inspects diffs with structured output schema validation.',
    },
    {
      stage: 'AGGREGATING',
      desc: 'Arbitration engine deduplicates identical findings and calibrates severity rankings.',
    },
    {
      stage: 'PUBLISHING',
      desc: 'GitHub Check Runs and configured in-line PR comments are created.',
    },
    {
      stage: 'COMPLETED',
      desc: 'Final results are persisted to MongoDB and notifications are dispatched.',
    },
  ];

  const apiEndpoints = [
    { method: 'POST', path: '/api/v1/reviews', desc: 'Enqueue a GitHub PR for automated review', auth: 'Public / Optional' },
    { method: 'GET', path: '/api/v1/reviews', desc: 'List reviews with filters & pagination', auth: 'Public / Optional' },
    { method: 'GET', path: '/api/v1/reviews/:id', desc: 'Get review metadata and status', auth: 'Public' },
    { method: 'GET', path: '/api/v1/reviews/:id/findings', desc: 'Get granular findings for a review', auth: 'Public' },
    { method: 'POST', path: '/api/v1/reviews/:id/cancel', desc: 'Cancel an active or queued review', auth: 'Public / Optional' },
    { method: 'POST', path: '/api/v1/reviews/:id/retry', desc: 'Retry a failed review', auth: 'Public / Optional' },
    { method: 'POST', path: '/api/v1/github/webhooks', desc: 'GitHub App webhook receiver (HMAC validated)', auth: 'Webhook Secret' },
    { method: 'GET', path: '/api/v1/repositories', desc: 'List connected repositories', auth: 'Public / Optional' },
    { method: 'PATCH', path: '/api/v1/repositories/:id/config', desc: 'Update repository review policies', auth: 'Protected' },
    { method: 'GET', path: '/health', desc: 'Health check endpoint with uptime & DB status', auth: 'Public' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-500/10 text-brand-400 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Technical Reference</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Platform Architecture & Documentation
        </h1>
        <p className="text-sm text-dark-300 max-w-2xl leading-relaxed">
          Comprehensive technical guide on the multi-stage review pipeline, arbitration model,
          GitHub App integration, and REST API specification.
        </p>
      </div>

      {/* Section 1: Review Pipeline */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-400" />
          <span>Multi-Stage Review Pipeline</span>
        </h2>

        <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-4">
          <p className="text-xs text-dark-300 leading-relaxed">
            The platform never runs LLM code reviews synchronously during HTTP requests. All analysis runs
            through a resilient BullMQ worker pipeline with distinct, observable state transitions:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {pipelineStages.map((st, i) => (
              <div key={st.stage} className="p-3 rounded-xl bg-dark-800 border border-dark-700 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-300 flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-white">{st.stage}</span>
                </div>
                <p className="text-xs text-dark-300 pl-7">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Chrome Extension Setup */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Chrome className="w-5 h-5 text-violet-400" />
          <span>Chrome Extension (Manifest V3)</span>
        </h2>

        <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-3 text-xs text-dark-200">
          <p>
            The Chrome extension injects an autonomous review button onto any GitHub Pull Request page
            (<code className="text-brand-400">github.com/:owner/:repo/pull/:number</code>).
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-dark-300 pl-2">
            <li>Run <code className="text-white bg-dark-800 px-1.5 py-0.5 rounded">npm run build</code> inside the <code className="text-brand-400">extension/</code> directory.</li>
            <li>Open Google Chrome and navigate to <code className="text-white bg-dark-800 px-1.5 py-0.5 rounded">chrome://extensions</code>.</li>
            <li>Enable <strong>Developer Mode</strong> in the top-right corner.</li>
            <li>Click <strong>Load Unpacked</strong> and select the <code className="text-brand-400">extension/dist/</code> directory.</li>
            <li>Navigate to any GitHub PR to see the <strong>✨ Review PR with AI</strong> button.</li>
          </ol>
        </div>
      </section>

      {/* Section 3: REST API Reference */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>REST API Specification</span>
          </h2>
          <a
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
          >
            <span>Interactive Swagger Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="glass-panel rounded-2xl border border-dark-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-800 text-dark-300 uppercase tracking-wider border-b border-dark-700">
                <tr>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700 text-dark-200">
                {apiEndpoints.map((ep) => (
                  <tr key={ep.path + ep.method} className="hover:bg-dark-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-brand-400">{ep.method}</td>
                    <td className="px-4 py-3 font-mono text-white">{ep.path}</td>
                    <td className="px-4 py-3">{ep.desc}</td>
                    <td className="px-4 py-3 text-dark-300">{ep.auth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
