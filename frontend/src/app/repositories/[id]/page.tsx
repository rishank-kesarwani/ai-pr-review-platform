'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Shield, Check, Plus, Trash2, Sliders, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { RepositoryItem, Severity } from '../../../lib/types';

export default function RepositoryConfigPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.id as string;

  const [repo, setRepo] = useState<RepositoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [autoComment, setAutoComment] = useState(false);
  const [minSeverity, setMinSeverity] = useState<Severity>('HIGH');
  const [minConfidence, setMinConfidence] = useState(0.8);
  const [maxFiles, setMaxFiles] = useState(50);
  const [customRules, setCustomRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [ignoredFiles, setIgnoredFiles] = useState<string[]>([]);
  const [newIgnoreInput, setNewIgnoreInput] = useState('');
  // Model Regression settings
  const [regressionEnabled, setRegressionEnabled] = useState(false);
  const [regressionBlocking, setRegressionBlocking] = useState(false);
  const [regressionDataset, setRegressionDataset] = useState('pr-review-evaluation');
  const [regressionBaseline, setRegressionBaseline] = useState('baseline-v1.0.0');
  const [regressionPolicy, setRegressionPolicy] = useState('standard');

  useEffect(() => {
    async function loadRepo() {
      try {
        const data = await api.get<RepositoryItem>(`/repositories/${repoId}`);
        setRepo(data);
        if (data.configuration) {
          setAutoComment(data.configuration.autoCommentEnabled || false);
          setMinSeverity(data.configuration.minCommentSeverity || 'HIGH');
          setMinConfidence(data.configuration.minCommentConfidence ?? 0.8);
          setMaxFiles(data.configuration.maxFilesPerReview || 50);
          setCustomRules(data.configuration.customRules || []);
          setIgnoredFiles(data.configuration.ignoredFiles || []);
          setRegressionEnabled(data.configuration.regressionEnabled ?? false);
          setRegressionBlocking(data.configuration.regressionBlocking ?? false);
          setRegressionDataset(data.configuration.regressionDataset || 'pr-review-evaluation');
          setRegressionBaseline(data.configuration.regressionBaseline || 'baseline-v1.0.0');
          setRegressionPolicy(data.configuration.regressionPolicy || 'standard');
        }
      } catch (err: any) {
        setErrorMessage('Failed to load repository settings');
      } finally {
        setLoading(false);
      }
    }
    loadRepo();
  }, [repoId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      await api.patch(`/repositories/${repoId}/config`, {
        autoCommentEnabled: autoComment,
        minCommentSeverity: minSeverity,
        minCommentConfidence: minConfidence,
        maxFilesPerReview: maxFiles,
        customRules,
        ignoredFiles,
        regressionEnabled,
        regressionBlocking,
        regressionDataset,
        regressionBaseline,
        regressionPolicy,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const addCustomRule = () => {
    if (!newRuleInput.trim()) return;
    setCustomRules([...customRules, newRuleInput.trim()]);
    setNewRuleInput('');
  };

  const removeCustomRule = (index: number) => {
    setCustomRules(customRules.filter((_, i) => i !== index));
  };

  const addIgnoredPattern = () => {
    if (!newIgnoreInput.trim()) return;
    setIgnoredFiles([...ignoredFiles, newIgnoreInput.trim()]);
    setNewIgnoreInput('');
  };

  const removeIgnoredPattern = (index: number) => {
    setIgnoredFiles(ignoredFiles.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-dark-300">Loading configuration...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/repositories"
          className="inline-flex items-center gap-1.5 text-xs text-dark-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repositories</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Repository Review Policy
        </h1>
        <p className="text-xs sm:text-sm text-brand-400 font-mono">{repo?.fullName}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Automated PR Commenting */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">Automated PR Commenting</h3>
              <p className="text-xs text-dark-300">
                Post high-confidence review findings directly onto GitHub Pull Requests
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoComment}
                onChange={(e) => setAutoComment(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dark-700">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dark-200">Minimum Comment Severity</label>
              <select
                value={minSeverity}
                onChange={(e) => setMinSeverity(e.target.value as Severity)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="CRITICAL">CRITICAL Only</option>
                <option value="HIGH">HIGH and CRITICAL</option>
                <option value="MEDIUM">MEDIUM, HIGH, and CRITICAL</option>
                <option value="LOW">All (including LOW & INFO)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dark-200">
                Confidence Threshold ({Math.round(minConfidence * 100)}%)
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Custom Review Rules */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Repository-Specific Review Rules</h3>
            <p className="text-xs text-dark-300">
              Instruct the AI inspector to enforce custom team patterns, architectural rules, and conventions.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newRuleInput}
              onChange={(e) => setNewRuleInput(e.target.value)}
              placeholder="e.g. Ensure all database writes wrap in a transaction..."
              className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={addCustomRule}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-xs font-semibold text-white border border-dark-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {customRules.length > 0 && (
            <ul className="space-y-2 pt-2">
              {customRules.map((rule, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-dark-800/80 border border-dark-700 text-xs text-dark-200"
                >
                  <span>{idx + 1}. {rule}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomRule(idx)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card 3: Ignored Files Patterns */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Ignored Files & Patterns</h3>
            <p className="text-xs text-dark-300">
              Files matching these glob patterns will be excluded from static and AI review.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newIgnoreInput}
              onChange={(e) => setNewIgnoreInput(e.target.value)}
              placeholder="e.g. generated/** or *.min.js"
              className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={addIgnoredPattern}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-xs font-semibold text-white border border-dark-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {ignoredFiles.map((pat, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-dark-800 text-dark-300 border border-dark-700"
              >
                <span>{pat}</span>
                <button
                  type="button"
                  onClick={() => removeIgnoredPattern(idx)}
                  className="text-dark-400 hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Card 4: AI Model Regression Quality Gate */}
        <div className="glass-panel rounded-2xl p-6 border border-dark-600 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">AI Model Regression Detection</h3>
              </div>
              <p className="text-xs text-dark-300">
                Evaluate PR review quality against benchmark datasets to catch model accuracy degradations
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={regressionEnabled}
                onChange={(e) => setRegressionEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {regressionEnabled && (
            <div className="space-y-4 pt-4 border-t border-dark-700">
              <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/60 border border-dark-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white">Block PR on Regression Failure</span>
                  <p className="text-[11px] text-dark-300">
                    When enabled, failing AI regression checks will fail the GitHub Status Check
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regressionBlocking}
                    onChange={(e) => setRegressionBlocking(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-dark-200">Evaluation Dataset</label>
                  <input
                    type="text"
                    value={regressionDataset}
                    onChange={(e) => setRegressionDataset(e.target.value)}
                    placeholder="pr-review-evaluation"
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-dark-200">Baseline Identifier</label>
                  <input
                    type="text"
                    value={regressionBaseline}
                    onChange={(e) => setRegressionBaseline(e.target.value)}
                    placeholder="baseline-v1.0.0"
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-dark-200">Regression Policy</label>
                  <select
                    value={regressionPolicy}
                    onChange={(e) => setRegressionPolicy(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="standard">Standard (3% Quality Delta)</option>
                    <option value="strict">Strict (1% Quality Delta)</option>
                    <option value="lenient">Lenient (5% Quality Delta)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Notices */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Check className="w-4 h-4" />
            <span>Repository configuration saved successfully!</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
