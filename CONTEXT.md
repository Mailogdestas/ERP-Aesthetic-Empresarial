# Contexto do Projeto — ERP Barbearia (Monorepo)

Este documento descreve a arquitetura, fluxo de dados, dependências, execução e integrações do projeto ERP Barbearia. Use-o como referência de configuração e entendimento sistêmico.

## Visão Geral

- Monorepo com `backend` (NestJS + Prisma), `frontend` (Next.js + Chakra UI) e `n8n` (integrações via webhook).
- Banco `PostgreSQL` orquestrado por `docker-compose`, com migrações Prisma e `seed` de dados.
- API REST com `Swagger` em `http://localhost:3001/api/docs` e autenticação `JWT` (papéis: `ADMIN`, `GERENTE`, `BARBEIRO`).
- Frontend SPA protegida, layout responsivo e tema custom baseado em `#5D0C95`.
- Integração de notificações/marketing via `n8n` (ex.: WhatsApp por webhook).

## Estrutura de Pastas

```
.
├── backend/        # NestJS, Prisma, módulos de domínio
├── frontend/       # Next.js, Chakra UI, páginas e componentes
├── n8n/            # templates/README de fluxos n8n
├── docker-compose.yml
└── .gitignore
```

## Stack e Dependências

- Backend: `@nestjs/*`, `@prisma/client`, `prisma`, `pg`, `passport-jwt`, `bcryptjs`, `axios`, `dotenv`, `@nestjs/swagger`.
- Frontend: `next@14`, `react@18`, `@chakra-ui/react`, `axios`, `recharts`, `framer-motion`.
- Infra: `postgres:15-alpine`, `n8nio/n8n:1.72.0`, Node 18 (build/run).

## Backend (NestJS)

### Bootstrap (`backend/src/main.ts`)

- Prefixo global: `api`.
- CORS: libera `http://localhost:3000`, `3002`, `3010` (ajuste conforme necessidade).
- Filtros/Interceptors globais: `HttpExceptionFilter`, `LoggingInterceptor`.
- `Swagger` via `setupSwagger(app)` com autenticação Bearer.
- Porta: `PORT` (default `3001`). Log: `Backend running at http://localhost:${port}/api`.

### Módulos (`backend/src/app.module.ts`)

- `AuthModule`: autenticação, JWT (`PassportModule`), `AuthController`/`AuthService`/`JwtStrategy`.
- `UsuarioModule`, `AgendamentoModule`, `ClienteModule`, `BarbeiroModule`, `KpiModule`.
- `PrismaService` como provider compartilhado (conexão resiliente).

### Autenticação e Autorização

- `POST /auth/login`: valida credenciais e emite `JWT` com `sub`, `email`, `role`, `barbeariaId` (expira em `12h`).
- `JwtStrategy`: extrai `Bearer` e injeta `user` no request.
- `RolesGuard` + decorator `@Roles(...)` para restringir endpoints por papel.
- `JwtAuthGuard` protege rotas (ex.: `UsuarioController`).

### Observabilidade e Resiliência

- `LoggingInterceptor`: loga método/URL e tempo de resposta.
- `HttpExceptionFilter`: padroniza respostas e loga erros não tratados.
- Alguns controladores aplicam fallback quando DB está indisponível (retorno simulado/arrays vazios), evitando quebra em dev/demo.

### Endpoints Mapeados (atuais)

- `POST /auth/login` — autenticação JWT.
- `GET /usuarios` — restrito a `ADMIN`/`GERENTE`.
- `POST /usuarios` — restrito a `ADMIN`.
- `POST /agendamentos` — cria agendamento (`PENDENTE`), chama webhook n8n; registra `Notificacao` em caso de erro.
- `GET /agendamentos?barbeariaId&inicio&fim` — lista agendamentos por período.
- `POST /clientes` e `GET /clientes?barbeariaId` — CRUD básico com fallback.
- `POST /barbeiros` e `GET /barbeiros?barbeariaId` — CRUD barbeiros com fallback.
- `GET /kpi/resumo?barbeariaId&inicio&fim` — KPIs (detalhes em `KpiService`).

> Observação: o frontend referencia rotas adicionais (`/estoque`, `/pacotes`, `/planos`, `/vendas`, `/historico`, `/fidelidade`) que podem estar planejadas ou pendentes no backend.

## Banco de Dados (Prisma + PostgreSQL)

- `datasource db` (`postgresql`), `url = env("DATABASE_URL")`.
- `generator client` com `binaryTargets` incluindo `debian-openssl-3.0.x` (compatibilidade container).
- Enum `Role`: `ADMIN`, `GERENTE`, `BARBEIRO`.

### Modelos principais

