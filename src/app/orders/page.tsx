'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Printer, CheckCircle2, XCircle, RefreshCw, Tags } from 'lucide-react';
import { printReceipt, printCupLabels, printOrderSlips } from '@/lib/receipt';
import { printOrderDirect, pairPrinterUsb, pairPrinterSerial, isDirectPrintSupported } from '@/lib/escpos';

export default function OrderQueuePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<any | null>(null);
  const [directPrintAvailable, setDirectPrintAvailable] = useState(false);

  useEffect(() => {
    setDirectPrintAvailable(isDirectPrintSupported());
  }, []);

  // Raw ESC/POS first (exact length + auto cut); browser dialog as fallback
  const printDirectOrFallback = async (
    order: any,
    parts: { receipt?: boolean; labels?: boolean },
    fallback: () => void
  ) => {
    try {
      await printOrderDirect(order, parts);
    } catch {
      fallback();
    }
  };

  const handlePairPrinter = async (mode: 'usb' | 'serial') => {
    try {
      const name = mode === 'usb' ? await pairPrinterUsb() : await pairPrinterSerial();
      alert(`เชื่อมต่อเครื่องพิมพ์แล้ว (${name})`);
    } catch (e: any) {
      alert(`เชื่อมต่อไม่สำเร็จ: ${e?.message || e}`);
    }
  };

  const fetchOrders = () => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then(setOrders);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders =
    activeTab === 'ALL'
      ? orders
      : orders.filter((o) => o.orderStatus === activeTab);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'PREPARING':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-800" /> คิวออเดอร์ & ประวัติการสั่งซื้อ
          </h1>
          <p className="text-xs text-stone-500">ติดตามออเดอร์ในครัว & พิมพ์สลิปย้อนหลัง</p>
        </div>

        <button
          onClick={fetchOrders}
          className="px-4 py-2.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-2xl text-xs font-bold text-stone-700 flex items-center gap-1.5 shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> รีเฟรชข้อมูล
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
        {['ALL', 'PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${
              activeTab === tab
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-400 text-xs">
            ไม่พบออเดอร์ตามแท็บที่เลือก
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="cream-card rounded-3xl p-5 border border-stone-300 flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="font-black text-sm text-stone-900 font-mono">{ord.orderNo}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(
                      ord.orderStatus
                    )}`}
                  >
                    {ord.orderStatus}
                  </span>
                </div>

                <div className="py-2 text-[11px] text-stone-500 flex items-center justify-between">
                  <span>
                    ช่องทาง: <strong className="text-stone-800">{ord.channel?.name}</strong>
                    {ord.externalOrderNo && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-mono font-bold">
                        #{ord.externalOrderNo}
                      </span>
                    )}
                  </span>
                  <span>{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Items List */}
                <div className="py-2 space-y-1 text-xs border-y border-stone-200 my-2">
                  {ord.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-stone-700">
                      <span>{it.productName} x{it.quantity}</span>
                      <span className="font-mono text-stone-500 font-bold">฿{it.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center py-2 text-sm font-black text-stone-900">
                  <span>ยอดสุทธิ</span>
                  <span className="text-emerald-800 font-mono">฿{ord.netTotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
                  {ord.orderStatus === 'PREPARING' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'COMPLETED')}
                      className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> เสร็จสิ้น
                    </button>
                  )}
                  {ord.orderStatus !== 'CANCELLED' && ord.orderStatus !== 'COMPLETED' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'CANCELLED')}
                      className="py-2 px-3 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl border border-rose-300 flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" /> ยกเลิก
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrderForSlip(ord)}
                    className="p-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl"
                    title="พิมพ์สลิป"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slip Re-print Modal */}
      {selectedOrderForSlip && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cream-card max-w-sm w-full rounded-3xl p-6 border border-stone-300">
            <h3 className="text-base font-extrabold text-stone-800 mb-3">พิมพ์สลิปย้อนหลัง</h3>

            <div id="thermal-slip" className="bg-white text-stone-900 p-4 rounded-xl font-mono text-xs border border-stone-300 shadow-inner mb-4 space-y-2">
              <div className="text-center border-b border-dashed border-stone-400 pb-2">
                <img src="/logo_single.png" alt="HAUS BLEND" className="w-36 mx-auto mb-1" />
                <div>Bangkok, Thailand</div>
              </div>
              <div className="text-[10px] space-y-0.5">
                <div>ORDER #: {selectedOrderForSlip.orderNo}</div>
                <div>DATE: {new Date(selectedOrderForSlip.createdAt).toLocaleString()}</div>
                <div>CHANNEL: {selectedOrderForSlip.channel?.name}</div>
              </div>
              <div className="border-t border-b border-dashed border-stone-400 py-2 space-y-1">
                {selectedOrderForSlip.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between">
                    <div>{it.productName} x{it.quantity}</div>
                    <div>฿{it.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-sm">
                <span>TOTAL:</span>
                <span>฿{selectedOrderForSlip.netTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() =>
                  printDirectOrFallback(selectedOrderForSlip, { receipt: true, labels: true }, () =>
                    printOrderSlips(selectedOrderForSlip)
                  )
                }
                className="w-full py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> พิมพ์ใบเสร็จ + สลิปติดแก้ว
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    printDirectOrFallback(selectedOrderForSlip, { receipt: true }, () =>
                      printReceipt(selectedOrderForSlip)
                    )
                  }
                  className="flex-1 py-2.5 bg-stone-100 border border-stone-300 text-stone-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> ใบเสร็จ
                </button>
                <button
                  onClick={() =>
                    printDirectOrFallback(selectedOrderForSlip, { labels: true }, () =>
                      printCupLabels(selectedOrderForSlip)
                    )
                  }
                  className="flex-1 py-2.5 bg-stone-100 border border-stone-300 text-stone-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Tags className="w-3.5 h-3.5" /> สลิปแก้ว
                </button>
                <button
                  onClick={() => setSelectedOrderForSlip(null)}
                  className="flex-1 py-2.5 bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
                >
                  ปิด
                </button>
              </div>
              {directPrintAvailable && (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => handlePairPrinter('usb')}
                    className="py-1.5 text-[10px] font-bold text-stone-500 hover:text-emerald-800 underline underline-offset-2"
                  >
                    🖨 เชื่อมต่อแบบ USB
                  </button>
                  <button
                    onClick={() => handlePairPrinter('serial')}
                    className="py-1.5 text-[10px] font-bold text-stone-500 hover:text-emerald-800 underline underline-offset-2"
                  >
                    🔌 เชื่อมต่อแบบ COM (Virtual COM)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
