'use client';

import React, { useEffect, useState } from 'react';
import { UserCheck, Plus, User } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARISTA';
  active: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARISTA'>('CASHIER');
  const [active, setActive] = useState(true);

  const loadUsers = () => {
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then(setUsers);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (res.ok) {
      setIsAddOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      loadUsers();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedUser.id,
        name,
        role,
        active,
        password: password || undefined,
      }),
    });

    if (res.ok) {
      setIsEditOpen(false);
      setSelectedUser(null);
      setPassword('');
      loadUsers();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'CASHIER':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'BARISTA':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-800" /> จัดการสิทธิ์ & บัญชีพนักงาน (RBAC)
          </h1>
          <p className="text-xs text-stone-500">จัดการบัญชีผู้ใช้งาน และกำหนดบทบาทสิทธิ์การเข้าถึงเมนู</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-2xl shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งานใหม่
        </button>
      </div>

      {/* Users Table */}
      <div className="cream-card rounded-3xl border border-stone-300 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] font-extrabold">
              <tr>
                <th className="px-4 py-3.5">ชื่อพนักงาน</th>
                <th className="px-4 py-3.5">อีเมลใช้งาน</th>
                <th className="px-4 py-3.5">สิทธิ์การใช้งาน (Role)</th>
                <th className="px-4 py-3.5">สถานะบัญชี</th>
                <th className="px-4 py-3.5">วันที่สร้าง</th>
                <th className="px-4 py-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-700 bg-white">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50 transition">
                  <td className="px-4 py-3.5 font-bold text-stone-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-800" /> {u.name}
                  </td>
                  <td className="px-4 py-3.5 text-stone-500 font-mono">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getRoleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {u.active ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        ใช้งานปกติ
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                        ระงับการใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-stone-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setName(u.name);
                        setRole(u.role);
                        setActive(u.active);
                        setPassword('');
                        setIsEditOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl transition"
                    >
                      แก้ไขสิทธิ์
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="cream-card max-w-sm w-full rounded-3xl p-6 border border-stone-300">
            <h3 className="text-base font-extrabold text-stone-800 mb-4">สร้างบัญชีผู้ใช้ใหม่</h3>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block text-stone-600 font-bold mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย แคชเชียร์"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">อีเมล</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@cafe.com"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">บทบาทสิทธิ์ (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800 font-bold"
                >
                  <option value="ADMIN">ADMIN (สิทธิ์สูงสุดทุกระบบ)</option>
                  <option value="MANAGER">MANAGER (จัดการเมนู สต๊อก & รายงาน)</option>
                  <option value="CASHIER">CASHIER (ขายสินค้า POS & ดูคิว)</option>
                  <option value="BARISTA">BARISTA (คิวออเดอร์ในครัว)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 py-2.5 bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl"
              >
                ยกเลิก
              </button>
              <button type="submit" className="flex-1 py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-2xl">
                สร้างบัญชี
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit User */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleUpdateUser} className="cream-card max-w-sm w-full rounded-3xl p-6 border border-stone-300">
            <h3 className="text-base font-extrabold text-stone-800 mb-4">แก้ไขบัญชี: {selectedUser.name}</h3>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block text-stone-600 font-bold mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">รหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">บทบาทสิทธิ์ (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800 font-bold"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="CASHIER">CASHIER</option>
                  <option value="BARISTA">BARISTA</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeUser"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded bg-stone-50 border-stone-300 text-emerald-800"
                />
                <label htmlFor="activeUser" className="text-stone-700 font-bold">เปิดใช้งานบัญชีนี้</label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="flex-1 py-2.5 bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl"
              >
                ยกเลิก
              </button>
              <button type="submit" className="flex-1 py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-2xl">
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
