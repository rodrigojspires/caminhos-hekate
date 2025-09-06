-- Migração para tabelas de personalização de UI
-- Criada em: 2024-01-20

-- Tabela de preferências do usuário
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme JSONB DEFAULT '{}',
    layout JSONB DEFAULT '{}',
    accessibility JSONB DEFAULT '{}',
    locale VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de temas customizados
CREATE TABLE custom_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    colors JSONB NOT NULL,
    typography JSONB DEFAULT '{}',
    spacing JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_custom_themes_user_id ON custom_themes(user_id);
CREATE INDEX idx_custom_themes_public ON custom_themes(is_public) WHERE is_public = true;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_themes_updated_at
    BEFORE UPDATE ON custom_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir temas padrão
INSERT INTO custom_themes (user_id, name, colors, typography, spacing, is_public) VALUES
(NULL, 'Tema Claro', '{
    "primary": "#8B5CF6",
    "secondary": "#06B6D4",
    "background": "#FFFFFF",
    "surface": "#F8FAFC",
    "text": "#1E293B",
    "textSecondary": "#64748B",
    "border": "#E2E8F0",
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444"
}', '{
    "fontFamily": "Inter, sans-serif",
    "fontSize": "medium",
    "lineHeight": 1.5
}', '{
    "density": "comfortable",
    "borderRadius": "medium"
}', true),

(NULL, 'Tema Escuro', '{
    "primary": "#A78BFA",
    "secondary": "#22D3EE",
    "background": "#0F172A",
    "surface": "#1E293B",
    "text": "#F1F5F9",
    "textSecondary": "#94A3B8",
    "border": "#334155",
    "success": "#34D399",
    "warning": "#FBBF24",
    "error": "#F87171"
}', '{
    "fontFamily": "Inter, sans-serif",
    "fontSize": "medium",
    "lineHeight": 1.5
}', '{
    "density": "comfortable",
    "borderRadius": "medium"
}', true),

(NULL, 'Alto Contraste', '{
    "primary": "#000000",
    "secondary": "#0066CC",
    "background": "#FFFFFF",
    "surface": "#F5F5F5",
    "text": "#000000",
    "textSecondary": "#333333",
    "border": "#000000",
    "success": "#006600",
    "warning": "#CC6600",
    "error": "#CC0000"
}', '{
    "fontFamily": "Inter, sans-serif",
    "fontSize": "large",
    "lineHeight": 1.6
}', '{
    "density": "spacious",
    "borderRadius": "small"
}', true);

-- Comentários para documentação
COMMENT ON TABLE user_preferences IS 'Armazena as preferências de personalização de cada usuário';
COMMENT ON TABLE custom_themes IS 'Armazena temas customizados criados pelos usuários';
COMMENT ON COLUMN user_preferences.theme IS 'Configurações de tema (cores, tipografia, etc.)';
COMMENT ON COLUMN user_preferences.layout IS 'Configurações de layout (sidebar, header, densidade)';
COMMENT ON COLUMN user_preferences.accessibility IS 'Configurações de acessibilidade (contraste, movimento, etc.)';
COMMENT ON COLUMN custom_themes.colors IS 'Paleta de cores do tema personalizado';
COMMENT ON COLUMN custom_themes.is_public IS 'Se o tema pode ser usado por outros usuários';