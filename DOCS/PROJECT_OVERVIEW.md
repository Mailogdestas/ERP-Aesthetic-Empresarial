# ERP Barbearia — Documentação Detalhada do Projeto

Esta documentação cobre a estrutura do monorepo, principais módulos do backend (NestJS + Prisma), páginas e libs do frontend (Next.js + Chakra UI), e integrações auxiliares. Para cada arquivo relevante, descrevemos responsabilidades e funções principais.

## Estrutura Geral

- `backend/`: API REST em NestJS, com ORM Prisma e PostgreSQL.
- `frontend/`: SPA em Next.js com Chakra UI, consumindo a API.
- `n8n/`: templates de automação via webhook (WhatsApp etc.).
- `docker-compose.yml`: orquestra containers (`db`, `backend`, `frontend`, `n8n`).

---

## Backend (NestJS)

### Bootstrap e Configuração

- `src/main.ts`
  - Inicializa NestJS com prefixo global `api`.
  - Habilita CORS para `http://localhost:3000`, `3002`, `3010`.
  - Registra filtro global `HttpExceptionFilter` e `LoggingInterceptor`.
  - `setupSwagger(app)`: configura Swagger com Bearer.
  - Lê porta via `process.env.PORT` (default 3001).

- `src/config/swagger.ts`
  - Função `setupSwagger(app)`: cria documentação Swagger (`/api/docs`) protegida por Bearer.

### Core

- `src/core/prisma/prisma.service.ts`
  - Provider Prisma para acesso ao banco; resiliente e compartilhado.

- `src/core/auth/*`
  - `jwt.guard.ts`: protege rotas com JWT.
  - `roles.guard.ts`: aplica controle por papéis (`ADMIN`, `GERENTE`, `BARBEIRO`).
  - `decorators/roles.decorator.ts`: decorator `@Roles(...)` para restrição em endpoints.
  - `role.enum.ts`: enum de papéis.
  - `jwt.strategy.ts` (implícito): extrai `Bearer` e injeta `user` no request.

### Módulos

- `src/app.module.ts`
  - Registra módulos: `AuthModule`, `UsuarioModule`, `AgendamentoModule`, `ClienteModule`, `BarbeiroModule`, `KpiModule`, `VendaModule`, `CaixaModule`.

#### Usuário

- `modules/usuario/usuario.controller.ts`
  - `GET /usuarios`: restrito; lista usuários.
  - `POST /usuarios`: restrito; cria usuário.

- `modules/usuario/usuario.service.ts`
  - `create(dto)`: cria usuário com hash de senha.
  - `findAll()`: lista usuários.

- `modules/usuario/dto/create-usuario.dto.ts`
  - DTO com validações (`email`, `senha` min 6, `nome`, `role`, `barbeariaId`).

#### Cliente

- `modules/cliente/cliente.controller.ts`
  - `POST /clientes`: cria cliente (fallback quando DB indisponível).
  - `GET /clientes?barbeariaId`: lista por barbearia.

- `modules/cliente/cliente.service.ts`
  - `create(data)`: insere cliente.
  - `findByBarbearia(id)`: busca clientes por barbearia.

#### Barbeiro

- `modules/barbeiro/barbeiro.controller.ts`
  - `POST /barbeiros`: cria barbeiro; retorna forma amigável.
  - `GET /barbeiros?barbeariaId`: lista barbeiros com comissões padrão.

- `modules/barbeiro/barbeiro.service.ts`
  - `create(data)`: insere barbeiro.
  - `findByBarbearia(id)`: busca barbeiros.

#### Agendamento

- `modules/agendamento/agendamento.controller.ts`
  - `POST /agendamentos`: cria agendamento.
  - `GET /agendamentos?barbeariaId&inicio&fim`: lista por período.

- `modules/agendamento/agendamento.service.ts`
  - `create(data)`: cria `Agendamento` com `status='PENDENTE'` e tenta acionar webhook n8n; em erro, salva `Notificacao` com payload.
  - `listByPeriodo(barbeariaId, inicio, fim)`: busca agendamentos.

#### KPI

- `modules/kpi/kpi.controller.ts`
  - `GET /kpi/resumo?barbeariaId&inicio&fim`: resumo de métricas.

- `modules/kpi/kpi.service.ts`
  - `resumo(barbeariaId, inicio, fim)`: calcula contagem de agendamentos concluídos, `faturamentoTotal` e `despesasTotal` via `Transacao`, fluxo de caixa e clientes ativos.

#### Vendas

