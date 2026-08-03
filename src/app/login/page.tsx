'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, ShieldCheck, User, Lock, KeyRound, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@cafe.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-800 text-white shadow-lg mb-3">
            <Coffee className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-black text-stone-800 tracking-tight flex items-center justify-center gap-2">
            CAFE POS <Sparkles className="w-5 h-5 text-emerald-600" />
          </h1>
          <p className="text-xs font-semibold text-stone-500 mt-1">Smart POS, BOM & Channel Management System</p>
        </div>

        {/* Login Card */}
        <div className="cream-card rounded-3xl p-8 shadow-sm border border-stone-300">
          <h2 className="text-lg font-extrabold text-stone-800 mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" /> Sign In to System
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-3 pl-11 pr-4 text-sm text-stone-800 font-medium focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                  placeholder="name@cafe.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-3 pl-11 pr-4 text-sm text-stone-800 font-medium focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-extrabold text-sm rounded-2xl shadow-md transition transform active:scale-98 disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Shortcuts */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <span className="block text-xs font-bold text-stone-500 mb-3 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-emerald-700" /> Quick Demo Accounts (Pass: 123456)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickLogin('admin@cafe.com')}
                className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-left transition"
              >
                <div className="font-extrabold text-[11px]">ADMIN</div>
                <div className="text-[10px] text-purple-700">admin@cafe.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('manager@cafe.com')}
                className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-left transition"
              >
                <div className="font-extrabold text-[11px]">MANAGER</div>
                <div className="text-[10px] text-blue-700">manager@cafe.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('cashier@cafe.com')}
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-left transition"
              >
                <div className="font-extrabold text-[11px]">CASHIER</div>
                <div className="text-[10px] text-emerald-700">cashier@cafe.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('barista@cafe.com')}
                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-left transition"
              >
                <div className="font-extrabold text-[11px]">BARISTA</div>
                <div className="text-[10px] text-amber-700">barista@cafe.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