- `Barbearia`: raiz multi-tenant; relaciona todas as entidades do domínio.
- `Usuario`: `email` único, `senhaHash`, `role`, relação com `Barbearia`; link opcional `Usuario ↔ Barbeiro` (`usuarioId`).
- `Cliente`: dados pessoais, `ativo`, relações com `HistoricoAtendimento`, `Fidelidade`, `Agendamento`.
- `Barbeiro`: `nome`, `telefone?`, `comissaoPadrao`, vinculado a `Barbearia` e `Usuario?`.
- `Produto`/`Fornecedor`: gerenciamento de estoque e fornecedores.
- `Servico`: `nome`, `preco`, `duracaoMin`.
- `Estoque`: 1:1 com `Produto` (`produtoId` único), `quantidade`, `alertaMin`.
- `Pacote`/`Plano`: campos `Json` (itens/benefícios), `ativo`.
- `Agendamento`: vínculos com `Cliente`, `Barbeiro`, `Servico`, `Barbearia`; `inicio`, `fim`, `status`.
- `HistoricoAtendimento`: descrição, valor total, data.
- `Caixa`: saldo agregado por barbearia.
- `Transacao`: `tipo` (`RECEITA`/`DESPESA`), `valor`, `descricao?`, `data`.
- `Comissao`: por barbeiro/agendamento; `percentual`, `valor`, `calculadoEm`.
- `Fidelidade`: 1:1 com `Cliente` (`clienteId` único); `pontos`, `nivel`.
- `Notificacao`: `tipo`, `payload Json`, `enviadoEm`, `status`.

### Migração e Seed

- Migração inicial cria tabelas, índices únicos e FKs com políticas (`RESTRICT`, `SET NULL`).
- `prisma/seed.ts` cria dados de exemplo: `Barbearia`, `Usuario ADMIN`, `Cliente`, `Barbeiro`, `Servico`, um `Agendamento` pendente e duas `Transacao`s.

## Integrações (n8n / WhatsApp)

- `docker-compose` inicia `n8n` com `N8N_HOST`, `N8N_PORT`, `WEBHOOK_URL`/`N8N_WEBHOOK_URL`.
- Template `n8n/templates/whatsapp/agendamento.json`:
  - Webhook `POST /webhook/whatsapp/agendamento`.
  - Nó custom `WhatsApp` envia mensagem “Olá! Seu agendamento está marcado para {{$json.inicio}}.”.
- Backend chama `POST ${N8N_WEBHOOK_URL}webhook/whatsapp/agendamento` ao criar agendamento; em falha, grava `Notificacao` com `status = ERRO`.

## Frontend (Next.js + Chakra UI)

- `_app.tsx`:
  - `ChakraProvider` com `theme` custom.
  - `AuthProvider` (estado do token; `login`/`logout`).
  - `ProtectedRoute` para páginas autenticadas.
  - `AppLayout` com `Topbar` e `Sidebar` responsivos.

- Tema (`src/theme.ts`):
  - Paleta `brand` baseada em `#5D0C95`.
  - Breakpoints estendidos (`3xl`, `4xl`).
  - Defaults de componentes (`Button`, `IconButton`, `Badge`, `Heading`) e `body.bg`.

- Navegação (`components/nav/Sidebar.tsx`):
  - Itens: `Dashboard`, `Agenda`, `Clientes`, `Histórico`, `Barbeiros & Comissões`, `Caixa`, `Pacotes`, `Planos`, `Marketing`, `Vendas`, `Fidelidade`, `Estoque`, `Insights`.

- Autenticação (`lib/auth.tsx`, `components/auth/ProtectedRoute.tsx`):
  - `login`: `POST /auth/login`, salva `accessToken` em `localStorage`.
  - Interceptor `axios`: injeta `Authorization: Bearer <token>`.
  - Redireciona para `/` quando não autenticado.

- Consumo da API (`lib/api.ts`):
  - `baseURL`: `NEXT_PUBLIC_API_URL ? NEXT_PUBLIC_API_URL + '/api' : '/api'`.

- Páginas:
  - `index` (login dev-friendly com valores default).
  - `dashboard` (KPIs, gráficos, placeholders expandidos).
  - `agenda` (listar/criar agendamentos com modal, status, toasts).
  - `clientes` (lista, busca, criação com modal; fallback local se API falha).
  - `barbeiros` (lista/criação com modal; exibe comissão).
  - Outras: `historico`, `vendas`, `estoque`, `pacotes`, `planos`, `fidelidade`, `marketing`, `insights` — estruturadas para consumir endpoints correspondentes.

## Infraestrutura (Docker Compose)

