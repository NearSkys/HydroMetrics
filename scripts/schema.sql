-- Criação da tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    totp_secret VARCHAR(64),
    totp_ativo BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Criação da tabela de Equipamentos
CREATE TABLE IF NOT EXISTS equipamentos (
    id SERIAL PRIMARY KEY,
    codigo_patrimonio VARCHAR(50) UNIQUE NOT NULL,
    nome_equipamento VARCHAR(120) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    criticidade VARCHAR(20) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Criação da tabela de Leituras de Operação (Manutenção Preditiva)
CREATE TABLE IF NOT EXISTS leituras_operacao (
    id SERIAL PRIMARY KEY,
    equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
    data_leitura TIMESTAMPTZ NOT NULL,
    eficiencia_percentual NUMERIC(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    temperatura_ar_k NUMERIC(5,2),
    temperatura_processo_k NUMERIC(5,2),
    velocidade_rotacao_rpm INTEGER,
    torque_nm NUMERIC(5,2),
    desgaste_ferramenta_min INTEGER,
    tipo_falha VARCHAR(50),
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Criação de Índices para otimizar agregações no Dashboard (Dashboard O&M)
CREATE INDEX IF NOT EXISTS idx_leituras_data ON leituras_operacao(data_leitura);
CREATE INDEX IF NOT EXISTS idx_leituras_equip_data ON leituras_operacao(equipamento_id, data_leitura);
CREATE INDEX IF NOT EXISTS idx_leituras_status ON leituras_operacao(status);

-- =========================================================================
-- IMPLEMENTAÇÃO DE SEGURANÇA (VULN-07) - Least Privilege Principle
-- =========================================================================
-- A criação do usuário e concessão de privilégios é realizada dinamicamente
-- pelo script de inicialização do Docker (scripts/init_user.sh) utilizando
-- a variável DB_PASSWORD definida exclusivamente no arquivo .env

