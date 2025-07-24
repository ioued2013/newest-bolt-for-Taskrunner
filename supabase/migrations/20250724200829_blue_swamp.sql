/*
  # Analytics and Reporting System

  1. New Tables
    - `user_analytics` - Track user behavior and engagement
    - `service_analytics` - Track service performance metrics
    - `platform_metrics` - Overall platform statistics
    - `notification_logs` - Track notification delivery

  2. Security
    - Enable RLS on analytics tables
    - Restrict access to own data and admin access

  3. Features
    - User engagement tracking
    - Service performance metrics
    - Platform-wide analytics
    - Notification tracking
*/

-- User analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  session_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Service analytics table
CREATE TABLE IF NOT EXISTS service_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type IN ('view', 'booking', 'completion', 'rating')),
  metric_value numeric(10,2),
  metadata jsonb DEFAULT '{}',
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Platform metrics table
CREATE TABLE IF NOT EXISTS platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric(15,2) NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('count', 'sum', 'average', 'percentage')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  delivery_method text DEFAULT 'push' CHECK (delivery_method IN ('push', 'email', 'sms', 'in_app')),
  metadata jsonb DEFAULT '{}',
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_analytics_user_id_idx ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS user_analytics_event_type_idx ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS user_analytics_created_at_idx ON user_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS service_analytics_service_id_idx ON service_analytics(service_id);
CREATE INDEX IF NOT EXISTS service_analytics_metric_type_idx ON service_analytics(metric_type);
CREATE INDEX IF NOT EXISTS service_analytics_date_idx ON service_analytics(date DESC);
CREATE INDEX IF NOT EXISTS platform_metrics_metric_name_idx ON platform_metrics(metric_name);
CREATE INDEX IF NOT EXISTS platform_metrics_period_idx ON platform_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS notification_logs_user_id_idx ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS notification_logs_status_idx ON notification_logs(status);

-- Enable RLS
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analytics"
  ON user_analytics
  FOR SELECT
  TO authenticated
  USING (user_id = uid());

CREATE POLICY "Service owners can view their service analytics"
  ON service_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM services 
      WHERE services.id = service_analytics.service_id 
      AND services.merchant_id = uid()
    )
  );

CREATE POLICY "Users can view their own notifications"
  ON notification_logs
  FOR ALL
  TO authenticated
  USING (user_id = uid());

-- Admin policies
CREATE POLICY "Admins can view all analytics"
  ON user_analytics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all service analytics"
  ON service_analytics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage platform metrics"
  ON platform_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

-- Function to track user events
CREATE OR REPLACE FUNCTION track_user_event(
  p_user_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_analytics (user_id, event_type, event_data)
  VALUES (p_user_id, p_event_type, p_event_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update service metrics
CREATE OR REPLACE FUNCTION update_service_metric(
  p_service_id uuid,
  p_metric_type text,
  p_metric_value numeric DEFAULT 1
)
RETURNS void AS $$
BEGIN
  INSERT INTO service_analytics (service_id, metric_type, metric_value)
  VALUES (p_service_id, p_metric_type, p_metric_value)
  ON CONFLICT (service_id, metric_type, date) 
  DO UPDATE SET 
    metric_value = service_analytics.metric_value + p_metric_value,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;