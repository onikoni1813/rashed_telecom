"use client";

import React, { useState } from "react";
import { formatBDT } from "@/lib/i18n";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Printer,
  User,
  AlertCircle,
  Tag,
} from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  brand: string | null;
  sku: string;
  barcode: string | null;
  sellingPrice: number;
  category: { name: string };
  stockBalances: Array<{ quantityOnHand: number; locationId: string }>;
  serialNumbers?: Array<{ id: string; imei1: string | null; imei2: string | null; status: string }>;
}

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  totalDue: number;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
  unitPrice: number;
  selectedSerialIds: string[];
}

interface PosTerminalProps {
  shopId: string;
  locationId: string;
  cashierId: string;
  products: ProductItem[];
  customers: CustomerItem[];
}

export function PosTerminal({
  shopId,
  locationId,
  cashierId,
  products,
  customers,
}: PosTerminalProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);

  // Payment splits
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [bkashAmount, setBkashAmount] = useState<number>(0);
  const [nagadAmount, setNagadAmount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);

  // Categories
  const categories = Array.from(new Set(products.map((p) => p.category.name)));

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));

    const matchesCat = selectedCategory === "ALL" || p.category.name === selectedCategory;

    return matchesSearch && matchesCat;
  });

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalAmount = Math.max(0, subtotal - discount);
  const totalPaid = cashAmount + bkashAmount + nagadAmount;
  const dueAmount = Math.max(0, totalAmount - totalPaid);

  const addToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: Number(product.sellingPrice),
          selectedSerialIds: [],
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.product.id === productId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((it) => it.product.id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setErrorMessage(null);

    const payments: Array<{ method: "CASH" | "BKASH" | "NAGAD"; amount: number }> = [];
    if (cashAmount > 0) payments.push({ method: "CASH", amount: cashAmount });
    if (bkashAmount > 0) payments.push({ method: "BKASH", amount: bkashAmount });
    if (nagadAmount > 0) payments.push({ method: "NAGAD", amount: nagadAmount });

    const payload = {
      shopId,
      customerId: selectedCustomerId || null,
      locationId,
      items: cart.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
        requestedPrice: it.unitPrice,
        serialNumberIds: it.selectedSerialIds,
      })),
      discount,
      payments,
    };

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/v1/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": cashierId,
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to process sale.");
      }

      setCompletedInvoice(data.data);
      setCart([]);
      setDiscount(0);
      setCashAmount(0);
      setBkashAmount(0);
      setNagadAmount(0);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top POS Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 glass-panel p-5 sm:p-6 shadow-xl">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  POS দ্রুত বিক্রয় কাউন্টার
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  কাউন্টার ১ • লাইভ
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                বারকোড স্ক্যান বা পণ্য সার্চ করে দ্রুত ক্যাশ মেমো ও স্প্লিট পেমেন্ট সম্পন্ন করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/80 border border-border font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ক্যাশ ড্রয়ার: সক্রিয়</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Product Selection Grid */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Categories Bar */}
          <div className="glass-panel p-4 rounded-2xl shadow-sm border border-border/80 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="পণ্য, মডেল, বা বারকোড দিয়ে খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-background/80 rounded-xl border border-border focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary shadow-xs transition-all font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3.5 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === "ALL"
                    ? "bg-gradient-to-r from-primary to-indigo-600 text-white border-white/20 shadow-md shadow-primary/25 scale-[1.02]"
                    : "bg-card text-muted-foreground hover:bg-muted/70 border-border"
                }`}
              >
                সব পণ্য ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-primary to-indigo-600 text-white border-white/20 shadow-md shadow-primary/25 scale-[1.02]"
                      : "bg-card text-muted-foreground hover:bg-muted/70 border-border"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {filteredProducts.map((p) => {
              const stockQty = p.stockBalances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="glass-card p-4 rounded-2xl border border-border/80 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between select-none group active:scale-95 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold truncate">
                        {p.brand || p.category.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          stockQty > 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        মজুদ: {stockQty}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {p.name}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-1">{p.sku}</div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                    <div className="font-black text-sm text-foreground">
                      {formatBDT(p.sellingPrice, "en")}
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs group-hover:bg-primary group-hover:text-white transition-colors">
                      +
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 cols: Cart, Customer & Checkout */}
        <div className="lg:col-span-5 rounded-3xl glass-panel shadow-xl border border-border/80 p-5 sm:p-6 space-y-5 sticky top-20">
          <div className="flex items-center justify-between border-b border-border/70 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h2 className="font-black text-base text-foreground">বিক্রয় কার্ট (Cart)</h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {cart.reduce((s, it) => s + it.quantity, 0)} টি আইটেম
            </span>
          </div>

        {/* Customer Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>গ্রাহক নির্বাচন (Customer)</span>
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          >
            <option value="">ওয়াক-ইন কাস্টমার (Walk-in Customer)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) {c.totalDue > 0 ? `— বকেয়া: ৳${c.totalDue}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Item List */}
        <div className="max-h-[220px] overflow-y-auto divide-y divide-border pr-1">
          {cart.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              কার্ট খালি। বাম পাশ থেকে পণ্য ক্লিক করে কার্টে যুক্ত করুন।
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {formatBDT(item.unitPrice, "en")}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded-md border flex items-center justify-center hover:bg-muted"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-6 h-6 rounded-md border flex items-center justify-center hover:bg-muted"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-6 h-6 text-muted-foreground hover:text-rose-600 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Discounts */}
        <div className="space-y-2 pt-2 border-t text-sm">
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>সাবটোটাল</span>
            <span className="font-semibold text-foreground">{formatBDT(subtotal, "en")}</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">ডিসকাউন্ট (৳)</span>
            <input
              type="number"
              min="0"
              max={subtotal}
              value={discount || ""}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="w-24 px-2 py-1 text-right text-xs bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-between font-bold text-base text-foreground pt-1 border-t">
            <span>সর্বমোট প্রদেয় (Net Total)</span>
            <span className="text-primary">{formatBDT(totalAmount, "en")}</span>
          </div>
        </div>

        {/* Split Payments Controls */}
        <div className="space-y-2 pt-2 border-t">
          <label className="text-xs font-medium text-muted-foreground">পেমেন্ট মেথড ও অর্থ গ্রহণ</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                <Banknote className="w-3 h-3 text-emerald-600" /> ক্যাশ
              </span>
              <input
                type="number"
                min="0"
                value={cashAmount || ""}
                onChange={(e) => setCashAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full text-xs p-1.5 bg-background border rounded-md font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                <Smartphone className="w-3 h-3 text-rose-500" /> বিকাশ
              </span>
              <input
                type="number"
                min="0"
                value={bkashAmount || ""}
                onChange={(e) => setBkashAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full text-xs p-1.5 bg-background border rounded-md font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                <Smartphone className="w-3 h-3 text-amber-500" /> নগদ
              </span>
              <input
                type="number"
                min="0"
                value={nagadAmount || ""}
                onChange={(e) => setNagadAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full text-xs p-1.5 bg-background border rounded-md font-mono"
              />
            </div>
          </div>

          {/* Quick Pay Fill Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setCashAmount(totalAmount);
                setBkashAmount(0);
                setNagadAmount(0);
              }}
              className="text-[11px] px-2 py-1 rounded-sm border bg-muted/60 hover:bg-muted font-medium text-foreground"
            >
              সম্পূর্ণ ক্যাশ
            </button>
            <button
              type="button"
              onClick={() => {
                setBkashAmount(totalAmount);
                setCashAmount(0);
                setNagadAmount(0);
              }}
              className="text-[11px] px-2 py-1 rounded-sm border bg-muted/60 hover:bg-muted font-medium text-foreground"
            >
              সম্পূর্ণ বিকাশ
            </button>
          </div>
        </div>

        {/* Due amount summary */}
        {dueAmount > 0 && (
          <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>বকেয়া (Customer Due):</span>
            </div>
            <span className="font-bold">{formatBDT(dueAmount, "en")}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Checkout Button */}
        <button
          type="button"
          disabled={cart.length === 0 || loading}
          onClick={handleCheckout}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shimmer-button active:scale-95 cursor-pointer"
        >
          <CreditCard className="w-5 h-5" />
          <span>{loading ? "বিক্রয় ও ক্যাশমেমো তৈরি হচ্ছে..." : "চেকআউট ও রসিদ তৈরি (F1)"}</span>
        </button>
      </div>
    </div>

    {/* Invoice Success Receipt Modal */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#faf8f5] dark:bg-[#f5f2eb] text-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-300 p-6 space-y-5 shadow-2xl font-mono text-xs select-none">
            <div className="text-center space-y-1.5 pb-3 border-b border-dashed border-zinc-400">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-black text-lg text-zinc-950 uppercase">বিক্রয় সম্পন্ন হয়েছে!</h3>
              <p className="text-xs text-zinc-600 font-bold">
                মেমো নং: {completedInvoice.invoiceNumber}
              </p>
            </div>

            <div className="p-4 bg-white/80 rounded-2xl space-y-2 border border-zinc-300/80">
              <div className="flex justify-between">
                <span className="text-zinc-600">সর্বমোট মূল্য:</span>
                <span className="font-extrabold text-sm text-zinc-950">{formatBDT(completedInvoice.totalAmount, "en")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">পরিশোধিত নগদ:</span>
                <span className="font-extrabold text-emerald-700">
                  {formatBDT(completedInvoice.paidAmount, "en")}
                </span>
              </div>
              {completedInvoice.dueAmount > 0 && (
                <div className="flex justify-between font-bold text-rose-600 pt-1 border-t border-dashed border-zinc-300">
                  <span>বকেয়া পরিমাণ:</span>
                  <span>{formatBDT(completedInvoice.dueAmount, "en")}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl border border-zinc-400 bg-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-100 shadow-xs active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4 text-zinc-700" />
                <span>প্রিন্ট রসিদ</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedInvoice(null)}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95 transition-all"
              >
                নতুন বিক্রয়
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
