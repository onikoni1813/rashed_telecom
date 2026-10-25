"use client";

import React, { useState, useMemo } from "react";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  ShoppingBag,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  CreditCard,
  Search,
  X,
  PackageCheck,
  Package,
  Trash2,
  AlertCircle,
  FileText,
  UserPlus,
  Check,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  createPurchaseOrderAction,
  receiveGoodsAction,
  createSupplierAction,
} from "./purchasing-actions";

export interface SerializedPOItem {
  id: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface SerializedPurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  orderedAt: string;
  expectedAt?: string | null;
  notes?: string | null;
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
  };
  items: SerializedPOItem[];
}

export interface SerializedSupplier {
  id: string;
  name: string;
  phone?: string | null;
  contactPerson?: string | null;
  payableBalance: number;
}

export interface SerializedProductOption {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
}

export interface SerializedLocationOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface PurchasingViewProps {
  shopId: string;
  initialOrders: SerializedPurchaseOrder[];
  initialSuppliers: SerializedSupplier[];
  products: SerializedProductOption[];
  locations: SerializedLocationOption[];
}

interface NewPOItemRow {
  productId: string;
  quantity: number;
  unitCost: number;
}

export function PurchasingView({
  shopId,
  initialOrders,
  initialSuppliers,
  products,
  locations,
}: PurchasingViewProps) {
  const [orders, setOrders] = useState<SerializedPurchaseOrder[]>(initialOrders);
  const [suppliers, setSuppliers] = useState<SerializedSupplier[]>(initialSuppliers);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [selectedOrderForReceive, setSelectedOrderForReceive] = useState<SerializedPurchaseOrder | null>(null);

  // Create PO Form State
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poExpectedAt, setPoExpectedAt] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poRows, setPoRows] = useState<NewPOItemRow[]>([
    { productId: products[0]?.id || "", quantity: 1, unitCost: products[0]?.costPrice || 0 },
  ]);
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);

  // Goods Receipt (GRN) Form State
  const [receiveLocationId, setReceiveLocationId] = useState(locations[0]?.id || "");
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState("");
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);

  // Add Supplier Form State
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Add Row in PO Builder
  const handleAddRow = () => {
    const defaultProd = products[0];
    setPoRows((prev) => [
      ...prev,
      { productId: defaultProd?.id || "", quantity: 1, unitCost: defaultProd?.costPrice || 0 },
    ]);
  };

  // Remove Row in PO Builder
  const handleRemoveRow = (idx: number) => {
    if (poRows.length <= 1) return;
    setPoRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Change product in row (auto-fill cost price)
  const handleProductChange = (idx: number, prodId: string) => {
    const found = products.find((p) => p.id === prodId);
    setPoRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, productId: prodId, unitCost: found?.costPrice || r.unitCost } : r))
    );
  };

  // Change quantity in row
  const handleQtyChange = (idx: number, qty: number) => {
    setPoRows((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: Math.max(1, qty) } : r)));
  };

  // Change unit cost in row
  const handleCostChange = (idx: number, cost: number) => {
    setPoRows((prev) => prev.map((r, i) => (i === idx ? { ...r, unitCost: Math.max(0, cost) } : r)));
  };

  // Calculate PO Total
  const calculatedPoTotal = poRows.reduce((sum, r) => sum + r.quantity * r.unitCost, 0);

  // Submit New Purchase Order
  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId) {
      showNotification("সরবরাহকারী নির্বাচন করুন।", true);
      return;
    }
    if (poRows.length === 0) {
      showNotification("কমপক্ষে একটি পণ্য যোগ করুন।", true);
      return;
    }

    setIsSubmittingPO(true);
    try {
      const res = await createPurchaseOrderAction({
        shopId,
        supplierId: poSupplierId,
        expectedAt: poExpectedAt ? new Date(poExpectedAt).toISOString() : null,
        notes: poNotes.trim() || null,
        items: poRows.map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
          unitCost: r.unitCost,
        })),
      });

      if (!res.success || !res.order) {
        showNotification(res.error || "পারচেজ অর্ডার তৈরি ব্যর্থ হয়েছে।", true);
        return;
      }

      setOrders((prev) => [res.order as SerializedPurchaseOrder, ...prev]);
      showNotification(`পারচেজ অর্ডার ${res.order.poNumber} সফলভাবে তৈরি হয়েছে!`);

      // Reset
      setPoNotes("");
      setPoExpectedAt("");
      setPoRows([{ productId: products[0]?.id || "", quantity: 1, unitCost: products[0]?.costPrice || 0 }]);
      setIsCreatePOModalOpen(false);
    } catch (err: any) {
      showNotification(err.message || "সমস্যা হয়েছে।", true);
    } finally {
      setIsSubmittingPO(false);
    }
  };

  // Open Receive Modal
  const handleOpenReceiveModal = (order: SerializedPurchaseOrder) => {
    setSelectedOrderForReceive(order);
    const initialQtys: Record<string, number> = {};
    order.items.forEach((it) => {
      const remaining = it.quantity - it.receivedQuantity;
      initialQtys[it.id] = remaining > 0 ? remaining : 0;
    });
    setReceiveQuantities(initialQtys);
    setReceiveNotes("");
    setIsReceiveModalOpen(true);
  };

  // Submit Goods Receipt (GRN)
  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReceive) return;
    if (!receiveLocationId) {
      showNotification("লোকেশন নির্বাচন করুন।", true);
      return;
    }

    const itemsToReceive = selectedOrderForReceive.items
      .map((it) => {
        const qty = receiveQuantities[it.id] || 0;
        return {
          productId: it.product.id,
          quantity: qty,
          unitCost: it.unitCost,
        };
      })
      .filter((it) => it.quantity > 0);

    if (itemsToReceive.length === 0) {
      showNotification("কমপক্ষে একটি পণ্যের রিসিভ পরিমাণ দিন।", true);
      return;
    }

    setIsSubmittingReceive(true);
    try {
      const res = await receiveGoodsAction({
        shopId,
        purchaseOrderId: selectedOrderForReceive.id,
        locationId: receiveLocationId,
        notes: receiveNotes.trim() || null,
        receivedItems: itemsToReceive,
      });

      if (!res.success || !res.result) {
        showNotification(res.error || "পণ্য রিসিভ ব্যর্থ হয়েছে।", true);
        return;
      }

      // Update local orders state
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === selectedOrderForReceive.id) {
            return {
              ...o,
              status: res.result.newStatus,
              items: o.items.map((it) => {
                const receivedNow = receiveQuantities[it.id] || 0;
                return {
                  ...it,
                  receivedQuantity: it.receivedQuantity + receivedNow,
                };
              }),
            };
          }
          return o;
        })
      );

      // Update supplier balance
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === selectedOrderForReceive.supplier.id
            ? { ...s, payableBalance: s.payableBalance + res.result.totalReceivedValue }
            : s
        )
      );

      showNotification(
        `পণ্য রিসিভ সম্পন্ন! (${res.result.grnNumber}) — ইনভেন্টরি স্টক বৃদ্ধি পেয়েছে।`
      );
      setIsReceiveModalOpen(false);
      setSelectedOrderForReceive(null);
    } catch (err: any) {
      showNotification(err.message || "সমস্যা হয়েছে।", true);
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  // Submit New Supplier
  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      showNotification("সরবরাহকারীর নাম দিন।", true);
      return;
    }

    setIsSubmittingSupplier(true);
    try {
      const res = await createSupplierAction({
        shopId,
        name: supName.trim(),
        phone: supPhone.trim() || null,
        contactPerson: supContact.trim() || null,
        address: supAddress.trim() || null,
      });

      if (!res.success || !res.supplier) {
        showNotification(res.error || "সরবরাহকারী তৈরি ব্যর্থ হয়েছে।", true);
        return;
      }

      setSuppliers((prev) => [...prev, res.supplier as SerializedSupplier]);
      setPoSupplierId(res.supplier.id); // Auto-select in PO form

      showNotification(`"${res.supplier.name}" সরবরাহকারী যুক্ত হয়েছে!`);
      setSupName("");
      setSupPhone("");
      setSupContact("");
      setSupAddress("");
      setIsAddSupplierModalOpen(false);
    } catch (err: any) {
      showNotification(err.message || "সমস্যা হয়েছে।", true);
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesPo = o.poNumber.toLowerCase().includes(q);
        const matchesSup = o.supplier.name.toLowerCase().includes(q);
        const matchesItem = o.items.some((it) => it.product.name.toLowerCase().includes(q));
        return matchesPo || matchesSup || matchesItem;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const totalPayable = suppliers.reduce((sum, s) => sum + Number(s.payableBalance), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-600 text-white shadow-2xl animate-in slide-in-from-top-4 duration-300 font-semibold text-sm border border-emerald-400/30">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-2 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-rose-600 text-white shadow-2xl animate-in slide-in-from-top-4 duration-300 font-semibold text-sm border border-rose-400/30">
          <AlertCircle className="w-5 h-5 text-white shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-2 ring-white/10 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  ক্রয় ও সাপ্লায়ার অর্ডার ব্যবস্থাপনা
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-500 dark:text-blue-400">
                  <Sparkles className="w-3 h-3" />
                  GRN & Stock In
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                পারচেজ অর্ডার (PO), গুডস রিসিভ নোট (GRN), এবং সরবরাহকারী প্রদেয় বিলিং
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsAddSupplierModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-indigo-500" />
              <span>নতুন সাপ্লায়ার</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (suppliers.length > 0 && !poSupplierId) {
                  setPoSupplierId(suppliers[0].id);
                }
                setIsCreatePOModalOpen(true);
              }}
              className="flex-1 sm:flex-initial shimmer-button inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 hover:brightness-110 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন পারচেজ অর্ডার</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              মোট পারচেজ অর্ডার
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
            {orders.length} টি
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            সাপ্লায়ারদের সাথে নিষ্পত্তিকৃত ক্রয়াদেশ
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              নিবন্ধিত সরবরাহকারী (Suppliers)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-primary font-mono">
            {suppliers.length} জন
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            সক্রিয় ভেন্ডর ও ডিস্ট্রিবিউটর অ্যাকাউন্ট
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              সরবরাহকারীর প্রদেয় পাওনা (Payable)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatBDT(totalPayable, "en")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            গুডস রিসিভ (GRN) ও বিল অনুযায়ী দেনা
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-border/60 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="PO নম্বর, সাপ্লায়ার, বা পণ্য দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-card/80 rounded-xl border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition-all font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 p-1 rounded-xl border border-border/50 text-xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "ALL"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            সকল অর্ডার ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ORDERED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "ORDERED"
                ? "bg-card text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            অপেক্ষমাণ (Ordered)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PARTIALLY_RECEIVED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "PARTIALLY_RECEIVED"
                ? "bg-card text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            আংশিক রিসিভড
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("RECEIVED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "RECEIVED"
                ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            রিসিভ সম্পন্ন (Received)
          </button>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-5 py-3.5">PO নম্বর</th>
                <th className="px-4 py-3.5">সরবরাহকারী</th>
                <th className="px-4 py-3.5">অর্ডারকৃত পণ্যসমূহ</th>
                <th className="px-4 py-3.5 text-right">মোট মূল্য</th>
                <th className="px-4 py-3.5 text-center">স্ট্যাটাস</th>
                <th className="px-4 py-3.5 text-center">তারিখ</th>
                <th className="px-4 py-3.5 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Truck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-bold text-base text-foreground">কোন পারচেজ অর্ডার পাওয়া যায়নি</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      সাপ্লায়ারের কাছে পণ্য অর্ডার করতে উপরের &apos;নতুন পারচেজ অর্ডার&apos; বাটনে ক্লিক করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const isReceived = po.status === "RECEIVED";
                  const isPartial = po.status === "PARTIALLY_RECEIVED";

                  return (
                    <tr key={po.id} className="hover:bg-blue-500/5 transition-colors group">
                      <td className="px-5 py-4 font-mono font-bold text-primary group-hover:text-blue-500 transition-colors">
                        {po.poNumber}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">{po.supplier.name}</div>
                        {po.supplier.phone && (
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {po.supplier.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {po.items.map((it) => (
                            <div key={it.id} className="text-xs flex items-center gap-1.5 font-medium">
                              <span className="text-foreground">{it.product.name}:</span>
                              <span
                                className={`font-mono px-1.5 py-0.2 rounded-md ${
                                  it.receivedQuantity >= it.quantity
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {it.receivedQuantity} / {it.quantity} টি
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-base text-foreground">
                        {formatBDT(Number(po.totalAmount), "en")}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isReceived
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : isPartial
                              ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {isReceived ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {po.status === "RECEIVED"
                            ? "রিসিভ সম্পন্ন"
                            : po.status === "PARTIALLY_RECEIVED"
                            ? "আংশিক রিসিভড"
                            : "অর্ডারকৃত"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {formatDhakaDate(po.orderedAt, "en", false)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {!isReceived ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReceiveModal(po)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>পণ্য রিসিভ (GRN)</span>
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> সম্পন্ন
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE PURCHASE ORDER */}
      {/* ========================================================================= */}
      {isCreatePOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-panel bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">নতুন পারচেজ অর্ডার তৈরি করুন</h3>
                  <p className="text-xs text-muted-foreground">
                    সাপ্লায়ারের কাছে পণ্য ক্রয়াদেশ পাঠান (রিসিভ করার পর ইনভেন্টরি স্টক বাড়বে)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePOModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePOSubmit} className="space-y-4">
              {/* Supplier Selection + Add Supplier Quick Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-foreground">
                    সরবরাহকারী (Supplier) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ নতুন সরবরাহকারী যোগ করুন</span>
                  </button>
                </div>
                <select
                  required
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-blue-500/30 focus:outline-hidden transition-all"
                >
                  <option value="" disabled>সরবরাহকারী নির্বাচন করুন</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ""} — বকেয়া: {formatBDT(s.payableBalance, "en")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Table Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    অর্ডারকৃত পণ্যসমূহ <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ আরও পণ্য যোগ করুন</span>
                  </button>
                </div>

                <div className="border border-border/70 rounded-2xl overflow-hidden bg-muted/20">
                  <div className="p-3 bg-muted/60 text-xs font-bold grid grid-cols-12 gap-2 text-muted-foreground uppercase">
                    <div className="col-span-6">পণ্য (Product)</div>
                    <div className="col-span-2 text-right">পরিমাণ (টি)</div>
                    <div className="col-span-2 text-right">একক খরচ (৳)</div>
                    <div className="col-span-2 text-right">মোট (৳)</div>
                  </div>

                  <div className="divide-y divide-border/60 p-2 space-y-2">
                    {poRows.map((row, idx) => {
                      const lineTotal = row.quantity * row.unitCost;
                      return (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center pt-2 first:pt-0">
                          <div className="col-span-6 flex items-center gap-1.5">
                            {poRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="p-1 rounded-md text-muted-foreground hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <select
                              value={row.productId}
                              onChange={(e) => handleProductChange(idx, e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-background text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleQtyChange(idx, Number(e.target.value) || 1)}
                              className="w-full px-2 py-1.5 rounded-lg border border-border/70 bg-background font-mono text-xs text-right font-bold focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min="0"
                              value={row.unitCost}
                              onChange={(e) => handleCostChange(idx, Number(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded-lg border border-border/70 bg-background font-mono text-xs text-right font-bold focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="col-span-2 text-right font-mono font-bold text-xs text-foreground pr-1">
                            {formatBDT(lineTotal, "en")}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculated Order Total */}
                  <div className="p-3 bg-card border-t border-border/70 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">মোট অর্ডার মূল্য:</span>
                    <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                      {formatBDT(calculatedPoTotal, "en")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expected Delivery Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">প্রত্যাশিত ডেলিভারি তারিখ</label>
                  <input
                    type="date"
                    value={poExpectedAt}
                    onChange={(e) => setPoExpectedAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-blue-500/30 focus:outline-hidden transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">রেফারেন্স / নোট</label>
                  <input
                    type="text"
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="যেমন: জরুরি স্টক ডেলিভারি"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-blue-500/30 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsCreatePOModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPO}
                  className="shimmer-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPO ? (
                    <span>অর্ডার তৈরি হচ্ছে...</span>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>অর্ডার নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GOODS RECEIPT (GRN / পণ্য রিসিভ) */}
      {/* ========================================================================= */}
      {isReceiveModalOpen && selectedOrderForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    পণ্য গ্রহণ (Goods Receipt — {selectedOrderForReceive.poNumber})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    সাপ্লায়ার: {selectedOrderForReceive.supplier.name} • চালান রিসিভ করে স্টকে যোগ করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              {/* Target Location */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  পণ্য রাখার গোডাউন / লোকেশন <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={receiveLocationId}
                  onChange={(e) => setReceiveLocationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden transition-all"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isDefault ? "(প্রধান দোকান)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items to Receive */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">রিসিভ করার পরিমাণ নির্ধারণ করুন</label>
                <div className="border border-border/70 rounded-2xl overflow-hidden bg-muted/20">
                  <div className="p-3 bg-muted/60 text-xs font-bold grid grid-cols-12 gap-2 text-muted-foreground uppercase">
                    <div className="col-span-6">পণ্য (Product)</div>
                    <div className="col-span-3 text-center">অর্ডার / অবশিষ্ট</div>
                    <div className="col-span-3 text-right">এখন রিসিভ (টি)</div>
                  </div>

                  <div className="divide-y divide-border/60 p-2 space-y-2">
                    {selectedOrderForReceive.items.map((it) => {
                      const remaining = it.quantity - it.receivedQuantity;
                      const currentVal = receiveQuantities[it.id] !== undefined ? receiveQuantities[it.id] : remaining;

                      return (
                        <div key={it.id} className="grid grid-cols-12 gap-2 items-center pt-2 first:pt-0">
                          <div className="col-span-6">
                            <div className="font-bold text-xs text-foreground">{it.product.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{it.product.sku}</div>
                          </div>

                          <div className="col-span-3 text-center text-xs font-mono">
                            <span className="font-semibold text-foreground">{it.receivedQuantity}</span> / {it.quantity} টি
                            <div className="text-[10px] text-amber-500 font-bold">বাকি: {remaining} টি</div>
                          </div>

                          <div className="col-span-3">
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={currentVal}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setReceiveQuantities((prev) => ({
                                  ...prev,
                                  [it.id]: Math.min(remaining, Math.max(0, val)),
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-background font-mono text-sm text-right font-black text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">চালান রেফারেন্স / ডেলিভারি নোট</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="যেমন: চালান নং ১২৩৪৫, রিসিভ সম্পন্ন"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceive}
                  className="shimmer-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReceive ? (
                    <span>রিসিভ হচ্ছে...</span>
                  ) : (
                    <>
                      <PackageCheck className="w-4 h-4" />
                      <span>রিসিভ সম্পন্ন করুন (GRN)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD SUPPLIER */}
      {/* ========================================================================= */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md glass-panel bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">নতুন সরবরাহকারী যুক্ত করুন</h3>
                  <p className="text-xs text-muted-foreground">পাইকারি ভেন্ডর বা ডিস্ট্রিবিউটরের তথ্য দিন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplierSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  সরবরাহকারী / কোম্পানির নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="যেমন: Samsung Bangladesh, Smart Technologies"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">যোগাযোগের ব্যক্তি (Contact Person)</label>
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="যেমন: মোঃ করিম সাহেব"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">ফোন নম্বর</label>
                <input
                  type="tel"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="যেমন: 01711223344"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background font-mono text-sm focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">ঠিকানা</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="যেমন: মোতালেব প্লাজা, হাতিরপুল, ঢাকা"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSupplier}
                  className="shimmer-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSupplier ? (
                    <span>যোগ হচ্ছে...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>সাপ্লায়ার সেভ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
