"use client";

import React, { useState, useMemo } from "react";
import { formatBDT } from "@/lib/i18n";
import {
  Package,
  Plus,
  Search,
  Tag,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Sparkles,
  Box,
  X,
  Smartphone,
  Headphones,
  Wrench,
  Shield,
  FolderPlus,
  Copy,
  TrendingUp,
  Percent,
  Check,
  AlertCircle,
  BarChart3,
  Archive,
} from "lucide-react";
import { createProductAction, createCategoryAction } from "./product-actions";

export interface SerializedStockBalance {
  id: string;
  quantityOnHand: number;
  averageCost: number;
  location: {
    id: string;
    name: string;
  };
}

export interface SerializedProduct {
  id: string;
  name: string;
  brand: string | null;
  sku: string;
  barcode: string | null;
  modelNumber: string | null;
  isTrackStock: boolean;
  costPrice: number;
  sellingPrice: number;
  minStockAlert: number;
  isActive: boolean;
  createdAt: string;
  category: {
    id: string;
    name: string;
    type: string;
  };
  stockBalances: SerializedStockBalance[];
}

export interface SerializedCategory {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
}

export interface SerializedLocation {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ProductCatalogViewProps {
  shopId: string;
  initialProducts: SerializedProduct[];
  initialCategories: SerializedCategory[];
  locations: SerializedLocation[];
}

export function ProductCatalogView({
  shopId,
  initialProducts,
  initialCategories,
  locations,
}: ProductCatalogViewProps) {
  const [products, setProducts] = useState<SerializedProduct[]>(initialProducts);
  const [categories, setCategories] = useState<SerializedCategory[]>(initialCategories);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK">("ALL");

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add Product Form State
  const [prodName, setProdName] = useState("");
  const [prodCategoryId, setProdCategoryId] = useState("");
  const [prodBrand, setProdBrand] = useState("");
  const [prodModel, setProdModel] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodCostPrice, setProdCostPrice] = useState<number | "">("");
  const [prodSellingPrice, setProdSellingPrice] = useState<number | "">("");
  const [prodTrackStock, setProdTrackStock] = useState(true);
  const [prodInitialStock, setProdInitialStock] = useState<number | "">(0);
  const [prodLocationId, setProdLocationId] = useState(locations[0]?.id || "");
  const [prodMinStockAlert, setProdMinStockAlert] = useState<number>(5);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Add Category Form State
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<string>("ACCESSORY");
  const [catParentId, setCatParentId] = useState<string>("");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Copy SKU state feedback
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Auto-generate SKU helper
  const handleAutoSku = () => {
    const prefix = prodBrand ? prodBrand.slice(0, 3).toUpperCase() : "PRD";
    const rand = Math.floor(1000 + Math.random() * 9000);
    const datePart = Date.now().toString().slice(-4);
    setProdSku(`${prefix}-${datePart}${rand}`);
  };

  // Helper for Category icon
  const getCategoryIcon = (catName: string) => {
    const name = catName.toLowerCase();
    if (name.includes("ফোন") || name.includes("phone") || name.includes("হ্যান্ডসেট")) {
      return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
    }
    if (name.includes("এক্সেসরিজ") || name.includes("হেডফোন") || name.includes("earphone") || name.includes("charger")) {
      return <Headphones className="w-3.5 h-3.5 text-purple-500" />;
    }
    if (name.includes("পার্টস") || name.includes("ডিসপ্লে") || name.includes("battery") || name.includes("ব্যাটারি")) {
      return <Wrench className="w-3.5 h-3.5 text-amber-500" />;
    }
    return <Tag className="w-3.5 h-3.5 text-indigo-400" />;
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "ALL" && p.category.id !== selectedCategory) {
        return false;
      }

      // Stock Total calculation
      const stockTotal = p.stockBalances.reduce(
        (sum, b) => sum + Number(b.quantityOnHand),
        0
      );

