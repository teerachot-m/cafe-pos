'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Layers, Sparkles, Scale, ListPlus, Share2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

interface Channel {
  id: string;
  name: string;
  gpPercent: number;
  active: boolean;
}

interface OptionItemForm {
  name: string;
  extraPrice: string;
}

interface OptionGroupForm {
  name: string;
  isRequired: boolean;
  items: OptionItemForm[];
}

export default function MenuManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  // Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // New Category Form
  const [catName, setCatName] = useState('');

  // New Product & BOM Form
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [bomRows, setBomRows] = useState<{ ingredientId: string; quantityRequired: string }[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroupForm[]>([]);
  const [channelPriceMap, setChannelPriceMap] = useState<Record<string, string>>({});

  const reloadData = () => {
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
    fetch('/api/products').then((r) => r.json()).then(setProducts);
    fetch('/api/ingredients').then((r) => r.json()).then(setIngredients);
    fetch('/api/channels').then((r) => r.json()).then(setChannels);
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName }),
    });
    setCatName('');
    setIsAddCategoryOpen(false);
    reloadData();
  };

  const addBomRow = () => {
    if (ingredients.length === 0) return;
    setBomRows((prev) => [...prev, { ingredientId: ingredients[0].id, quantityRequired: '1' }]);
  };

  const removeBomRow = (index: number) => {
    setBomRows((prev) => prev.filter((_, i) => i !== index));
  };

  // ----- Option Group Builder -----
  const addOptionGroup = () => {
    setOptionGroups((prev) => [
      ...prev,
      { name: '', isRequired: true, items: [{ name: '', extraPrice: '0' }] },
    ]);
  };

  const removeOptionGroup = (gIdx: number) => {
    setOptionGroups((prev) => prev.filter((_, i) => i !== gIdx));
  };

  const updateGroup = (gIdx: number, patch: Partial<OptionGroupForm>) => {
    setOptionGroups((prev) => prev.map((g, i) => (i === gIdx ? { ...g, ...patch } : g)));
  };

  const addOptionItem = (gIdx: number) => {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx ? { ...g, items: [...g.items, { name: '', extraPrice: '0' }] } : g
      )
    );
  };

  const removeOptionItem = (gIdx: number, itemIdx: number) => {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx ? { ...g, items: g.items.filter((_, j) => j !== itemIdx) } : g
      )
    );
  };

  const updateOptionItem = (gIdx: number, itemIdx: number, patch: Partial<OptionItemForm>) => {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx
          ? { ...g, items: g.items.map((it, j) => (j === itemIdx ? { ...it, ...patch } : it)) }
          : g
      )
    );
  };

  const resetProductForm = () => {
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdImage('');
    setBomRows([]);
    setOptionGroups([]);
    setChannelPriceMap({});
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodCategory) return;

    const payload = {
      name: prodName,
      description: prodDesc,
      price: parseFloat(prodPrice),
      categoryId: prodCategory,
      imageUrl: prodImage || null,
      recipes: bomRows.map((r) => ({
        ingredientId: r.ingredientId,
        quantityRequired: parseFloat(r.quantityRequired),
      })),
      optionGroups: optionGroups
        .filter((g) => g.name.trim() && g.items.some((it) => it.name.trim()))
        .map((g) => ({
          name: g.name.trim(),
          isRequired: g.isRequired,
          items: g.items
            .filter((it) => it.name.trim())
            .map((it) => ({ name: it.name.trim(), extraPrice: parseFloat(it.extraPrice) || 0 })),
        })),
      channelPrices: Object.entries(channelPriceMap)
        .filter(([, price]) => price !== '' && !isNaN(parseFloat(price)))
        .map(([channelId, price]) => ({ channelId, price: parseFloat(price) })),
    };

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      resetProductForm();
      setIsAddProductOpen(false);
      reloadData();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const estimatedModalCogs = bomRows.reduce((acc, r) => {
    const ing = ingredients.find((i) => i.id === r.ingredientId);
    if (!ing) return acc;
    const qty = parseFloat(r.quantityRequired) || 0;
    return acc + qty * ing.costPerUnit;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-800" /> จัดการเมนู & สูตรวัตถุดิบ BOM
          </h1>
          <p className="text-xs text-stone-500">สร้างเมนู + ตัวเลือก, กำหนดราคาตามช่องทางขาย & ผูกสูตรต้นทุนวัตถุดิบ</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCategoryOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-2xl text-xs font-bold text-stone-700 flex items-center gap-1.5 shadow-2xs"
          >
            <Layers className="w-4 h-4 text-emerald-700" /> เพิ่มหมวดหมู่
          </button>
          <button
            onClick={() => {
              if (categories.length > 0) setProdCategory(categories[0].id);
              setIsAddProductOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-2xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> เพิ่มเมนู & สูตร BOM
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const cogs = p.recipes?.reduce((acc: number, r: any) => {
            return acc + r.quantityRequired * (r.ingredient?.costPerUnit || 0);
          }, 0) || 0;

          const margin = p.price > 0 ? ((p.price - cogs) / p.price) * 100 : 0;

          return (
            <div key={p.id} className="cream-card rounded-3xl p-5 border border-stone-300 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                    {p.category?.name || 'Category'}
                  </span>
                  <span className="font-black text-sm text-emerald-800 font-mono">฿{p.price.toFixed(2)}</span>
                </div>

                <h3 className="font-extrabold text-sm text-stone-800">{p.name}</h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{p.description}</p>

                {/* Channel Prices */}
                <div className="mt-3 pt-3 border-t border-stone-200">
                  <span className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Share2 className="w-3.5 h-3.5 text-emerald-700" /> ราคาตามช่องทางขาย:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {channels.map((ch) => {
                      const cp = p.channelPrices?.find((c: any) => c.channelId === ch.id);
                      return (
                        <span
                          key={ch.id}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                            cp
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-stone-50 text-stone-500 border-stone-200'
                          }`}
                        >
                          {ch.name}: <span className="font-mono">฿{(cp ? cp.price : p.price).toFixed(2)}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Option Groups */}
                {p.optionGroups && p.optionGroups.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-200">
                    <span className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <ListPlus className="w-3.5 h-3.5 text-emerald-700" /> ตัวเลือกเมนู:
                    </span>
                    <div className="space-y-1">
                      {p.optionGroups.map((g: any) => (
                        <div key={g.id} className="text-[11px] text-stone-700">
                          <strong className="text-emerald-800">{g.name}:</strong>{' '}
                          {g.items
                            .map((it: any) => (it.extraPrice > 0 ? `${it.name} (+฿${it.extraPrice})` : it.name))
                            .join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BOM Ingredients */}
                <div className="mt-3 pt-3 border-t border-stone-200">
                  <span className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Scale className="w-3.5 h-3.5 text-emerald-700" /> สูตรวัตถุดิบ BOM:
                  </span>
                  {p.recipes && p.recipes.length > 0 ? (
                    <div className="space-y-1">
                      {p.recipes.map((r: any) => (
                        <div key={r.id} className="flex justify-between text-[11px] text-stone-700">
                          <span>• {r.ingredient?.name}</span>
                          <span className="font-mono text-stone-500 font-bold">
                            {r.quantityRequired} {r.ingredient?.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400 italic">ยังไม่ผูกสูตรวัตถุดิบ</span>
                  )}
                </div>
              </div>

              {/* Profit Margin Bar */}
              <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-[11px]">
                <span className="text-stone-500">ต้นทุนวัตถุดิบรวม: <strong className="text-stone-800 font-mono">฿{cogs.toFixed(2)}</strong></span>
                <span className="text-emerald-800 font-extrabold">กำไรขั้นต้น {margin.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Category */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateCategory} className="cream-card max-w-sm w-full rounded-3xl p-6 border border-stone-300">
            <h3 className="text-base font-extrabold text-stone-800 mb-4">เพิ่มหมวดหมู่เมนู</h3>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="เช่น กาแฟสกัดเย็น, เบเกอรี่"
              className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2.5 px-3.5 text-xs text-stone-800 mb-4"
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                className="flex-1 py-2.5 bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl"
              >
                ยกเลิก
              </button>
              <button type="submit" className="flex-1 py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-2xl">
                สร้างหมวดหมู่
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Product & Options & BOM Recipe */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateProduct} className="cream-card max-w-xl w-full rounded-3xl p-6 border border-stone-300 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-stone-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-800" /> เพิ่มเมนูสินค้า & สูตร BOM
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">ชื่อเมนูสินค้า</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="เช่น Iced Vanilla Latte"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2 px-3 text-stone-800 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">ราคาหน้าร้าน (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="90.00"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2 px-3 text-stone-800 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">หมวดหมู่</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2 px-3 text-stone-800 font-bold"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">คำอธิบาย</label>
                <input
                  type="text"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="รายละเอียดเมนูแบบย่อ"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2 px-3 text-stone-800"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">รูปภาพ URL</label>
                <input
                  type="url"
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl py-2 px-3 text-stone-800"
                />
              </div>

              {/* Channel Prices Section */}
              <div className="pt-3 border-t border-stone-200">
                <span className="font-extrabold text-emerald-800 flex items-center gap-1 mb-2">
                  <Share2 className="w-3.5 h-3.5" /> ราคาขายตามช่องทาง (เว้นว่าง = ใช้ราคาหน้าร้าน)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {channels.map((ch) => (
                    <div key={ch.id} className="flex items-center gap-2 bg-stone-50 p-2 rounded-2xl border border-stone-300">
                      <span className="flex-1 font-bold text-stone-700 text-[11px] truncate">
                        {ch.name}
                        {ch.gpPercent > 0 && (
                          <span className="text-stone-400 font-mono"> (GP {ch.gpPercent}%)</span>
                        )}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={channelPriceMap[ch.id] ?? ''}
                        onChange={(e) =>
                          setChannelPriceMap((prev) => ({ ...prev, [ch.id]: e.target.value }))
                        }
                        placeholder={prodPrice || 'ราคา'}
                        className="w-20 bg-white border border-stone-300 rounded-xl py-1 px-2 text-stone-900 font-mono font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Option Groups Builder Section */}
              <div className="pt-3 border-t border-stone-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                    <ListPlus className="w-3.5 h-3.5" /> ตัวเลือกเมนู (เช่น ระดับหวาน, ชนิดนม)
                  </span>
                  <button
                    type="button"
                    onClick={addOptionGroup}
                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl text-[11px]"
                  >
                    + เพิ่มกลุ่มตัวเลือก
                  </button>
                </div>

                {optionGroups.map((group, gIdx) => (
                  <div key={gIdx} className="mb-3 bg-stone-50 p-3 rounded-2xl border border-stone-300 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) => updateGroup(gIdx, { name: e.target.value })}
                        placeholder="ชื่อกลุ่ม เช่น ระดับความหวาน"
                        className="flex-1 bg-white border border-stone-300 rounded-xl py-1.5 px-2 text-stone-800 font-bold"
                      />
                      <label className="flex items-center gap-1 text-[10px] font-bold text-stone-600 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={group.isRequired}
                          onChange={(e) => updateGroup(gIdx, { isRequired: e.target.checked })}
                          className="rounded border-stone-300"
                        />
                        ต้องเลือก
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOptionGroup(gIdx)}
                        className="text-rose-600 hover:text-rose-800 font-bold text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>

                    {group.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-2 pl-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateOptionItem(gIdx, itemIdx, { name: e.target.value })}
                          placeholder="ชื่อตัวเลือก เช่น หวานน้อย 50%"
                          className="flex-1 bg-white border border-stone-300 rounded-xl py-1 px-2 text-stone-800"
                        />
                        <span className="text-[10px] text-stone-500 font-bold">+฿</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.extraPrice}
                          onChange={(e) => updateOptionItem(gIdx, itemIdx, { extraPrice: e.target.value })}
                          placeholder="0"
                          className="w-16 bg-white border border-stone-300 rounded-xl py-1 px-2 text-stone-900 font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => removeOptionItem(gIdx, itemIdx)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addOptionItem(gIdx)}
                      className="ml-3 px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-bold rounded-xl text-[10px]"
                    >
                      + เพิ่มตัวเลือกในกลุ่มนี้
                    </button>
                  </div>
                ))}
              </div>

              {/* BOM Builder Section */}
              <div className="pt-3 border-t border-stone-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" /> สูตรวัตถุดิบ BOM (Raw Material Recipe)
                  </span>
                  <button
                    type="button"
                    onClick={addBomRow}
                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl text-[11px]"
                  >
                    + เพิ่มวัตถุดิบ
                  </button>
                </div>

                {bomRows.map((row, idx) => {
                  const selectedIng = ingredients.find((i) => i.id === row.ingredientId);
                  return (
                    <div key={idx} className="flex items-center gap-2 mb-2 bg-stone-50 p-2 rounded-2xl border border-stone-300">
                      <select
                        value={row.ingredientId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBomRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ingredientId: val } : r)));
                        }}
                        className="flex-1 bg-white border border-stone-300 rounded-xl py-1 px-2 text-stone-800 font-bold"
                      >
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.1"
                        value={row.quantityRequired}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBomRows((prev) => prev.map((r, i) => (i === idx ? { ...r, quantityRequired: val } : r)));
                        }}
                        placeholder="ปริมาณ"
                        className="w-20 bg-white border border-stone-300 rounded-xl py-1 px-2 text-stone-900 font-mono font-bold"
                      />

                      <span className="text-[10px] text-stone-500 font-bold w-8">{selectedIng?.unit}</span>

                      <button
                        type="button"
                        onClick={() => removeBomRow(idx)}
                        className="text-rose-600 hover:text-rose-800 font-bold text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {bomRows.length > 0 && (
                  <div className="text-[11px] text-stone-500 pt-1 text-right">
                    ประมาณการต้นทุนวัตถุดิบ: <strong className="text-emerald-800 font-mono font-black">฿{estimatedModalCogs.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsAddProductOpen(false)}
                className="flex-1 py-3 bg-stone-200 text-stone-700 font-bold rounded-2xl"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-800 text-white font-bold rounded-2xl shadow-md"
              >
                บันทึกเมนู & สูตร
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
