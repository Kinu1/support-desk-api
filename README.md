# Support Desk API

API backend para uma plataforma de Help Desk / Service Desk, desenvolvida como projeto de portfolio para vagas de Desenvolvedor Backend Junior e Full Stack Junior.

## X - Contexto do projeto

Este projeto simula uma API corporativa para operacao de suporte tecnico. O objetivo e representar um backend com regras de negocio reais para abertura, acompanhamento e gestao de chamados.

O fluxo principal do sistema foi pensado para tres perfis:

- `CUSTOMER`: abre e acompanha os proprios tickets.
- `AGENT`: atende, atualiza e comenta tickets atribuidos.
- `ADMIN`: gerencia usuarios, agentes e acompanha a operacao de forma consolidada.

O projeto foi estruturado para demonstrar fundamentos cobrados com frequencia em vagas junior de backend e full stack:

- autenticacao e autorizacao com JWT
- separacao de responsabilidades por perfil
- modelagem relacional com PostgreSQL
- persistencia com Prisma
- validacao de entrada
- testes automatizados
- ambiente reproduzivel com Docker
- pipeline de CI no GitHub Actions

## Y - O que a API entrega

### Funcionalidades principais

- Autenticacao com JWT.
- Controle de acesso por perfil: `ADMIN`, `AGENT`, `CUSTOMER`.
- Cadastro de cliente e login.
- Gestao de usuarios e agentes.
- Criacao, listagem, consulta e atualizacao de tickets.
- Comentarios publicos e internos.
- Historico automatico de eventos do ticket.
- Dashboard operacional com metricas por status, urgencia e resolucao.

### Endpoints principais

#### Autenticacao

- `POST /api/v1/auth/register-customer`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

#### Usuarios

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users/agents`
- `PATCH /api/v1/users/:id/status`

#### Tickets

- `POST /api/v1/tickets`
- `GET /api/v1/tickets`
- `GET /api/v1/tickets/:id`
- `PATCH /api/v1/tickets/:id`
- `POST /api/v1/tickets/:id/comments`
- `GET /api/v1/tickets/:id/comments`
- `GET /api/v1/tickets/:id/events`

#### Dashboard

- `GET /api/v1/dashboard/summary`

### Stack utilizada

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT
- Docker
- Jest
- Supertest
- GitHub Actions

## Z - Como executar e validar

### Requisitos

- Node.js 24+
- npm 11+
- Docker e Docker Compose

### Variaveis de ambiente

Use `.env.example` como referencia:

```env
NODE_ENV=development
PORT=3000
POSTGRES_USER=support_desk
POSTGRES_PASSWORD=support_desk_password
POSTGRES_DB=support_desk
POSTGRES_PORT=5432
DATABASE_URL="postgresql://support_desk:support_desk_password@localhost:5432/support_desk?schema=public"
JWT_ACCESS_SECRET="change_me_access_secret"
JWT_ACCESS_EXPIRES_IN="15m"
```

### Execucao local

```bash
npm install
docker compose up -d postgres
npm run db:deploy
npm run db:seed
npm run start:dev
```

### Execucao com Docker

```bash
docker compose up --build
```

O container da API aplica as migrations pendentes antes de iniciar.

### URLs principais

- API: `http://localhost:3000`
- Healthcheck: `GET /health`
- Swagger: `GET /api/docs`

### Qualidade e validacao

Scripts disponiveis:

```bash
npm run lint
npm run build
npm test
npm run test:e2e
npm run test:cov
npm audit
```

Cobertura atual:

- Statements: `87.85%`
- Lines: `87.28%`
- Functions: `92.3%`
- Branches: `67.94%`

### CI

O GitHub Actions executa:

- `npm ci`
- `prisma generate`
- `prisma migrate deploy`
- `prisma db seed`
- `npm run lint`
- `npm run build`
- `npm test`
- `npm run test:e2e`
- `npm run test:cov`
- `npm audit --audit-level=moderate`

### Credenciais de seed

Todos os usuarios seed usam a senha:

```text
Password123!
```

Usuarios disponiveis:

```text
admin@supportdesk.test
agent@supportdesk.test
customer@supportdesk.test
```