      // Stock filter
      if (stockFilter === "LOW_STOCK") {
        if (!p.isTrackStock || stockTotal > p.minStockAlert) return false;
      } else if (stockFilter === "OUT_OF_STOCK") {
        if (!p.isTrackStock || stockTotal > 0) return false;
      } else if (stockFilter === "IN_STOCK") {
        if (p.isTrackStock && stockTotal <= 0) return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesBrand = p.brand?.toLowerCase().includes(query) || false;
        const matchesSku = p.sku.toLowerCase().includes(query);
        const matchesBarcode = p.barcode?.toLowerCase().includes(query) || false;
        const matchesModel = p.modelNumber?.toLowerCase().includes(query) || false;
        const matchesCategory = p.category.name.toLowerCase().includes(query);

        return matchesName || matchesBrand || matchesSku || matchesBarcode || matchesModel || matchesCategory;
      }

      return true;
    });
  }, [products, selectedCategory, stockFilter, search]);

  // KPI Calculations
  const stockTrackedCount = products.filter((p) => p.isTrackStock).length;
  const lowStockProducts = products.filter((p) => {
    const totalQty = p.stockBalances.reduce(
      (sum, b) => sum + Number(b.quantityOnHand),
      0
    );
    return p.isTrackStock && totalQty <= p.minStockAlert;
  });

  const totalStockUnits = products.reduce((acc, p) => {
    const qty = p.stockBalances.reduce((s, b) => s + Number(b.quantityOnHand), 0);
    return acc + qty;
  }, 0);

  // Submit Product Handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showNotification("পণ্যের নাম দিন।", true);
      return;
    }
    if (!prodCategoryId) {
      showNotification("ক্যাটাগরি নির্বাচন করুন।", true);
      return;
    }
    if (prodSellingPrice === "" || Number(prodSellingPrice) < 0) {
      showNotification("সঠিক বিক্রয় মূল্য নির্ধারণ করুন।", true);
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const res = await createProductAction({
        shopId,
        categoryId: prodCategoryId,
        name: prodName.trim(),
        brand: prodBrand.trim() || null,
        modelNumber: prodModel.trim() || null,
        sku: prodSku.trim() || null,
        barcode: prodBarcode.trim() || null,
        costPrice: Number(prodCostPrice) || 0,
        sellingPrice: Number(prodSellingPrice) || 0,
        isTrackStock: prodTrackStock,
        initialStock: Number(prodInitialStock) || 0,
        locationId: prodLocationId || undefined,
        minStockAlert: prodMinStockAlert,
      });

      if (!res.success || !res.product) {
        showNotification(res.error || "পণ্য যোগ করতে সমস্যা হয়েছে।", true);
        return;
      }

      // Add to local state
      setProducts((prev) => [res.product as SerializedProduct, ...prev]);
      showNotification(`"${res.product.name}" সফলভাবে ক্যাটালগে যুক্ত হয়েছে!`);

      // Reset form
      setProdName("");
      setProdBrand("");
      setProdModel("");
      setProdSku("");
      setProdBarcode("");
      setProdCostPrice("");
      setProdSellingPrice("");
      setProdInitialStock(0);
      setIsAddProductOpen(false);
    } catch (err: any) {
      showNotification(err.message || "পণ্য তৈরিতে সমস্যা হয়েছে।", true);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Submit Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      showNotification("ক্যাটাগরির নাম দিন।", true);
      return;
    }

    setIsSubmittingCategory(true);
    try {
      const res = await createCategoryAction({
        shopId,
        name: catName.trim(),
        type: catType,
        parentId: catParentId || null,
      });

      if (!res.success || !res.category) {
        showNotification(res.error || "ক্যাটাগরি তৈরিতে সমস্যা হয়েছে।", true);
        return;
      }

      // Add to local categories state
      setCategories((prev) => [...prev, res.category as SerializedCategory]);
      // If product modal is open, auto-select this new category
      setProdCategoryId(res.category.id);

      showNotification(`"${res.category.name}" ক্যাটাগরি তৈরি সম্পন্ন হয়েছে!`);
      setCatName("");
      setCatParentId("");
      setIsAddCategoryOpen(false);
    } catch (err: any) {
      showNotification(err.message || "ক্যাটাগরি তৈরিতে সমস্যা হয়েছে।", true);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSku(text);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Profit Margin calculation helper for Add Product Modal
  const cost = Number(prodCostPrice) || 0;
  const sell = Number(prodSellingPrice) || 0;
  const estimatedProfit = sell > 0 ? sell - cost : 0;
  const profitMarginPercent = cost > 0 && sell > 0 ? Math.round(((sell - cost) / cost) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-600 text-white shadow-2xl animate-in slide-in-from-top-4 duration-300 font-semibold text-sm border border-emerald-400/30">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-2 hover:opacity-75 transition-opacity"
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
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/10 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  পণ্য ক্যাটালগ ও প্রডাক্ট তালিকা
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400">
                  <Sparkles className="w-3 h-3" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                মোবাইল হ্যান্ডসেট, এক্সেসরিজ এবং রিপেয়ার পার্টস ইনভেন্টরি ক্যাটালগ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Add Category Button */}
            <button
              type="button"
              onClick={() => setIsAddCategoryOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground font-bold text-xs sm:text-sm transition-all shadow-sm hover:border-purple-500/40 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-purple-500" />
              <span>নতুন ক্যাটাগরি</span>
            </button>

            {/* Add Product Button */}
            <button
              type="button"
              onClick={() => {
                if (categories.length > 0 && !prodCategoryId) {
                  setProdCategoryId(categories[0].id);
                }
                setIsAddProductOpen(true);
              }}
              className="flex-1 sm:flex-initial shimmer-button inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 hover:brightness-110 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন পণ্য যুক্ত করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">মোট পণ্য</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{products.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>সক্রিয় ক্যাটালগ আইটেম</span>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">ক্যাটাগরি সমূহ</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{categories.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>ক্যাটাগরি গ্রুপ</span>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">মোট মজুত স্টক</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {totalStockUnits} টি
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>ট্র্যাকড: {stockTrackedCount} টি পণ্য</span>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">কম স্টক অ্যালার্ট</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500">
            {lowStockProducts.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>রি-অর্ডার প্রয়োজন</span>
          </div>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-border/60 backdrop-blur-xl space-y-3.5 shadow-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="পণ্য, মডেল, ব্র্যান্ড, SKU, বা বারকোড দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-card/80 rounded-xl border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Stock Filters */}
          <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 p-1 rounded-xl border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setStockFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                stockFilter === "ALL"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              সব
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("IN_STOCK")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                stockFilter === "IN_STOCK"
                  ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ইন স্টক
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("LOW_STOCK")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                stockFilter === "LOW_STOCK"
                  ? "bg-card text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              লো স্টক ({lowStockProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("OUT_OF_STOCK")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                stockFilter === "OUT_OF_STOCK"
                  ? "bg-card text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              স্টক শেষ
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "border border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            সকল পণ্য ({products.length})
          </button>

          {categories.map((c) => {
            const count = products.filter((p) => p.category.id === c.id).length;
            const isSelected = selectedCategory === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 text-xs rounded-xl border font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25"
                    : "border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {getCategoryIcon(c.name)}
                <span>{c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-5 py-3.5">পণ্য ও ব্র্যান্ড</th>
                <th className="px-4 py-3.5">ক্যাটাগরি</th>
                <th className="px-4 py-3.5">SKU / বারকোড</th>
                <th className="px-4 py-3.5 text-right">ক্রয় মূল্য</th>
                <th className="px-4 py-3.5 text-right">বিক্রয় মূল্য</th>
                <th className="px-4 py-3.5 text-center">লাভ (Margin)</th>
                <th className="px-4 py-3.5 text-center">মজুদ স্টক</th>
                <th className="px-4 py-3.5 text-center">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-bold text-base text-foreground">কোন পণ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {search || selectedCategory !== "ALL" || stockFilter !== "ALL"
                        ? "আপনার ফিল্টারের সাথে মিলে এমন কোনো পণ্য মেলেনি। ফিল্টার রিসেট করে দেখুন।"
                        : "ক্যাটালগ তৈরি করতে উপরের 'নতুন পণ্য যুক্ত করুন' বাটনে ক্লিক করে পণ্য যোগ করুন।"}
                    </p>
                    {(search || selectedCategory !== "ALL" || stockFilter !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setSelectedCategory("ALL");
                          setStockFilter("ALL");
                        }}
                        className="mt-3 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        ফিল্টার রিসেট করুন
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockTotal = product.stockBalances.reduce(
                    (sum, b) => sum + Number(b.quantityOnHand),
                    0
                  );
                  const isOutOfStock = product.isTrackStock && stockTotal <= 0;
                  const isLow = product.isTrackStock && !isOutOfStock && stockTotal <= product.minStockAlert;

                  const cost = Number(product.costPrice) || 0;
                  const sell = Number(product.sellingPrice) || 0;
                  const marginPct = cost > 0 && sell > 0 ? Math.round(((sell - cost) / cost) * 100) : 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-indigo-500/5 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground group-hover:text-indigo-500 transition-colors">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-0.5">
                          {product.brand && <span>{product.brand}</span>}
                          {product.modelNumber && (
                            <>
                              <span>•</span>
                              <span>মডেল: {product.modelNumber}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 border border-border/60 text-foreground">
                          {getCategoryIcon(product.category.name)}
                          <span>{product.category.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{product.sku}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(product.sku)}
                            title="SKU কপি করুন"
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedSku === product.sku ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {product.barcode && (
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            বারকোড: {product.barcode}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-muted-foreground">
                        {formatBDT(cost, "en")}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-foreground">
                        {formatBDT(sell, "en")}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {marginPct > 0 ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <TrendingUp className="w-2.5 h-2.5" />
                            +{marginPct}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {product.isTrackStock ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              isOutOfStock
                                ? "bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                                : isLow
                                ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isOutOfStock
                                  ? "bg-rose-500"
                                  : isLow
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-emerald-500"
                              }`}
                            />
                            {stockTotal} টি
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">সার্ভিস/আনট্র্যাকড</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            product.isActive
                              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {product.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </span>
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
      {/* MODAL: ADD PRODUCT */}
      {/* ========================================================================= */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">নতুন পণ্য যুক্ত করুন</h3>
                  <p className="text-xs text-muted-foreground">ক্যাটালগে নতুন আইটেম ও প্রাথমিক স্টক তথ্য দিন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateProduct} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  পণ্যের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="যেমন: iPhone 15 Pro, Samsung 25W Fast Charger, ইত্যাদি"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                />
              </div>

              {/* Category Selection + Quick Add Category Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-foreground">
                    ক্যাটাগরি <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ নতুন ক্যাটাগরি তৈরি করুন</span>
                  </button>
                </div>
                <select
                  required
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                >
                  <option value="" disabled>ক্যাটাগরি নির্বাচন করুন</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand and Model Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">ব্র্যান্ড (Brand)</label>
                  <input
                    type="text"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    placeholder="যেমন: Apple, Samsung, Xiaomi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">মডেল নাম্বার (Model No)</label>
                  <input
                    type="text"
                    value={prodModel}
                    onChange={(e) => setProdModel(e.target.value)}
                    placeholder="যেমন: A3102, SM-A155F"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-foreground">SKU কোড</label>
                    <button
                      type="button"
                      onClick={handleAutoSku}
                      className="inline-flex items-center gap-1 text-[11px] text-purple-500 hover:text-purple-600 font-bold cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      অটো কোড
                    </button>
                  </div>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="যেমন: APPL-15PRO-BLK (খালি রাখলে অটো হবে)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background font-mono text-sm focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">বারকোড (Barcode)</label>
                  <input
                    type="text"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    placeholder="যেমন: 8901234567890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background font-mono text-sm focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Pricing & Profit Calculation */}
              <div className="p-4 rounded-2xl border border-border/70 bg-muted/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">ক্রয় মূল্য (Cost Price ৳)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={prodCostPrice}
                      onChange={(e) => setProdCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      বিক্রয় মূল্য (Selling Price ৳) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={prodSellingPrice}
                      onChange={(e) => setProdSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Live Profit Preview */}
                {sell > 0 && (
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-card border border-border/60">
                    <span className="text-muted-foreground font-medium">প্রত্যাশিত লাভ ও মার্জিন:</span>
                    <div className="flex items-center gap-2 font-bold font-mono">
                      <span className={estimatedProfit >= 0 ? "text-emerald-500" : "text-rose-500"}>
                        {formatBDT(estimatedProfit, "en")}
                      </span>
                      {profitMarginPercent > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[11px]">
                          +{profitMarginPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Stock Tracking & Initial Stock */}
              <div className="p-4 rounded-2xl border border-border/70 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-foreground">ইনভেন্টরি স্টক ট্র্যাক করুন</div>
                    <div className="text-[11px] text-muted-foreground">বিক্রি ও কেনাকাটায় স্বয়ংক্রিয় স্টক হ্রাস/বৃদ্ধি হবে</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prodTrackStock}
                    onChange={(e) => setProdTrackStock(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-border"
                  />
                </div>

                {prodTrackStock && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-border/50">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">প্রাথমিক স্টক পরিমাণ (টি)</label>
                      <input
                        type="number"
                        min="0"
                        value={prodInitialStock}
                        onChange={(e) => setProdInitialStock(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background font-mono text-sm focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">কম স্টক অ্যালার্ট সীমা (টি)</label>
                      <input
                        type="number"
                        min="0"
                        value={prodMinStockAlert}
                        onChange={(e) => setProdMinStockAlert(Number(e.target.value) || 0)}
                        placeholder="5"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background font-mono text-sm focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="shimmer-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProduct ? (
                    <span>যোগ হচ্ছে...</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>পণ্য সেভ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CATEGORY */}
      {/* ========================================================================= */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md glass-panel bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">নতুন ক্যাটাগরি তৈরি করুন</h3>
                  <p className="text-xs text-muted-foreground">পণ্য সুশৃঙ্খলভাবে সাজাতে নতুন ক্যাটাগরি গ্রুপ যোগ করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  ক্যাটাগরির নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="যেমন: স্মার্টওয়াচ, ব্লুটুথ স্পিকার, পাওয়ার ব্যাংক"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-purple-500/30 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  ক্যাটাগরির ধরন (Type)
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCatType("ACCESSORY")}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      catType === "ACCESSORY"
                        ? "border-purple-500 bg-purple-500/10 font-bold text-purple-600 dark:text-purple-400 ring-1 ring-purple-500"
                        : "border-border/70 bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    <Headphones className="w-4 h-4 text-purple-500" />
                    <span>এক্সেসরিজ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatType("PHONE")}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      catType === "PHONE"
                        ? "border-blue-500 bg-blue-500/10 font-bold text-blue-600 dark:text-blue-400 ring-1 ring-blue-500"
                        : "border-border/70 bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    <span>হ্যান্ডসেট</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatType("PART")}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      catType === "PART"
                        ? "border-amber-500 bg-amber-500/10 font-bold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500"
                        : "border-border/70 bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-amber-500" />
                    <span>স্পেয়ার পার্টস</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatType("CONSUMABLE")}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      catType === "CONSUMABLE"
                        ? "border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500"
                        : "border-border/70 bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    <Archive className="w-4 h-4 text-emerald-500" />
                    <span>কনজিউমেবল</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="shimmer-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-500/25 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCategory ? (
                    <span>তৈরি হচ্ছে...</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>ক্যাটাগরি সেভ করুন</span>
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