- `modules/venda/venda.controller.ts`
  - `POST /vendas`: cria venda.
  - `GET /vendas?barbeariaId&inicio&fim`: lista vendas.
  - `GET /vendas/:id`: obtém venda.
  - `POST /vendas/:id/pagamentos`: adiciona pagamento.

- `modules/venda/venda.service.ts`
  - `criarVenda(dto: CreateVendaDto)`: calcula `valorTotal`, cria `Venda` e `ItemVenda` relacionados; fallback amigável se DB indisponível.
  - `listarVendas({barbeariaId, inicio?, fim?})`: retorna vendas com `itens`, `pagamentos`, `cliente`, `barbeiro` (ordenadas por `createdAt`).
  - `obterVenda(id)`: retorna venda com itens e pagamentos.
  - `adicionarPagamento(vendaId, dto: AddPagamentoDto)`: cria `Pagamento` com `status='CONFIRMADO'` e `pagoEm` atual; fallback amigável.

#### Caixa

- `modules/caixa/caixa.controller.ts`
  - `POST /caixa/sessoes`: abre sessão (roles: ADMIN/GERENTE).
  - `PATCH /caixa/sessoes/:id/fechar`: fecha sessão (roles: ADMIN/GERENTE).
  - `GET /caixa/sessoes?barbeariaId`: lista sessões pela barbearia.
  - `POST /caixa/lancamentos`: registra lançamento (roles: ADMIN/GERENTE/BARBEIRO).
  - `GET /caixa/saldo-atual?barbeariaId`: consulta saldo agregado do caixa.

- `modules/caixa/caixa.service.ts`
  - `abrirSessao(dto: OpenSessaoDto)`: cria `CaixaSessao` (`status='ABERTA'`); fallback dev-friendly.
  - `fecharSessao(id)`: atualiza sessão para `FECHADA` com `fechadoEm` atual; fallback dev-friendly.
  - `listarSessoes(barbeariaId)`: lista as últimas sessões (até 100).
  - `registrarLancamento(dto: LancamentoDto)`: cria `LancamentoCaixa` e atualiza/gera `Caixa` agregado via `upsert` incrementando ou decrementando saldo.
  - `saldoAtual(barbeariaId)`: retorna `{ saldo }` do agregado `Caixa` ou zero em fallback.

### Prisma (ORM)

- `prisma/schema.prisma`
  - Enum `Role` e modelos de domínio: `Barbearia`, `Usuario`, `Cliente`, `Barbeiro`, `Produto`, `Fornecedor`, `Servico`, `Estoque`, `Pacote`, `Plano`, `Agendamento`, `HistoricoAtendimento`, `Caixa`, `Transacao`, `Comissao`, `Fidelidade`, `Notificacao`.
  - Modelos de Vendas & Caixa:
    - `Venda`, `ItemVenda`, `Pagamento` com relacionamentos e campos de auditoria.
    - `CaixaSessao`, `LancamentoCaixa` e `Caixa` (saldo agregado por barbearia, `barbeariaId` único).

- `prisma/migrations/*`
  - Migração inicial (estrutura das tabelas, índices únicos e FKs).
sw
- `prisma/seed.ts`
  - Seeds básicos: barbearia, admin, cliente, barbeiro, serviço e transações de receita/despesa para facilitar testes.

### Scripts

## API Endpoints (por arquivo)

Base URL: todas as rotas expostas pelo backend usam o prefixo `/api` configurado em `src/main.ts`. Em desenvolvimento, o servidor roda em `http://localhost:3001/api`.

Autenticação: a maioria dos módulos usa `JwtAuthGuard` e `RolesGuard`. Onde indicado, as rotas exigem `Authorization: Bearer <token>` e determinados perfis (`Role.ADMIN`, `Role.GERENTE`, `Role.BARBEIRO`).

### Core/Auth

- Arquivo: `src/core/auth/auth.controller.ts`
  - POST `/auth/login`
    - Body: `{ email: string, senha: string }`
    - Retorna: credenciais JWT para uso no header `Authorization`.

### Usuários

- Arquivo: `src/modules/usuario/usuario.controller.ts`
  - GET `/usuarios`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Retorna: lista de usuários.
  - POST `/usuarios`
    - Auth: JWT + Roles `[ADMIN]`
    - Body: `CreateUsuarioDto` `{ email, senha, nome, role, barbeariaId }`
    - Cria um usuário.

### Clientes

- Arquivo: `src/modules/cliente/cliente.controller.ts`
  - POST `/clientes`
    - Body: `{ nome: string, whatsapp?: string, telefone?: string, email?: string, barbeariaId: string }`
    - Observação: o backend prioriza `whatsapp` ou `telefone` para o campo `telefone` no banco.
    - Cria um cliente.
  - GET `/clientes?barbeariaId=<id>`
    - Retorna clientes da barbearia.

