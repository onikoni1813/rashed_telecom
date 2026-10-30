"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Sparkles,
  Zap,
  RotateCcw,
  ScanLine,
  Shield,
  Headphones,
  Battery,
  Wrench,
  Layers,
  ArrowRight,
  Clock,
  Receipt,
  X,
  Keyboard,
  Coins,
  Check,
  UserPlus,
} from "lucide-react";
import { createCustomerAction } from "@/features/customers/customer-actions";
import { CashMemo, InvoiceData } from "./cash-memo";


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
  const [customerList, setCustomerList] = useState<CustomerItem[]>(customers);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<"CATALOG" | "CART">("CATALOG");

  const handleCustomerSelectChange = (id: string) => {
    setSelectedCustomerId(id);
    if (!id) {
      setCustomerPhone("");
      setCustomerName("");
      return;
    }
    const found = customerList.find((c) => c.id === id);
    if (found) {
      setCustomerPhone(found.phone);
      setCustomerName(found.name);
    }
  };

  const handleCustomerPhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    const clean = phone.trim();
    if (!clean) {
      setSelectedCustomerId("");
      return;
    }
    const found = customerList.find((c) => c.phone.trim() === clean);
    if (found) {
      setSelectedCustomerId(found.id);
      if (!customerName.trim()) {
        setCustomerName(found.name);
      }
    } else {
      if (selectedCustomerId) {
        setSelectedCustomerId("");
      }
    }
  };

  // Quick Customer State
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustName, setQuickCustName] = useState("");
  const [quickCustPhone, setQuickCustPhone] = useState("");
  const [quickCustAddress, setQuickCustAddress] = useState("");
  const [quickCustLoading, setQuickCustLoading] = useState(false);
  const [quickCustError, setQuickCustError] = useState<string | null>(null);

  useEffect(() => {
    setCustomerList(customers);
  }, [customers]);

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickCustError(null);
    if (!quickCustName.trim()) {
      setQuickCustError("গ্রাহকের নাম পূরণ করা আবশ্যক।");
      return;
    }
    if (!quickCustPhone.trim() || quickCustPhone.trim().length < 6) {
      setQuickCustError("সঠিক মোবাইল নম্বর (কমপক্ষে ৬ ডিজিট) দিন।");
      return;
    }

    setQuickCustLoading(true);
    try {
      const res = await createCustomerAction({
        shopId,
        name: quickCustName.trim(),
        phone: quickCustPhone.trim(),
        address: quickCustAddress.trim() || null,
      });

      if (!res.success || !res.customer) {
        setQuickCustError(res.error || "গ্রাহক তৈরি ব্যর্থ হয়েছে।");
        setQuickCustLoading(false);
        return;
      }

      const newCust: CustomerItem = {
        id: res.customer.id,
        name: res.customer.name,
        phone: res.customer.phone,
        totalDue: res.customer.totalDue,
      };

      setCustomerList((prev) => [newCust, ...prev]);
      setSelectedCustomerId(newCust.id);
      setCustomerPhone(newCust.phone);
      setCustomerName(newCust.name);
      setIsQuickCustomerOpen(false);
      setQuickCustName("");
      setQuickCustPhone("");
      setQuickCustAddress("");
    } catch (err: any) {
      setQuickCustError(err.message || "ত্রুটি ঘটেছে।");
    } finally {
      setQuickCustLoading(false);
    }
  };

  // Payment splits
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [bkashAmount, setBkashAmount] = useState<number>(0);
  const [nagadAmount, setNagadAmount] = useState<number>(0);
  const [isCustomPayment, setIsCustomPayment] = useState<boolean>(false);

  // Cash Tendered for Change Calculation
  const [cashTendered, setCashTendered] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceData | null>(null);

  // Active IMEI selector modal
  const [imeiSelectModalItem, setImeiSelectModalItem] = useState<CartItem | null>(null);

  // Search input ref for keyboard focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Categories list
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
  const changeDue = cashTendered > cashAmount ? cashTendered - cashAmount : 0;

  // Auto-sync cash amount with total bill if not using custom split payment
  useEffect(() => {
    if (!isCustomPayment) {
      setCashAmount(totalAmount);
      setBkashAmount(0);
      setNagadAmount(0);
      setCashTendered(totalAmount);
    }
  }, [totalAmount, isCustomPayment]);

  // Ref for checkout handler in keyboard shortcut listener
  const handleCheckoutRef = useRef<() => void>(() => {});

  // Global Keyboard Shortcuts (F1, F2, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        handleCheckoutRef.current?.();
      } else if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (completedInvoice) setCompletedInvoice(null);
        else if (imeiSelectModalItem) setImeiSelectModalItem(null);
        else setSearch("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completedInvoice, imeiSelectModalItem]);

  const addToCart = (product: ProductItem) => {
    const stockQty = product.stockBalances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
    if (stockQty <= 0) {
      setErrorMessage(`${product.name} স্টকে নেই!`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        if (existing.quantity >= stockQty) {
          setErrorMessage(`স্টকে সর্বোচ্চ ${stockQty} টি পণ্য রয়েছে`);
          setTimeout(() => setErrorMessage(null), 3000);
          return prev;
        }
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
    const item = cart.find((it) => it.product.id === productId);
    if (!item) return;

    const stockQty = item.product.stockBalances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
    const newQty = item.quantity + delta;

    if (delta > 0 && newQty > stockQty) {
      setErrorMessage(`স্টকে সর্বোচ্চ ${stockQty} টি পণ্য রয়েছে`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setCart((prev) =>
      prev
        .map((it) => {
          if (it.product.id === productId) {
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

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setIsCustomPayment(false);
    setCashAmount(0);
    setBkashAmount(0);
    setNagadAmount(0);
    setCashTendered(0);
    setSelectedCustomerId("");
    setCustomerPhone("");
    setCustomerName("");
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (totalPaid > totalAmount) {
      setErrorMessage(
        `পরিশোধের পরিমাণ (${formatBDT(totalPaid)}) মোট বিলের (${formatBDT(totalAmount)}) চেয়ে বেশি হতে পারে না! অতিরিক্ত টাকা ফেরত দেওয়ার জন্য 'কাস্টমার ক্যাশ দিল (Tendered)' অপশন ব্যবহার করুন।`
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const payments: Array<{ method: "CASH" | "BKASH" | "NAGAD"; amount: number }> = [];
    if (cashAmount > 0) payments.push({ method: "CASH", amount: cashAmount });
    if (bkashAmount > 0) payments.push({ method: "BKASH", amount: bkashAmount });
    if (nagadAmount > 0) payments.push({ method: "NAGAD", amount: nagadAmount });

    let finalPhone = customerPhone.trim() || null;
    let finalName = customerName.trim() || null;
    let finalCustId = selectedCustomerId || null;

    if (dueAmount > 0 && !finalCustId && !finalPhone && !finalName) {
      finalName = "ওয়াক-ইন কাস্টমার";
      finalPhone = "01000000000";
    }

    const payload = {
      shopId,
      customerId: finalCustId,
      customerPhone: finalPhone,
      customerName: finalName,
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

      const snapshotItems = cart.map((it) => ({
        id: it.product.id,
        productName: it.product.name,
        brand: it.product.brand,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.quantity * it.unitPrice,
        serials: it.selectedSerialIds.map((sid) => {
          const sn = it.product.serialNumbers?.find((s) => s.id === sid);
          return sn?.imei1 || sn?.imei2 || sid;
        }),
      }));

      setCompletedInvoice({
        invoiceNumber: data.data?.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        customerName: finalName || "ওয়াক-ইন কাস্টমার",
        customerPhone: finalPhone || null,
        cashierName: "অ্যাডমিন / ক্যাশিয়ার",
        items: snapshotItems,
        subtotal: subtotal,
        discount: discount,
        totalAmount: data.data?.totalAmount ?? totalAmount,
        paidAmount: data.data?.paidAmount ?? totalPaid,
        dueAmount: data.data?.dueAmount ?? dueAmount,
        payments: payments,
        cashTendered: cashTendered,
        changeDue: changeDue,
      });

      clearCart();
      setMobileTab("CATALOG");
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during checkout.");
    } finally {
      setLoading(false);
    }
  };

  handleCheckoutRef.current = handleCheckout;

  // Helper for Product Icon based on category or name
  const getProductIcon = (p: ProductItem) => {
    const name = p.name.toLowerCase();
    const cat = p.category.name.toLowerCase();

    if (cat.includes("স্মার্টফোন") || cat.includes("phone") || name.includes("galaxy") || name.includes("redmi") || name.includes("vivo")) {
      return <Smartphone className="w-5 h-5 text-blue-500" />;
    }
    if (name.includes("charger") || name.includes("চার্জার") || name.includes("cable") || name.includes("gan")) {
      return <Zap className="w-5 h-5 text-amber-500" />;
    }
    if (name.includes("earbuds") || name.includes("tws") || name.includes("headphone") || name.includes("buds")) {
      return <Headphones className="w-5 h-5 text-purple-500" />;
    }
    if (name.includes("display") || name.includes("ডিসপ্লে") || name.includes("screen") || name.includes("oled")) {
      return <Wrench className="w-5 h-5 text-cyan-500" />;
    }
    if (name.includes("battery") || name.includes("ব্যাটারি")) {
      return <Battery className="w-5 h-5 text-emerald-500" />;
    }
    if (name.includes("glass") || name.includes("গ্লাস") || name.includes("cover") || name.includes("case")) {
      return <Shield className="w-5 h-5 text-indigo-500" />;
    }
    return <Tag className="w-5 h-5 text-primary" />;
  };

  const selectedCustomer = customerList.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28 lg:pb-12 animate-in fade-in duration-300">
      {/* WRAP ALL SCREEN UI IN PRINT:HIDDEN SO PRINT PREVIEW ONLY SHOWS THE CASH MEMO */}
      <div className="pos-workspace print:hidden space-y-6">
        {/* 1. FUTURISTIC COMMAND HEADER WITH LIVE REGISTER CONTROLS */}
        <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 glass-panel p-5 sm:p-7 shadow-2xl">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/10 blur-3xl pointer-events-none animate-pulse-subtle" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-tr from-cyan-400/20 to-emerald-400/15 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 opacity-75 blur-sm group-hover:opacity-100 transition duration-300" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-xl">
                <ShoppingCart className="w-7 h-7" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  POS দ্রুত বিক্রয় ও ক্যাশ কাউন্টার
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  কাউন্টার ১ • লাইভ
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                বারকোড স্ক্যান, স্মার্টফোন IMEI নির্বাচন, স্প্লিট পেমেন্ট ও ইনস্ট্যান্ট থার্মাল মেমো
              </p>
            </div>
          </div>

          {/* Quick Hotkeys Pill Dock */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/80 border border-border font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>ক্যাশ ড্রয়ার: ৳৫,০০০</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/80 font-mono text-[11px] text-muted-foreground">
              <span className="bg-card px-1.5 py-0.5 rounded-md border font-bold text-foreground">F1</span>
              <span>চেকআউট</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="bg-card px-1.5 py-0.5 rounded-md border font-bold text-foreground">F2</span>
              <span>সার্চ</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="bg-card px-1.5 py-0.5 rounded-md border font-bold text-foreground">Esc</span>
              <span>ক্লিয়ার</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View Switcher (Catalog vs Cart) */}
      <div className="lg:hidden grid grid-cols-2 gap-2 p-1.5 bg-muted/60 rounded-2xl border border-border">
        <button
          type="button"
          onClick={() => setMobileTab("CATALOG")}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            mobileTab === "CATALOG"
              ? "bg-card text-foreground shadow-md border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>পণ্য ক্যাটালগ</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("CART")}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all relative ${
            mobileTab === "CART"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>বিক্রয় কার্ট ও বিল</span>
          {cart.length > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                mobileTab === "CART" ? "bg-white text-primary" : "bg-primary text-white"
              }`}
            >
              {cart.reduce((s, it) => s + it.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* 2. MAIN WORKSPACE: TWO-COLUMN LAYOUT (7 COLS CATALOG / 5 COLS TERMINAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT 7 COLS: PRODUCT SEARCH, CATEGORIES & INTERACTIVE CARDS */}
        <div className={`lg:col-span-7 space-y-4 ${mobileTab === "CART" ? "hidden lg:block" : "block"}`}>
          
          {/* Search Bar & Fast Barcode Scan Trigger */}
          <div className="glass-panel p-4 rounded-3xl shadow-lg border border-border/80 space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="পণ্য, মডেল নম্বর, বা বারকোড দিয়ে দ্রুত খুঁজুন... (F2)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 text-sm bg-background/90 rounded-2xl border border-border/80 focus:outline-hidden focus:ring-4 focus:ring-primary/20 focus:border-primary shadow-inner transition-all font-medium text-foreground placeholder:text-muted-foreground"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (products.length > 0) {
                    // Simulate fast scanner finding a product
                    const randomProd = products[Math.floor(Math.random() * products.length)];
                    addToCart(randomProd);
                  }
                }}
                className="px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 shrink-0"
                title="বারকোড স্ক্যানার সিমুলেটর"
              >
                <ScanLine className="w-4 h-4 animate-pulse" />
                <span className="hidden sm:inline">বারকোড স্ক্যান</span>
              </button>
            </div>

            {/* Glowing Category Pills Carousel */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-4 py-2 text-xs rounded-xl font-black whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  selectedCategory === "ALL"
                    ? "bg-gradient-to-r from-primary to-indigo-600 text-white border-white/20 shadow-lg shadow-primary/30 scale-[1.02]"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>সব পণ্য ({products.length})</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs rounded-xl font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-primary to-indigo-600 text-white border-white/20 shadow-lg shadow-primary/30 scale-[1.02]"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid: Elevated Visual Cards with Hover Elevation & Neon Accents */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredProducts.map((p) => {
              const stockQty = p.stockBalances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
              const inCartItem = cart.find((it) => it.product.id === p.id);
              const hasSerials = p.serialNumbers && p.serialNumbers.length > 0;

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`glass-card p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between select-none group relative overflow-hidden active:scale-98 shadow-sm hover:shadow-xl hover:-translate-y-1.5 ${
                    inCartItem
                      ? "border-primary/60 ring-2 ring-primary/20 bg-primary/5"
                      : "border-border/80 hover:border-primary/40 bg-card/90 hover:bg-card"
                  }`}
                >
                  {/* Neon Glow on hover */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all pointer-events-none" />

                  <div>
                    {/* Brand & Stock Status Header */}
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 shadow-xs">
                          {getProductIcon(p)}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                          {p.brand || p.category.name}
                        </span>
                      </div>

                      {/* Stock Badge with Conditional Styling */}
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold shrink-0 border ${
                          stockQty > 10
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                            : stockQty > 0
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                        }`}
                      >
                        {stockQty > 0 ? `মজুদ: ${stockQty}` : "স্টক শেষ"}
                      </span>
                    </div>

                    {/* Product Name */}
                    <div className="font-extrabold text-xs sm:text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {p.name}
                    </div>

                    {/* SKU & Serial/IMEI indicator */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md border border-border">
                        {p.sku}
                      </span>
                      {hasSerials && (
                        <span className="text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-500/20">
                          IMEI ট্র্যাকিং
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Add to Cart Action Footer */}
                  <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">বিক্রয় মূল্য</div>
                      <div className="font-black text-sm sm:text-base text-foreground tracking-tight">
                        {formatBDT(p.sellingPrice)}
                      </div>
                    </div>

                    {/* Interactive Add Pill */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-md transition-all ${
                        inCartItem
                          ? "bg-primary text-white scale-110 shadow-primary/40 ring-2 ring-primary/30"
                          : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                      }`}
                    >
                      {inCartItem ? inCartItem.quantity : "+"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-3 border border-border/80">
              <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground text-sm">কোনো পণ্য পাওয়া যায়নি</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                আপনার অনুসন্ধানের সাথে মিলে এমন কোনো পণ্য নেই। বানান পরীক্ষা করুন অথবা সব ক্যাটাগরি সিলেক্ট করুন।
              </p>
            </div>
          )}

          {/* Floating Checkout Bar for Mobile View */}
          {cart.length > 0 && mobileTab === "CATALOG" && (
            <div className="lg:hidden fixed bottom-[72px] left-3 right-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
              <div
                onClick={() => setMobileTab("CART")}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-primary text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl shadow-blue-500/40 border border-white/25 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white relative shadow-inner">
                    <ShoppingCart className="w-5 h-5 text-white" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-indigo-600 shadow-xs">
                      {cart.reduce((s, it) => s + it.quantity, 0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-blue-100">
                      {cart.reduce((s, it) => s + it.quantity, 0)} টি পণ্য নির্বাচিত
                    </div>
                    <div className="text-sm font-black text-white tracking-tight">
                      {formatBDT(totalAmount)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileTab("CART");
                  }}
                  className="px-4 py-2.5 bg-white text-blue-700 hover:bg-white/95 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <span>চেকআউট করুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS: EXECUTIVE CART & FAST CHECKOUT TERMINAL */}
        <div className={`lg:col-span-5 rounded-3xl glass-panel shadow-2xl border border-border/80 p-5 sm:p-6 space-y-5 sticky top-20 ${mobileTab === "CATALOG" ? "hidden lg:block" : "block"}`}>
          
          {/* Mobile Back to Catalog Button */}
          <div className="lg:hidden pb-1">
            <button
              type="button"
              onClick={() => setMobileTab("CATALOG")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>‹ আরও পণ্য যোগ করতে তালিকায় যান</span>
            </button>
          </div>
          
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-base text-foreground">বিক্রয় কার্ট</h2>
                <p className="text-[11px] text-muted-foreground font-medium">গ্রাহক নির্বাচন ও চেকআউট</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {cart.reduce((s, it) => s + it.quantity, 0)} টি পণ্য
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  title="কার্ট ক্লিয়ার করুন"
                  className="p-1.5 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Customer Selection with Live Dues Badge & Direct Phone/Name */}
          <div className="space-y-2.5 p-3 sm:p-3.5 rounded-2xl border bg-muted/40 border-border/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>
                  গ্রাহক নির্বাচন {dueAmount > 0 ? <strong className="text-amber-600 dark:text-amber-400 font-extrabold">(বাকি হিসাব)</strong> : <span className="text-muted-foreground font-normal">(ঐচ্ছিক)</span>}
                </span>
              </label>

              <div className="flex items-center gap-2">
                {selectedCustomer && selectedCustomer.totalDue > 0 && (
                  <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                    পূর্বের বকেয়া: {formatBDT(selectedCustomer.totalDue)}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setQuickCustError(null);
                    setIsQuickCustomerOpen(true);
                  }}
                  className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                  title="নতুন কাস্টমার নিবন্ধন করুন"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ নতুন</span>
                </button>
              </div>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerSelectChange(e.target.value)}
              className="w-full text-xs font-semibold bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shadow-xs transition-all"
            >
              <option value="">ওয়াক-ইন কাস্টমার (বা নিচে মোবাইল/নাম দিন)</option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone} {c.totalDue > 0 ? `(পূর্বের বকেয়া: ৳${c.totalDue})` : ""}
                </option>
              ))}
            </select>

            {/* Direct Customer Mobile & Name Input for Due / Walk-in sale */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/60">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                  গ্রাহকের মোবাইল নম্বর (ঐচ্ছিক)
                </label>
                <div className="relative">
                  <Smartphone className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="01712345678 (ঐচ্ছিক)"
                    value={customerPhone}
                    onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                  গ্রাহকের নাম (ঐচ্ছিক)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="যেমন: মোঃ সাকিব হোসেন / আলমগীর ভাই"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {dueAmount > 0 && (
              <p className="text-[10px] text-muted-foreground font-medium pt-0.5">
                💡 মোবাইল নম্বর দেওয়া ঐচ্ছিক; নাম দিলে সেই নামে অথবা ওয়াক-ইন হিসেবে বাকি খতিয়ানে জমা থাকবে।
              </p>
            )}
          </div>

          {/* Cart Items List */}
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 divide-y divide-border/40 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto opacity-30" />
                <p>কার্ট খালি। বাম পাশ থেকে পণ্য নির্বাচন করে কার্টে যোগ করুন।</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-foreground truncate">
                      {item.product.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                      <span>{formatBDT(item.unitPrice)}</span>
                      <span>×</span>
                      <strong className="text-foreground">{item.quantity}</strong>
                      <span>=</span>
                      <strong className="text-primary font-black">{formatBDT(item.unitPrice * item.quantity)}</strong>
                    </div>

                    {/* IMEI Chip for Phones */}
                    {item.product.serialNumbers && item.product.serialNumbers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setImeiSelectModalItem(item)}
                        className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1"
                      >
                        <Smartphone className="w-2.5 h-2.5" />
                        <span>
                          {item.selectedSerialIds.length > 0
                            ? `IMEI সিলেক্টেড (${item.selectedSerialIds.length})`
                            : "IMEI নির্বাচন করুন"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Quantity Stepper Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-7 h-7 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center font-bold text-foreground transition-colors shadow-xs active:scale-95"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-black text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-7 h-7 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center font-bold text-foreground transition-colors shadow-xs active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 flex items-center justify-center transition-colors ml-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Totals & Discount Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>উপ-মোট</span>
              <span className="font-extrabold text-foreground">{formatBDT(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-500" />
                <span>ডিসকাউন্ট বা ছাড় (৳):</span>
              </span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount || ""}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="০"
                className="w-24 px-2.5 py-1 text-right text-xs font-black bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Huge Net Total Card */}
            <div className="pt-2 border-t border-border/70 flex items-baseline justify-between">
              <div>
                <span className="text-xs font-black uppercase text-foreground block">সর্বমোট প্রদেয়</span>
                <span className="text-[10px] text-muted-foreground font-medium">নিট প্রদেয় বিল</span>
              </div>
              <div className="text-2xl font-black text-primary tracking-tight">
                {formatBDT(totalAmount)}
              </div>
            </div>
          </div>

          {/* Multi-Channel Split Payment Terminals */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span>পেমেন্ট মাধ্যম</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold">
                পরিশোধ: <strong className="text-foreground">{formatBDT(totalPaid)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* CASH INPUT */}
              <div className="p-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 space-y-1">
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Banknote className="w-3 h-3" /> ক্যাশ
                </span>
                <input
                  type="number"
                  min="0"
                  value={cashAmount || ""}
                  onChange={(e) => {
                    setIsCustomPayment(true);
                    setCashAmount(Number(e.target.value));
                  }}
                  placeholder="০"
                  className="w-full text-xs font-mono font-black p-1.5 bg-background border border-emerald-500/20 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* BKASH INPUT (SIGNATURE PINK) */}
              <div className="p-2.5 rounded-xl border border-[#E2136E]/30 bg-[#E2136E]/5 space-y-1">
                <span className="text-[10px] font-extrabold text-[#E2136E] flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> বিকাশ
                </span>
                <input
                  type="number"
                  min="0"
                  value={bkashAmount || ""}
                  onChange={(e) => {
                    setIsCustomPayment(true);
                    setBkashAmount(Number(e.target.value));
                  }}
                  placeholder="০"
                  className="w-full text-xs font-mono font-black p-1.5 bg-background border border-[#E2136E]/30 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#E2136E]/20"
                />
              </div>

              {/* NAGAD INPUT (SIGNATURE ORANGE) */}
              <div className="p-2.5 rounded-xl border border-[#F7941D]/30 bg-[#F7941D]/5 space-y-1">
                <span className="text-[10px] font-extrabold text-[#F7941D] flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> নগদ
                </span>
                <input
                  type="number"
                  min="0"
                  value={nagadAmount || ""}
                  onChange={(e) => {
                    setIsCustomPayment(true);
                    setNagadAmount(Number(e.target.value));
                  }}
                  placeholder="০"
                  className="w-full text-xs font-mono font-black p-1.5 bg-background border border-[#F7941D]/30 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#F7941D]/20"
                />
              </div>
            </div>

            {/* Quick 1-Click Pay Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsCustomPayment(false);
                  setCashAmount(totalAmount);
                  setBkashAmount(0);
                  setNagadAmount(0);
                  setCashTendered(totalAmount);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold text-emerald-700 dark:text-emerald-300 transition-colors active:scale-95"
              >
                ফুল ক্যাশ
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomPayment(true);
                  setBkashAmount(totalAmount);
                  setCashAmount(0);
                  setNagadAmount(0);
                  setCashTendered(0);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-[#E2136E]/30 bg-[#E2136E]/10 hover:bg-[#E2136E]/20 font-bold text-[#E2136E] transition-colors active:scale-95"
              >
                ফুল বিকাশ
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomPayment(true);
                  setNagadAmount(totalAmount);
                  setCashAmount(0);
                  setBkashAmount(0);
                  setCashTendered(0);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-[#F7941D]/30 bg-[#F7941D]/10 hover:bg-[#F7941D]/20 font-bold text-[#F7941D] transition-colors active:scale-95"
              >
                ফুল নগদ
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomPayment(true);
                  setCashAmount(0);
                  setBkashAmount(0);
                  setNagadAmount(0);
                  setCashTendered(0);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 font-bold text-rose-700 dark:text-rose-300 transition-colors active:scale-95"
              >
                সম্পূর্ণ বাকি (৳০ নগদ)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomPayment(true);
                  const half = Math.round(totalAmount / 2);
                  setCashAmount(half);
                  setBkashAmount(0);
                  setNagadAmount(0);
                  setCashTendered(half);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 font-bold text-amber-700 dark:text-amber-300 transition-colors active:scale-95"
              >
                ৫০% জমা (বাকি ৫০%)
              </button>
            </div>

            {/* Cash Tendered & Change Return Calculator */}
            {cashAmount > 0 && (
              <div className="p-3 rounded-2xl bg-background border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 font-bold">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>কাস্টমার ক্যাশ দিল (Tendered):</span>
                  </span>
                  <input
                    type="number"
                    min={cashAmount}
                    value={cashTendered || ""}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    placeholder={String(cashAmount)}
                    className="w-24 px-2.5 py-1 text-right text-xs font-black bg-card border rounded-lg text-foreground"
                  />
                </div>

                {changeDue > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>ফেরত দিতে হবে (Change Due):</span>
                    <span className="text-sm font-black">{formatBDT(changeDue)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dues Warning Card */}
          {dueAmount > 0 && (
            <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-extrabold text-xs">বাকি বিক্রয় (Customer Due):</span>
                </div>
                <span className="font-black text-sm text-amber-600 dark:text-amber-400">{formatBDT(dueAmount)}</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                ✓ বিক্রয় সম্পন্ন হলে এই {formatBDT(dueAmount)} টাকা স্বয়ংক্রিয়ভাবে কাস্টমার বাকি খতিয়ানে সংরক্ষিত হবে।
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* High-Impact Glowing Checkout Button */}
          <button
            type="button"
            disabled={cart.length === 0 || loading}
            onClick={handleCheckout}
            className="w-full py-4 rounded-2xl text-white font-black text-sm shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 shimmer-button active:scale-95 cursor-pointer"
          >
            <CreditCard className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span>{loading ? "বিক্রয় সম্পন্ন হচ্ছে..." : "চেকআউট ও রসিদ তৈরি (F1)"}</span>
          </button>
        </div>
      </div>
      {/* END pos-workspace print:hidden */}
      </div>

      {/* 3. IMEI SELECTION MODAL FOR SMARTPHONES */}
      {imeiSelectModalItem && (
        <div className="print:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-black text-sm text-foreground">
                  IMEI / সিরিয়াল নম্বর নির্বাচন
                </h3>
              </div>
              <button
                onClick={() => setImeiSelectModalItem(null)}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground font-medium">
              <strong className="text-foreground">{imeiSelectModalItem.product.name}</strong> এর জন্য স্টকে থাকা সিরিয়াল নির্বাচন করুন:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {imeiSelectModalItem.product.serialNumbers?.map((s) => {
                const isSelected = imeiSelectModalItem.selectedSerialIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setCart((prev) =>
                        prev.map((it) => {
                          if (it.product.id === imeiSelectModalItem.product.id) {
                            const newSerials = isSelected
                              ? it.selectedSerialIds.filter((id) => id !== s.id)
                              : [...it.selectedSerialIds, s.id];
                            return { ...it, selectedSerialIds: newSerials };
                          }
                          return it;
                        })
                      );
                      setImeiSelectModalItem((prev) =>
                        prev
                          ? {
                              ...prev,
                              selectedSerialIds: isSelected
                                ? prev.selectedSerialIds.filter((id) => id !== s.id)
                                : [...prev.selectedSerialIds, s.id],
                            }
                          : null
                      );
                    }}
                    className={`p-3 rounded-xl border text-xs font-mono cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold"
                        : "bg-muted/40 border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <div>
                      <div>IMEI 1: {s.imei1 || "N/A"}</div>
                      {s.imei2 && <div className="text-[10px] text-muted-foreground">IMEI 2: {s.imei2}</div>}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setImeiSelectModalItem(null)}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/25"
            >
              নিশ্চিত করুন
            </button>
          </div>
        </div>
      )}

      {/* 4. INVOICE SUCCESS CASH MEMO MODAL (Thermal 80mm & Classic A4/A5) */}
      {completedInvoice && (
        <CashMemo
          invoice={completedInvoice}
          onClose={() => setCompletedInvoice(null)}
          onNewSale={() => setCompletedInvoice(null)}
        />
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickCustomerOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-border/80 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-foreground text-sm">নতুন গ্রাহক দ্রুত নিবন্ধন</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="p-5 space-y-3.5">
              {quickCustError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {quickCustError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">গ্রাহকের নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="নাম লিখুন..."
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background rounded-xl border border-border text-foreground"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
                  placeholder="যেমন: 01712345678"
                  value={quickCustPhone}
                  onChange={(e) => setQuickCustPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background rounded-xl border border-border text-foreground font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">ঠিকানা (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="ঠিকানা বা এলাকা..."
                  value={quickCustAddress}
                  onChange={(e) => setQuickCustAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background rounded-xl border border-border text-foreground"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={quickCustLoading}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {quickCustLoading ? "সংরক্ষণ হচ্ছে..." : "গ্রাহক যোগ ও নির্বাচন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

