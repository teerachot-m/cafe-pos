'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Coffee,
  ShoppingCart,
  Clock,
  BookOpen,
  Boxes,
  BarChart3,
  Share2,
  Users,
  UserCheck,
  LogOut,
  Sparkles,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARISTA';
}

export default function DashboardHubPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  if (!user) return null;

  const modules = [
    {
      href: '/pos',
      title: 'POS Selling Terminal',
      subtitle: 'หน้าขายสินค้า รับออเดอร์ ชำระเงิน & พิมพ์สลิป',
      icon: ShoppingCart,
      color: 'bg-emerald-700 text-white',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      roles: ['ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      href: '/orders',
      title: 'Order Queue & Slips',
      subtitle: 'คิวเตรียมสินค้า อัปเดตสถานะ & พิมพ์สลิปย้อนหลัง',
      icon: Clock,
      color: 'bg-amber-700 text-white',
      badgeColor: 'bg-amber-100 text-amber-800',
      roles: ['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'],
    },
    {
      href: '/menu',
      title: 'Menu & BOM Recipes',
      subtitle: 'จัดการเมนูสินค้า หมวดหมู่ & สูตรวัตถุดิบ BOM',
      icon: BookOpen,
      color: 'bg-blue-700 text-white',
      badgeColor: 'bg-blue-100 text-blue-800',
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      href: '/inventory',
      title: 'Stock Inventory',
      subtitle: 'เช็กสต๊อกวัตถุดิบ ตัดสต๊อกอัตโนมัติ & เติมวัตถุดิบ',
      icon: Boxes,
      color: 'bg-purple-700 text-white',
      badgeColor: 'bg-purple-100 text-purple-800',
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      href: '/accounting',
      title: 'Accounting & GP Profit',
      subtitle: 'รายงานรายได้สุทธิ หัก GP Delivery & ต้นทุน BOM',
      icon: BarChart3,
      color: 'bg-teal-700 text-white',
      badgeColor: 'bg-teal-100 text-teal-800',
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      href: '/channels',
      title: 'Sales Channels & GP',
      subtitle: 'ตั้งค่าเปอร์เซ็นต์ GP ช่องทางขาย (LineMan / Grab)',
      icon: Share2,
      color: 'bg-indigo-700 text-white',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      href: '/crm',
      title: 'CRM Customer Loyalty',
      subtitle: 'ระบบสะสมแต้ม ค้นหาเบอร์โทร & ประวัติการซื้อ',
      icon: Users,
      color: 'bg-rose-700 text-white',
      badgeColor: 'bg-rose-100 text-rose-800',
      roles: ['ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      href: '/admin/users',
      title: 'Admin Role Management',
      subtitle: 'จัดการผู้ใช้งาน สิทธิ์การเข้าถึง & บัญชีพนักงาน',
      icon: UserCheck,
      color: 'bg-stone-800 text-white',
      badgeColor: 'bg-stone-200 text-stone-800',
      roles: ['ADMIN'],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 px-2">
      {/* Top Header Card */}
      <div className="cream-card rounded-3xl p-6 mb-8 flex flex-wrap items-center justify-between gap-4 border border-stone-300 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-800 flex items-center justify-center shadow-md text-white">
            <Coffee className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-stone-800 tracking-tight">CAFE POS SYSTEM</h1>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              ระบบขายหน้าร้าน คำนวณตัดสต๊อก BOM & รายงานกำไรสุทธิ
            </p>
          </div>
        </div>

        {/* User Badge & Logout Button */}
        <div className="flex items-center gap-3 bg-stone-100 p-2.5 rounded-2xl border border-stone-200">
          <div className="text-right px-2">
            <span className="block text-xs font-bold text-stone-800">{user.name}</span>
            <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase border border-emerald-300">
              {user.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 bg-white hover:bg-rose-50 hover:text-rose-600 text-stone-600 rounded-xl border border-stone-200 transition shadow-2xs flex items-center gap-1.5 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Main Feature Menu Grid (Tablet First 2-3 Columns) */}
      <div className="mb-4">
        <h2 className="text-base font-extrabold text-stone-700 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-700" /> เลือกเมนูปฏิบัติการ (Main Functions)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => {
            const hasAccess = mod.roles.includes(user.role);
            if (!hasAccess) return null;
            const Icon = mod.icon;

            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="cream-card cream-card-hover rounded-3xl p-6 flex flex-col justify-between group cursor-pointer border border-stone-300/80 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl ${mod.color} flex items-center justify-center shadow-md group-hover:scale-105 transition duration-200`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-emerald-800 group-hover:text-white text-stone-400 flex items-center justify-center transition">
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-stone-800 group-hover:text-emerald-800 transition mb-1">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium leading-relaxed">
                    {mod.subtitle}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 group-hover:underline">
                    เข้าสู่หน้างาน →
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${mod.badgeColor}`}>
                    {user.role}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
