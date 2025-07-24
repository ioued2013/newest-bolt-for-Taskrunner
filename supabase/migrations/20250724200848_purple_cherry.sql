/*
  # Enhanced Reviews and Ratings System

  1. Table Updates
    - Add helpful votes to reviews
    - Add review responses from merchants
    - Add review moderation features
    - Add review media attachments

  2. Security
    - Update RLS policies for enhanced features
    - Add moderation policies for admins

  3. Features
    - Review helpfulness voting
    - Merchant responses to reviews
    - Review media attachments
    - Review moderation and flagging
*/

-- Add columns to existing reviews table
DO $$
BEGIN
  -- Add helpful votes columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'helpful_votes'
  ) THEN
    ALTER TABLE reviews ADD COLUMN helpful_votes integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'total_votes'
  ) THEN
    ALTER TABLE reviews ADD COLUMN total_votes integer DEFAULT 0;
  END IF;

  -- Add media attachments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'images'
  ) THEN
    ALTER TABLE reviews ADD COLUMN images jsonb DEFAULT '[]';
  END IF;

  -- Add moderation fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE reviews ADD COLUMN is_flagged boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'moderation_status'
  ) THEN
    ALTER TABLE reviews ADD COLUMN moderation_status text DEFAULT 'approved' 
    CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'moderated_by'
  ) THEN
    ALTER TABLE reviews ADD COLUMN moderated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'moderated_at'
  ) THEN
    ALTER TABLE reviews ADD COLUMN moderated_at timestamptz;
  END IF;
END $$;

-- Review votes table
CREATE TABLE IF NOT EXISTS review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_helpful boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Review responses table (for merchant replies)
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Review flags table
CREATE TABLE IF NOT EXISTS review_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  flagger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'fake', 'offensive', 'other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, flagger_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS review_votes_review_id_idx ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS review_responses_review_id_idx ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS review_flags_review_id_idx ON review_flags(review_id);
CREATE INDEX IF NOT EXISTS review_flags_status_idx ON review_flags(status);

-- Enable RLS
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can vote on reviews"
  ON review_votes
  FOR ALL
  TO authenticated
  USING (user_id = uid());

CREATE POLICY "Review votes are viewable by everyone"
  ON review_votes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Merchants can respond to their reviews"
  ON review_responses
  FOR ALL
  TO authenticated
  USING (
    merchant_id = uid() OR
    EXISTS (
      SELECT 1 FROM reviews 
      WHERE reviews.id = review_responses.review_id 
      AND reviews.reviewed_id = uid()
    )
  );

CREATE POLICY "Review responses are viewable by everyone"
  ON review_responses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can flag reviews"
  ON review_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (flagger_id = uid());

CREATE POLICY "Users can view their own flags"
  ON review_flags
  FOR SELECT
  TO authenticated
  USING (flagger_id = uid());

-- Admin policies for moderation
CREATE POLICY "Admins can manage review flags"
  ON review_flags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = uid() AND profiles.role = 'admin'
    )
  );

-- Function to update review helpfulness
CREATE OR REPLACE FUNCTION update_review_helpfulness()
RETURNS trigger AS $$
BEGIN
  UPDATE reviews SET
    helpful_votes = (
      SELECT COUNT(*) FROM review_votes 
      WHERE review_id = NEW.review_id AND is_helpful = true
    ),
    total_votes = (
      SELECT COUNT(*) FROM review_votes 
      WHERE review_id = NEW.review_id
    )
  WHERE id = NEW.review_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_votes_update_helpfulness
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpfulness();