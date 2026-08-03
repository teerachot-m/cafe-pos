'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Coffee,
  ShoppingCart,
  Clock,
  BookOpen,
  Boxes,
  Share2,
  Users,
  BarChart3,
  UserCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARISTA';
}

export default function Navigation() {
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

  if (pathname === '/login') return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'MANAGER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'CASHIER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'BARISTA':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const navLinks = [
    { href: '/pos', label: 'POS Terminal', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { href: '/orders', label: 'Order Queue', icon: Clock, roles: ['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'] },
    { href: '/menu', label: 'Menu & BOM', icon: BookOpen, roles: ['ADMIN', 'MANAGER'] },
    { href: '/inventory', label: 'Stock Inventory', icon: Boxes, roles: ['ADMIN', 'MANAGER'] },
    { href: '/channels', label: 'Sales Channels', icon: Share2, roles: ['ADMIN', 'MANAGER'] },
    { href: '/crm', label: 'CRM Loyalty', icon: Users, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { href: '/accounting', label: 'Accounting & GP', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
    { href: '/admin/users', label: 'Role Management', icon: UserCheck, roles: ['ADMIN'] },
  ];

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-3 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/pos" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Coffee className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-wide flex items-center gap-1.5">
              CAFE POS <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <span className="text-[10px] text-slate-400 block -mt-1 font-mono uppercase tracking-widest">
              Smart POS & BOM Inventory
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
          {navLinks.map((link) => {
            if (user && !link.roles.includes(user.role)) return null;
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Auth */}
        <div className="flex items-center gap-3 ml-auto">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-100">{user.name}</span>
                <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded uppercase border ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:brightness-110 transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
