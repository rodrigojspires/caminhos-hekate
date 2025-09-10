-- Migration: Gamification Events System
-- Description: Creates tables for gamification events, competitions, and rewards
-- Date: 2025-01-27

-- Create events table for gamification competitions
CREATE TABLE IF NOT EXISTS gamification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'competition', -- competition, challenge, tournament
    category VARCHAR(100), -- learning, engagement, social, special
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER,
    entry_fee_points INTEGER DEFAULT 0,
    prize_pool_points INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- upcoming, active, completed, cancelled
    rules JSONB, -- flexible rules storage
    metadata JSONB, -- additional event data
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event participants table
CREATE TABLE IF NOT EXISTS gamification_event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES gamification_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_score INTEGER DEFAULT 0,
    current_rank INTEGER,
    participation_data JSONB, -- flexible participation tracking
    status VARCHAR(50) DEFAULT 'active', -- active, completed, disqualified
    UNIQUE(event_id, user_id)
);

-- Create rewards table for gamification system
CREATE TABLE IF NOT EXISTS gamification_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) NOT NULL, -- points, badge, achievement, premium_access, custom
    reward_value JSONB NOT NULL, -- flexible reward data (points amount, badge_id, etc.)
    rarity VARCHAR(50) DEFAULT 'common', -- common, rare, epic, legendary, mythic
    conditions JSONB, -- conditions to earn this reward
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    max_claims INTEGER, -- null for unlimited
    current_claims INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user rewards table to track claimed rewards
CREATE TABLE IF NOT EXISTS gamification_user_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES gamification_rewards(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_from VARCHAR(100), -- event_id, achievement_id, manual, etc.
    status VARCHAR(50) DEFAULT 'claimed', -- claimed, redeemed, expired
    metadata JSONB, -- additional claim data
    UNIQUE(user_id, reward_id, claimed_from)
);

-- Create event rewards junction table
CREATE TABLE IF NOT EXISTS gamification_event_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES gamification_events(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES gamification_rewards(id) ON DELETE CASCADE,
    position_requirement INTEGER, -- 1st place, 2nd place, etc. null for participation reward
    percentage_requirement DECIMAL(5,2), -- top 10%, top 25%, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, reward_id, position_requirement)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gamification_events_status ON gamification_events(status);
CREATE INDEX IF NOT EXISTS idx_gamification_events_dates ON gamification_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_gamification_events_category ON gamification_events(category);

CREATE INDEX IF NOT EXISTS idx_gamification_event_participants_event ON gamification_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_gamification_event_participants_user ON gamification_event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_event_participants_score ON gamification_event_participants(event_id, current_score DESC);

CREATE INDEX IF NOT EXISTS idx_gamification_rewards_type ON gamification_rewards(reward_type);
CREATE INDEX IF NOT EXISTS idx_gamification_rewards_active ON gamification_rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_gamification_rewards_rarity ON gamification_rewards(rarity);

CREATE INDEX IF NOT EXISTS idx_gamification_user_rewards_user ON gamification_user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_user_rewards_reward ON gamification_user_rewards(reward_id);
CREATE INDEX IF NOT EXISTS idx_gamification_user_rewards_claimed ON gamification_user_rewards(claimed_at);

-- Enable Row Level Security
ALTER TABLE gamification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_event_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gamification_events
CREATE POLICY "Events are viewable by everyone" ON gamification_events
    FOR SELECT USING (true);

CREATE POLICY "Events can be created by authenticated users" ON gamification_events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Events can be updated by creator or admin" ON gamification_events
    FOR UPDATE USING (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for gamification_event_participants
CREATE POLICY "Participants can view their own participation" ON gamification_event_participants
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM gamification_events WHERE id = event_id AND status = 'active'
    ));

CREATE POLICY "Users can enroll themselves in events" ON gamification_event_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON gamification_event_participants
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for gamification_rewards
CREATE POLICY "Rewards are viewable by everyone" ON gamification_rewards
    FOR SELECT USING (is_active = true);

CREATE POLICY "Rewards can be managed by admins" ON gamification_rewards
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for gamification_user_rewards
CREATE POLICY "Users can view their own rewards" ON gamification_user_rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can claim rewards" ON gamification_user_rewards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for gamification_event_rewards
CREATE POLICY "Event rewards are viewable by everyone" ON gamification_event_rewards
    FOR SELECT USING (true);

CREATE POLICY "Event rewards can be managed by admins" ON gamification_event_rewards
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON gamification_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON gamification_event_participants TO authenticated;
GRANT SELECT ON gamification_rewards TO authenticated;
GRANT SELECT, INSERT ON gamification_user_rewards TO authenticated;
GRANT SELECT ON gamification_event_rewards TO authenticated;

-- Grant permissions to anon users (read-only for public events)
GRANT SELECT ON gamification_events TO anon;
GRANT SELECT ON gamification_rewards TO anon;
GRANT SELECT ON gamification_event_rewards TO anon;