- `db` (`postgres:15-alpine`):
  - Env: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`.
  - Volume: `db_data`.

- `n8n` (`n8nio/n8n:1.72.0`):
  - Env: `N8N_HOST`, `N8N_PORT`, `WEBHOOK_URL`/`N8N_WEBHOOK_URL`.
  - Porta: `5678` (configurável).
  - Volume: `n8n_data`.

- `backend`:
  - Build: `./backend`; depende de `db`.
  - Env: `DATABASE_URL`, `JWT_SECRET`, `N8N_WEBHOOK_URL`, `NODE_ENV`, `PORT`.
  - Porta: `3001` (configurável via `BACKEND_PORT`).
  - Comando: `npx prisma migrate deploy && node dist/src/main.js`.
  - Monta volume do código e usa `working_dir: /app`.

- `frontend`:
  - Build: `./frontend`.
  - Env: `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).
  - Comando: `npm run dev` (porta 3000 exposta no Dockerfile).
  - Monta volume do código para hot-reload.

## Variáveis de Ambiente

### Backend

- `DATABASE_URL`: `postgresql://<user>:<pass>@db:5432/<db>?schema=public`.
- `JWT_SECRET`: segredo do JWT.
- `N8N_WEBHOOK_URL`: ex.: `http://n8n:5678/` (compose) ou `http://localhost:5678/`.
- `PORT`: porta da API (default `3001`).
- `NODE_ENV`: `development`/`production`.

### Frontend

- `NEXT_PUBLIC_API_URL`: base do backend (sem `/api`).

## Execução Local (Docker)

1. Garantir Docker Desktop ativo.
2. `docker-compose up --build -d`
3. Acessos:
   - Backend: `http://localhost:3001/api` e docs `http://localhost:3001/api/docs`.
   - Frontend: `http://localhost:3000/`.
   - n8n: `http://localhost:5678/`.
4. Logs (se necessário):
   - `docker-compose logs -f backend`
   - `docker-compose logs -f frontend`
   - `docker-compose logs -f n8n`

## Execução Local (sem Docker)

- Banco:
  - Subir PostgreSQL local; exportar `DATABASE_URL`.
- Backend:
  - `cd backend && npm i`
  - `npm run prisma:migrate` (ou `npx prisma migrate dev`)
  - `npm run dev`
  - (Opcional) `npm run seed` para dados iniciais.
- Frontend:
  - `cd frontend && npm i`
  - `set NEXT_PUBLIC_API_URL=http://localhost:3001` (Windows) ou `export NEXT_PUBLIC_API_URL=...`
  - `npm run dev`

## Swagger e Desenvolvimento de API

- `http://localhost:3001/api/docs` para testar e documentar endpoints.
- Use `Authorize` com `Bearer <token>` gerado em `POST /auth/login`.

## Segurança e Boas Práticas

- Armazenar `JWT_SECRET` e `DATABASE_URL` em `.env` (ignorado pelo git).
- `RolesGuard` para proteger rotas sensíveis.
- Fallbacks são úteis em dev; para produção, considerar políticas/monitoramento mais robustos.

## Observabilidade e Logs

- `LoggingInterceptor`: tempo de requisição.
- `HttpExceptionFilter`: tratamento de erro padrão e logs em dev.
- Recomendações futuras: `requestId`, logs estruturados (JSON), agregação (ELK/Grafana/Prometheus), Sentry.

## Navegação e UX

- Layout responsivo com `Drawer` no mobile (menu lateral) e `Sidebar` em telas maiores.
- Páginas usam `TableContainer` e `Table size="sm"` para legibilidade.

## Evoluções Planejáveis

- Implementar endpoints faltantes: `estoque`, `pacotes`, `planos`, `vendas`, `historico`, `fidelidade`.
- Cálculo automático de `Comissao` por `Agendamento`/`Historico`.
- Gestão de `Caixa` e `Transacao` com relatórios.
- Templates n8n adicionais (lembretes, confirmações, marketing segmentado).
- Testes unitários/e2e no backend (Jest) e frontend (Playwright/Cypress).
- Observabilidade avançada.
- Autorização refinada (escopos e perfis múltiplos).

## Comandos Úteis

- Backend:
  - `npm run dev` (watch)
  - `npm run build` e `npm start`
  - `npm run prisma:migrate`, `npm run prisma:generate`
  - `npm run seed`
- Frontend:
  - `npm run dev`
  - `npm run build`, `npm run start`
- Compose:
  - `docker-compose up -d`, `docker-compose down -v`
  - `docker-compose logs -f backend`

## Notas de Compatibilidade

- Prisma com `binaryTargets = ["native", "debian-openssl-3.0.x"]` para funcionar dentro do container.
- Build backend copia `@prisma` e `.prisma` do estágio de build para produção, garantindo o Prisma Client disponível.