# 💈 ERP Aesthetic Barber SaaS

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.4.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Sistema Enterprise de Gestão Completa para Barbearias**

*Solução SaaS multi-tenant com arquitetura orientada a eventos*

</div>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Entidades Principais](#-entidades-principais)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Executando o Projeto](#-executando-o-projeto)
- [API Documentation](#-api-documentation)
- [Domínios e Casos de Uso](#-domínios-e-casos-de-uso)
- [Fluxos de Negócio](#-fluxos-de-negócio)
- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Segurança](#-segurança)
- [Monitoramento](#-monitoramento)
- [Troubleshooting](#-troubleshooting)
- [Contribuição](#-contribuição)

---

## 🎯 Visão Geral

O **ERP Aesthetic Barber SaaS** é uma solução enterprise completa para gestão de barbearias, desenvolvida com arquitetura moderna e escalável. O sistema oferece:

### 🚀 Características Principais

- **Multi-tenant**: Suporte a múltiplas barbearias em uma única instância
- **Event-Driven**: Arquitetura orientada a eventos para alta performance
- **RBAC**: Controle de acesso baseado em papéis (Admin, Manager, Barber)
- **Real-time**: Atualizações em tempo real via WebSockets
- **API-First**: RESTful API com documentação Swagger completa
- **Auditoria**: Log completo de todas as operações
- **Idempotência**: Operações financeiras seguras e confiáveis

### 🎯 Funcionalidades Core

- ✅ **CRM Completo**: Gestão de clientes e fidelização
- ✅ **Agendamento Inteligente**: Sistema avançado de horários
- ✅ **Controle de Vendas**: PDV integrado com múltiplas formas de pagamento
- ✅ **Gestão Financeira**: Caixa, despesas e relatórios
- ✅ **Controle de Estoque**: Movimentações automáticas e alertas
- ✅ **Comissionamento**: Cálculo automático de comissões
- ✅ **Relatórios Avançados**: Dashboards e KPIs em tempo real
- ✅ **Automações N8N**: Workflows personalizáveis

---

## 🏗️ Arquitetura do Sistema

### 📐 Visão Arquitetural

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React + TypeScript + Vite]
        UI --> |HTTP/WebSocket| API
    end
    
    subgraph "Backend Layer"
        API[NestJS API Gateway]
        API --> AUTH[Authentication Service]
        API --> DOMAINS[Domain Services]
    end
    
    subgraph "Domain Layer"
        DOMAINS --> CRM[CRM Domain]
        DOMAINS --> AGENDA[Agendamento Domain]
        DOMAINS --> VENDAS[Vendas Domain]
        DOMAINS --> PAGTO[Pagamento Domain]
        DOMAINS --> CAIXA[Caixa Domain]
        DOMAINS --> ESTOQUE[Estoque Domain]
        DOMAINS --> FINANC[Financeiro Domain]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        REDIS[(Redis Cache)]
        FILES[File Storage]
    end
    
    subgraph "External Services"
        N8N[N8N Automations]
        PAYMENT[Payment Gateways]
        NOTIF[Notification Services]
    end
```

### 🔄 Event-Driven Architecture

O sistema utiliza eventos para comunicação entre domínios:

```typescript
// Exemplo de fluxo de eventos
ATENDIMENTO_CONCLUIDO → VENDA_CRIADA → VENDA_PAGA → [
  CAIXA_ATUALIZADO,
  ESTOQUE_BAIXADO,
  PONTOS_FIDELIDADE_ADICIONADOS,
  COMISSAO_CALCULADA
]
```

---

## 🗃️ Entidades Principais

### 👤 **Cliente**
```typescript
interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  dataNascimento?: Date;
  endereco?: string;
  observacoes?: string;
  barbeariaId: string;
  // Relacionamentos
  agendamentos: Agendamento[];
  vendas: Venda[];
  fidelidade?: Fidelidade;
  historicoAtendimentos: HistoricoAtendimento[];
}
```

### 📅 **Agendamento**
```typescript
interface Agendamento {
  id: string;
  dataHora: Date;
  status: AgendamentoStatus; // PENDENTE, CONFIRMADO, EM_ANDAMENTO, CONCLUIDO, CANCELADO
  observacoes?: string;
  clienteId: string;
  barbeiroId: string;
  servicoId: string;
  barbeariaId: string;
  // Campos de auditoria
  createdAt: Date;
  updatedAt: Date;
}
```

### 🛒 **Venda**
```typescript
interface Venda {
  id: string;
  numero: string; // Sequencial por barbearia
  status: VendaStatus; // ABERTA, FINALIZADA, CANCELADA
  subtotal: Decimal;
  desconto: Decimal;
  total: Decimal;
  observacoes?: string;
  // Relacionamentos
  barbeariaId: string;
  clienteId?: string;
  barbeiroId: string;
  agendamentoId?: string;
  itens: ItemVenda[];
  pagamentos: Pagamento[];
}
```

### 💳 **Pagamento**
```typescript
interface Pagamento {
  id: string;
  valor: Decimal;
  metodo: MetodoPagamento; // DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO, PIX
  status: PagamentoStatus; // PENDENTE, APROVADO, REJEITADO
  transacaoId?: string;
  vendaId: string;
  processadoEm?: Date;
}
```

### 💰 **CaixaSessao**
```typescript
interface CaixaSessao {
  id: string;
  dataAbertura: Date;
  dataFechamento?: Date;
  valorAbertura: Decimal;
  valorFechamento?: Decimal;
  status: CaixaStatus; // ABERTO, FECHADO
  barbeariaId: string;
  usuarioAberturaId: string;
  usuarioFechamentoId?: string;
  movimentos: CaixaMovimento[];
}
```

### 📦 **Produto**
```typescript
interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco: Decimal;
  categoria: string;
  codigoBarras?: string;
  ativo: boolean;
  barbeariaId: string;
  // Controle de estoque
  estoque?: Estoque;
  movimentos: EstoqueMovimento[];
}
```

### 💸 **Despesa**
```typescript
interface Despesa {
  id: string;
  descricao: string;
  valor: Decimal;
  tipo: TipoDespesa; // FIXA, VARIAVEL, INVESTIMENTO
  categoria: string;
  vencimento: Date;
  pagoEm?: Date;
  status: PagamentoStatus;
  metodo?: MetodoPagamento;
  barbeariaId: string;
  fornecedorId?: string;
  createdByUsuarioId: string;
}
```

---

## 📋 Pré-requisitos

### 🔧 Obrigatórios

| Tecnologia | Versão Mínima | Download |
|------------|---------------|----------|
| **Node.js** | 18.0.0+ | [nodejs.org](https://nodejs.org/) |
| **npm/yarn** | 8.0.0+ | Incluído com Node.js |
| **PostgreSQL** | 12.0+ | [postgresql.org](https://www.postgresql.org/) |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) |

### 🐳 Opcionais (Docker)

| Tecnologia | Versão | Download |
|------------|--------|----------|
| **Docker** | 20.0+ | [docker.com](https://www.docker.com/) |
| **Docker Compose** | 2.0+ | [docs.docker.com](https://docs.docker.com/compose/) |

### 🔧 Ferramentas de Desenvolvimento

- **VS Code** com extensões: Prisma, TypeScript, ESLint
- **Postman** ou **Insomnia** para testes de API
- **DBeaver** ou **pgAdmin** para gerenciamento do banco

---

## 🚀 Instalação e Configuração

### 📥 1. Clone do Repositório

```bash
git clone https://github.com/seu-usuario/https://github.com/Mailogdestas/erpempresarial.git
cd erp-maciotha-barber-saas
```

### 🔧 2. Configuração do Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

#### 📝 Configuração do `.env`

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/erp_barbearia?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Application
NODE_ENV="development"
PORT=3001
API_PREFIX="api"

# CORS
CORS_ORIGIN="http://localhost:3000"

# File Upload
MAX_FILE_SIZE=5242880  # 5MB
UPLOAD_DEST="./uploads"

# Redis (opcional)
REDIS_URL="redis://localhost:6379"

# N8N Integration
N8N_WEBHOOK_URL="http://localhost:5678/webhook"
N8N_API_KEY="your-n8n-api-key"

# Payment Gateways
STRIPE_SECRET_KEY="sk_test_..."
MERCADOPAGO_ACCESS_TOKEN="TEST-..."

# Notifications
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

#### 🗄️ 3. Configuração do Banco de Dados

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Executar migrações
npm run prisma:migrate

# Popular com dados iniciais
npm run seed
```

### 🎨 4. Configuração do Frontend

```bash
cd ../frontend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
```

#### 📝 Configuração do `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME="ERP Maciotha Barber"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

---

## ▶️ Executando o Projeto

### 🔥 Desenvolvimento Local

#### Backend
```bash
cd backend

# Modo desenvolvimento (hot reload)
npm run dev

# Build para produção
npm run build

# Executar produção
npm start
```

#### Frontend
```bash
cd frontend

# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar produção
npm start
```

### 🐳 Docker (Recomendado para Produção)

```bash
# Construir e executar todos os serviços
docker-compose up --build

# Executar em background
docker-compose up -d --build

# Parar todos os serviços
docker-compose down

# Ver logs
docker-compose logs -f [service-name]
```

### 🌐 URLs de Acesso

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:3000 | Interface principal |
| **Backend API** | http://localhost:3001/api | API REST |
| **Swagger Docs** | http://localhost:3001/api/docs | Documentação interativa |
| **N8N** | http://localhost:5678 | Automações |
| **PostgreSQL** | localhost:5432 | Banco de dados |

---

## 📚 API Documentation

### 🔐 Autenticação

Todas as rotas protegidas requerem JWT Bearer Token:

```bash
Authorization: Bearer <jwt-token>
```

### 👤 Endpoints de Autenticação

```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/profile
```

### 🏢 Endpoints por Domínio

#### 👥 CRM (Clientes)
```http
GET    /api/clientes                    # Listar clientes
POST   /api/clientes                    # Criar cliente
GET    /api/clientes/:id                # Buscar cliente
PATCH  /api/clientes/:id                # Atualizar cliente
DELETE /api/clientes/:id                # Remover cliente
GET    /api/clientes/:id/historico      # Histórico do cliente
```

#### 📅 Agendamentos
```http
GET    /api/agendamentos                # Listar agendamentos
POST   /api/agendamentos                # Criar agendamento
GET    /api/agendamentos/:id            # Buscar agendamento
PATCH  /api/agendamentos/:id            # Atualizar agendamento
PATCH  /api/agendamentos/:id/status     # Alterar status
DELETE /api/agendamentos/:id            # Cancelar agendamento
```

#### 🛒 Vendas
```http
GET    /api/vendas                      # Listar vendas
POST   /api/vendas                      # Criar venda
GET    /api/vendas/:id                  # Buscar venda
PATCH  /api/vendas/:id                  # Atualizar venda
POST   /api/vendas/:id/itens            # Adicionar item
DELETE /api/vendas/:id/itens/:itemId    # Remover item
POST   /api/vendas/:id/finalizar        # Finalizar venda
```

#### 💳 Pagamentos
```http
GET    /api/pagamentos                  # Listar pagamentos
POST   /api/pagamentos                  # Processar pagamento
GET    /api/pagamentos/:id              # Buscar pagamento
PATCH  /api/pagamentos/:id/status       # Atualizar status
```

#### 💰 Caixa
```http
GET    /api/caixa/sessoes               # Listar sessões
POST   /api/caixa/abrir                 # Abrir caixa
POST   /api/caixa/fechar                # Fechar caixa
GET    /api/caixa/movimentos            # Listar movimentos
POST   /api/caixa/movimentos            # Registrar movimento
```

#### 📦 Produtos & Estoque
```http
GET    /api/produtos                    # Listar produtos
POST   /api/produtos                    # Criar produto
GET    /api/produtos/:id                # Buscar produto
PATCH  /api/produtos/:id                # Atualizar produto
GET    /api/estoque                     # Consultar estoque
POST   /api/estoque/movimentos          # Registrar movimento
```

#### 💸 Financeiro
```http
GET    /api/despesas                    # Listar despesas
POST   /api/despesas                    # Criar despesa
PATCH  /api/despesas/:id                # Atualizar despesa
POST   /api/despesas/:id/pagar          # Pagar despesa
GET    /api/relatorios/faturamento      # Relatório de faturamento
GET    /api/relatorios/comissoes        # Relatório de comissões
```

### 📊 Exemplos de Uso da API

#### Criar um Cliente
```bash
curl -X POST http://localhost:3001/api/clientes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "telefone": "(11) 99999-9999",
    "email": "joao@email.com",
    "dataNascimento": "1990-01-15"
  }'
```

#### Criar um Agendamento
```bash
curl -X POST http://localhost:3001/api/agendamentos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "uuid-do-cliente",
    "barbeiroId": "uuid-do-barbeiro",
    "servicoId": "uuid-do-servico",
    "dataHora": "2024-01-15T14:00:00Z",
    "observacoes": "Cliente prefere barba baixa"
  }'
```

---

## 🏛️ Domínios e Casos de Uso

### 🎯 CRM (Customer Relationship Management)

**Responsabilidade**: Gerenciar cadastro e relacionamento com clientes

**Casos de Uso**:
- ✅ Cadastrar/Atualizar Cliente
- ✅ Consultar Histórico de Atendimentos
- ✅ Gerenciar Programa de Fidelidade
- ✅ Campanhas de Marketing

### 📅 AGENDAMENTO

**Responsabilidade**: Agendar horários e gerenciar capacidade

**Casos de Uso**:
- ✅ Criar/Confirmar Agendamento
- ✅ Gerenciar Disponibilidade de Barbeiros
- ✅ Bloqueios de Agenda
- ✅ Reagendamentos e Cancelamentos

### 🛒 VENDAS

**Responsabilidade**: Criar vendas, adicionar itens, calcular totais

**Casos de Uso**:
- ✅ Criar Venda (PDV)
- ✅ Adicionar Produtos/Serviços
- ✅ Aplicar Descontos
- ✅ Finalizar Venda

### 💳 PAGAMENTO

**Responsabilidade**: Registrar pagamentos e validar status

**Casos de Uso**:
- ✅ Processar Pagamento (Múltiplas formas)
- ✅ Validar Transações
- ✅ Estornos e Cancelamentos
- ✅ Integração com Gateways

### 💰 CAIXA

**Responsabilidade**: Registrar movimentos financeiros diários

**Casos de Uso**:
- ✅ Abertura/Fechamento de Caixa
- ✅ Registro de Entradas/Saídas
- ✅ Conferência de Valores
- ✅ Relatórios de Movimento

### 📦 ESTOQUE

**Responsabilidade**: Controlar produtos e movimentações

**Casos de Uso**:
- ✅ Controle de Estoque em Tempo Real
- ✅ Baixa Automática por Vendas
- ✅ Entrada de Mercadorias
- ✅ Alertas de Estoque Baixo

### 💸 FINANCEIRO

**Responsabilidade**: Consolidar valores e gerar relatórios

**Casos de Uso**:
- ✅ Gestão de Despesas
- ✅ Cálculo de Comissões
- ✅ Relatórios Gerenciais
- ✅ Análise de Performance

---

## 🔄 Fluxos de Negócio

### 🎯 Fluxo Completo de Atendimento

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as Agendamento
    participant At as Atendimento
    participant V as Vendas
    participant P as Pagamento
    participant Cx as Caixa
    participant E as Estoque
    participant F as Financeiro

    C->>A: Solicita Agendamento
    A->>A: Verifica Disponibilidade
    A->>C: Confirma Horário
    
    Note over At: No horário agendado
    At->>V: Inicia Atendimento
    V->>V: Cria Venda Automática
    V->>V: Adiciona Serviços/Produtos
    V->>P: Solicita Pagamento
    P->>P: Processa Pagamento
    P->>Cx: Registra Entrada
    P->>E: Baixa Estoque
    P->>F: Calcula Comissão
    
    Note over F: Eventos disparados
    F->>C: Adiciona Pontos Fidelidade
```

### 💰 Fluxo de Gestão de Caixa

```mermaid
graph LR
    A[Abertura do Caixa] --> B[Registrar Vendas]
    B --> C[Registrar Despesas]
    C --> D[Conferir Valores]
    D --> E[Fechamento do Caixa]
    E --> F[Relatório Diário]
    F --> G[Consolidação Financeira]
```

---

## 🛠️ Tecnologias

### 🔧 Backend Stack

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **NestJS** | ^10.0.0 | Framework principal |
| **TypeScript** | ^5.4.0 | Linguagem |
| **Prisma** | ^5.0.0 | ORM |
| **PostgreSQL** | 12+ | Banco de dados |
| **JWT** | ^9.0.2 | Autenticação |
| **Swagger** | ^7.1.1 | Documentação |
| **bcryptjs** | ^2.4.3 | Criptografia |
| **class-validator** | ^0.14.0 | Validação |
| **@nestjs/event-emitter** | ^3.0.1 | Eventos |
| **@nestjs/schedule** | ^6.0.1 | Cron jobs |

### 🎨 Frontend Stack

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **React** | ^18.0.0 | UI Framework |
| **TypeScript** | ^5.4.0 | Linguagem |
| **Vite** | ^5.0.0 | Build tool |
| **Tailwind CSS** | ^3.4.0 | Styling |
| **Axios** | ^1.6.8 | HTTP Client |
| **Zustand** | ^4.5.0 | State management |
| **React Hook Form** | ^7.50.0 | Formulários |
| **Recharts** | ^2.12.0 | Gráficos |

### 🔧 DevOps & Tools

- **Docker** & **Docker Compose**
- **GitHub Actions** (CI/CD)
- **ESLint** & **Prettier**
- **Husky** (Git hooks)
- **Jest** (Testes)
- **N8N** (Automações)

---

## 📁 Estrutura do Projeto

```
erp-maciotha-barber-saas/
├── 📁 backend/                          # API NestJS
│   ├── 📁 src/
│   │   ├── 📁 config/                   # Configurações
│   │   ├── 📁 core/                     # Funcionalidades core
│   │   │   ├── 📁 auth/                 # Autenticação JWT
│   │   │   ├── 📁 guards/               # Guards de segurança
│   │   │   ├── 📁 decorators/           # Decorators customizados
│   │   │   └── 📁 interceptors/         # Interceptors
│   │   ├── 📁 domains/                  # Domínios de negócio
│   │   │   ├── 📁 crm/                  # CRM (Clientes)
│   │   │   │   ├── 📁 controllers/
│   │   │   │   ├── 📁 services/
│   │   │   │   ├── 📁 dto/
│   │   │   │   └── 📄 crm.module.ts
│   │   │   ├── 📁 agendamento/          # Agendamentos
│   │   │   ├── 📁 vendas/               # Vendas e PDV
│   │   │   ├── 📁 pagamentos/           # Pagamentos
│   │   │   ├── 📁 caixa/                # Gestão de caixa
│   │   │   ├── 📁 estoque/              # Controle de estoque
│   │   │   └── 📁 financeiro/           # Relatórios financeiros
│   │   ├── 📁 shared/                   # Utilitários compartilhados
│   │   │   ├── 📁 dto/                  # DTOs base
│   │   │   ├── 📁 services/             # Serviços base
│   │   │   └── 📁 utils/                # Utilitários
│   │   ├── 📄 app.module.ts             # Módulo principal
│   │   └── 📄 main.ts                   # Entry point
│   ├── 📁 prisma/                       # Schema e migrações
│   │   ├── 📁 migrations/               # Migrações do banco
│   │   ├── 📄 schema.prisma             # Schema do banco
│   │   └── 📄 seed.ts                   # Dados iniciais
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   └── 📄 nest-cli.json
├── 📁 frontend/                         # Interface React
│   ├── 📁 src/
│   │   ├── 📁 components/               # Componentes React
│   │   │   ├── 📁 ui/                   # Componentes base
│   │   │   ├── 📁 forms/                # Formulários
│   │   │   ├── 📁 charts/               # Gráficos
│   │   │   └── 📁 layout/               # Layout components
│   │   ├── 📁 pages/                    # Páginas da aplicação
│   │   │   ├── 📁 dashboard/            # Dashboard
│   │   │   ├── 📁 clientes/             # Gestão de clientes
│   │   │   ├── 📁 agendamentos/         # Agendamentos
│   │   │   ├── 📁 vendas/               # PDV e vendas
│   │   │   ├── 📁 caixa/                # Gestão de caixa
│   │   │   ├── 📁 estoque/              # Controle de estoque
│   │   │   └── 📁 relatorios/           # Relatórios
│   │   ├── 📁 lib/                      # Utilitários
│   │   │   ├── 📁 api/                  # Cliente API
│   │   │   ├── 📁 hooks/                # Custom hooks
│   │   │   ├── 📁 stores/               # Zustand stores
│   │   │   └── 📁 utils/                # Utilitários
│   │   └── 📄 theme.ts                  # Configuração do tema
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   └── 📄 vite.config.ts
├── 📁 n8n/                             # Automações
│   ├── 📁 templates/                    # Templates de workflow
│   └── 📄 README.md
├── 📁 docs/                            # Documentação
│   ├── 📄 API_DOCUMENTATION.md
│   ├── 📄 DEPLOYMENT.md
│   └── 📄 CONTRIBUTING.md
├── 📄 docker-compose.yml               # Orquestração Docker
├── 📄 .gitignore
└── 📄 README.md                        # Este arquivo
```

---

## 🔒 Segurança

### 🛡️ Autenticação e Autorização

- **JWT Tokens** com refresh automático
- **RBAC** (Role-Based Access Control)
- **Guards** personalizados por rota
- **Rate Limiting** para APIs
- **CORS** configurado adequadamente

### 🔐 Roles e Permissões

| Role | Permissões |
|------|------------|
| **ADMIN** | Acesso total ao sistema |
| **MANAGER** | Gestão da barbearia, relatórios, configurações |
| **BARBER** | Agendamentos, vendas, atendimentos |

### 🛡️ Segurança de Dados

- **Criptografia** de senhas com bcrypt
- **Soft Delete** para preservar dados
- **Auditoria** completa de operações
- **Validação** rigorosa de inputs
- **Sanitização** de dados

---

## 📊 Monitoramento

### 📈 Métricas e KPIs

- **Performance** da aplicação
- **Uso de recursos** (CPU, memória)
- **Tempo de resposta** das APIs
- **Taxa de erro** por endpoint
- **Métricas de negócio** (vendas, agendamentos)

### 🔍 Logs e Auditoria

```typescript
// Exemplo de log estruturado
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "action": "VENDA_CRIADA",
  "userId": "uuid-usuario",
  "barbeariaId": "uuid-barbearia",
  "metadata": {
    "vendaId": "uuid-venda",
    "valor": 50.00,
    "clienteId": "uuid-cliente"
  }
}
```

---

## 🔧 Troubleshooting

### ❌ Problemas Comuns

#### 🔌 Erro de Conexão com Banco

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql -h localhost -U postgres -d erp_barbearia

# Verificar variáveis de ambiente
echo $DATABASE_URL
```

#### 🚪 Porta já em uso

```bash
# Verificar processos na porta
lsof -i :3001
netstat -tulpn | grep :3001

# Matar processo se necessário
kill -9 <PID>
```

#### 🐳 Problemas com Docker

```bash
# Limpar containers e volumes
docker-compose down -v
docker system prune -a

# Reconstruir imagens
docker-compose build --no-cache
docker-compose up --build
```

#### 🔄 Problemas com Migrações

```bash
# Reset do banco (CUIDADO: apaga dados)
npm run prisma:migrate:reset

# Aplicar migrações pendentes
npm run prisma:migrate:deploy

# Regenerar cliente Prisma
npm run prisma:generate
```

### 📞 Suporte e Debug

#### 🔍 Logs Detalhados

```bash
# Backend logs
cd backend
npm run dev -- --verbose

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### 🧪 Testes de API

```bash
# Testar endpoint de health
curl http://localhost:3001/api/health

# Testar autenticação
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barbearia.com","password":"admin123"}'
```

---

## 🤝 Contribuição

### 📝 Guidelines

1. **Fork** o repositório
2. **Crie** uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** um Pull Request

### 🧪 Testes

```bash
# Executar testes
npm test

# Testes com coverage
npm run test:cov

# Testes e2e
npm run test:e2e
```

### 📋 Checklist de PR

- [ ] Código segue os padrões do projeto
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] Sem breaking changes
- [ ] Performance verificada

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Contato

- **Email**: curasticoplay@gmail.com

---

<div align="center">

**🚀 Desenvolvido com ❤️ para revolucionar a gestão de barbearias**

*ERP Aesthetic SaaS - Sua barbearia, nossa tecnologia*

</div>
