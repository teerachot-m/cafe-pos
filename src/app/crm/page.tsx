'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Award, Phone } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  totalSpent: number;
  createdAt: string;
}

export default function CRMLoyaltyPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const loadCustomers = () => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then(setCustomers);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email }),
    });

    if (res.ok) {
      setIsAddOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      loadCustomers();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-800" /> ระบบสะสมแต้มสมาชิก CRM
          </h1>
          <p className="text-xs text-stone-500">จัดการฐานข้อมูลลูกค้า แต้มสะสม & ยอดซื้อสะสม</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-2xl shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> ลงทะเบียนสมาชิกใหม่
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="cream-card p-3 rounded-2xl border border-stone-300 flex items-center justify-between shadow-2xs">
        <div className="relative flex-1 max-w-xs">
          <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาด้วยเบอร์โทร หรือชื่อ..."
            className="w-full bg-white border border-stone-300 rounded-xl py-1.5 pl-9 pr-3 text-xs text-stone-800"
          />
        </div>
        <span className="text-xs text-stone-600 font-bold">{filtered.length} สมาชิกทั้งหมด</span>
      </div>

      {/* Customer Directory Table */}
      <div className="cream-card rounded-3xl border border-stone-300 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] font-extrabold">
              <tr>
                <th className="px-4 py-3.5">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3.5">เบอร์โทรศัพท์</th>
                <th className="px-4 py-3.5">อีเมล</th>
                <th className="px-4 py-3.5">แต้มสะสมปัจจุบัน</th>
                <th className="px-4 py-3.5">ยอดซื้อสะสม (บาท)</th>
                <th className="px-4 py-3.5">วันที่สมัครสมาชิก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-700 bg-white">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50 transition">
                  <td className="px-4 py-3.5 font-bold text-stone-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-700" /> {c.name}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-emerald-800 font-bold">{c.phone}</td>
                  <td className="px-4 py-3.5 text-stone-500">{c.email || '-'}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-black rounded-full border border-emerald-300">
                      {c.points} แต้ม
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-stone-900 font-black">฿{c.totalSpent.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-stone-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateCustomer} className="cream-card max-w-sm w-full rounded-3xl p-6 border border-stone-300">
            <h3 className="text-base font-extrabold text-stone-800 mb-4">ลงทะเบียนสมาชิกใหม่</h3>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block text-stone-600 font-bold mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย ประเสริฐ"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812345678"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-900 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">อีเมล (ถ้ามี)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="somchai@example.com"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                />
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
                บันทึกข้อมูล
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
