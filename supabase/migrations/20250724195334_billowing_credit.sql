/*
  # Delivery System Tables

  1. New Tables
    - `delivery_zones`
      - `id` (uuid, primary key)
      - `name` (text)
      - `coordinates` (jsonb polygon)
      - `base_fee` (decimal)
      - `per_km_rate` (decimal)
      - `is_active` (boolean)
      - `created_at` (timestamp)
    - `deliveries`
      - `id` (uuid, primary key)
      - `service_request_id` (uuid, references service_requests.id)
      - `driver_id` (uuid, references profiles.id)
      - `pickup_location` (jsonb)
      - `delivery_location` (jsonb)
      - `status` (text: 'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')
      - `estimated_delivery_time` (timestamp)
      - `actual_delivery_time` (timestamp)
      - `delivery_fee` (decimal)
      - `distance_km` (decimal)
      - `driver_notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `driver_locations`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, references profiles.id)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `is_available` (boolean)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Drivers can manage their own deliveries and location
    - Clients and merchants can view delivery status
    - Admins have full access

  3. Real-time
    - Enable real-time subscriptions for delivery tracking
    - Driver location updates
*/

-- Create delivery_zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  coordinates jsonb NOT NULL,
  base_fee decimal(8,2) DEFAULT 5.00,
  per_km_rate decimal(8,2) DEFAULT 2.50,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  pickup_location jsonb NOT NULL,
  delivery_location jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  estimated_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  delivery_fee decimal(8,2),
  distance_km decimal(8,2),
  driver_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create driver_locations table for real-time tracking
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  latitude decimal(10,8),
  longitude decimal(11,8),
  is_available boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Delivery zones policies (public read, admin write)
CREATE POLICY "Delivery zones are viewable by everyone"
  ON delivery_zones FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage delivery zones"
  ON delivery_zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Deliveries policies
CREATE POLICY "Users can view related deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM service_requests 
      WHERE service_requests.id = service_request_id 
      AND (service_requests.client_id = auth.uid() OR service_requests.merchant_id = auth.uid())
    )
  );

CREATE POLICY "Drivers can update their assigned deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "System can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Driver locations policies
CREATE POLICY "Drivers can manage their own location"
  ON driver_locations FOR ALL
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Available driver locations are viewable by merchants and admins"
  ON driver_locations FOR SELECT
  TO authenticated
  USING (
    is_available = true OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('merchant', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS deliveries_service_request_id_idx ON deliveries(service_request_id);
CREATE INDEX IF NOT EXISTS deliveries_driver_id_idx ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON deliveries(status);
CREATE INDEX IF NOT EXISTS driver_locations_driver_id_idx ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS driver_locations_is_available_idx ON driver_locations(is_available);

-- Create updated_at triggers
CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER driver_locations_updated_at
  BEFORE UPDATE ON driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert default delivery zone
INSERT INTO delivery_zones (name, coordinates, base_fee, per_km_rate) VALUES
  ('Downtown Core', '{"type":"Polygon","coordinates":[[[-73.6,45.5],[-73.5,45.5],[-73.5,45.6],[-73.6,45.6],[-73.6,45.5]]]}', 5.00, 2.50)
ON CONFLICT DO NOTHING;