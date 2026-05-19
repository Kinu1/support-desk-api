# Support Desk API

API backend para uma plataforma de Help Desk / Service Desk, desenvolvida como projeto de portfolio para vagas de Desenvolvedor Backend Junior e Full Stack Junior.

## Sobre o projeto

O projeto simula uma API corporativa de atendimento de chamados. O fluxo principal permite que clientes abram tickets, agentes acompanhem atendimentos atribuidos a eles e administradores monitorem a operacao.

## Funcionalidades principais

- Autenticacao com JWT.
- Controle de acesso por perfil: `ADMIN`, `AGENT`, `CUSTOMER`.
- Gestao de usuarios e agentes.
- Criacao, listagem, consulta e atualizacao de tickets.
- Comentarios publicos e internos.
- Historico automatico de eventos do ticket.
- Dashboard operacional com metricas por status, urgencia e resolucao.
- PostgreSQL com Prisma Migrate.
- Docker, CI e testes automatizados.

## Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT
- Docker
- Jest
- Supertest
- GitHub Actions

## Como executar

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

### Rodando localmente

```bash
npm install
docker compose up -d postgres
npm run db:deploy
npm run db:seed
npm run start:dev
```

### Rodando com Docker Compose

```bash
docker compose up --build
```

O container da API aplica as migrations pendentes antes de iniciar.

### URLs principais

- API: `http://localhost:3000`
- Healthcheck: `GET /health`
- Swagger: `GET /api/docs`

## Qualidade e validacao

### Scripts disponiveis

```bash
npm run lint
npm run build
npm test
npm run test:e2e
npm run test:cov
npm audit
```

### Cobertura de testes

- Statements: `87.85%`
- Lines: `87.28%`
- Functions: `92.3%`
- Branches: `67.94%`

### CI

O GitHub Actions executa:

- install com `npm ci`
- Prisma generate
- migrations
- seed
- lint
- build
- testes unitarios
- testes e2e
- cobertura
- audit de dependencias

## Credenciais de seed

Todos os usuarios seed usam a senha:

```text
Password123!
```

Usuarios:

```text
admin@supportdesk.test
agent@supportdesk.test
customer@supportdesk.test
```

## Endpoints principais

### Autenticacao

- `POST /api/v1/auth/register-customer`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Usuarios

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users/agents`
- `PATCH /api/v1/users/:id/status`

### Tickets

- `POST /api/v1/tickets`
- `GET /api/v1/tickets`
- `GET /api/v1/tickets/:id`
- `PATCH /api/v1/tickets/:id`
- `POST /api/v1/tickets/:id/comments`
- `GET /api/v1/tickets/:id/comments`
- `GET /api/v1/tickets/:id/events`

### Dashboard

- `GET /api/v1/dashboard/summary`
