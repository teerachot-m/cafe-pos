'use client';

import React, { useEffect, useState } from 'react';
import { Boxes, AlertTriangle, Plus, Scale } from 'lucide-react';

interface StockLog {
  id: string;
  changeAmount: number;
  resultingStock: number;
  type: string;
  note: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockAlert: number;
  costPerUnit: number;
  stockLogs: StockLog[];
}

export default function StockInventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  // Form State
  const [restockAmount, setRestockAmount] = useState('');
  const [restockType, setRestockType] = useState<'RESTOCK' | 'WASTE' | 'ADJUSTMENT'>('RESTOCK');
  const [restockCost, setRestockCost] = useState('');
  const [restockNote, setRestockNote] = useState('');

  const loadData = () => {
    fetch('/api/ingredients')
      .then((res) => res.json())
      .then(setIngredients);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || !restockAmount) return;

    const res = await fetch(`/api/ingredients/${selectedIngredient.id}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: restockAmount,
        type: restockType,
        note: restockNote,
        costPerUnit: restockCost ? parseFloat(restockCost) : selectedIngredient.costPerUnit,
      }),
    });

    if (res.ok) {
      setIsRestockOpen(false);
      setSelectedIngredient(null);
      setRestockAmount('');
      setRestockNote('');
      loadData();
    } else {
      const err = await res.json();
      alert(`Error updating stock: ${err.error}`);
    }
  };

  const lowStockCount = ingredients.filter((i) => i.currentStock <= i.minStockAlert).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-800" /> คลังวัตถุดิบ & การตัดสต๊อก BOM
          </h1>
          <p className="text-xs text-stone-500">เช็กปริมาณวัตถุดิบ เติมสต๊อก & แจ้งเตือนวัตถุดิบใกล้หมด</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="cream-card p-5 rounded-3xl border border-stone-300 flex items-center gap-3.5 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase">วัตถุดิบทั้งหมด</div>
            <div className="text-2xl font-black text-stone-900">{ingredients.length} รายการ</div>
          </div>
        </div>

        <div className="cream-card p-5 rounded-3xl border border-stone-300 flex items-center gap-3.5 shadow-2xs">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              lowStockCount > 0 ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase">เตือนวัตถุดิบต่ำกว่าเกณฑ์</div>
            <div className={`text-2xl font-black ${lowStockCount > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
              {lowStockCount} รายการ
            </div>
          </div>
        </div>
      </div>

      {/* Ingredient Stock Table */}
      <div className="cream-card rounded-3xl border border-stone-300 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-extrabold text-stone-800">ตารางตรรกะวัตถุดิบ</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] font-extrabold">
              <tr>
                <th className="px-4 py-3.5">ชื่อวัตถุดิบ</th>
                <th className="px-4 py-3.5">หน่วยนับ</th>
                <th className="px-4 py-3.5">คงเหลือปัจจุบัน</th>
                <th className="px-4 py-3.5">ขั้นต่ำแจ้งเตือน</th>
                <th className="px-4 py-3.5">ต้นทุน/หน่วย (บาท)</th>
                <th className="px-4 py-3.5">สถานะ</th>
                <th className="px-4 py-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-700 bg-white">
              {ingredients.map((ing) => {
                const isLow = ing.currentStock <= ing.minStockAlert;
                return (
                  <tr key={ing.id} className="hover:bg-stone-50 transition">
                    <td className="px-4 py-3.5 font-bold text-stone-900">{ing.name}</td>
                    <td className="px-4 py-3.5 font-mono text-stone-500 font-bold">{ing.unit}</td>
                    <td className="px-4 py-3.5 font-mono font-black text-sm text-stone-900">
                      {ing.currentStock.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-stone-500">{ing.minStockAlert.toLocaleString()}</td>
                    <td className="px-4 py-3.5 font-mono text-emerald-800 font-bold">฿{ing.costPerUnit.toFixed(2)}</td>
                    <td className="px-4 py-3.5">
                      {isLow ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          วัตถุดิบใกล้หมด
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ปกติ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedIngredient(ing);
                          setRestockCost(ing.costPerUnit.toString());
                          setIsRestockOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> เติม/ปรับสต๊อก
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock & Adjustment Modal */}
      {isRestockOpen && selectedIngredient && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleRestockSubmit} className="cream-card max-w-md w-full rounded-3xl p-6 border border-stone-300 shadow-xl">
            <h3 className="text-base font-extrabold text-stone-800 mb-1">
              ปรับปรุงสต๊อก: {selectedIngredient.name}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              คงเหลือในระบบ: <strong className="text-emerald-800 font-mono font-bold">{selectedIngredient.currentStock} {selectedIngredient.unit}</strong>
            </p>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block text-stone-600 font-bold mb-1">ประเภทการปรับปรุง</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['RESTOCK', 'WASTE', 'ADJUSTMENT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRestockType(t)}
                      className={`p-2.5 rounded-xl font-bold text-[11px] border transition ${
                        restockType === t
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-stone-50 text-stone-700 border-stone-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">
                  จำนวน ({selectedIngredient.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  placeholder="เช่น 500"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-900 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">
                  ต้นทุนต่อ {selectedIngredient.unit} (บาท)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">หมายเหตุ / เหตุผล</label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="เช่น รับของจากซัพพลายเออร์ / วัตถุดิบหมดอายุ"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-stone-800"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsRestockOpen(false)}
                className="flex-1 py-3 bg-stone-200 text-stone-700 font-bold rounded-2xl"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-800 text-white font-bold rounded-2xl shadow-md"
              >
                ยืนยันบันทึก
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
