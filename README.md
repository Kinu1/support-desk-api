# support-desk-api

API backend para uma plataforma de Help Desk / Service Desk, criada como projeto de portfolio para vagas de Desenvolvedor Backend Junior e Full Stack Junior.

## Objetivo

Construir uma API REST profissional com autenticacao, permissoes por perfil, gestao de tickets, comentarios, historico de alteracoes, dashboard operacional, testes, Docker e CI/CD.

## Stack planejada

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- Prisma
- Docker Compose
- JWT
- Swagger/OpenAPI
- Jest
- GitHub Actions

## Roadmap

- `0.1`: setup base NestJS, configuracoes, Swagger e healthcheck.
- `0.2`: Docker Compose, PostgreSQL, Prisma, migrations e seed.
- `0.3`: autenticacao JWT e roles.
- `0.4`: usuarios e permissoes.
- `0.5`: tickets com filtros e paginacao.
- `0.6`: comentarios e historico.
- `0.7`: dashboard.
- `0.8`: testes unitarios e e2e.
- `1.0`: Dockerfile, CI, README tecnico e validacao final.

## Estrategia Git

- `main`: versao estavel.
- `feature/project-setup`: setup inicial da API.
- `feature/database-prisma`: banco, Prisma, migrations e seed.
- `feature/auth`: autenticacao e autorizacao.
- `feature/users-roles`: usuarios e permissoes.
- `feature/tickets`: modulo de tickets.
- `feature/comments-history`: comentarios e historico.
- `feature/dashboard`: metricas operacionais.
- `feature/tests`: cobertura de testes.
- `feature/docker-ci-docs`: Docker, CI e documentacao final.

## Status

Repositorio inicial criado. A implementacao da API sera versionada por feature branches.
