"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  Truck,
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Edit,
  ShoppingBag,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Copy,
  User,
} from "lucide-react";
import {
  createSupplierAction,
  updateSupplierAction,
  paySupplierDueAction,
} from "./supplier-actions";

export interface SerializedSupplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  payableBalance: number;
  isActive: boolean;
  createdAt: string;
}

interface SuppliersViewProps {
  shopId: string;
  initialSuppliers: SerializedSupplier[];
}

export function SuppliersView({ shopId, initialSuppliers }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState<SerializedSupplier[]>(initialSuppliers);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "WITH_DUE" | "ZERO_DUE">("ALL");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<SerializedSupplier | null>(null);
  const [paySupplier, setPaySupplier] = useState<SerializedSupplier | null>(null);

  // Add Form state
  const [newName, setNewName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Form state
  const [editName, setEditName] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Pay Form state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "BANK" | "BKASH" | "NAGAD">("CASH");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Copied indicator state
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      const matchesSearch =
        q === "" ||
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === "WITH_DUE") return s.payableBalance > 0;
      if (filterType === "ZERO_DUE") return s.payableBalance <= 0;
      return true;
    });
  }, [suppliers, search, filterType]);

  // Aggregates
  const totalSuppliersCount = suppliers.length;
  const suppliersWithDueCount = suppliers.filter((s) => s.payableBalance > 0).length;
  const totalPayableAmount = suppliers.reduce((acc, s) => acc + s.payableBalance, 0);
  const activeSuppliersCount = suppliers.filter((s) => s.isActive).length;

  // Handle Add Supplier Submit
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError("সরবরাহকারী বা প্রতিষ্ঠানের নাম পূরণ করা আবশ্যক।");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createSupplierAction({
        shopId,
        name: newName,
        contactPerson: newContactPerson.trim() || null,
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        address: newAddress.trim() || null,
      });

      if (!res.success || !res.supplier) {
        setFormError(res.error || "সরবরাহকারী যোগ করতে সমস্যা হয়েছে।");
        setIsSubmitting(false);
        return;
      }

      setSuppliers((prev) => [res.supplier!, ...prev]);
      showToast(`সরবরাহকারী "${res.supplier.name}" সফলভাবে যুক্ত করা হয়েছে!`);
      setNewName("");
      setNewContactPerson("");
      setNewPhone("");
      setNewEmail("");
      setNewAddress("");
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "অপ্রত্যাশিত ত্রুটি ঘটেছে।");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (s: SerializedSupplier) => {
    setEditSupplier(s);
    setEditName(s.name);
    setEditContactPerson(s.contactPerson || "");
    setEditPhone(s.phone || "");
    setEditEmail(s.email || "");
    setEditAddress(s.address || "");
    setEditIsActive(s.isActive);
    setFormError(null);
  };

  // Handle Edit Submit
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupplier) return;
    setFormError(null);

    if (!editName.trim()) {
      setFormError("সরবরাহকারীর নাম আবশ্যক।");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateSupplierAction({
        shopId,
        supplierId: editSupplier.id,
        name: editName,
        contactPerson: editContactPerson.trim() || null,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
        isActive: editIsActive,
      });

      if (!res.success || !res.supplier) {
        setFormError(res.error || "সাপ্লায়ার তথ্য আপডেট ব্যর্থ হয়েছে।");
        setIsSubmitting(false);
        return;
      }

      setCustomersOrSuppliersUpdated: {
        setSuppliers((prev) =>
          prev.map((item) => (item.id === res.supplier!.id ? res.supplier! : item))
        );
      }

      showToast(`সাপ্লায়ার তথ্য আপডেট করা হয়েছে!`);
      setEditSupplier(null);
    } catch (err: any) {
      setFormError(err.message || "ত্রুটি ঘটেছে।");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Pay Due Modal
  const openPayModal = (s: SerializedSupplier) => {
    setPaySupplier(s);
    setPayAmount(s.payableBalance.toString());
    setPayMethod("CASH");
    setPayRef("");
    setPayNotes("");
    setFormError(null);
  };

  // Handle Pay Due Submit
  const handlePayDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier) return;
    setFormError(null);

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("সঠিক পরিশোধের পরিমাণ (টাকা) প্রদান করুন।");
      return;
    }
    if (amt > paySupplier.payableBalance) {
      setFormError(`পরিশোধের পরিমাণ মোট প্রদেয় দেনা (${formatBDT(paySupplier.payableBalance)}) এর বেশি হতে পারবে না।`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await paySupplierDueAction({
        shopId,
        supplierId: paySupplier.id,
        amount: amt,
        paymentMethod: payMethod,
        referenceNumber: payRef.trim() || null,
        notes: payNotes.trim() || null,
      });

      if (!res.success || !res.result) {
        setFormError(res.error || "পেমেন্ট সংরক্ষণ ব্যর্থ হয়েছে।");
        setIsSubmitting(false);
        return;
      }

      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === paySupplier.id
            ? { ...s, payableBalance: res.result!.newPayableBalance }
            : s
        )
      );

      showToast(`৳${amt} সরবরাহকারী দেনা পরিশোধ সফলভাবে সম্পন্ন হয়েছে!`);
      setPaySupplier(null);
    } catch (err: any) {
      setFormError(err.message || "পেমেন্টে ত্রুটি ঘটেছে।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              সরবরাহকারী ব্যবস্থাপনা
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                {totalSuppliersCount} প্রতিষ্ঠান
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              দোকানের সকল ভেন্ডর, পাইকারি ডিলার, যোগাযোগের ব্যক্তি ও ক্রয়ের বাকি হিসাব
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/purchases"
            className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/70 text-foreground text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 text-sky-600" />
            <span>পারচেজ অর্ডার</span>
          </Link>

          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন সরবরাহকারী যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">মোট সরবরাহকারী</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">
            {totalSuppliersCount} <span className="text-xs font-semibold text-muted-foreground">টি</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            রেজিস্টার্ড পাইকারি ডিলার ও ভেন্ডর
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">দেনা আছে এমন সাপ্লায়ার</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {suppliersWithDueCount} <span className="text-xs font-semibold text-muted-foreground">টি</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            বকেয়া বিল পরিশোধ করতে হবে
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">মোট প্রদেয় দেনা</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatBDT(totalPayableAmount)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            সাপ্লায়ারদের প্রদেয় বাকি টাকা
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden group hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">সক্রিয় পার্টনার</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400">
            {activeSuppliersCount} <span className="text-xs font-semibold text-muted-foreground">টি</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            চলতি ব্যবসায়িক অংশীদার
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-3 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="প্রতিষ্ঠানের নাম, প্রতিনিধি, ফোন বা ঠিকানা দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-background rounded-xl border border-border/80 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-foreground placeholder:text-muted-foreground font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3.5 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all border ${
              filterType === "ALL"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            সব সরবরাহকারী ({suppliers.length})
          </button>
          <button
            onClick={() => setFilterType("WITH_DUE")}
            className={`px-3.5 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all border ${
              filterType === "WITH_DUE"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            প্রদেয় দেনা আছে ({suppliersWithDueCount})
          </button>
          <button
            onClick={() => setFilterType("ZERO_DUE")}
            className={`px-3.5 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all border ${
              filterType === "ZERO_DUE"
                ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            শূন্য দেনা ({suppliers.length - suppliersWithDueCount})
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <Truck className="w-12 h-12 mx-auto opacity-30 text-emerald-500" />
            <div className="font-bold text-sm text-foreground">কোনো সরবরাহকারী পাওয়া যায়নি</div>
            <p className="text-xs max-w-sm mx-auto">
              {search
                ? `"${search}" এর সাথে মিলে এমন কোনো সরবরাহকারী নেই।`
                : "এখনও কোনো সরবরাহকারী নিবন্ধিত নেই। নতুন সরবরাহকারী যুক্ত করতে উপরের বাটনে ক্লিক করুন।"}
            </p>
            <button
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ নতুন সরবরাহকারী যোগ</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">প্রতিষ্ঠান ও যোগাযোগের ব্যক্তি</th>
                  <th className="py-3.5 px-4">মোবাইল ও ইমেইল</th>
                  <th className="py-3.5 px-4">ঠিকানা</th>
                  <th className="py-3.5 px-4 text-right">প্রদেয় দেনা (Payable)</th>
                  <th className="py-3.5 px-4 text-center">স্ট্যাটাস</th>
                  <th className="py-3.5 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filteredSuppliers.map((s) => {
                  const initial = s.name ? s.name.trim().charAt(0).toUpperCase() : "S";
                  const hasDue = s.payableBalance > 0;

                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                      {/* Name & Contact Person */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              <span>{s.name}</span>
                              {hasDue && (
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="দেনা বাকি আছে" />
                              )}
                            </div>
                            {s.contactPerson && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span>{s.contactPerson}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {s.phone ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${s.phone}`}
                                className="font-mono font-semibold text-foreground hover:text-emerald-600 flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{s.phone}</span>
                              </a>
                              <button
                                onClick={() => copyToClipboard(s.phone!)}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                title="ফোন কপি করুন"
                              >
                                {copiedPhone === s.phone ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic">—</span>
                          )}

                          {s.email && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span>{s.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4">
                        <div className="text-muted-foreground max-w-xs truncate flex items-center gap-1">
                          {s.address ? (
                            <>
                              <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                              <span title={s.address}>{s.address}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/60 italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* Payable Due */}
                      <td className="py-3 px-4 text-right">
                        {hasDue ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="font-black text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20 font-mono">
                              {formatBDT(s.payableBalance)}
                            </span>
                            <span className="text-[10px] text-amber-600 font-bold mt-0.5">
                              দেনা পরিশোধ বাকি
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                            পরিশোধিত (৳০)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {s.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            সক্রিয়
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                            নিষ্ক্রিয়
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Statement View */}
                          <Link
                            href={`/app/statements?supplierId=${s.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-bold text-xs flex items-center gap-1 transition-all"
                            title="সাপ্লায়ার স্টেটমেন্ট দেখুন"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>স্টেটমেন্ট</span>
                          </Link>

                          {/* Pay Supplier Due Button */}
                          {hasDue && (
                            <button
                              onClick={() => openPayModal(s)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 font-bold text-xs flex items-center gap-1 transition-all"
                              title="সাপ্লায়ার দেনা পরিশোধ করুন"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>পরিশোধ</span>
                            </button>
                          )}

                          {/* New PO */}
                          <Link
                            href="/app/purchases"
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-sky-600 hover:bg-muted/80 border border-border transition-all"
                            title="নতুন পণ্য ক্রয় অর্ডার"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </Link>

                          {/* Edit Supplier */}
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border transition-all"
                            title="তথ্য পরিবর্তন করুন"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= ADD SUPPLIER MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">নতুন সরবরাহকারী যোগ করুন</h3>
                  <p className="text-[11px] text-muted-foreground">পাইকারি বিক্রেতা বা ভেন্ডর বিবরণ</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  প্রতিষ্ঠান বা সরবরাহকারীর নাম <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ইউনিক টেলিকম ডিস্ট্রিবিউটর"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                  />
                </div>
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  যোগাযোগের ব্যক্তি (Contact Person)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="যেমন: কামরুল হাসান (ম্যানেজার)"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  মোবাইল নম্বর
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="যেমন: 01812345678"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-mono font-medium"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  ইমেইল (ঐচ্ছিক)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="যেমন: sales@uniquetelecom.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  অফিস বা গুদামের ঠিকানা (ঐচ্ছিক)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                  <textarea
                    rows={2}
                    placeholder="যেমন: দোকান ৪২, মোতালিব প্লাজা, হাতিরপুল, ঢাকা"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT SUPPLIER MODAL ================= */}
      {editSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">সরবরাহকারী তথ্য পরিবর্তন</h3>
                  <p className="text-[11px] text-muted-foreground">{editSupplier.name} এর বিবরণ আপডেট করুন</p>
                </div>
              </div>
              <button
                onClick={() => setEditSupplier(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">প্রতিষ্ঠানের নাম *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">যোগাযোগের ব্যক্তি</label>
                <input
                  type="text"
                  value={editContactPerson}
                  onChange={(e) => setEditContactPerson(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">ইমেইল</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">ঠিকানা</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="editIsActive" className="text-xs font-bold text-foreground cursor-pointer">
                  প্রতিষ্ঠানটি সক্রিয় (Active) হিসেবে থাকবে
                </label>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditSupplier(null)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "আপডেট হচ্ছে..." : "আপডেট সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PAY SUPPLIER DUE MODAL ================= */}
      {paySupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-sm">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">সরবরাহকারী দেনা পরিশোধ</h3>
                  <p className="text-[11px] text-muted-foreground">{paySupplier.name} এর বাকি বিল শোধ করুন</p>
                </div>
              </div>
              <button
                onClick={() => setPaySupplier(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayDue} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Outstanding Balance Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground block">মোট প্রদেয় দেনা</span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                    {formatBDT(paySupplier.payableBalance)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPayAmount(paySupplier.payableBalance.toString())}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-500/30"
                >
                  সম্পূর্ণ দেনা পরিশোধ
                </button>
              </div>

              {/* Pay Amount */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  পরিশোধের পরিমাণ (টাকা) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-background rounded-xl border border-border font-mono font-bold text-foreground focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  পেমেন্ট মাধ্যম
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["CASH", "BANK", "BKASH", "NAGAD"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayMethod(method)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        payMethod === method
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {method === "CASH"
                        ? "নগদ (Cash)"
                        : method === "BANK"
                        ? "ব্যাংক"
                        : method === "BKASH"
                        ? "বিকাশ"
                        : "নগদ (MFS)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  চেক নম্বর / TrxID / ভাউচার রেফারেন্স (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Cheque #1234 বা Bank TrxID"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-background rounded-xl border border-border text-foreground font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  মন্তব্য / নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="পেমেন্ট সম্পর্কিত বিবরণ..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-background rounded-xl border border-border text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaySupplier(null)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-600/25 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "পরিশোধ হচ্ছে..." : "দেনা পরিশোধ নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
