-- Migration: Add comparePrice column to Course table
-- Description: Adds an optional compare price (decimal) column for courses
-- Date: 2025-02-21

ALTER TABLE "Course"
ADD COLUMN IF NOT EXISTS "comparePrice" DECIMAL(10, 2);
