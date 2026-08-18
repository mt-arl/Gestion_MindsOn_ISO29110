-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DROPPED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "ClassModality" AS ENUM ('VIRTUAL', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "TuitionFeeStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "guardianPhone1" TEXT,
    "guardianPhone2" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentClassId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modality" "ClassModality" NOT NULL,
    "schedule" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "primaryTeacherId" TEXT NOT NULL,
    "assistantTeacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuition_fees" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "TuitionFeeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuition_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tuitionFeeId" TEXT NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_ci_key" ON "students"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE INDEX "students_ci_idx" ON "students"("ci");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_ci_key" ON "teachers"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");

-- CreateIndex
CREATE INDEX "teachers_ci_idx" ON "teachers"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE INDEX "classes_primaryTeacherId_idx" ON "classes"("primaryTeacherId");

-- CreateIndex
CREATE INDEX "classes_assistantTeacherId_idx" ON "classes"("assistantTeacherId");

-- CreateIndex
CREATE INDEX "tuition_fees_studentId_idx" ON "tuition_fees"("studentId");

-- CreateIndex
CREATE INDEX "tuition_fees_classId_idx" ON "tuition_fees"("classId");

-- CreateIndex
CREATE INDEX "tuition_fees_status_idx" ON "tuition_fees"("status");

-- CreateIndex
CREATE INDEX "tuition_fees_dueDate_idx" ON "tuition_fees"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "tuition_fees_studentId_classId_month_year_key" ON "tuition_fees"("studentId", "classId", "month", "year");

-- CreateIndex
CREATE INDEX "payments_tuitionFeeId_idx" ON "payments"("tuitionFeeId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_currentClassId_fkey" FOREIGN KEY ("currentClassId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_primaryTeacherId_fkey" FOREIGN KEY ("primaryTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_assistantTeacherId_fkey" FOREIGN KEY ("assistantTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_fees" ADD CONSTRAINT "tuition_fees_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_fees" ADD CONSTRAINT "tuition_fees_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tuitionFeeId_fkey" FOREIGN KEY ("tuitionFeeId") REFERENCES "tuition_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
