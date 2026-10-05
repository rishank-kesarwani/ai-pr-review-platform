'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, UserPlus, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.post<{ user: any; accessToken: string; refreshToken: string }>(
        '/auth/register',
        { name, email, password, githubUsername: githubUsername || undefined },
      );
      api.setTokens(data.accessToken, data.refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="glass-panel rounded-2xl p-8 border border-dark-600 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Create an Account</h1>
          <p className="text-xs text-dark-300">Set up custom rules, repository policies, and notification hooks</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-200">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Developer"
              required
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500"
            />
          </div>

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
            <label className="text-xs font-semibold text-dark-200">GitHub Username (Optional)</label>
            <input
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="octocat"
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-200">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
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
              <span>Creating Account...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-dark-300">
          <span>Already have an account? </span>
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
