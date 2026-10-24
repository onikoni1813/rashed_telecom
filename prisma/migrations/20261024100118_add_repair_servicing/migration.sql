-- CreateTable
CREATE TABLE "service_jobs" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "job_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "device_brand" TEXT NOT NULL,
    "device_model" TEXT NOT NULL,
    "device_imei" TEXT,
    "device_color" TEXT,
    "intake_condition" TEXT NOT NULL,
    "accessories_received" TEXT,
    "reported_issue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INTAKE',
    "assigned_technician_id" UUID,
    "intake_cashier_id" UUID NOT NULL,
    "promised_date" TIMESTAMP(3),
    "estimated_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "labour_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "parts_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outside_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "delivery_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_job_status_history" (
    "id" UUID NOT NULL,
    "service_job_id" UUID NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_job_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_diagnostics" (
    "id" UUID NOT NULL,
    "service_job_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "diagnosis_findings" TEXT NOT NULL,
    "estimated_labour" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_parts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customer_approved" BOOLEAN,
    "approved_at" TIMESTAMP(3),
    "customer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_parts" (
    "id" UUID NOT NULL,
    "service_job_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "consumed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_warranties" (
    "id" UUID NOT NULL,
    "service_job_id" UUID NOT NULL,
    "warranty_days" INTEGER NOT NULL DEFAULT 30,
    "warranty_terms" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_warranties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_jobs_shop_id_status_idx" ON "service_jobs"("shop_id", "status");

-- CreateIndex
CREATE INDEX "service_jobs_customer_id_idx" ON "service_jobs"("customer_id");

-- CreateIndex
CREATE INDEX "service_jobs_assigned_technician_id_idx" ON "service_jobs"("assigned_technician_id");

-- CreateIndex
CREATE INDEX "service_jobs_created_at_idx" ON "service_jobs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_jobs_shop_id_job_number_key" ON "service_jobs"("shop_id", "job_number");

-- CreateIndex
CREATE INDEX "service_job_status_history_service_job_id_idx" ON "service_job_status_history"("service_job_id");

-- CreateIndex
CREATE INDEX "service_diagnostics_service_job_id_idx" ON "service_diagnostics"("service_job_id");

-- CreateIndex
CREATE INDEX "service_parts_service_job_id_idx" ON "service_parts"("service_job_id");

-- CreateIndex
CREATE INDEX "service_parts_product_id_idx" ON "service_parts"("product_id");

-- CreateIndex
CREATE INDEX "service_warranties_service_job_id_idx" ON "service_warranties"("service_job_id");

-- AddForeignKey
ALTER TABLE "service_jobs" ADD CONSTRAINT "service_jobs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_jobs" ADD CONSTRAINT "service_jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_jobs" ADD CONSTRAINT "service_jobs_assigned_technician_id_fkey" FOREIGN KEY ("assigned_technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_jobs" ADD CONSTRAINT "service_jobs_intake_cashier_id_fkey" FOREIGN KEY ("intake_cashier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_job_status_history" ADD CONSTRAINT "service_job_status_history_service_job_id_fkey" FOREIGN KEY ("service_job_id") REFERENCES "service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_job_status_history" ADD CONSTRAINT "service_job_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_diagnostics" ADD CONSTRAINT "service_diagnostics_service_job_id_fkey" FOREIGN KEY ("service_job_id") REFERENCES "service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_diagnostics" ADD CONSTRAINT "service_diagnostics_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_service_job_id_fkey" FOREIGN KEY ("service_job_id") REFERENCES "service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_consumed_by_id_fkey" FOREIGN KEY ("consumed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_warranties" ADD CONSTRAINT "service_warranties_service_job_id_fkey" FOREIGN KEY ("service_job_id") REFERENCES "service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