### Barbeiros

- Arquivo: `src/modules/barbeiro/barbeiro.controller.ts`
  - POST `/barbeiros`
    - Body: `{ nome: string, contato?: string, telefone?: string, comissao?: number, barbeariaId: string }`
    - Cria um barbeiro (mapeia `contato` para `telefone`).
  - GET `/barbeiros?barbeariaId=<id>`
    - Retorna barbeiros da barbearia.

### Produtos

- Arquivo: `src/modules/produto/produto.controller.ts`
  - GET `/produtos?barbeariaId=<id>`
    - Auth: JWT
    - Retorna produtos da barbearia.
  - POST `/produtos`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Body: `{ barbeariaId: string, nome: string, preco?: number, descricao?: string, fornecedorId?: string }`
    - Observação: `descricao` não é persistida no schema atual.
    - Cria um produto.

### Fornecedores

- Arquivo: `src/modules/fornecedor/fornecedor.controller.ts`
  - GET `/fornecedores?barbeariaId=<id>`
    - Auth: JWT
    - Retorna fornecedores da barbearia.
  - POST `/fornecedores`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Body: `{ barbeariaId: string, nome: string, whatsapp?: string, email?: string }`
    - Observação: o campo no banco é `contato` e recebe `whatsapp ?? email`.
    - Cria um fornecedor.

### Estoque

- Arquivo: `src/modules/estoque/estoque.controller.ts`
  - GET `/estoque?barbeariaId=<id>`
    - Auth: JWT
    - Retorna posicionamento de estoque.
  - POST `/estoque/ajustar`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Body: `{ produtoId: string, barbeariaId: string, quantidadeDelta: number }`
    - Ajusta quantidade do estoque.

### Agendamentos

- Arquivo: `src/modules/agendamento/agendamento.controller.ts`
  - POST `/agendamentos`
    - Body: `{ clienteId: string, barbeiroId: string, servicoId: string, barbeariaId: string, inicio: Date, fim: Date }`
    - Cria um agendamento; dispara webhook N8N (se configurado) e loga falha como `Notificacao`.
  - GET `/agendamentos?barbeariaId=<id>&inicio=<ISO>&fim=<ISO>`
    - Retorna agendamentos no intervalo.

### KPI

- Arquivo: `src/modules/kpi/kpi.controller.ts`
  - GET `/kpi/resumo?barbeariaId=<id>&inicio=<ISO>&fim=<ISO>`
    - Retorna resumo de métricas (agendamentos concluídos, faturamento, despesas, fluxo de caixa, clientes ativos).

### Vendas

- Arquivo: `src/modules/venda/venda.controller.ts`
  - POST `/vendas`
    - Auth: JWT + Roles `[ADMIN, GERENTE, BARBEIRO]`
    - Body: `CreateVendaDto`
      - `{ barbeariaId: string, clienteId?: string, barbeiroId?: string, itens: { produtoId?: string, servicoId?: string, quantidade: number, precoUnit: number }[] }`
    - Cria venda com itens.
  - GET `/vendas?barbeariaId=<id>&inicio=<ISO>&fim=<ISO>`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Lista vendas, incluindo itens e pagamentos.
  - GET `/vendas/:id`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Obtém uma venda específica.
  - POST `/vendas/:id/pagamentos`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Body: `AddPagamentoDto` `{ valor: number, metodo: 'dinheiro'|'cartao'|'pix' }`
    - Observação: o serviço normaliza `metodo` para enum `MetodoPagamento` (maiúsculo) e marca `status=PAGO`.

### Caixa

- Arquivo: `src/modules/caixa/caixa.controller.ts`
  - POST `/caixa/sessoes`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Body: `OpenSessaoDto` `{ barbeariaId: string, abertoPorUsuarioId: string, saldoInicial?: number }`
    - Abre sessão de caixa.
  - PATCH `/caixa/sessoes/:id/fechar`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Fecha sessão de caixa.
  - GET `/caixa/sessoes?barbeariaId=<id>`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Lista sessões da barbearia.
  - POST `/caixa/lancamentos`
    - Auth: JWT + Roles `[ADMIN, GERENTE, BARBEIRO]`
    - Body: `LancamentoDto`
      - `{ caixaSessaoId: string, barbeariaId: string, tipo: 'ENTRADA'|'SAIDA', origem?: string, metodo?: 'dinheiro'|'cartao'|'pix', valor: number, descricao?: string }`
    - Registra lançamento vinculado a sessão.
  - GET `/caixa/saldo-atual?barbeariaId=<id>`
    - Auth: JWT + Roles `[ADMIN, GERENTE]`
    - Retorna saldo agregado da barbearia.

