-- Prompt Testing Feature Migration
-- Run this in Supabase SQL Editor

-- ============================================================
-- Table 1: prompt_test_questions
-- Stores the test questions/prompts to evaluate Serin against
-- ============================================================
CREATE TABLE IF NOT EXISTS prompt_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL UNIQUE,           -- e.g. "E17", "A01"
  category TEXT NOT NULL,                  -- "empathy", "boundary", "crisis"
  user_message TEXT NOT NULL,
  expected_behavior TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_prompt_test_questions_active
  ON prompt_test_questions(is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_prompt_test_questions_category
  ON prompt_test_questions(category);

-- ============================================================
-- Table 2: prompt_test_runs
-- Stores metadata about each test execution run
-- ============================================================
CREATE TABLE IF NOT EXISTS prompt_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_label TEXT,                          -- e.g. "Post-prompt-update"
  model_id TEXT NOT NULL,
  model_label TEXT,
  total_questions INTEGER DEFAULT 0,
  completed_questions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',           -- pending/running/completed/failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  avg_rating NUMERIC(3,1),
  rated_count INTEGER DEFAULT 0
);

-- Index for filtering by status and date
CREATE INDEX IF NOT EXISTS idx_prompt_test_runs_status
  ON prompt_test_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_test_runs_created_by
  ON prompt_test_runs(created_by, created_at DESC);

-- ============================================================
-- Table 3: prompt_test_results
-- Stores individual question results within a test run
-- ============================================================
CREATE TABLE IF NOT EXISTS prompt_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES prompt_test_runs(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES prompt_test_questions(id),
  test_id_snapshot TEXT NOT NULL,          -- Snapshot of test_id at time of run
  user_message_snapshot TEXT NOT NULL,     -- Snapshot of user_message at time of run
  expected_behavior_snapshot TEXT,         -- Snapshot of expected_behavior at time of run
  serin_response TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  whats_good TEXT,
  whats_to_change TEXT,
  rated_at TIMESTAMPTZ,
  rated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient lookups by run
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_run_id
  ON prompt_test_results(run_id, created_at);

-- Index for tracking ratings
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_rating
  ON prompt_test_results(run_id, rating) WHERE rating IS NOT NULL;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE prompt_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_results ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin or super_admin
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = $1
    AND admin_roles.role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is super_admin only
CREATE OR REPLACE FUNCTION is_super_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = $1
    AND admin_roles.role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- prompt_test_questions policies
-- ============================================================

-- Read: admins and super_admins
CREATE POLICY "prompt_test_questions_select_admin"
  ON prompt_test_questions
  FOR SELECT
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Insert: super_admins only
CREATE POLICY "prompt_test_questions_insert_super_admin"
  ON prompt_test_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin_user(auth.uid()));

-- Update: super_admins only
CREATE POLICY "prompt_test_questions_update_super_admin"
  ON prompt_test_questions
  FOR UPDATE
  TO authenticated
  USING (is_super_admin_user(auth.uid()))
  WITH CHECK (is_super_admin_user(auth.uid()));

-- Delete: super_admins only
CREATE POLICY "prompt_test_questions_delete_super_admin"
  ON prompt_test_questions
  FOR DELETE
  TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================================
-- prompt_test_runs policies
-- ============================================================

-- Read: admins and super_admins
CREATE POLICY "prompt_test_runs_select_admin"
  ON prompt_test_runs
  FOR SELECT
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Insert: super_admins only
CREATE POLICY "prompt_test_runs_insert_super_admin"
  ON prompt_test_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin_user(auth.uid()));

-- Update: super_admins only
CREATE POLICY "prompt_test_runs_update_super_admin"
  ON prompt_test_runs
  FOR UPDATE
  TO authenticated
  USING (is_super_admin_user(auth.uid()))
  WITH CHECK (is_super_admin_user(auth.uid()));

-- Delete: super_admins only
CREATE POLICY "prompt_test_runs_delete_super_admin"
  ON prompt_test_runs
  FOR DELETE
  TO authenticated
  USING (is_super_admin_user(auth.uid()));

-- ============================================================
-- prompt_test_results policies
-- ============================================================

-- Read: admins and super_admins
CREATE POLICY "prompt_test_results_select_admin"
  ON prompt_test_results
  FOR SELECT
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Insert: super_admins only
CREATE POLICY "prompt_test_results_insert_super_admin"
  ON prompt_test_results
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin_user(auth.uid()));

-- Update: super_admins only (for rating)
CREATE POLICY "prompt_test_results_update_super_admin"
  ON prompt_test_results
  FOR UPDATE
  TO authenticated
  USING (is_super_admin_user(auth.uid()))
  WITH CHECK (is_super_admin_user(auth.uid()));

-- Delete: super_admins only
CREATE POLICY "prompt_test_results_delete_super_admin"
  ON prompt_test_results
  FOR DELETE
  TO authenticated
  USING (is_super_admin_user(auth.uid()));
