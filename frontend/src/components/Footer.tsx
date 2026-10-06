import React from 'react';
import Link from 'next/link';
import { Github, Shield, Cpu, RefreshCw } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-dark-600 bg-dark-900/90 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="font-bold text-white tracking-tight">AI PR Review Platform</span>
            </div>
            <p className="text-xs text-dark-300 leading-relaxed max-w-sm">
              Enterprise-grade automated GitHub Pull Request review system powered by AST static analysis,
              AI code intelligence, BullMQ async queues, and real-time GitHub Checks.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-dark-300">
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-emerald-400" /> SOC2 Compliant Pattern</span>
              <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-indigo-400" /> AI Platform Verified</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-dark-100 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-1.5 text-xs text-dark-300">
              <li><Link href="/reviews" className="hover:text-brand-400 transition-colors">Review Explorer</Link></li>
              <li><Link href="/repositories" className="hover:text-brand-400 transition-colors">Connected Repositories</Link></li>
              <li><Link href="/docs" className="hover:text-brand-400 transition-colors">Architecture & Docs</Link></li>
              <li><a href="http://localhost:3000/api/docs" target="_blank" rel="noreferrer" className="hover:text-brand-400 transition-colors">Swagger API Reference ↗</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-dark-100 uppercase tracking-wider">Integrations</h4>
            <ul className="space-y-1.5 text-xs text-dark-300">
              <li><span className="text-dark-200">GitHub App & Webhooks</span></li>
              <li><span className="text-dark-200">Chrome Extension (MV3)</span></li>
              <li><span className="text-dark-200">BullMQ & Redis Streams</span></li>
              <li><span className="text-dark-200">Shared AI Platform</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-dark-700 flex flex-col sm:flex-row items-center justify-between text-xs text-dark-400 gap-4">
          <p>© {new Date().getFullYear()} AI PR Review Platform. Built with Next.js, NestJS, and TypeScript.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/rishank-kesarwani/ai-pr-review-platform" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-dark-200 transition-colors">
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repo</span>
            </a>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
