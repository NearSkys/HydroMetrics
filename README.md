# ⚡ HydroMetrics O&M

> **Dashboard de Operação & Manutenção com Monitoramento Preditivo para Soluções Ambientais**  
> *Projeto de Portfólio & Prova de Conceito Técnica (PoC)*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Security](https://img.shields.io/badge/Security-OWASP%20Hardened-00ffa3)](https://owasp.org)
[![Tests](https://img.shields.io/badge/Tests-Jest%20%26%20Supertest-C21325?logo=jest&logoColor=white)](https://jestjs.io)

---

## 📌 1. Visão Geral e Propósito

O **HydroMetrics O&M** é uma plataforma fullstack concebida para simular uma central de comando e monitoramento contínuo para equipamentos eletromecânicos críticos (como bombas de captação e recalque, motores de aeração e compressores industriais) em estações de tratamento de efluentes e saneamento.

O sistema traduz telemetria física bruta em inteligência visual e acionável, calculando métricas de eficiência operacional, correlacionando anomalias térmicas e de torque, e antecipando falhas mecânicas antes que ocorram paradas não planejadas.

> [!NOTE]
> ### 💡 Aviso de Portfólio & Prova de Conceito (PoC)
> Este software foi desenvolvido estritamente como **projeto de portfólio profissional e prova de conceito técnica**. 
> O objetivo principal é evidenciar competências práticas de engenharia de software fullstack, modelagem relacional performática, mitigação de vulnerabilidades (OWASP Top 10), conteinerização com Docker e visualização analítica ágil. Os dados operacionais são derivados do dataset público internacional [AI4I 2020 Predictive Maintenance Dataset](https://www.kaggle.com/datasets/stephanmatzka/predictive-maintenance-dataset-ai4i-2020) (Kaggle).

---

## 🏗️ 2. Arquitetura do Sistema

A aplicação é estruturada em 3 camadas desacopladas e conteinerizadas:

```
[ Cliente Web / Navegador ]
         │
         ▼  (HTTP / Fetch com credentials: 'include')
[ API RESTful - Node.js & Express ]
   ├── Middlewares: Helmet (CSP), Rate Limit (Proxy Trust), Cookie Parser
   ├── Autenticação: JWT (HS256) em Cookie HttpOnly + Blacklist de Logout
   └── Driver: pg (PostgreSQL nativo com queries parametrizadas)
         │
         ▼  (TCP / Porta 5432)
[ Banco de Dados - PostgreSQL 15 ]
   ├── Usuário Restrito: ast_app_user (Princípio do Menor Privilégio)
   ├── Tabelas: usuarios, equipamentos, leituras_operacao
   └── Índices Otimizados: Consultas analíticas em <30ms
```

---

## 🛡️ 3. Engenharia de Segurança (OWASP Top 10)

O projeto incorpora medidas defensivas validadas por suíte de testes automatizados:

| Identificador | Classificação OWASP | Mecanismo Implementado |
|---|---|---|
| **VULN-01** | A03 - Injection / XSS | Armazenamento de sessão JWT estritamente em cookies `HttpOnly`, `SameSite=Strict` e `Secure`. |
| **VULN-02** | A01 - Broken Access Control | Mecanismo de invalidação de sessão (*Token Blacklist*) no logout. |
| **VULN-03** | A04 - Insecure Design | Proteção contra força bruta com `express-rate-limit` e suporte a proxy reverso (`trust proxy 1`). |
| **VULN-04** | A07 - Identification & Auth | Mitigação de enumeração de contas via resposta uniforme `202 Accepted` no registro. |
| **VULN-07** | A05 - Security Misconfiguration | Princípio do Menor Privilégio no banco (`ast_app_user` sem permissões de DDL/DROP/DELETE). |
| **VULN-10** | A03 - Injection | Content Security Policy (CSP) rigoroso configurado via `helmet`. |
| **VULN-11** | A03 - Injection (SQLi) | 100% das consultas ao PostgreSQL utilizam queries preparadas e parâmetros numerados (`$1, $2`). |
| **VULN-12** | A07 - Identification & Auth | Autenticação Multifator (MFA/2FA) via TOTP (RFC 6238) com QR Code. Exigência do segundo fator para operações críticas como troca de senha. |

---

## 🚀 4. Como Executar o Projeto

### Pré-requisitos
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados (Recomendado)
- **OU** [Node.js 18+](https://nodejs.org/) e [PostgreSQL 15+](https://www.postgresql.org/) instalados localmente

---

### Opção A: Execução via Docker Compose (Recomendado)

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/hydrometrics-om.git
   cd hydrometrics-om
   ```

2. **Crie o arquivo de variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```

3. **Suba todo o ecossistema (Aplicação + Banco PostgreSQL + Migrações):**
   ```bash
   docker compose up --build
   ```

4. **Acesse as páginas no navegador:**
   - ⚡ **Landing Page & Apresentação:** [http://localhost:3000/landing.html](http://localhost:3000/landing.html)
   - 🔐 **Autenticação / Registro:** [http://localhost:3000/index.html](http://localhost:3000/index.html)
   - 📊 **Dashboard O&M:** [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html)

---

### Opção B: Execução Local com Node.js

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o `.env` com os dados do seu banco PostgreSQL:**
   ```bash
   cp .env.example .env
   ```

3. **Execute o script de seed (Criação de equipamentos e ingestão de 10.000 leituras):**
   ```bash
   npm run seed
   ```

4. **Inicie o servidor:**
   ```bash
   npm start
   ```

---

## 🧪 5. Testes Automatizados

O projeto conta com suítes de testes unitários e de integração de segurança desenvolvidas com **Jest** e **Supertest**:

```bash
# Executa todos os testes
npm test

# Executa apenas os testes de segurança defensiva (SQLi, BOLA, JWT, User Enum)
npm run test:security

# Gera relatório de cobertura de código
npm run test:coverage
```

---

## 📂 6. Estrutura do Repositório

```text
├── data/                    # Dataset de telemetria AI4I 2020 para seed
├── public/                  # Frontend estático da aplicação
│   ├── css/
│   │   ├── style.css        # Design System dark industrial (tokens, layout)
│   │   └── landing.css      # Estilos dedicados da landing page
│   ├── js/
│   │   ├── auth.js          # Lógica de login, registro e controle de abas
│   │   └── dashboard.js     # Renderização de KPIs e gráficos via Chart.js
│   ├── index.html           # Tela de autenticação e registro
│   ├── dashboard.html       # Painel de monitoramento e telemetria
│   └── landing.html         # Landing page de apresentação do projeto
├── scripts/
│   ├── schema.sql           # DDL das tabelas, índices e usuário restrito
│   └── seed_ai4i.js         # Script ETL de ingestão em lote do dataset
├── src/
│   ├── config/
│   │   └── database.js      # Pool de conexões pg
│   ├── controllers/
│   │   ├── authController.js       # Login, registro e logout seguro
│   │   ├── equipamentoController.js # Listagem de ativos
│   │   └── indicadorController.js   # Agregações SQL e cálculo de métricas
│   ├── middlewares/
│   │   └── authMiddleware.js        # Verificação JWT, cookies e blacklist
│   ├── routes/
│   │   └── apiRoutes.js     # Roteamento RESTful com rate limiting
│   └── server.js            # Inicialização do Express, Helmet e CORS
├── .dockerignore
├── .env.example             # Template seguro para variáveis de ambiente
├── .gitignore               # Configurado para ignorar docs internos, segredos e node_modules
├── docker-compose.yml       # Orquestração multicontêiner
├── Dockerfile               # Imagem Alpine da aplicação
├── package.json
└── README.md
```

---

## 📄 7. Licença

Este projeto é disponibilizado sob a licença [ISC](LICENSE). Desenvolvido para fins de estudo, demonstração e composição de portfólio profissional.
