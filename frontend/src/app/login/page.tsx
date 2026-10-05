'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, LogIn, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.post<{ user: any; accessToken: string; refreshToken: string }>(
        '/auth/login',
        { email, password },
      );
      api.setTokens(data.accessToken, data.refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid login credentials');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      {/* Public Access Notice Banner */}
      <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-brand-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Optional Authentication</span>
        </div>
        <p>
          You do not need to sign in to review public GitHub PRs. Anonymous guest submissions are fully supported!
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-8 border border-dark-600 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Sign In to AI PR Review</h1>
          <p className="text-xs text-dark-300">Access saved review history and connected repositories</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-200">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@example.com"
              required
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-200">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-dark-300">
          <span>Don&apos;t have an account? </span>
          <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
