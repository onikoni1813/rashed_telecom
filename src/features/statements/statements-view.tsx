"use client";

import React, { useState } from "react";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  FileText,
  Printer,
  Calendar,
  Users,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  CreditCard,
  Building,
} from "lucide-react";

export interface StatementCustomer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  totalDue: number;
}

export interface StatementSupplier {
  id: string;
  name: string;
  phone: string | null;
  contactPerson: string | null;
  totalPayable: number;
}

export interface StatementLineItem {
  id: string;
  date: string;
  type: "INVOICE" | "PAYMENT" | "RETURN" | "GOODS_RECEIPT";
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface StatementData {
  party: {
    id: string;
    name: string;
    phone: string | null;
    address?: string | null;
    currentBalance: number;
  };
  type: "CUSTOMER" | "SUPPLIER";
  totalBilled: number;
  totalPaid: number;
  closingBalance: number;
  lines: StatementLineItem[];
  startDate: string | null;
  endDate: string | null;
}

interface StatementsViewProps {
  shopId: string;
  customers: StatementCustomer[];
  suppliers: StatementSupplier[];
  initialStatement?: StatementData | null;
}

export function StatementsView({
  shopId,
  customers,
  suppliers,
  initialStatement = null,
}: StatementsViewProps) {
  const [statementType, setStatementType] = useState<"CUSTOMER" | "SUPPLIER">(
    initialStatement ? initialStatement.type : "CUSTOMER"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    statementType === "CUSTOMER" && initialStatement
      ? initialStatement.party.id
      : customers[0]?.id || ""
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    statementType === "SUPPLIER" && initialStatement
      ? initialStatement.party.id
      : suppliers[0]?.id || ""
  );

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statement, setStatement] = useState<StatementData | null>(initialStatement);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const isCustomer = statementType === "CUSTOMER";
      const partyId = isCustomer ? selectedCustomerId : selectedSupplierId;

      if (!partyId) {
        throw new Error(isCustomer ? "অনুগ্রহ করে গ্রাহক নির্বাচন করুন।" : "অনুগ্রহ করে সরবরাহকারী নির্বাচন করুন।");
      }

      const queryParams = new URLSearchParams({
        shopId,
        ...(isCustomer ? { customerId: partyId } : { supplierId: partyId }),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });

