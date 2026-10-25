import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const shopId = "11111111-1111-1111-1111-111111111111";

  console.log("Adding rich demo data for Rashed Telecom...");

  // 1. Fetch Prerequisites
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error("Shop not found");

  const adminUser = await prisma.user.findFirst({ where: { memberships: { some: { shopId } } } });
  const techUser = await prisma.user.findFirst({ where: { fullName: { contains: "Kamrul" } } }) || adminUser!;
  const location = await prisma.location.findFirst({ where: { shopId } });
  if (!adminUser || !location) throw new Error("Admin user or location missing");

  // 2. Fetch or Create Categories
  const catPhone = await prisma.category.upsert({
    where: { shopId_name: { shopId, name: "স্মার্টফোন (Smartphones)" } },
    update: {},
    create: { shopId, name: "স্মার্টফোন (Smartphones)" },
  });

  const catAccessory = await prisma.category.upsert({
    where: { shopId_name: { shopId, name: "মোবাইল এক্সেসরিজ (Accessories)" } },
    update: {},
    create: { shopId, name: "মোবাইল এক্সেসরিজ (Accessories)" },
  });

  const catParts = await prisma.category.upsert({
    where: { shopId_name: { shopId, name: "সার্ভিসিং স্পেয়ার পার্টস (Parts)" } },
    update: {},
    create: { shopId, name: "সার্ভিসিং স্পেয়ার পার্টস (Parts)" },
  });

  // 3. Upsert Products
  const newProductsData = [
    {
      sku: "SAM-A55-128",
      name: "Samsung Galaxy A55 5G (8GB/128GB)",
      brand: "Samsung",
      categoryId: catPhone.id,
      costPrice: 38000,
      sellingPrice: 43500,
      minStockAlert: 2,
      qty: 6,
    },
    {
      sku: "REDMI-NOTE13P",
      name: "Xiaomi Redmi Note 13 Pro (8GB/256GB)",
      brand: "Xiaomi",
      categoryId: catPhone.id,
      costPrice: 26000,
      sellingPrice: 29500,
      minStockAlert: 3,
      qty: 8,
    },
    {
      sku: "VIVO-Y200-128",
      name: "Vivo Y200 5G (8GB/128GB)",
      brand: "Vivo",
      categoryId: catPhone.id,
      costPrice: 22500,
      sellingPrice: 25000,
      minStockAlert: 2,
      qty: 5,
    },
    {
      sku: "BAS-65W-GAN",
      name: "Baseus 65W GaN Fast Charger Ultra",
      brand: "Baseus",
      categoryId: catAccessory.id,
      costPrice: 1850,
      sellingPrice: 2500,
      minStockAlert: 5,
      qty: 15,
    },
    {
      sku: "QCY-T13-ANC",
      name: "QCY T13 ANC Wireless TWS Earbuds",
      brand: "QCY",
      categoryId: catAccessory.id,
      costPrice: 1450,
      sellingPrice: 2100,
      minStockAlert: 5,
      qty: 20,
    },
    {
      sku: "RMX-TYPEC-CB",
      name: "Remax King Kong Type-C Fast Data Cable",
      brand: "Remax",
      categoryId: catAccessory.id,
      costPrice: 180,
      sellingPrice: 350,
      minStockAlert: 10,
      qty: 45,
    },
    {
      sku: "GLAS-11D-KING",
      name: "11D King Kong Curved Tempered Glass",
      brand: "Generic",
      categoryId: catAccessory.id,
      costPrice: 60,
      sellingPrice: 250,
      minStockAlert: 15,
      qty: 80,
    },
    {
      sku: "PART-DISP-RED-N12",
      name: "Original AMOLED Display for Redmi Note 12",
      brand: "Xiaomi",
      categoryId: catParts.id,
      costPrice: 2200,
      sellingPrice: 3500,
      minStockAlert: 4,
      qty: 12,
    },
    {
      sku: "PART-BAT-RED-N12",
      name: "Original 5000mAh Battery for Redmi Note 12",
      brand: "Xiaomi",
      categoryId: catParts.id,
      costPrice: 900,
      sellingPrice: 1600,
      minStockAlert: 5,
      qty: 14,
    },
    {
      sku: "PART-DISP-VIVO-Y20",
      name: "Original LCD Display for Vivo Y20 / Y20s",
      brand: "Vivo",
      categoryId: catParts.id,
      costPrice: 1400,
      sellingPrice: 2200,
      minStockAlert: 3,
      qty: 8,
    },
  ];

  const productMap = new Map<string, any>();

  for (const p of newProductsData) {
    const prod = await prisma.product.upsert({
      where: { shopId_sku: { shopId, sku: p.sku } },
      update: {
        costPrice: new Prisma.Decimal(p.costPrice),
        sellingPrice: new Prisma.Decimal(p.sellingPrice),
      },
      create: {
        shopId,
        categoryId: p.categoryId,
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        isTrackStock: true,
        costPrice: new Prisma.Decimal(p.costPrice),
        sellingPrice: new Prisma.Decimal(p.sellingPrice),
        minStockAlert: p.minStockAlert,
      },
    });

    productMap.set(p.sku, prod);

    // Ensure Stock Balance
    const existingBal = await prisma.stockBalance.findFirst({
      where: {
        shopId,
        productId: prod.id,
        locationId: location.id,
      },
    });

    if (!existingBal) {
      await prisma.stockBalance.create({
        data: {
          shopId,
          productId: prod.id,
          locationId: location.id,
          quantityOnHand: p.qty,
          averageCost: new Prisma.Decimal(p.costPrice),
        },
      });
    } else {
      await prisma.stockBalance.update({
        where: { id: existingBal.id },
        data: { quantityOnHand: p.qty },
      });
    }
  }

  // 4. Upsert Customers with realistic dues
  const customersData = [
    { name: "রফিক আহমেদ (Rafiq)", phone: "01819876543", address: "মিরপুর ১০, ঢাকা", totalDue: 1500 },
    { name: "মো: রাসেল হোসেন (Russel)", phone: "01912344556", address: "উত্তরা সেক্টর ৭, ঢাকা", totalDue: 800 },
    { name: "সেলিম রেজা (Selim)", phone: "01711223344", address: "ধানমন্ডি ২৭, ঢাকা", totalDue: 0 },
    { name: "জাহিদুল ইসলাম (Zahid)", phone: "01678990011", address: "ফার্মগেট, ঢাকা", totalDue: 2200 },
    { name: "মো: আল-আমিন (Al-Amin)", phone: "01712345678", address: "মোহাম্মদপুর, ঢাকা", totalDue: 500 },
  ];

  const customerList: any[] = [];
  for (const c of customersData) {
    const cust = await prisma.customer.upsert({
      where: { shopId_phone: { shopId, phone: c.phone } },
      update: { totalDue: new Prisma.Decimal(c.totalDue) },
      create: {
        shopId,
        name: c.name,
        phone: c.phone,
        address: c.address,
        totalDue: new Prisma.Decimal(c.totalDue),
      },
    });
    customerList.push(cust);
  }

  // 5. Active & Delivered Service Jobs
  const now = new Date();
  const todayMorning = new Date(now);
  todayMorning.setHours(9, 30, 0, 0);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(14, 0, 0, 0);

  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(now.getDate() - 2);

  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(now.getDate() - 5);

  const twelveDaysAgo = new Date(now);
  twelveDaysAgo.setDate(now.getDate() - 12);

  const serviceJobsList = [
    // 1. IN LAB QUEUE (REPAIRING)
    {
      jobNumber: "JOB-2026-101",
      customer: customerList[0],
      deviceBrand: "Samsung",
      deviceModel: "Galaxy S22 Ultra",
      reportedIssue: "ডিসপ্লে গ্রিন লাইন সমস্যা (OLED Bonding Repair)",
      status: "REPAIRING",
      labourCost: 2500,
      partsCost: 1000,
      outsideCost: 0,
      totalAmount: 3500,
      paidAmount: 1000,
      dueAmount: 2500,
      paymentStatus: "PARTIALLY_PAID",
      createdAt: todayMorning,
      parts: [],
    },
    // 2. IN LAB QUEUE (DIAGNOSING)
    {
      jobNumber: "JOB-2026-102",
      customer: customerList[1],
      deviceBrand: "Apple",
      deviceModel: "iPhone 13 Pro Max",
      reportedIssue: "হোয়াইট স্ক্রিন অফ ডেথ (White Screen IC Jumper)",
      status: "DIAGNOSING",
      labourCost: 3000,
      partsCost: 500,
      outsideCost: 0,
      totalAmount: 3500,
      paidAmount: 0,
      dueAmount: 3500,
      paymentStatus: "PENDING",
      createdAt: todayMorning,
      parts: [],
    },
    // 3. IN LAB QUEUE (READY FOR DELIVERY)
    {
      jobNumber: "JOB-2026-103",
      customer: customerList[2],
      deviceBrand: "Xiaomi",
      deviceModel: "Redmi Note 12",
      reportedIssue: "ব্যাটারি ব্যাকআপ অত্যন্ত দুর্বল ও চার্জ থাকে না",
      status: "READY",
      labourCost: 700,
      partsCost: 900,
      outsideCost: 0,
      totalAmount: 1600,
      paidAmount: 1600,
      dueAmount: 0,
      paymentStatus: "PAID",
      createdAt: yesterday,
      parts: [
        {
          sku: "PART-BAT-RED-N12",
          qty: 1,
          unitCost: 900,
          sellingPrice: 1600,
        },
      ],
    },
    // 4. DELIVERED (TODAY)
    {
      jobNumber: "JOB-2026-104",
      customer: customerList[3],
      deviceBrand: "Vivo",
      deviceModel: "Y20",
      reportedIssue: "গ্লাস ও ডিসপ্লে ভেঙে পুরো কালো হয়ে গিয়েছিল",
      status: "DELIVERED",
      labourCost: 800,
      partsCost: 1400,
      outsideCost: 0,
      totalAmount: 2200,
      paidAmount: 2200,
      dueAmount: 0,
      paymentStatus: "PAID",
      createdAt: todayMorning,
      parts: [
        {
          sku: "PART-DISP-VIVO-Y20",
          qty: 1,
          unitCost: 1400,
          sellingPrice: 2200,
        },
      ],
    },
    // 5. DELIVERED (THIS WEEK - 2 DAYS AGO)
    {
      jobNumber: "JOB-2026-105",
      customer: customerList[4],
      deviceBrand: "Xiaomi",
      deviceModel: "Redmi Note 12",
      reportedIssue: "টাচ কাজ করে না ও ডিসপ্লে ভাঙা",
      status: "DELIVERED",
      labourCost: 1300,
      partsCost: 2200,
      outsideCost: 0,
      totalAmount: 3500,
      paidAmount: 3500,
      dueAmount: 0,
      paymentStatus: "PAID",
      createdAt: twoDaysAgo,
      parts: [
        {
          sku: "PART-DISP-RED-N12",
          qty: 1,
          unitCost: 2200,
          sellingPrice: 3500,
        },
      ],
    },
    // 6. DELIVERED (THIS MONTH - 12 DAYS AGO)
    {
      jobNumber: "JOB-2026-106",
      customer: customerList[1],
      deviceBrand: "Samsung",
      deviceModel: "Galaxy A15",
      reportedIssue: "ডিসপ্লে পরিবর্তন ও ফিটিং",
      status: "DELIVERED",
      labourCost: 1000,
      partsCost: 1800,
      outsideCost: 0,
      totalAmount: 2800,
      paidAmount: 2800,
      dueAmount: 0,
      paymentStatus: "PAID",
      createdAt: twelveDaysAgo,
      parts: [],
    },
  ];

  for (const job of serviceJobsList) {
    const createdJob = await prisma.serviceJob.upsert({
      where: { shopId_jobNumber: { shopId, jobNumber: job.jobNumber } },
      update: {
        status: job.status,
        totalAmount: new Prisma.Decimal(job.totalAmount),
        paidAmount: new Prisma.Decimal(job.paidAmount),
        dueAmount: new Prisma.Decimal(job.dueAmount),
        labourCost: new Prisma.Decimal(job.labourCost),
        partsCost: new Prisma.Decimal(job.partsCost),
        createdAt: job.createdAt,
      },
      create: {
        shopId,
        jobNumber: job.jobNumber,
        customerId: job.customer.id,
        deviceBrand: job.deviceBrand,
        deviceModel: job.deviceModel,
        intakeCondition: "চালু অবস্থা, বডিতে সামান্য দাগ",
        reportedIssue: job.reportedIssue,
        status: job.status,
        assignedTechnicianId: techUser.id,
        intakeCashierId: adminUser.id,
        labourCost: new Prisma.Decimal(job.labourCost),
        partsCost: new Prisma.Decimal(job.partsCost),
        outsideCost: new Prisma.Decimal(job.outsideCost),
        totalAmount: new Prisma.Decimal(job.totalAmount),
        paidAmount: new Prisma.Decimal(job.paidAmount),
        dueAmount: new Prisma.Decimal(job.dueAmount),
        paymentStatus: job.paymentStatus,
        createdAt: job.createdAt,
      },
    });

    for (const p of job.parts) {
      const partProd = productMap.get(p.sku);
      if (partProd) {
        await prisma.servicePart.create({
          data: {
            serviceJobId: createdJob.id,
            productId: partProd.id,
            quantity: p.qty,
            unitCost: new Prisma.Decimal(p.unitCost),
            sellingPrice: new Prisma.Decimal(p.sellingPrice),
            subtotal: new Prisma.Decimal(p.sellingPrice * p.qty),
            consumedById: techUser.id,
          },
        });
      }
    }
  }

  // 6. Rich Multi-Timeframe Sales
  const salesDemoData = [
    // TODAY SALE 1: Redmi Note 13 Pro (bKash)
    {
      invoiceNumber: "INV-2026-TODAY-01",
      customer: customerList[0],
      createdAt: todayMorning,
      paymentMethod: "BKASH",
      subtotal: 29500,
      discount: 500,
      totalAmount: 29000,
      paidAmount: 29000,
      dueAmount: 0,
      items: [
        {
          sku: "REDMI-NOTE13P",
          qty: 1,
          unitPrice: 29500,
          unitCost: 26000,
        },
      ],
    },
    // TODAY SALE 2: QCY Earbuds + Remax Cable + 11D Glass (Cash)
    {
      invoiceNumber: "INV-2026-TODAY-02",
      customer: customerList[1],
      createdAt: todayMorning,
      paymentMethod: "CASH",
      subtotal: 2100 + 350 + 250,
      discount: 100,
      totalAmount: 2600,
      paidAmount: 2600,
      dueAmount: 0,
      items: [
        { sku: "QCY-T13-ANC", qty: 1, unitPrice: 2100, unitCost: 1450 },
        { sku: "RMX-TYPEC-CB", qty: 1, unitPrice: 350, unitCost: 180 },
        { sku: "GLAS-11D-KING", qty: 1, unitPrice: 250, unitCost: 60 },
      ],
    },
    // TODAY SALE 3: Baseus 65W GaN Charger (Nagad)
    {
      invoiceNumber: "INV-2026-TODAY-03",
      customer: customerList[2],
      createdAt: todayMorning,
      paymentMethod: "NAGAD",
      subtotal: 2500,
      discount: 0,
      totalAmount: 2500,
      paidAmount: 2500,
      dueAmount: 0,
      items: [
        { sku: "BAS-65W-GAN", qty: 1, unitPrice: 2500, unitCost: 1850 },
      ],
    },
    // THIS WEEK (YESTERDAY): Vivo Y200 + Tempered Glass (Card/Bank)
    {
      invoiceNumber: "INV-2026-WEEK-01",
      customer: customerList[3],
      createdAt: yesterday,
      paymentMethod: "BANK",
      subtotal: 25000 + 250,
      discount: 250,
      totalAmount: 25000,
      paidAmount: 25000,
      dueAmount: 0,
      items: [
        { sku: "VIVO-Y200-128", qty: 1, unitPrice: 25000, unitCost: 22500 },
        { sku: "GLAS-11D-KING", qty: 1, unitPrice: 250, unitCost: 60 },
      ],
    },
    // THIS WEEK (3 DAYS AGO): 2 Baseus Chargers + 2 Remax Cables (bKash)
    {
      invoiceNumber: "INV-2026-WEEK-02",
      customer: customerList[4],
      createdAt: twoDaysAgo,
      paymentMethod: "BKASH",
      subtotal: 2500 * 2 + 350 * 2,
      discount: 200,
      totalAmount: 5500,
      paidAmount: 5500,
      dueAmount: 0,
      items: [
        { sku: "BAS-65W-GAN", qty: 2, unitPrice: 2500, unitCost: 1850 },
        { sku: "RMX-TYPEC-CB", qty: 2, unitPrice: 350, unitCost: 180 },
      ],
    },
    // THIS MONTH (5 DAYS AGO): Samsung A55 5G (Cash)
    {
      invoiceNumber: "INV-2026-MONTH-01",
      customer: customerList[0],
      createdAt: fiveDaysAgo,
      paymentMethod: "CASH",
      subtotal: 43500,
      discount: 500,
      totalAmount: 43000,
      paidAmount: 43000,
      dueAmount: 0,
      items: [
        { sku: "SAM-A55-128", qty: 1, unitPrice: 43500, unitCost: 38000 },
      ],
    },
    // THIS MONTH (12 DAYS AGO): QCY Earbuds x 3 (Wholesale / Friends - Nagad)
    {
      invoiceNumber: "INV-2026-MONTH-02",
      customer: customerList[1],
      createdAt: twelveDaysAgo,
      paymentMethod: "NAGAD",
      subtotal: 2100 * 3,
      discount: 300,
      totalAmount: 6000,
      paidAmount: 6000,
      dueAmount: 0,
      items: [
        { sku: "QCY-T13-ANC", qty: 3, unitPrice: 2100, unitCost: 1450 },
      ],
    },
  ];

  for (const s of salesDemoData) {
    const existing = await prisma.sale.findUnique({
      where: { shopId_invoiceNumber: { shopId, invoiceNumber: s.invoiceNumber } },
    });

    if (!existing) {
      const createdSale = await prisma.sale.create({
        data: {
          shopId,
          invoiceNumber: s.invoiceNumber,
          customerId: s.customer.id,
          cashierId: adminUser.id,
          subtotal: new Prisma.Decimal(s.subtotal),
          discount: new Prisma.Decimal(s.discount),
          totalAmount: new Prisma.Decimal(s.totalAmount),
          paidAmount: new Prisma.Decimal(s.paidAmount),
          dueAmount: new Prisma.Decimal(s.dueAmount),
          paymentStatus: "PAID",
          createdAt: s.createdAt,
          items: {
            create: s.items.map((it) => {
              const p = productMap.get(it.sku);
              return {
                productId: p.id,
                quantity: it.qty,
                unitPrice: new Prisma.Decimal(it.unitPrice),
                unitCost: new Prisma.Decimal(it.unitCost),
                subtotal: new Prisma.Decimal(it.unitPrice * it.qty),
              };
            }),
          },
        },
      });

      await prisma.payment.upsert({
        where: { shopId_paymentNumber: { shopId, paymentNumber: `PAY-${s.invoiceNumber}` } },
        update: {
          amount: new Prisma.Decimal(s.paidAmount),
          paymentMethod: s.paymentMethod,
          createdAt: s.createdAt,
        },
        create: {
          shopId,
          paymentNumber: `PAY-${s.invoiceNumber}`,
          customerId: s.customer.id,
          amount: new Prisma.Decimal(s.paidAmount),
          paymentMethod: s.paymentMethod,
          createdAt: s.createdAt,
          receivedBy: adminUser.id,
        },
      });
    }
  }

  // 7. Operating Expenses
  const teaCat = await prisma.expenseCategory.findFirst({ where: { shopId, name: { contains: "চা" } } });
  const utilCat = await prisma.expenseCategory.findFirst({ where: { shopId, name: { contains: "বিদ্যুৎ" } } });
  const otherCat = await prisma.expenseCategory.findFirst({ where: { shopId, name: { contains: "অন্যান্য" } } });
  const convCat = await prisma.expenseCategory.findFirst({ where: { shopId, name: { contains: "যাতায়াত" } } });
  const netCat = await prisma.expenseCategory.findFirst({ where: { shopId, name: { contains: "ইন্টারনেট" } } });
  const rentCat = await prisma.expenseCategory.findFirst({ where: { shopId, name: { contains: "ভাড়া" } } });

  const defaultCat = teaCat || otherCat!;
  const otherAcc = await prisma.account.findFirst({ where: { shopId, code: "6200" } });
  const rentAcc = await prisma.account.findFirst({ where: { shopId, code: "6000" } });

  const expensesDataList = [
    // TODAY
    {
      expenseNumber: "EXP-DEMO-TODAY-01",
      catId: teaCat?.id || defaultCat.id,
      accId: otherAcc!.id,
      amount: 180,
      payee: "মামার চা দোকান",
      notes: "সকালের চা, বিস্কুট ও নাস্তা",
      method: "CASH",
      date: todayMorning,
    },
    {
      expenseNumber: "EXP-DEMO-TODAY-02",
      catId: teaCat?.id || defaultCat.id,
      accId: otherAcc!.id,
      amount: 150,
      payee: "কোল্ড ড্রিংকস কর্নার",
      notes: "দোকানের বিশেষ কাস্টমার আপ্যায়ন",
      method: "CASH",
      date: todayMorning,
    },
    // THIS WEEK
    {
      expenseNumber: "EXP-DEMO-WEEK-01",
      catId: convCat?.id || defaultCat.id,
      accId: otherAcc!.id,
      amount: 450,
      payee: "পাঠাও পার্সেল ও রিকশা",
      notes: "স্টেডিয়াম মার্কেট থেকে আর্জেন্ট ডিসপ্লে ও ব্যাটারি সংগ্রহ",
      method: "CASH",
      date: twoDaysAgo,
    },
    {
      expenseNumber: "EXP-DEMO-WEEK-02",
      catId: otherCat?.id || defaultCat.id,
      accId: otherAcc!.id,
      amount: 650,
      payee: "ইলেকট্রনিক্স টুলস স্টোর",
      notes: "ল্যাবের সোল্ডারিং ফ্লাক্স ও ক্লিনিং অ্যালকোহল ক্রয়",
      method: "CASH",
      date: fiveDaysAgo,
    },
    // THIS MONTH
    {
      expenseNumber: "EXP-DEMO-MONTH-01",
      catId: netCat?.id || defaultCat.id,
      accId: otherAcc!.id,
      amount: 1000,
      payee: "লিংক৩ ব্রডব্যান্ড",
      notes: "দোকান ও সিসিটিভি ক্যামেরার মাসিক ইন্টারনেট বিল",
      method: "BKASH",
      date: twelveDaysAgo,
    },
    {
      expenseNumber: "EXP-DEMO-MONTH-02",
      catId: utilCat?.id || rentAcc!.id,
      accId: rentAcc!.id,
      amount: 3200,
      payee: "ডেসকো বিদ্যুৎ মিটার",
      notes: "দোকানের চলতি মাসের বাণিজ্যিক বিদ্যুৎ বিল",
      method: "BKASH",
      date: twelveDaysAgo,
    },
  ];

  for (const exp of expensesDataList) {
    await prisma.expense.upsert({
      where: { shopId_expenseNumber: { shopId, expenseNumber: exp.expenseNumber } },
      update: {
        amount: new Prisma.Decimal(exp.amount),
        expenseDate: exp.date,
      },
      create: {
        shopId,
        expenseNumber: exp.expenseNumber,
        categoryId: exp.catId,
        accountId: exp.accId,
        paymentMethod: exp.method,
        amount: new Prisma.Decimal(exp.amount),
        expenseDate: exp.date,
        payee: exp.payee,
        notes: exp.notes,
        recordedById: adminUser.id,
      },
    });
  }

  console.log("Full realistic demo data populated successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
