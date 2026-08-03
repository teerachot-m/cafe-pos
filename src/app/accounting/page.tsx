'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, DollarSign, TrendingUp, Percent, Boxes, PieChart } from 'lucide-react';

interface Summary {
  totalOrders: number;
  grossSales: number;
  totalGpFees: number;
  totalPointDiscounts: number;
  netSales: number;
  totalCogs: number;
  netProfit: number;
  grossProfitMargin: number;
}

interface ChannelBreakdown {
  channelName: string;
  count: number;
  gross: number;
  gpFee: number;
  net: number;
}

export default function AccountingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [channelsBreakdown, setChannelsBreakdown] = useState<ChannelBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        setSummary(data.summary);
        setChannelsBreakdown(data.channelsBreakdown || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-stone-500 text-xs">กำลังโหลดรายงานการเงิน...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-800" /> สรุปบัญชี & รายงาน GP ช่องทางขาย
          </h1>
          <p className="text-xs text-stone-500">รายงานยอดขายสุทธิ หัก GP Delivery & ต้นทุนวัตถุดิบ BOM</p>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cream-card p-5 rounded-3xl border border-stone-300 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase">
              <span>ยอดขายรวม (Gross)</span>
              <DollarSign className="w-4 h-4 text-emerald-800" />
            </div>
            <div className="text-2xl font-black text-stone-900 mt-1 font-mono">฿{summary.grossSales.toLocaleString()}</div>
            <div className="text-[10px] text-stone-500 font-bold mt-1">จากทั้งหมด {summary.totalOrders} ออเดอร์</div>
          </div>

          <div className="cream-card p-5 rounded-3xl border border-stone-300 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase">
              <span>ค่า GP แพลตฟอร์ม</span>
              <Percent className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1 font-mono">-฿{summary.totalGpFees.toLocaleString()}</div>
            <div className="text-[10px] text-stone-500 font-bold mt-1">LineMan / Grab GP</div>
          </div>

          <div className="cream-card p-5 rounded-3xl border border-stone-300 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase">
              <span>ต้นทุนวัตถุดิบ (BOM)</span>
              <Boxes className="w-4 h-4 text-indigo-700" />
            </div>
            <div className="text-2xl font-black text-stone-900 mt-1 font-mono">-฿{summary.totalCogs.toLocaleString()}</div>
            <div className="text-[10px] text-stone-500 font-bold mt-1">คำนวณจากสูตร BOM วัตถุดิบจริง</div>
          </div>

          <div className="cream-card p-5 rounded-3xl border border-emerald-400 bg-emerald-50/60 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-900 text-[11px] font-extrabold uppercase">
              <span>กำไรสุทธิ (Net Profit)</span>
              <TrendingUp className="w-4 h-4 text-emerald-800" />
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">฿{summary.netProfit.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-800 font-black mt-1">อัตรากำไรขั้นต้น: {summary.grossProfitMargin}%</div>
          </div>
        </div>
      )}

      {/* Channel Breakdown Table */}
      <div className="cream-card rounded-3xl border border-stone-300 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-extrabold text-stone-800 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-800" /> สรุปรายรับแยกตามช่องทางขาย
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] font-extrabold">
              <tr>
                <th className="px-4 py-3.5">ชื่อช่องทางขาย</th>
                <th className="px-4 py-3.5">จำนวนออเดอร์</th>
                <th className="px-4 py-3.5">ยอดขายรวม Gross (บาท)</th>
                <th className="px-4 py-3.5">หัก GP Delivery (บาท)</th>
                <th className="px-4 py-3.5 font-bold text-emerald-800">รายรับสุทธิส่งเข้าบัญชีร้าน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-700 bg-white">
              {channelsBreakdown.map((ch, idx) => (
                <tr key={idx} className="hover:bg-stone-50 transition">
                  <td className="px-4 py-3.5 font-bold text-stone-900">{ch.channelName}</td>
                  <td className="px-4 py-3.5 font-mono font-bold">{ch.count}</td>
                  <td className="px-4 py-3.5 font-mono">฿{ch.gross.toLocaleString()}</td>
                  <td className="px-4 py-3.5 font-mono text-rose-700 font-bold">-฿{ch.gpFee.toLocaleString()}</td>
                  <td className="px-4 py-3.5 font-mono font-black text-emerald-800">฿{ch.net.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
