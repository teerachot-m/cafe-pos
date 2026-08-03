'use client';

import React, { useEffect, useState } from 'react';
import {
  Coffee,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Search,
  CheckCircle,
  Printer,
  Sparkles,
  Award,
  QrCode,
  CreditCard,
  Banknote,
  Percent,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  extraPrice: number;
}

interface ProductOptionGroup {
  id: string;
  name: string;
  items: ProductOption[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  optionGroups: ProductOptionGroup[];
}

interface Channel {
  id: string;
  name: string;
  gpPercent: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
}

interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  selectedOptionIds: string[];
  selectedOptionNames: string[];
  unitPrice: number;
  subtotal: number;
}

export default function POSTerminalPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Option Modal State
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string>>({});

  // Customer CRM State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearchMsg, setCustomerSearchMsg] = useState('');
  const [usePoints, setUsePoints] = useState<number>(0);

  // Payment Modal & Thermal Slip State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PROMPTPAY_QR' | 'CREDIT_CARD'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  useEffect(() => {
    fetch('/api/categories').then((res) => res.json()).then(setCategories);
    fetch('/api/products').then((res) => res.json()).then(setProducts);
    fetch('/api/channels').then((res) => res.json()).then((data: Channel[]) => {
      setChannels(data);
      if (data.length > 0) setSelectedChannel(data[0]);
    });
  }, []);

  const filteredProducts =
    selectedCategory === 'ALL'
      ? products
      : products.filter((p) => p.categoryId === selectedCategory);

  const handleProductClick = (product: Product) => {
    if (product.optionGroups && product.optionGroups.length > 0) {
      setActiveModalProduct(product);
      const initialMap: Record<string, string> = {};
      product.optionGroups.forEach((g) => {
        if (g.items.length > 0) {
          initialMap[g.id] = g.items[0].id;
        }
      });
      setSelectedOptionsMap(initialMap);
    } else {
      addToCart(product, [], [], product.price);
    }
  };

  const handleAddWithOptions = () => {
    if (!activeModalProduct) return;
    const optionIds: string[] = [];
    const optionNames: string[] = [];
    let extraPriceTotal = 0;

    activeModalProduct.optionGroups.forEach((group) => {
      const selectedId = selectedOptionsMap[group.id];
      if (selectedId) {
        const item = group.items.find((i) => i.id === selectedId);
        if (item) {
          optionIds.push(item.id);
          optionNames.push(`${group.name}: ${item.name}`);
          extraPriceTotal += item.extraPrice;
        }
      }
    });

    addToCart(
      activeModalProduct,
      optionIds,
      optionNames,
      activeModalProduct.price + extraPriceTotal
    );
    setActiveModalProduct(null);
  };

  const addToCart = (
    product: Product,
    optionIds: string[],
    optionNames: string[],
    unitPrice: number
  ) => {
    const cartItemId = `${product.id}-${optionIds.sort().join('-')}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            cartItemId,
            product,
            quantity: 1,
            selectedOptionIds: optionIds,
            selectedOptionNames: optionNames,
            unitPrice,
            subtotal: unitPrice,
          },
        ];
      }
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, subtotal: newQty * item.unitPrice }
              : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const handleCustomerSearch = async () => {
    if (!customerPhone) return;
    setCustomerSearchMsg('Searching...');
    try {
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(customerPhone)}`);
      const data = await res.json();
      if (data) {
        setCustomer(data);
        setCustomerSearchMsg(`พบลูกค้า: ${data.name}`);
      } else {
        setCustomer(null);
        setCustomerSearchMsg('ไม่พบข้อมูลลูกค้า');
      }
    } catch {
      setCustomerSearchMsg('เกิดข้อผิดพลาดในการค้นหา');
    }
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const pointDiscount = customer && usePoints > 0 ? Math.min(customer.points, usePoints) : 0;
  const netTotal = Math.max(0, cartSubtotal - pointDiscount);
  const gpPercent = selectedChannel ? selectedChannel.gpPercent : 0;
  const estimatedGpFee = (cartSubtotal * (gpPercent / 100));

  const handleCompleteOrder = async () => {
    if (cart.length === 0 || !selectedChannel) return;
    setSubmittingOrder(true);

    try {
      const payload = {
        channelId: selectedChannel.id,
        customerId: customer ? customer.id : null,
        usePoints: pointDiscount,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          optionItemIds: item.selectedOptionIds,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to place order');
      }

      setCompletedOrder(orderData);
      setCart([]);
      setCustomer(null);
      setCustomerPhone('');
      setUsePoints(0);
      setIsPaymentOpen(false);
    } catch (err: any) {
      alert(`Order Error: ${err.message}`);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const cashVal = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, cashVal - netTotal);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-110px)]">
      {/* LEFT CATALOG AREA (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
        {/* Sales Channel Selector Bar */}
        <div className="cream-card p-3 rounded-2xl mb-4 flex items-center justify-between gap-2 overflow-x-auto border border-stone-300">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider px-2 flex items-center gap-1.5 whitespace-nowrap">
            <Percent className="w-4 h-4 text-emerald-700" /> ช่องทางขาย (Sales Channel):
          </span>
          <div className="flex items-center gap-2">
            {channels.map((ch) => {
              const isSelected = selectedChannel?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {ch.name}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      isSelected ? 'bg-emerald-950 text-emerald-300 font-mono' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    GP {ch.gpPercent}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-300'
            }`}
          >
            รายการทั้งหมด ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid (Tablet Optimized Large Touch Cards) */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="cream-card cream-card-hover rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer group border border-stone-300 shadow-2xs"
            >
              <div>
                <div className="w-full h-28 bg-stone-100 rounded-xl mb-2.5 overflow-hidden relative border border-stone-200">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <Coffee className="w-9 h-9" />
                    </div>
                  )}
                  {product.optionGroups && product.optionGroups.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-emerald-800/90 text-white text-[10px] font-bold rounded-lg shadow-sm">
                      ตัวเลือก +
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-xs text-stone-800 line-clamp-1 group-hover:text-emerald-800 transition">
                  {product.name}
                </h3>
                <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">{product.description}</p>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="font-black text-sm text-emerald-800 font-mono">
                  ฿{product.price.toFixed(2)}
                </span>
                <button className="w-8 h-8 rounded-xl bg-emerald-100 group-hover:bg-emerald-800 text-emerald-800 group-hover:text-white flex items-center justify-center transition shadow-2xs">
                  <Plus className="w-4 h-4 font-bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT CART PANEL (4 Cols) */}
      <div className="lg:col-span-4 cream-card rounded-3xl p-4 flex flex-col h-full border border-stone-300 shadow-sm">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-800" />
            <h2 className="font-extrabold text-sm text-stone-800">รายการสั่งซื้อ (Cart)</h2>
          </div>
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            {cart.reduce((a, b) => a + b.quantity, 0)} รายการ
          </span>
        </div>

        {/* CRM Customer Phone Lookup */}
        <div className="py-3 border-b border-stone-200">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="เบอร์โทรสมาชิก (CRM)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl py-2 pl-9 pr-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
              />
            </div>
            <button
              onClick={handleCustomerSearch}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs rounded-xl transition"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          {customerSearchMsg && (
            <span className="text-[10px] text-emerald-800 font-bold block mt-1">{customerSearchMsg}</span>
          )}

          {customer && (
            <div className="mt-2 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-1">
                  <Award className="w-4 h-4 text-emerald-700" /> {customer.name}
                </div>
                <div className="text-[10px] text-emerald-800">
                  แต้มสะสม: <span className="font-extrabold text-emerald-900">{customer.points} แต้ม</span>
                </div>
              </div>
              {customer.points > 0 && (
                <button
                  onClick={() => setUsePoints(usePoints > 0 ? 0 : customer.points)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition ${
                    usePoints > 0 ? 'bg-emerald-800 text-white' : 'bg-white border border-emerald-300 text-emerald-800'
                  }`}
                >
                  {usePoints > 0 ? 'กำลังใช้แต้ม' : 'ใช้แต้มส่วนลด'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cart Itemized List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs py-8">
              <Coffee className="w-10 h-10 mb-2 opacity-30 text-stone-600" />
              <span>ยังไม่มีรายการในตะกร้า</span>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartItemId}
                className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-between shadow-2xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-extrabold text-xs text-stone-800 truncate">{item.product.name}</h4>
                  {item.selectedOptionNames.length > 0 && (
                    <div className="text-[10px] text-emerald-800 font-medium truncate">
                      {item.selectedOptionNames.join(', ')}
                    </div>
                  )}
                  <div className="text-[11px] font-bold text-stone-600 font-mono">
                    ฿{item.unitPrice.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white rounded-xl p-0.5 border border-stone-300">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, -1)}
                      className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-emerald-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-extrabold text-stone-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, 1)}
                      className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-emerald-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Totals Summary */}
        <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600 font-medium">
            <span>ยอดรวม (Subtotal)</span>
            <span className="font-mono">฿{cartSubtotal.toFixed(2)}</span>
          </div>

          {selectedChannel && selectedChannel.gpPercent > 0 && (
            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>ค่า GP ช่องทาง ({selectedChannel.gpPercent}%)</span>
              <span className="text-stone-700 font-mono">-฿{estimatedGpFee.toFixed(2)}</span>
            </div>
          )}

          {pointDiscount > 0 && (
            <div className="flex justify-between text-emerald-800 font-bold">
              <span>ส่วนลดแต้มสะสม CRM</span>
              <span className="font-mono">-฿{pointDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-stone-300">
            <span>ยอดชำระสุทธิ (Net Total)</span>
            <span className="text-emerald-800 text-base font-mono">฿{netTotal.toFixed(2)}</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setIsPaymentOpen(true)}
            className="w-full mt-3 py-3.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-black text-sm rounded-2xl shadow-md transition active:scale-98 disabled:opacity-40"
          >
            ชำระเงิน ฿{netTotal.toFixed(2)}
          </button>
        </div>
      </div>

      {/* MODAL 1: Product Option Modifiers Modal */}
      {activeModalProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cream-card max-w-md w-full rounded-3xl p-6 border border-stone-300 shadow-xl">
            <h3 className="text-lg font-extrabold text-stone-800 mb-1">{activeModalProduct.name}</h3>
            <p className="text-xs text-stone-500 mb-4">{activeModalProduct.description}</p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {activeModalProduct.optionGroups.map((group) => (
                <div key={group.id} className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-2">
                    {group.name}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const isSelected = selectedOptionsMap[group.id] === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setSelectedOptionsMap((prev) => ({ ...prev, [group.id]: item.id }))
                          }
                          className={`p-2.5 rounded-xl text-xs font-bold text-left transition border ${
                            isSelected
                              ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          <div>{item.name}</div>
                          {item.extraPrice > 0 && (
                            <div className={`text-[10px] ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                              +฿{item.extraPrice}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setActiveModalProduct(null)}
                className="flex-1 py-3 rounded-2xl bg-stone-200 hover:bg-stone-300 font-bold text-xs text-stone-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddWithOptions}
                className="flex-1 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 font-bold text-xs text-white shadow-md"
              >
                เพิ่มใส่ตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cream-card max-w-lg w-full rounded-3xl p-6 border border-stone-300 shadow-xl">
            <h3 className="text-lg font-extrabold text-stone-800 mb-4 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-800" /> เลือกวิธีการชำระเงิน
            </h3>

            {/* Payment Method Choice */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3.5 rounded-2xl flex flex-col items-center gap-2 border font-extrabold text-xs transition ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                    : 'bg-stone-50 text-stone-700 border-stone-300'
                }`}
              >
                <Banknote className="w-6 h-6" /> เงินสด (Cash)
              </button>
              <button
                onClick={() => setPaymentMethod('PROMPTPAY_QR')}
                className={`p-3.5 rounded-2xl flex flex-col items-center gap-2 border font-extrabold text-xs transition ${
                  paymentMethod === 'PROMPTPAY_QR'
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                    : 'bg-stone-50 text-stone-700 border-stone-300'
                }`}
              >
                <QrCode className="w-6 h-6" /> PromptPay QR
              </button>
              <button
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`p-3.5 rounded-2xl flex flex-col items-center gap-2 border font-extrabold text-xs transition ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                    : 'bg-stone-50 text-stone-700 border-stone-300'
                }`}
              >
                <CreditCard className="w-6 h-6" /> บัตรเครดิต
              </button>
            </div>

            {/* Cash Input */}
            {paymentMethod === 'CASH' && (
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 mb-6 space-y-3">
                <label className="block text-xs font-bold text-stone-600 uppercase">
                  รับเงินสดมา (THB)
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={`ขั้นต่ำ ฿${netTotal.toFixed(2)}`}
                  className="w-full bg-white border border-stone-300 rounded-xl py-2.5 px-4 text-lg font-black text-stone-900 font-mono"
                />

                <div className="flex gap-2">
                  {[netTotal, 100, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCashReceived(preset.toString())}
                      className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-xs font-extrabold text-stone-800 rounded-xl"
                    >
                      ฿{preset}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-2 text-sm font-black text-emerald-800">
                  <span>เงินทอน:</span>
                  <span className="font-mono">฿{changeDue.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* PromptPay QR Graphic */}
            {paymentMethod === 'PROMPTPAY_QR' && (
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 mb-6 text-center space-y-3">
                <div className="w-36 h-36 mx-auto bg-white p-2 rounded-2xl flex items-center justify-center border border-stone-200">
                  <QrCode className="w-28 h-28 text-stone-900" />
                </div>
                <div className="text-xs font-bold text-stone-700">
                  สแกนจ่ายยอด: <span className="text-emerald-800 text-base font-mono font-black">฿{netTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsPaymentOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-stone-200 hover:bg-stone-300 font-bold text-xs text-stone-700"
              >
                ยกเลิก
              </button>
              <button
                disabled={submittingOrder}
                onClick={handleCompleteOrder}
                className="flex-1 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs shadow-md"
              >
                {submittingOrder ? 'กำลังบันทึก...' : 'ยืนยันชำระเงิน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Thermal Receipt Slip Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cream-card max-w-sm w-full rounded-3xl p-6 border border-stone-300 shadow-xl">
            <div className="text-center mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-700 mx-auto mb-2" />
              <h3 className="text-lg font-extrabold text-stone-800">ทำรายการสำเร็จ!</h3>
              <p className="text-xs text-stone-500 font-mono">Order No: {completedOrder.orderNo}</p>
            </div>

            {/* Thermal Slip Printable Area */}
            <div id="thermal-slip" className="bg-white text-stone-900 p-4 rounded-xl font-mono text-xs border border-stone-300 shadow-inner mb-6 space-y-2">
              <div className="text-center border-b border-dashed border-stone-400 pb-2">
                <div className="font-black text-sm">CAFE POS STORE</div>
                <div>Bangkok, Thailand</div>
                <div>TEL: 02-123-4567</div>
              </div>

              <div className="text-[10px] space-y-0.5 border-b border-dashed border-stone-400 pb-2">
                <div>ORDER #: {completedOrder.orderNo}</div>
                <div>DATE: {new Date(completedOrder.createdAt).toLocaleString('th-TH')}</div>
                <div>CHANNEL: {completedOrder.channel?.name} (GP {completedOrder.channelGpPercent}%)</div>
                <div>CASHIER: {completedOrder.cashier?.name}</div>
              </div>

              <div className="border-b border-dashed border-stone-400 pb-2 space-y-1">
                {completedOrder.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between">
                    <div>
                      <div>{it.productName} x{it.quantity}</div>
                      {it.selectedOptionsJson && (
                        <div className="text-[9px] text-stone-600 pl-2">
                          {JSON.parse(it.selectedOptionsJson).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="font-bold">฿{it.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 font-bold">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>฿{completedOrder.subtotal.toFixed(2)}</span>
                </div>
                {completedOrder.pointDiscount > 0 && (
                  <div className="flex justify-between text-stone-700">
                    <span>POINT DISCOUNT:</span>
                    <span>-฿{completedOrder.pointDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1 border-t border-stone-900 font-black">
                  <span>TOTAL NET:</span>
                  <span>฿{completedOrder.netTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-stone-400 text-[10px]">
                THANK YOU FOR YOUR VISIT!
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> พิมพ์สลิป (Print Slip)
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="px-4 py-3 rounded-2xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
