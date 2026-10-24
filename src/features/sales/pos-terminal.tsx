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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 cols: Product Selection Grid */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search & Categories Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="পণ্য, মডেল, বা বারকোড দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-card rounded-xl border border-input focus:outline-hidden focus:ring-2 focus:ring-primary/20 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-colors border ${
                selectedCategory === "ALL"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              সব পণ্য (All)
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-colors border ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const stockQty = p.stockBalances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="p-3.5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between select-none"
              >
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
                    {p.brand || p.category.name}
                  </div>
                  <div className="font-semibold text-sm text-foreground leading-snug line-clamp-2 mt-0.5">
                    {p.name}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground mt-1">{p.sku}</div>
                </div>

                <div className="mt-3 pt-2 border-t flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground">
                    {formatBDT(p.sellingPrice, "en")}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold ${
                      stockQty > 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    স্টক: {stockQty}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 5 cols: Cart, Customer & Checkout */}
      <div className="lg:col-span-5 rounded-2xl border bg-card shadow-xs p-5 space-y-5 sticky top-20">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base text-foreground">বিক্রয় কার্ট (Cart)</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
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
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>{loading ? "বিক্রয় সম্পন্ন হচ্ছে..." : "চেকআউট ও রসিদ তৈরি"}</span>
        </button>
      </div>

      {/* Invoice Success Receipt Modal */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-foreground">বিক্রয় সম্পন্ন হয়েছে!</h3>
              <p className="text-xs text-muted-foreground font-mono">
                ইনভয়েস: {completedInvoice.invoiceNumber}
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl space-y-2 text-xs border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">সর্বমোট মূল্য</span>
                <span className="font-semibold">{formatBDT(completedInvoice.totalAmount, "en")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">পরিশোধকৃত অর্থ</span>
                <span className="font-semibold text-emerald-600">
                  {formatBDT(completedInvoice.paidAmount, "en")}
                </span>
              </div>
              {completedInvoice.dueAmount > 0 && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>বকেয়া</span>
                  <span>{formatBDT(completedInvoice.dueAmount, "en")}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg border bg-background font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-muted"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট করুন</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedInvoice(null)}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90"
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
