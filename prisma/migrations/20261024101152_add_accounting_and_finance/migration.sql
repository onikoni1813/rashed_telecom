-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT DEFAULT '6200',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "expense_number" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "payment_method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payee" TEXT,
    "receipt_ref" TEXT,
    "notes" TEXT,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "period_name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "closed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_categories_shop_id_idx" ON "expense_categories"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_shop_id_name_key" ON "expense_categories"("shop_id", "name");

-- CreateIndex
CREATE INDEX "expenses_shop_id_expense_date_idx" ON "expenses"("shop_id", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_shop_id_expense_number_key" ON "expenses"("shop_id", "expense_number");

-- CreateIndex
CREATE INDEX "accounting_periods_shop_id_is_closed_idx" ON "accounting_periods"("shop_id", "is_closed");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_shop_id_period_name_key" ON "accounting_periods"("shop_id", "period_name");

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
