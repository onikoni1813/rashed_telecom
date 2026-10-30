"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  Users,
  UserPlus,
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
  ShoppingCart,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Copy,
} from "lucide-react";
import {
  createCustomerAction,
  updateCustomerAction,
  collectCustomerDueAction,
} from "./customer-actions";

export interface SerializedCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  totalDue: number;
  createdAt: string;
}

interface CustomersViewProps {
  shopId: string;
  initialCustomers: SerializedCustomer[];
}

export function CustomersView({ shopId, initialCustomers }: CustomersViewProps) {
  const [customers, setCustomers] = useState<SerializedCustomer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "WITH_DUE" | "ZERO_DUE">("ALL");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<SerializedCustomer | null>(null);
  const [collectDueCustomer, setCollectDueCustomer] = useState<SerializedCustomer | null>(null);

  // Add Form state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Collect Due Form state
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState<"CASH" | "BANK" | "BKASH" | "NAGAD">("CASH");
  const [collectRef, setCollectRef] = useState("");
  const [collectNotes, setCollectNotes] = useState("");

  // Copied indicator state
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Toast trigger
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        q === "" ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === "WITH_DUE") return c.totalDue > 0;
      if (filterType === "ZERO_DUE") return c.totalDue <= 0;
      return true;
    });
  }, [customers, search, filterType]);

  // Aggregate Stats
  const totalCustomersCount = customers.length;
  const customersWithDueCount = customers.filter((c) => c.totalDue > 0).length;
  const totalDueAmount = customers.reduce((acc, c) => acc + c.totalDue, 0);
  const zeroDueCount = customers.filter((c) => c.totalDue <= 0).length;

  // Handle Add Customer Submit
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError("গ্রাহকের নাম পূরণ করা আবশ্যক।");
      return;
    }
    if (!newPhone.trim() || newPhone.trim().length < 6) {
      setFormError("কমপক্ষে ৬ ডিজিটের সঠিক মোবাইল নম্বর প্রদান করুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCustomerAction({
        shopId,
        name: newName,
        phone: newPhone,
        email: newEmail.trim() || null,
        address: newAddress.trim() || null,
      });

      if (!res.success || !res.customer) {
        setFormError(res.error || "গ্রাহক তৈরি ব্যর্থ হয়েছে।");
        setIsSubmitting(false);
        return;
      }

      setCustomers((prev) => [res.customer!, ...prev]);
      showToast(`গ্রাহক "${res.customer.name}" সফলভাবে যুক্ত করা হয়েছে!`);
      setNewName("");
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
  const openEditModal = (c: SerializedCustomer) => {
    setEditCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditEmail(c.email || "");
    setEditAddress(c.address || "");
    setFormError(null);
  };

  // Handle Edit Submit
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setFormError(null);

    if (!editName.trim()) {
      setFormError("গ্রাহকের নাম পূরণ আবশ্যক।");
      return;
    }
    if (!editPhone.trim() || editPhone.trim().length < 6) {
      setFormError("সঠিক মোবাইল নম্বর প্রদান করুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateCustomerAction({
        shopId,
        customerId: editCustomer.id,
        name: editName,
        phone: editPhone,
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
      });

      if (!res.success || !res.customer) {
        setFormError(res.error || "গ্রাহক তথ্য আপডেট ব্যর্থ হয়েছে।");
        setIsSubmitting(false);
        return;
      }

      setCustomers((prev) =>
        prev.map((item) => (item.id === res.customer!.id ? res.customer! : item))
      );
      showToast(`গ্রাহক তথ্য আপডেট করা হয়েছে!`);
      setEditCustomer(null);
    } catch (err: any) {
      setFormError(err.message || "ত্রুটি ঘটেছে।");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Collect Due Modal
  const openCollectDueModal = (c: SerializedCustomer) => {
    setCollectDueCustomer(c);
    setCollectAmount(c.totalDue.toString());
    setCollectMethod("CASH");
    setCollectRef("");
    setCollectNotes("");
    setFormError(null);
  };

  // Handle Collect Due Submit
  const handleCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectDueCustomer) return;
    setFormError(null);

    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("সঠিক আদায়ের পরিমাণ (টাকা) প্রদান করুন।");
      return;
    }
    if (amt > collectDueCustomer.totalDue) {
      setFormError(`আদায়ের পরিমাণ মোট বকেয়া (${formatBDT(collectDueCustomer.totalDue)}) এর বেশি হতে পারবে না।`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await collectCustomerDueAction({
        shopId,
        customerId: collectDueCustomer.id,
        amount: amt,
        paymentMethod: collectMethod,
        referenceNumber: collectRef.trim() || null,
        notes: collectNotes.trim() || null,
      });

      if (!res.success || !res.payment) {
        setFormError(res.error || "বকেয়া আদায় সংরক্ষণ ব্যর্থ হয়েছে।");
        setIsSubmitting(false);
        return;
      }

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === collectDueCustomer.id
            ? { ...c, totalDue: res.payment!.newDueBalance }
            : c
        )
      );

      showToast(`৳${amt} বকেয়া আদায় সফলভাবে সম্পন্ন হয়েছে!`);
      setCollectDueCustomer(null);
    } catch (err: any) {
      setFormError(err.message || "বকেয়া আদায়ে ত্রুটি ঘটেছে।");
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              গ্রাহক তালিকা ও ব্যবস্থাপনা
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                {totalCustomersCount} জন
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              দোকানের সকল গ্রাহকদের ফোন নম্বর, ঠিকানা, বাকি হিসাব ও সরাসরি স্টেটমেন্ট
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/statements"
            className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/70 text-foreground text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>সকল স্টেটমেন্ট</span>
          </Link>

          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ নতুন গ্রাহক যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">মোট গ্রাহক</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">
            {totalCustomersCount} <span className="text-xs font-semibold text-muted-foreground">জন</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>সক্রিয় ডাটাবেজে সংরক্ষিত</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">বকেয়া আছে এমন গ্রাহক</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {customersWithDueCount} <span className="text-xs font-semibold text-muted-foreground">জন</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            তাগাদা বা কালেকশন প্রয়োজন
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">মোট বকেয়া পাওনা</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatBDT(totalDueAmount)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            মার্কেটে পাওনা বাকি অর্থ
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">বকেয়াহীন (পরিশোধিত)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {zeroDueCount} <span className="text-xs font-semibold text-muted-foreground">জন</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            সম্পূর্ণ পরিশোধিত কাস্টমার
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
            placeholder="নাম, মোবাইল নম্বর, বা ঠিকানা দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-background rounded-xl border border-border/80 focus:outline-hidden focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-foreground placeholder:text-muted-foreground font-medium"
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
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            সব গ্রাহক ({customers.length})
          </button>
          <button
            onClick={() => setFilterType("WITH_DUE")}
            className={`px-3.5 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all border ${
              filterType === "WITH_DUE"
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            বকেয়া আছে ({customersWithDueCount})
          </button>
          <button
            onClick={() => setFilterType("ZERO_DUE")}
            className={`px-3.5 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all border ${
              filterType === "ZERO_DUE"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            পরিশোধিত ({zeroDueCount})
          </button>
        </div>
      </div>

      {/* Customers Table / Card List */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <Users className="w-12 h-12 mx-auto opacity-30 text-indigo-500" />
            <div className="font-bold text-sm text-foreground">কোনো গ্রাহক পাওয়া যায়নি</div>
            <p className="text-xs max-w-sm mx-auto">
              {search
                ? `"${search}" এর সাথে মিলে এমন কোনো গ্রাহক নেই। অনুসন্ধান পরিবর্তন করুন।`
                : "এখনও কোনো গ্রাহক ডাটাবেজে যুক্ত করা হয়নি। নতুন গ্রাহক যোগ করতে উপরের বাটনে ক্লিক করুন।"}
            </p>
            <button
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ নতুন গ্রাহক নিবন্ধন</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">গ্রাহকের নাম ও বিবরণ</th>
                  <th className="py-3.5 px-4">মোবাইল নম্বর</th>
                  <th className="py-3.5 px-4">ঠিকানা</th>
                  <th className="py-3.5 px-4 text-right">মোট বকেয়া পাওনা</th>
                  <th className="py-3.5 px-4">নিবন্ধনের তারিখ</th>
                  <th className="py-3.5 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filteredCustomers.map((c) => {
                  const initial = c.name ? c.name.trim().charAt(0).toUpperCase() : "G";
                  const hasDue = c.totalDue > 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {hasDue && (
                                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="বকেয়া আছে" />
                              )}
                            </div>
                            {c.email && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span>{c.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${c.phone}`}
                            className="font-mono font-semibold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{c.phone}</span>
                          </a>
                          <button
                            onClick={() => copyToClipboard(c.phone)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                            title="ফোন নম্বর কপি করুন"
                          >
                            {copiedPhone === c.phone ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4">
                        <div className="text-muted-foreground max-w-xs truncate flex items-center gap-1">
                          {c.address ? (
                            <>
                              <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                              <span title={c.address}>{c.address}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/60 italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* Total Due */}
                      <td className="py-3 px-4 text-right">
                        {hasDue ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="font-black text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 font-mono">
                              {formatBDT(c.totalDue)}
                            </span>
                            <span className="text-[10px] text-rose-500 font-bold mt-0.5">
                              বাকি পাওনা
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                            পরিশোধিত (৳০)
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDhakaDate(c.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Statement View */}
                          <Link
                            href={`/app/statements?customerId=${c.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-bold text-xs flex items-center gap-1 transition-all"
                            title="লেজার স্টেটমেন্ট দেখুন"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>স্টেটমেন্ট</span>
                          </Link>

                          {/* Collect Due Button */}
                          {hasDue && (
                            <button
                              onClick={() => openCollectDueModal(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-bold text-xs flex items-center gap-1 transition-all"
                              title="বকেয়া টাকা আদায় গ্রহণ করুন"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>আদায়</span>
                            </button>
                          )}

                          {/* Edit Customer */}
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border transition-all"
                            title="তথ্য পরিবর্তন করুন"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Fast Sale */}
                          <Link
                            href="/app/pos"
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-indigo-600 hover:bg-muted/80 border border-border transition-all"
                            title="পিওএস বিক্রয়"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </Link>
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

      {/* ================= ADD CUSTOMER MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">নতুন গ্রাহক যোগ করুন</h3>
                  <p className="text-[11px] text-muted-foreground">গ্রাহকের নাম ও মোবাইল নম্বর প্রদান করুন</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  গ্রাহকের পুরো নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-background rounded-xl border border-border focus:outline-hidden focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-foreground font-medium"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="যেমন: 01712345678"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background rounded-xl border border-border focus:outline-hidden focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-foreground font-mono font-medium"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  মোবাইল নম্বরটি সিস্টেমে ইউনিক হতে হবে।
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  ইমেইল ঠিকানা (ঐচ্ছিক)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="যেমন: rafiq@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background rounded-xl border border-border focus:outline-hidden focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-foreground font-medium"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  ঠিকানা বা এলাকা (ঐচ্ছিক)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                  <textarea
                    rows={2}
                    placeholder="যেমন: হাউজ ১২, রোড ৪, মিরপুর-১০, ঢাকা"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background rounded-xl border border-border focus:outline-hidden focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-foreground font-medium"
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
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

      {/* ================= EDIT CUSTOMER MODAL ================= */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">গ্রাহক তথ্য পরিবর্তন</h3>
                  <p className="text-[11px] text-muted-foreground">{editCustomer.name} এর বিবরণ আপডেট করুন</p>
                </div>
              </div>
              <button
                onClick={() => setEditCustomer(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">গ্রাহকের নাম *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-background rounded-xl border border-border text-foreground font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
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

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "আপডেট হচ্ছে..." : "আপডেট সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= COLLECT DUE MODAL ================= */}
      {collectDueCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">বকেয়া আদায় গ্রহণ</h3>
                  <p className="text-[11px] text-muted-foreground">{collectDueCustomer.name} এর বাকি পরিশোধ করুন</p>
                </div>
              </div>
              <button
                onClick={() => setCollectDueCustomer(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCollectDue} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Outstanding Due Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-transparent border border-rose-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground block">বর্তমান মোট বকেয়া পাওনা</span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                    {formatBDT(collectDueCustomer.totalDue)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCollectAmount(collectDueCustomer.totalDue.toString())}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-500/30"
                >
                  সম্পূর্ণ বকেয়া
                </button>
              </div>

              {/* Collection Amount */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  আদায়ের পরিমাণ (টাকা) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-background rounded-xl border border-border font-mono font-bold text-foreground focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  পেমেন্ট মাধ্যম
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["CASH", "BKASH", "NAGAD", "BANK"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setCollectMethod(method)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        collectMethod === method
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {method === "CASH"
                        ? "নগদ (Cash)"
                        : method === "BKASH"
                        ? "বিকাশ"
                        : method === "NAGAD"
                        ? "নগদ (MFS)"
                        : "ব্যাংক"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  লেনদেন আইডি / TrxID / রেফারেন্স (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: MFS TrxID বা ভাউচার নম্বর"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
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
                  placeholder="নোট বা বিবরণ..."
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-background rounded-xl border border-border text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCollectDueCustomer(null)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "আদায় সংরক্ষণ হচ্ছে..." : "বকেয়া আদায় নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