## Dicas rápidas para novos devs

- Prefixo global: todas as rotas estão sob `/api`.
- Auth: faça `POST /api/auth/login` e use o token em `Authorization: Bearer <token>` nas rotas protegidas.
- Enums: backend usa enums Prisma em maiúsculo (`MetodoPagamento`, `PagamentoStatus`, `LancamentoTipo`, etc.). Alguns payloads do frontend enviam minúsculo para `metodo` e o backend converte.
- Fallbacks: vários serviços têm fallback dev-friendly quando o DB está indisponível; isso ajuda testes de UI sem banco.

- `scripts/db-test.ts`
  - Utilitários de verificação do banco (se existente).

---

## Frontend (Next.js + Chakra UI)

### Setup

- `src/pages/_app.tsx`
  - Provedor `ChakraProvider` com `theme` custom e `AuthProvider`.
  - `ProtectedRoute` para páginas autenticadas; wrapper de layout com `Topbar` e `Sidebar`.

- `src/theme.ts`
  - Paleta `brand` baseada em `#5D0C95`, breakpoints `3xl`, `4xl`, estilos padrão.

- `src/lib/api.ts`
  - Instância `axios` com `baseURL` em `NEXT_PUBLIC_API_URL` + `/api`.
  - Interceptor que injeta `Authorization: Bearer <token>` do `localStorage`.

- `src/lib/auth.tsx`
  - Contexto de autenticação: `login(email, senha)` contra `POST /auth/login`; salva `accessToken` no `localStorage`.
  - `logout()` remove token.

### Páginas

- `src/pages/index.tsx`
  - Tela de login (dev-friendly) com valores default.

- `src/pages/dashboard/*`
  - KPIs, gráficos, placeholders.

- `src/pages/agenda/*`
  - Listagem e criação de agendamentos com modal, status e toasts.

- `src/pages/clientes/*`
  - CRUD básico com modal; fallback em caso de falha da API.

- `src/pages/barbeiros/*`
  - Listagem/criação com exibição de comissão.

- `src/pages/caixa/index.tsx`
  - Atualizado para consumir `GET /caixa/saldo-atual` e `GET/POST/PATCH` de sessões e lançamentos.
  - Campos: `barbeariaId` editável, saldo atual, status de sessão aberta, ações (`Abrir`/`Fechar` sessão).
  - Modais: abrir sessão (usuário e saldo inicial) e registrar lançamento (tipo, origem, método, valor, descrição).
  - Lista sessões recentes e lançamentos locais (feedback imediato após registro).

- `src/pages/vendas/index.tsx`
  - Atualizado para listar vendas (`GET /vendas`) e criar venda (`POST /vendas`) via modal com itens simples (quantidade e preço unitário).
  - Modal de pagamento: `POST /vendas/:id/pagamentos` com valor e método.
  - Campo `barbeariaId` editável para testes.

### Componentes

- `src/components/*`
  - Layout (`Topbar`, `Sidebar`) com navegação para páginas do ERP.
  - UI (`forms`, `tables`, `modals`, `charts`, etc.) para reutilização.

---

## Documentação e Testes da API

- Swagger: `http://localhost:3001/api/docs` (usar `Authorize` com Bearer token).
- Postman: `backend/docs/postman_collection.json` com variáveis `baseUrl`, `token` e `barbeariaId`.
  - Fluxo sugerido:
    1. Executar "Auth / Login" para obter token (seed: `admin@barber.com` / `admin123`).
    2. Testar Vendas (criar, listar, obter e pagar).
    3. Testar Caixa (abrir/fechar sessão, listar sessões, registrar lançamento, consultar saldo).

---

## Observações e Compatibilidade

- Prisma Client: gere após alterações de schema (`npm run prisma:generate`) e aplique migrações (`npm run prisma:migrate`).
- `CaixaWhereUniqueInput` aceita `barbeariaId` como único; se encontrar lint indicando apenas `id`, regenere Prisma Client.
- CORS e variáveis de ambiente conforme `CONTEXT.md`.

---

## Próximos Passos Recomendados

- Implementar endpoint para listar `LancamentoCaixa` por `caixaSessaoId` no backend.
- Persistir `barbeariaId` e `usuarioId` ao `login` no frontend para evitar campos manuais.
- Completar módulos pendentes: `estoque`, `pacotes`, `planos`, `historico`, `fidelidade`.
- Adicionar testes automáticos (Jest no backend, Playwright/Cypress no frontend).