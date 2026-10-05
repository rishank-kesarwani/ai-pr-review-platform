'use client';

import React, { useState, useEffect } from 'react';
import { User, Bell, Cpu, Shield, Key, Check, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { UserProfile } from '../../lib/types';

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [webhookNotifs, setWebhookNotifs] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.get<UserProfile>('/auth/me');
        setUser(data);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Platform Settings</h1>
        <p className="text-xs sm:text-sm text-dark-300">
          Manage your account profile, notification dispatches, and review usage limits
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Profile & Public Access */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <User className="w-4 h-4 text-brand-400" />
              <span>User Profile</span>
            </div>

            {loading ? (
              <div className="text-xs text-dark-300 animate-pulse">Loading profile...</div>
            ) : user ? (
              <div className="space-y-3 text-xs text-dark-300">
                <div>
                  <span className="text-dark-400 block text-[10px] uppercase font-semibold">Name</span>
                  <span className="text-white font-medium">{user.name}</span>
                </div>
                <div>
                  <span className="text-dark-400 block text-[10px] uppercase font-semibold">Email</span>
                  <span className="text-white font-medium">{user.email}</span>
                </div>
                <div>
                  <span className="text-dark-400 block text-[10px] uppercase font-semibold">GitHub Login</span>
                  <span className="text-brand-400 font-mono">@{user.githubUsername || 'Not connected'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-dark-300">
                <p>Viewing in <strong className="text-emerald-400">Anonymous / Public Mode</strong>.</p>
                <p className="text-dark-400">Public Pull Requests can be analyzed freely without authentication.</p>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-dark-600 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Shield className="w-4 h-4" />
              <span>Public Access Enabled</span>
            </div>
            <p className="text-xs text-dark-300 leading-relaxed">
              Anonymous users can submit public repository PR URLs for instant automated reviews without mandatory login.
            </p>
          </div>
        </div>

        {/* Right Column: AI Usage & Notification Preferences */}
        <div className="md:col-span-2 space-y-6">
          {/* Notification Preferences */}
          <form onSubmit={handleSaveNotifications} className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Bell className="w-4 h-4 text-brand-400" />
              <span>Notification Preferences (Notification Service)</span>
            </div>

            <div className="space-y-4 text-xs text-dark-200">
              <label className="flex items-center justify-between p-3 rounded-xl bg-dark-800 border border-dark-700 cursor-pointer">
                <div>
                  <span className="font-semibold text-white block">Email Alerts on Review Completion</span>
                  <span className="text-dark-400">Receive an email digest whenever a PR review finishes processing</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="accent-brand-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-dark-800 border border-dark-700 cursor-pointer">
                <div>
                  <span className="font-semibold text-white block">Webhook Alerts on Critical Findings</span>
                  <span className="text-dark-400">Dispatch instant webhook payloads when CRITICAL security flaws are detected</span>
                </div>
                <input
                  type="checkbox"
                  checked={webhookNotifs}
                  onChange={(e) => setWebhookNotifs(e.target.checked)}
                  className="accent-brand-500 w-4 h-4"
                />
              </label>
            </div>

            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Notification preferences updated</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </form>

          {/* AI Usage & Cost Controls */}
          <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Cpu className="w-4 h-4 text-brand-400" />
              <span>AI Platform Cost Controls</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 space-y-1">
                <span className="text-dark-400 font-medium">Model Architecture</span>
                <p className="font-mono text-white font-semibold">Gemini 1.5 Pro</p>
              </div>
              <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 space-y-1">
                <span className="text-dark-400 font-medium">Max Context Window</span>
                <p className="font-mono text-white font-semibold">32,000 tokens</p>
              </div>
              <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 space-y-1">
                <span className="text-dark-400 font-medium">Diff Limit</span>
                <p className="font-mono text-white font-semibold">1.0 MB / 50 files</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
