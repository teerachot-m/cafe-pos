'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Grid, LogOut, User } from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARISTA';
}

export default function HeaderBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  // Hide header on login page and main hub dashboard page
  if (pathname === '/login' || pathname === '/dashboard') return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CASHIER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'BARISTA':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Main Menu Back Button (Tablet Touch Optimized) */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-95"
        >
          <Grid className="w-5 h-5" />
          <span>Main Menu</span>
        </Link>

        {/* Cafe Brand Logo */}
        <div className="hidden sm:flex items-center">
          <img src="/logo_single.png" alt="HAUS BLEND" className="h-8 w-auto" />
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
              <User className="w-4 h-4 text-emerald-700" />
              <div className="text-right">
                <span className="block text-xs font-bold text-stone-800">{user.name}</span>
                <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded uppercase border ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-stone-200 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