-- Insert sample data for testing
INSERT INTO gamification_rewards (name, description, reward_type, reward_value, rarity) VALUES
('Pontos de Participação', 'Recompensa por participar de um evento', 'points', '{"amount": 50}', 'common'),
('Badge de Campeão', 'Badge especial para vencedores', 'badge', '{"badge_id": "champion", "name": "Campeão"}', 'epic'),
('Acesso Premium Temporário', '7 dias de acesso premium', 'premium_access', '{"days": 7}', 'rare'),
('Pontos de Vitória', 'Recompensa para o primeiro lugar', 'points', '{"amount": 500}', 'legendary');

INSERT INTO gamification_events (title, description, event_type, category, start_date, end_date, max_participants, prize_pool_points, status) VALUES
('Desafio de Conhecimento Semanal', 'Competição semanal de conhecimento esotérico', 'competition', 'learning', NOW() + INTERVAL '1 day', NOW() + INTERVAL '8 days', 100, 1000, 'upcoming'),
('Maratona de Engajamento', 'Evento de engajamento de 30 dias', 'challenge', 'engagement', NOW() + INTERVAL '2 days', NOW() + INTERVAL '32 days', NULL, 2000, 'upcoming'),
('Torneio dos Mestres', 'Competição exclusiva para usuários avançados', 'tournament', 'special', NOW() + INTERVAL '7 days', NOW() + INTERVAL '14 days', 50, 5000, 'upcoming');

-- Link rewards to events
INSERT INTO gamification_event_rewards (event_id, reward_id, position_requirement) 
SELECT 
    e.id,
    r.id,
    CASE 
        WHEN r.name = 'Pontos de Vitória' THEN 1
        WHEN r.name = 'Badge de Campeão' THEN 1
        WHEN r.name = 'Acesso Premium Temporário' THEN 2
        ELSE NULL
    END
FROM gamification_events e
CROSS JOIN gamification_rewards r
WHERE e.title = 'Desafio de Conhecimento Semanal'
AND r.name IN ('Pontos de Participação', 'Pontos de Vitória', 'Badge de Campeão', 'Acesso Premium Temporário');

-- Create function to update event participant rankings
CREATE OR REPLACE FUNCTION update_event_rankings(event_uuid UUID)
RETURNS void AS $$
BEGIN
    WITH ranked_participants AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY current_score DESC, enrolled_at ASC) as new_rank
        FROM gamification_event_participants 
        WHERE event_id = event_uuid
        AND status = 'active'
    )
    UPDATE gamification_event_participants 
    SET current_rank = ranked_participants.new_rank
    FROM ranked_participants 
    WHERE gamification_event_participants.id = ranked_participants.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically distribute event rewards
CREATE OR REPLACE FUNCTION distribute_event_rewards(event_uuid UUID)
RETURNS void AS $$
DECLARE
    participant_record RECORD;
    reward_record RECORD;
BEGIN
    -- Distribute position-based rewards
    FOR participant_record IN 
        SELECT user_id, current_rank 
        FROM gamification_event_participants 
        WHERE event_id = event_uuid 
        AND status = 'active'
        AND current_rank IS NOT NULL
    LOOP
        FOR reward_record IN
            SELECT r.id as reward_id, er.position_requirement
            FROM gamification_event_rewards er
            JOIN gamification_rewards r ON er.reward_id = r.id
            WHERE er.event_id = event_uuid
            AND er.position_requirement = participant_record.current_rank
            AND r.is_active = true
        LOOP
            INSERT INTO gamification_user_rewards (user_id, reward_id, claimed_from)
            VALUES (participant_record.user_id, reward_record.reward_id, event_uuid::text)
            ON CONFLICT (user_id, reward_id, claimed_from) DO NOTHING;
        END LOOP;
    END LOOP;
    
    -- Distribute participation rewards (position_requirement IS NULL)
    FOR participant_record IN 
        SELECT DISTINCT user_id 
        FROM gamification_event_participants 
        WHERE event_id = event_uuid 
        AND status = 'active'
    LOOP
        FOR reward_record IN
            SELECT r.id as reward_id
            FROM gamification_event_rewards er
            JOIN gamification_rewards r ON er.reward_id = r.id
            WHERE er.event_id = event_uuid
            AND er.position_requirement IS NULL
            AND r.is_active = true
        LOOP
            INSERT INTO gamification_user_rewards (user_id, reward_id, claimed_from)
            VALUES (participant_record.user_id, reward_record.reward_id, event_uuid::text)
            ON CONFLICT (user_id, reward_id, claimed_from) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update rankings when scores change
CREATE OR REPLACE FUNCTION trigger_update_event_rankings()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_event_rankings(NEW.event_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rankings_on_score_change
    AFTER UPDATE OF current_score ON gamification_event_participants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_rankings();

-- Comments for documentation
COMMENT ON TABLE gamification_events IS 'Stores gamification events, competitions, and challenges';
COMMENT ON TABLE gamification_event_participants IS 'Tracks user participation in gamification events';
COMMENT ON TABLE gamification_rewards IS 'Defines available rewards in the gamification system';
COMMENT ON TABLE gamification_user_rewards IS 'Tracks rewards claimed by users';
COMMENT ON TABLE gamification_event_rewards IS 'Links rewards to specific events and positions';