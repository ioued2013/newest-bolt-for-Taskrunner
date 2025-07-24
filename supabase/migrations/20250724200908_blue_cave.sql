/*
  # Admin Dashboard and Management System

  1. New Tables
    - `admin_actions` - Log all admin actions for audit trail
    - `system_settings` - Platform configuration settings
    - `featured_services` - Manage featured/promoted services
    - `announcements` - Platform-wide announcements
    - `support_tickets` - Customer support system

  2. Security
    - Strict admin-only access policies
    - Audit trail for all admin actions

  3. Features
    - Admin action logging
    - System configuration management
    - Featured content management
    - Support ticket system
*/

-- Admin actions log
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text, -- 'user', 'service', 'review', etc.
  target_id uuid,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Featured services
CREATE TABLE IF NOT EXISTS featured_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  featured_type text DEFAULT 'homepage' CHECK (featured_type IN ('homepage', 'category', 'search')),
  priority integer DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  announcement_type text DEFAULT 'info' CHECK (announcement_type IN ('info', 'warning', 'success', 'error')),
  target_roles text[] DEFAULT ARRAY['client', 'merchant', 'driver'],
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'account', 'service')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Support ticket messages
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_internal boolean DEFAULT false, -- Internal admin notes
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS admin_actions_admin_id_idx ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS admin_actions_action_type_idx ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS featured_services_service_id_idx ON featured_services(service_id);
CREATE INDEX IF NOT EXISTS featured_services_featured_type_idx ON featured_services(featured_type);
CREATE INDEX IF NOT EXISTS featured_services_is_active_idx ON featured_services(is_active);
CREATE INDEX IF NOT EXISTS announcements_target_roles_idx ON announcements USING GIN(target_roles);
CREATE INDEX IF NOT EXISTS announcements_is_active_idx ON announcements(is_active);
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_assigned_to_idx ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_idx ON support_ticket_messages(ticket_id);

-- Enable RLS
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can manage admin actions"
  ON admin_actions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Public settings are viewable by everyone"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins can manage featured services"
  ON featured_services
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Active featured services are viewable by everyone"
  ON featured_services
  FOR SELECT
  TO authenticated
  USING (is_active = true AND start_date <= now() AND (end_date IS NULL OR end_date > now()));

CREATE POLICY "Admins can manage announcements"
  ON announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Active announcements are viewable by target roles"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND start_date <= now() 
    AND (end_date IS NULL OR end_date > now())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() 
      AND profiles.role = ANY(target_roles)
    )
  );

CREATE POLICY "Users can manage their own support tickets"
  ON support_tickets
  FOR ALL
  TO authenticated
  USING (user_id = uid());

CREATE POLICY "Admins can manage all support tickets"
  ON support_tickets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can manage their ticket messages"
  ON support_ticket_messages
  FOR ALL
  TO authenticated
  USING (
    sender_id = uid() OR
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_ticket_messages.ticket_id 
      AND support_tickets.user_id = uid()
    )
  );

CREATE POLICY "Admins can manage all ticket messages"
  ON support_ticket_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id uuid,
  p_action_type text,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_description text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_actions (
    admin_id, action_type, target_type, target_id, description, metadata
  ) VALUES (
    p_admin_id, p_action_type, p_target_type, p_target_id, p_description, p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, is_public) VALUES
  ('platform_fee_percentage', '10', 'Platform fee percentage for transactions', false),
  ('delivery_base_fee', '5.00', 'Base delivery fee in CAD', true),
  ('max_service_images', '5', 'Maximum number of images per service', true),
  ('review_moderation_enabled', 'true', 'Enable review moderation', false),
  ('maintenance_mode', 'false', 'Platform maintenance mode', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Trigger to update support ticket timestamps
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS trigger AS $$
BEGIN
  UPDATE support_tickets 
  SET updated_at = now() 
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_ticket_messages_update_ticket
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();