      const endpoint = isCustomer
        ? `/api/v1/statements/customer?${queryParams.toString()}`
        : `/api/v1/statements/supplier?${queryParams.toString()}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to fetch statement");
      }

      const sData = data.data;
      setStatement({
        type: statementType,
        party: isCustomer
          ? {
              id: sData.customer.id,
              name: sData.customer.name,
              phone: sData.customer.phone,
              address: sData.customer.address,
              currentBalance: sData.customer.currentTotalDue,
            }
          : {
              id: sData.supplier.id,
              name: sData.supplier.name,
              phone: sData.supplier.phone,
              address: sData.supplier.address,
              currentBalance: sData.supplier.currentTotalPayable,
            },
        totalBilled: sData.totalBilled,
        totalPaid: sData.totalPaid,
        closingBalance: sData.closingBalance,
        lines: sData.lines,
        startDate: sData.startDate,
        endDate: sData.endDate,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Elevated Non-printable Command Header */}
      <div className="print:hidden relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 ring-2 ring-white/10 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  রানিং ব্যালেন্স লেজার খতিয়ান
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  Running Balance
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                গ্রাহক ও সরবরাহকারীর বিস্তারিত ডেবিট, ক্রেডিট ও অবশিষ্ট ব্যালেন্স খতিয়ান বিবরণী
              </p>
            </div>
          </div>

          {statement && (
            <button
              onClick={handlePrint}
              className="shimmer-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / পিডিএফ</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-printable Filter & Selector Bar */}
      <div className="print:hidden glass-panel border border-border/60 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-5">
        {/* Floating Pill Toggle Mode */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-4">
          <button
            onClick={() => {
              setStatementType("CUSTOMER");
              setStatement(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              statementType === "CUSTOMER"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>গ্রাহক স্টেটমেন্ট</span>
          </button>
          <button
            onClick={() => {
              setStatementType("SUPPLIER");
              setStatement(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              statementType === "SUPPLIER"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>সরবরাহকারী স্টেটমেন্ট</span>
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {statementType === "CUSTOMER" ? (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                গ্রাহক নির্বাচন করুন <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs sm:text-sm bg-card/80 border border-border/70 rounded-xl p-2.5 font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
              >
                <option value="">-- গ্রাহক বাছাই করুন --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) — বকেয়া: {formatBDT(c.totalDue)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                সরবরাহকারী নির্বাচন করুন <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full text-xs sm:text-sm bg-card/80 border border-border/70 rounded-xl p-2.5 font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
              >
                <option value="">-- সরবরাহকারী বাছাই করুন --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone || "No phone"}) — প্রদেয়: {formatBDT(s.totalPayable)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              শুরুর তারিখ
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs sm:text-sm bg-card/80 border border-border/70 rounded-xl p-2 font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              শেষের তারিখ
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs sm:text-sm bg-card/80 border border-border/70 rounded-xl p-2 font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <div>
            <button
              onClick={fetchStatement}
              disabled={isLoading}
              className="shimmer-button w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs sm:text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{isLoading ? "লোড হচ্ছে..." : "স্টেটমেন্ট দেখুন"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Statement Sheet / Ledger Presentation */}
      {statement && (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-6 shadow-sm print:border-none print:shadow-none print:p-0">
          {/* Statement Header */}
          <div className="border-b border-border pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">
                রাশেদ টেলিকম
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                কালিগঞ্জ বাজার, ঝিনাইদহ • মোবাইল: ০১৭০০-০০০০০০
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 text-primary font-semibold text-xs uppercase tracking-wide">
                {statement.type === "CUSTOMER"
                  ? "গ্রাহক লেজার খতিয়ান"
                  : "সরবরাহকারী লেজার খতিয়ান"}
              </div>
            </div>

            <div className="text-right sm:text-right text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">তারিখ: </span>
                <span className="font-semibold">{formatDhakaDate(new Date())}</span>
              </div>
              {statement.startDate && (
                <div>
                  <span className="text-muted-foreground">সময়কাল: </span>
                  <span className="font-medium">
                    {formatDhakaDate(statement.startDate)} হতে {formatDhakaDate(statement.endDate || new Date())}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Party Details & KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 bg-muted/40 p-4 rounded-xl border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {statement.type === "CUSTOMER" ? "গ্রাহকের তথ্য" : "সরবরাহকারীর তথ্য"}
              </span>
              <div className="text-base font-bold text-foreground mt-1">{statement.party.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{statement.party.phone}</div>
              {statement.party.address && (
                <div className="text-xs text-muted-foreground mt-0.5">{statement.party.address}</div>
              )}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
              <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                {statement.type === "CUSTOMER" ? "মোট বিল" : "মোট ক্রয়"}
              </span>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatBDT(statement.totalBilled)}
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
              <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">
                মোট পরিশোধ
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatBDT(statement.totalPaid)}
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
              <span className="text-xs font-semibold text-rose-500 uppercase tracking-wide">
                {statement.type === "CUSTOMER" ? "অবশিষ্ট বকেয়া" : "প্রদেয় ব্যালেন্স"}
              </span>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatBDT(statement.closingBalance)}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="border border-border rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">তারিখ</th>
                  <th className="px-3 py-3">রেফারেন্স নং</th>
                  <th className="px-3 py-3">বিবরণ</th>
                  <th className="px-3 py-3 text-right">ডেবিট (৳)</th>
                  <th className="px-3 py-3 text-right">ক্রেডিট (৳)</th>
                  <th className="px-3 py-3 text-right">রানিং ব্যালেন্স (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statement.lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      এই সময়সীমার মধ্যে কোনো লেনদেন পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  statement.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {formatDhakaDate(line.date)}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-medium text-foreground">
                        {line.referenceNumber}
                      </td>
                      <td className="px-3 py-2.5 text-foreground max-w-xs">{line.description}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-foreground">
                        {line.debit > 0 ? formatBDT(line.debit) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {line.credit > 0 ? formatBDT(line.credit) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-primary">
                        {formatBDT(line.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-muted/40 font-bold border-t border-border">
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-right uppercase">
                    মোট (Total):
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">
                    {formatBDT(statement.totalBilled)}
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-600 dark:text-emerald-400">
                    {formatBDT(statement.totalPaid)}
                  </td>
                  <td className="px-3 py-3 text-right text-primary text-sm">
                    {formatBDT(statement.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signature Footer for Print View */}
          <div className="hidden print:grid grid-cols-2 pt-16 mt-12 border-t border-dashed border-border text-center text-xs">
            <div>
              <div className="border-t border-black/40 w-44 mx-auto pt-1 font-semibold">
                প্রস্তুতকারক
              </div>
            </div>
            <div>
              <div className="border-t border-black/40 w-44 mx-auto pt-1 font-semibold">
                {statement.type === "CUSTOMER" ? "গ্রাহকের স্বাক্ষর" : "সরবরাহকারীর স্বাক্ষর"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
