/*
  # Deployment Configuration Tables

  1. New Tables
    - `deployment_configs` - Environment-specific configuration settings
    - `feature_flags` - Dynamic feature toggles with rollout control
    - `app_versions` - App version management and update control
    - `maintenance_windows` - Scheduled maintenance periods
    - `app_usage_analytics` - Application usage tracking

  2. Security
    - Enable RLS on all tables
    - Admin-only access for configuration management
    - Public read access for active configurations
    - User-specific analytics insertion

  3. Functions
    - `get_app_config()` - Retrieve environment configuration
    - `check_maintenance_mode()` - Check if system is in maintenance
    - `log_app_usage()` - Log user activity for analytics

  4. Default Data
    - Production, staging, and development configurations
    - Essential feature flags
    - Initial app version entries
*/

-- Deployment configurations table
CREATE TABLE IF NOT EXISTS deployment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(environment, config_key)
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name text UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  description text,
  target_audience jsonb DEFAULT '{"all": true}'::jsonb,
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- App versions table
CREATE TABLE IF NOT EXISTS app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  build_number text NOT NULL,
  is_current boolean DEFAULT false,
  min_supported_version text,
  force_update boolean DEFAULT false,
  release_notes text,
  download_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(platform, version_number)
);

-- Maintenance windows table
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  affected_services text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CHECK (end_time > start_time)
);

-- App usage analytics table
CREATE TABLE IF NOT EXISTS app_usage_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  platform text NOT NULL,
  app_version text NOT NULL,
  screen_name text,
  action_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE deployment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deployment_configs
CREATE POLICY "Admins can manage deployment configs"
  ON deployment_configs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Public can read active deployment configs"
  ON deployment_configs
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for feature_flags
CREATE POLICY "Admins can manage feature flags"
  ON feature_flags
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Public can read feature flags"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for app_versions
CREATE POLICY "Admins can manage app versions"
  ON app_versions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Public can read app versions"
  ON app_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for maintenance_windows
CREATE POLICY "Admins can manage maintenance windows"
  ON maintenance_windows
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Public can read active maintenance windows"
  ON maintenance_windows
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for app_usage_analytics
CREATE POLICY "Users can insert their own usage analytics"
  ON app_usage_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can read all usage analytics"
  ON app_usage_analytics
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS deployment_configs_environment_idx ON deployment_configs(environment);
CREATE INDEX IF NOT EXISTS deployment_configs_active_idx ON deployment_configs(is_active);
CREATE INDEX IF NOT EXISTS feature_flags_enabled_idx ON feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS app_versions_platform_idx ON app_versions(platform);
CREATE INDEX IF NOT EXISTS app_versions_current_idx ON app_versions(is_current);
CREATE INDEX IF NOT EXISTS maintenance_windows_active_idx ON maintenance_windows(is_active);
CREATE INDEX IF NOT EXISTS maintenance_windows_time_idx ON maintenance_windows(start_time, end_time);
CREATE INDEX IF NOT EXISTS app_usage_analytics_user_idx ON app_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS app_usage_analytics_created_idx ON app_usage_analytics(created_at);

-- Functions for app configuration
CREATE OR REPLACE FUNCTION get_app_config(p_environment text DEFAULT 'production')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_result jsonb := '{}'::jsonb;
  config_record record;
BEGIN
  FOR config_record IN 
    SELECT config_key, config_value 
    FROM deployment_configs 
    WHERE environment = p_environment AND is_active = true
  LOOP
    config_result := config_result || jsonb_build_object(config_record.config_key, config_record.config_value);
  END LOOP;
  
  RETURN config_result;
END;
$$;

-- Function to check maintenance mode
CREATE OR REPLACE FUNCTION check_maintenance_mode()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM maintenance_windows
    WHERE is_active = true 
    AND now() BETWEEN start_time AND end_time
  );
END;
$$;

-- Function to log app usage
CREATE OR REPLACE FUNCTION log_app_usage(
  p_user_id uuid,
  p_session_id text,
  p_platform text,
  p_app_version text,
  p_screen_name text DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO app_usage_analytics (
    user_id, session_id, platform, app_version, 
    screen_name, action_type, metadata
  ) VALUES (
    p_user_id, p_session_id, p_platform, p_app_version,
    p_screen_name, p_action_type, p_metadata
  );
END;
$$;

-- Insert default deployment configurations
INSERT INTO deployment_configs (environment, config_key, config_value, description) VALUES
('production', 'app_name', '"Task Runner"', 'Application display name'),
('production', 'support_email', '"support@taskrunner.com"', 'Customer support email'),
('production', 'max_file_size_mb', '10', 'Maximum file upload size in MB'),
('production', 'session_timeout_hours', '24', 'User session timeout in hours'),
('production', 'rate_limit_requests_per_minute', '60', 'API rate limit per user per minute'),
('staging', 'app_name', '"Task Runner (Staging)"', 'Application display name for staging'),
('staging', 'support_email', '"staging@taskrunner.com"', 'Customer support email for staging'),
('development', 'app_name', '"Task Runner (Dev)"', 'Application display name for development'),
('development', 'support_email', '"dev@taskrunner.com"', 'Customer support email for development')
ON CONFLICT (environment, config_key) DO NOTHING;

-- Insert default feature flags
INSERT INTO feature_flags (flag_name, is_enabled, description, rollout_percentage) VALUES
('real_time_messaging', true, 'Enable real-time messaging between users', 100),
('payment_processing', true, 'Enable payment processing features', 100),
('delivery_tracking', true, 'Enable real-time delivery tracking', 100),
('advanced_analytics', false, 'Enable advanced analytics dashboard', 0),
('ai_recommendations', false, 'Enable AI-powered service recommendations', 0),
('video_calls', false, 'Enable video calling between users', 0),
('multi_language', true, 'Enable multi-language support', 100),
('push_notifications', true, 'Enable push notifications', 100)
ON CONFLICT (flag_name) DO NOTHING;

-- Insert current app version
INSERT INTO app_versions (version_number, platform, build_number, is_current, release_notes) VALUES
('1.0.0', 'ios', '1', true, 'Initial release with core marketplace features'),
('1.0.0', 'android', '1', true, 'Initial release with core marketplace features'),
('1.0.0', 'web', '1', true, 'Initial release with core marketplace features')
ON CONFLICT (platform, version_number) DO NOTHING;

-- Triggers for updated_at
CREATE TRIGGER deployment_configs_updated_at
  BEFORE UPDATE ON deployment_configs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();