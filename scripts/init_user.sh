#!/bin/sh
set -e

# =========================================================================
# Inicialização Segura do Usuário da Aplicação (Least Privilege Principle)
# Este script executa durante a inicialização do contêiner PostgreSQL
# e utiliza a senha fornecida dinamicamente via variável de ambiente.
# =========================================================================

APP_USER="${APP_DB_USER:-ast_app_user}"
APP_PASS="${APP_DB_PASSWORD}"
DATABASE="${POSTGRES_DB:-ast_db}"

if [ -z "$APP_PASS" ]; then
  echo "[INIT-DB] ERRO CRÍTICO: APP_DB_PASSWORD não está definida. Abortando criação de usuário."
  exit 1
fi

echo "[INIT-DB] Configurando usuário restrito '$APP_USER' para o banco '$DATABASE'..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DATABASE" <<-EOSQL
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$APP_USER') THEN
        CREATE ROLE $APP_USER WITH LOGIN PASSWORD '$APP_PASS';
      ELSE
        ALTER ROLE $APP_USER WITH PASSWORD '$APP_PASS';
      END IF;
    END
    \$\$;

    -- Garante acesso básico
    GRANT CONNECT ON DATABASE $DATABASE TO $APP_USER;
    GRANT USAGE ON SCHEMA public TO $APP_USER;

    -- Permissões estritas apenas para operações rotineiras (DML restrito)
    GRANT SELECT, INSERT, UPDATE ON TABLE usuarios, equipamentos, leituras_operacao TO $APP_USER;

    -- Permissão para sequências SERIAL
    GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $APP_USER;
EOSQL

echo "[INIT-DB] Usuário '$APP_USER' configurado com sucesso!"
