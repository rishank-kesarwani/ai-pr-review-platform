'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, GitPullRequest, FolderGit2, Settings, BookOpen, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import Logo from './Logo';
import { api } from '../lib/api';
import { UserProfile } from '../lib/types';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await api.get<UserProfile>('/auth/me');
        setUser(profile);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    api.clearTokens();
    setUser(null);
    window.location.href = '/';
  };

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: Sparkles },
    { name: 'Reviews', href: '/reviews', icon: GitPullRequest },
    { name: 'Repositories', href: '/repositories', icon: FolderGit2 },
    { name: 'Docs', href: '/docs', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-600 bg-dark-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center">
              <Logo showText={true} size={36} />
            </Link>
          </div>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/10 text-brand-400 border border-brand-500/30'
                      : 'text-dark-200 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Auth Info */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 rounded-lg bg-dark-700 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-xs text-dark-200 bg-dark-700/60 px-3 py-1.5 rounded-lg border border-dark-600">
                  <UserIcon className="w-3.5 h-3.5 text-brand-400" />
                  <span>{user.name || user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-dark-200 hover:text-white hover:bg-dark-700 border border-dark-600 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors shadow-md shadow-brand-600/20"
                >
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
