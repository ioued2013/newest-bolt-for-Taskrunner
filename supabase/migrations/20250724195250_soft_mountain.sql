/*
  # Marketplace Core Tables

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `icon_url` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
    - `services`
      - `id` (uuid, primary key)
      - `merchant_id` (uuid, references profiles.id)
      - `category_id` (uuid, references categories.id)
      - `title` (text)
      - `description` (text)
      - `price` (decimal)
      - `price_type` (text: 'fixed', 'hourly', 'per_item')
      - `duration_minutes` (integer)
      - `is_active` (boolean)
      - `requires_delivery` (boolean)
      - `service_area` (text)
      - `images` (jsonb array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `service_requests`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references profiles.id)
      - `merchant_id` (uuid, references profiles.id)
      - `service_id` (uuid, references services.id)
      - `status` (text: 'pending', 'accepted', 'in_progress', 'completed', 'cancelled')
      - `description` (text)
      - `scheduled_date` (timestamp)
      - `location` (jsonb)
      - `price_quoted` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `reviews`
      - `id` (uuid, primary key)
      - `service_request_id` (uuid, references service_requests.id)
      - `reviewer_id` (uuid, references profiles.id)
      - `reviewed_id` (uuid, references profiles.id)
      - `rating` (integer, 1-5)
      - `comment` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each user role
    - Merchants can manage their own services
    - Clients can view services and create requests
    - Users can view public service data

  3. Indexes
    - Performance indexes for common queries
    - Category and location-based searches
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  icon_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  price decimal(10,2),
  price_type text DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'hourly', 'per_item')),
  duration_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  requires_delivery boolean DEFAULT false,
  service_area text,
  images jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  merchant_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  description text,
  scheduled_date timestamptz,
  location jsonb,
  price_quoted decimal(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewed_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read, admin write)
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Services policies
CREATE POLICY "Active services are viewable by everyone"
  ON services FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Merchants can manage their own services"
  ON services FOR ALL
  TO authenticated
  USING (merchant_id = auth.uid());

-- Service requests policies
CREATE POLICY "Users can view their own service requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (client_id = auth.uid() OR merchant_id = auth.uid());

CREATE POLICY "Clients can create service requests"
  ON service_requests FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update their own service requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid() OR merchant_id = auth.uid());

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for completed requests"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM service_requests 
      WHERE service_requests.id = service_request_id 
      AND service_requests.status = 'completed'
      AND (service_requests.client_id = auth.uid() OR service_requests.merchant_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS services_merchant_id_idx ON services(merchant_id);
CREATE INDEX IF NOT EXISTS services_category_id_idx ON services(category_id);
CREATE INDEX IF NOT EXISTS services_is_active_idx ON services(is_active);
CREATE INDEX IF NOT EXISTS service_requests_client_id_idx ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS service_requests_merchant_id_idx ON service_requests(merchant_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests(status);
CREATE INDEX IF NOT EXISTS reviews_reviewed_id_idx ON reviews(reviewed_id);

-- Create updated_at trigger for services
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert default categories
INSERT INTO categories (name, description, icon_url) VALUES
  ('Home Services', 'Cleaning, repairs, maintenance', 'https://images.pexels.com/photos/4099468/pexels-photo-4099468.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Food & Delivery', 'Restaurant delivery, grocery shopping', 'https://images.pexels.com/photos/4393021/pexels-photo-4393021.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Transportation', 'Rides, moving services', 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Personal Care', 'Beauty, wellness, fitness', 'https://images.pexels.com/photos/3985163/pexels-photo-3985163.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Professional Services', 'Consulting, tutoring, tech support', 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Handyman', 'Repairs, installations, maintenance', 'https://images.pexels.com/photos/5691659/pexels-photo-5691659.jpeg?auto=compress&cs=tinysrgb&w=100')
ON CONFLICT (name) DO NOTHING;