'use client';

import React, { useEffect, useState } from 'react';
import { Share2, Plus, Percent, Calculator } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  gpPercent: number;
  active: boolean;
}

export default function SalesChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const [gpPercent, setGpPercent] = useState('');
  const [active, setActive] = useState(true);

  // New Channel Form
  const [newChannelName, setNewChannelName] = useState('');
  const [newGpPercent, setNewGpPercent] = useState('30');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Calculator preview
  const [calcAmount, setCalcAmount] = useState('100');

  const loadChannels = () => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then(setChannels);
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;

    await fetch('/api/channels', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedChannel.id,
        gpPercent: parseFloat(gpPercent),
        active,
      }),
    });

    setIsEditOpen(false);
    setSelectedChannel(null);
    loadChannels();
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName) return;

    await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newChannelName,
        gpPercent: parseFloat(newGpPercent || '0'),
      }),
    });

    setIsAddOpen(false);
    setNewChannelName('');
    loadChannels();
  };

  const calcVal = parseFloat(calcAmount) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-emerald-800" /> ตั้งค่าช่องทางขาย & ค่า GP
          </h1>
          <p className="text-xs text-stone-500">กำหนดเปอร์เซ็นต์ส่วนแบ่ง GP แต่ละแพลตฟอร์ม (หน้าร้าน 0%, LineMan 30%, Grab 30%)</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-2xl shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> เพิ่มช่องทางขาย
        </button>
      </div>

      {/* Live Calculator */}
      <div className="cream-card p-5 rounded-3xl border border-stone-300 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-stone-800">เครื่องมือจำลองคำนวณหัก GP หน้าร้าน</div>
            <div className="text-[11px] text-stone-500">ทดลองคำนวณรายรับหลังหัก GP แพลตฟอร์ม</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            value={calcAmount}
            onChange={(e) => setCalcAmount(e.target.value)}
            className="w-36 bg-white border border-stone-300 rounded-2xl py-2 px-3 text-xs text-stone-900 font-mono font-bold"
            placeholder="ยอดขายรวม"
          />
          <div className="text-xs space-x-2">
            {channels.map((ch) => {
              const fee = (calcVal * ch.gpPercent) / 100;
              const payout = calcVal - fee;
              return (
                <span key={ch.id} className="inline-block px-3 py-1.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                  <strong className="text-stone-800">{ch.name}:</strong> รับจริง <span className="text-emerald-800 font-mono font-extrabold">฿{payout.toFixed(2)}</span> (GP {ch.gpPercent}%)
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((ch) => (
          <div key={ch.id} className="cream-card rounded-3xl p-6 border border-stone-300 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-base text-stone-800">{ch.name}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    ch.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {ch.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center my-3">
                <div className="text-[10px] text-stone-500 font-bold uppercase">อัตราค่า GP แพลตฟอร์ม</div>
                <div className="text-3xl font-black text-emerald-800 font-mono flex items-center justify-center gap-1 mt-0.5">
                  {ch.gpPercent}% <Percent className="w-5 h-5 text-emerald-700" />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedChannel(ch);
                setGpPercent(ch.gpPercent.toString());
                setActive(ch.active);
                setIsEditOpen(true);
              }}
              className="mt-4 w-full py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-2xl transition"
            >
              แก้ไขอัตรา GP
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditOpen && selectedChannel && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleUpdateChannel} className="cream-card max-w-sm w-full rounded-3xl p-6 border border-stone-300">
            <h3 className="text-base font-extrabold text-stone-800 mb-4">แก้ไข GP: {selectedChannel.name}</h3>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block text-stone-600 font-bold mb-1">เปอร์เซ็นต์ GP (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={gpPercent}
                  onChange={(e) => setGpPercent(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-900 font-mono font-bold"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCh"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded bg-stone-50 border-stone-300 text-emerald-800"
                />
                <label htmlFor="activeCh" className="text-stone-700 font-bold">เปิดใช้งานช่องทางนี้</label>
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

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddChannel} className="cream-card max-w-sm w-full rounded-3xl p-6 border border-stone-300">
            <h3 className="text-base font-extrabold text-stone-800 mb-4">เพิ่มช่องทางขายใหม่</h3>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block text-stone-600 font-bold mb-1">ชื่อช่องทาง</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="เช่น Foodpanda, Robinhood"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">เปอร์เซ็นต์ GP (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newGpPercent}
                  onChange={(e) => setNewGpPercent(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-900 font-mono font-bold"
                  required
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
                สร้างช่องทาง
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
