-- Configuração de Full-Text Search (PostgreSQL)
-- Execute estas instruções no banco de dados usado pelo Prisma (@hekate/database)

-- Copiar configuração pt-br e função de normalização
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS portuguese_config (COPY = portuguese);

CREATE OR REPLACE FUNCTION normalize_search_text(input_text text)
RETURNS text AS $$
BEGIN
    RETURN lower(unaccent(trim(input_text)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Índices de FTS (ajuste os nomes das tabelas/colunas conforme o seu schema)
-- Exemplo para courses e products
CREATE INDEX IF NOT EXISTS idx_courses_fts ON courses USING GIN (
  to_tsvector('portuguese_config', normalize_search_text(title || ' ' || coalesce(description, '')))
);

CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING GIN (
  to_tsvector('portuguese_config', normalize_search_text(name || ' ' || coalesce(description, '')))
);

-- Função unificada de busca (ajuste conforme suas tabelas reais)
CREATE OR REPLACE FUNCTION unified_search(
    search_query text,
    search_type text DEFAULT 'all',
    filters jsonb DEFAULT '{}',
    sort_by text DEFAULT 'relevance',
    limit_count int DEFAULT 20,
    offset_count int DEFAULT 0
)
RETURNS TABLE(
    id text,
    type text,
    title text,
    description text,
    url text,
    rank real,
    metadata jsonb
) AS $$
DECLARE
    query_vector tsquery;
BEGIN
    query_vector := plainto_tsquery('portuguese_config', normalize_search_text(search_query));

    IF search_type IN ('all', 'courses') THEN
        RETURN QUERY
        SELECT 
            c.id::text,
            'course'::text,
            c.title,
            c.description,
            '/courses/' || c.slug,
            ts_rank(
                to_tsvector('portuguese_config', normalize_search_text(c.title || ' ' || coalesce(c.description,''))), 
                query_vector
            ) as rank,
            jsonb_build_object('level', c.level, 'duration', c.duration, 'price', c.price)
        FROM courses c
        WHERE to_tsvector('portuguese_config', normalize_search_text(c.title || ' ' || coalesce(c.description,''))) @@ query_vector
        ORDER BY rank DESC
        LIMIT limit_count OFFSET offset_count;
    END IF;

END;
$$ LANGUAGE plpgsql;

