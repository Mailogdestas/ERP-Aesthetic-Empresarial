# 📚 Documentação das APIs - ERP Barbearia

Esta documentação lista todas as APIs ativas do sistema organizadas por módulo para facilitar o desenvolvimento do frontend.

## 🔗 Base URL
```
http://localhost:3001/api
```

## 🔐 Autenticação
Todas as rotas (exceto login) requerem Bearer Token no header:
```
Authorization: Bearer <token>
```

---

## 1. 🔐 Autenticação

### POST `/auth/login`
**Descrição:** Realiza login no sistema  
**Roles:** Público  
**Body:**
```json
{
  "email": "admin@barbearia.com",
  "senha": "admin123"
}
```
**Response:**
```json
{
  "accessToken": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "admin@barbearia.com",
    "nome": "Admin",
    "role": "ADMIN"
  }
}
```

---

## 2. 👥 Usuários

### GET `/usuarios`
**Descrição:** Lista todos os usuários  
**Roles:** ADMIN, GERENTE  
**Query Params:** `barbeariaId` (opcional)

### POST `/usuarios`
**Descrição:** Cria novo usuário  
**Roles:** ADMIN, GERENTE  
**Body:**
```json
{
  "email": "usuario@email.com",
  "senha": "senha123",
  "nome": "Nome do Usuário",
  "role": "BARBEIRO|GERENTE|ADMIN",
  "barbeariaId": "uuid"
}
```

### GET `/usuarios/:id`
**Descrição:** Busca usuário por ID  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PUT `/usuarios/:id`
**Descrição:** Atualiza usuário  
**Roles:** ADMIN, GERENTE

### DELETE `/usuarios/:id`
**Descrição:** Remove usuário  
**Roles:** ADMIN

---

## 3. 🏪 Barbearias

### GET `/barbearias`
**Descrição:** Lista todas as barbearias  
**Roles:** ADMIN, GERENTE

### POST `/barbearias`
**Descrição:** Cria nova barbearia  
**Roles:** ADMIN  
**Body:**
```json
{
  "nome": "Nome da Barbearia",
  "endereco": "Endereço completo",
  "telefone": "(11) 99999-9999",
  "email": "contato@barbearia.com"
}
```

### GET `/barbearias/:id`
**Descrição:** Busca barbearia por ID  
**Roles:** ADMIN, GERENTE

### PUT `/barbearias/:id`
**Descrição:** Atualiza barbearia  
**Roles:** ADMIN, GERENTE

---

## 4. ✂️ Barbeiros

### GET `/barbeiros`
**Descrição:** Lista barbeiros  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Query Params:** `barbeariaId` (obrigatório)

### POST `/barbeiros`
**Descrição:** Cria novo barbeiro  
**Roles:** ADMIN, GERENTE  
**Body:**
```json
{
  "nome": "Nome do Barbeiro",
  "contato": "(11) 98888-8888",
  "telefone": "(11) 98888-8888",
  "comissao": 40.0,
  "barbeariaId": "uuid"
}
```

### GET `/barbeiros/:id`
**Descrição:** Busca barbeiro por ID  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PUT `/barbeiros/:id`
**Descrição:** Atualiza barbeiro  
**Roles:** ADMIN, GERENTE

### DELETE `/barbeiros/:id`
**Descrição:** Remove barbeiro  
**Roles:** ADMIN, GERENTE

---

## 5. 🛍️ Serviços

### GET `/servicos/barbearia/:barbeariaId`
**Descrição:** Lista serviços da barbearia  
**Roles:** ADMIN, GERENTE, BARBEIRO

### POST `/servicos`
**Descrição:** Cria novo serviço  
**Roles:** ADMIN, GERENTE  
**Body:**
```json
{
  "nome": "Corte Masculino",
  "descricao": "Corte tradicional masculino",
  "preco": 35.00,
  "duracao": 30,
  "barbeariaId": "uuid"
}
```

### GET `/servicos/:id`
**Descrição:** Busca serviço por ID  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PUT `/servicos/:id`
**Descrição:** Atualiza serviço  
**Roles:** ADMIN, GERENTE

### DELETE `/servicos/:id`
**Descrição:** Remove serviço  
**Roles:** ADMIN, GERENTE

---

## 6. 🛒 Produtos

### GET `/produtos/barbearia/:barbeariaId`
**Descrição:** Lista produtos da barbearia  
**Roles:** ADMIN, GERENTE, BARBEIRO

### POST `/produtos`
**Descrição:** Cria novo produto  
**Roles:** ADMIN, GERENTE  
**Body:**
```json
{
  "nome": "Pomada para Cabelo",
  "descricao": "Pomada fixadora",
  "preco": 25.00,
  "estoque": 50,
  "barbeariaId": "uuid"
}
```

### GET `/produtos/:id`
**Descrição:** Busca produto por ID  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PUT `/produtos/:id`
**Descrição:** Atualiza produto  
**Roles:** ADMIN, GERENTE

### DELETE `/produtos/:id`
**Descrição:** Remove produto  
**Roles:** ADMIN, GERENTE

---

## 7. 👤 Clientes

### GET `/clientes`
**Descrição:** Lista clientes  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Query Params:** `barbeariaId` (obrigatório)

### POST `/clientes`
**Descrição:** Cria novo cliente  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Body:**
```json
{
  "nome": "Nome do Cliente",
  "whatsapp": "11999887766",
  "telefone": "1133334444",
  "email": "cliente@email.com",
  "barbeariaId": "uuid"
}
```

### GET `/clientes/:id`
**Descrição:** Busca cliente por ID  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PUT `/clientes/:id`
**Descrição:** Atualiza cliente  
**Roles:** ADMIN, GERENTE, BARBEIRO

### DELETE `/clientes/:id`
**Descrição:** Remove cliente  
**Roles:** ADMIN, GERENTE

---

## 8. 📅 Agendamentos

### GET `/agendamentos`
**Descrição:** Lista agendamentos  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Query Params:** `barbeariaId` (obrigatório), `data`, `barbeiroId`, `status`

### POST `/agendamentos`
**Descrição:** Cria novo agendamento  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Body:**
```json
{
  "clienteId": "uuid",
  "barbeiroId": "uuid",
  "servicoId": "uuid",
  "barbeariaId": "uuid",
  "dataHora": "2024-12-20T10:00:00.000Z",
  "observacoes": "Observações opcionais"
}
```

### GET `/agendamentos/:id`
**Descrição:** Busca agendamento por ID  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PUT `/agendamentos/:id`
**Descrição:** Atualiza agendamento  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PATCH `/agendamentos/:id/confirmar`
**Descrição:** Confirma agendamento  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PATCH `/agendamentos/:id/cancelar`
**Descrição:** Cancela agendamento  
**Roles:** ADMIN, GERENTE, BARBEIRO

### DELETE `/agendamentos/:id`
**Descrição:** Remove agendamento  
**Roles:** ADMIN, GERENTE

---

## 9. 🛒 Vendas

### GET `/vendas`
**Descrição:** Lista vendas  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Query Params:** `barbeariaId` (obrigatório), `dataInicio`, `dataFim`, `barbeiroId`

### POST `/vendas`
**Descrição:** Cria nova venda  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Body:**
```json
{
  "barbeariaId": "uuid",
  "clienteId": "uuid",
  "barbeiroId": "uuid",
  "itens": [
    {
      "servicoId": "uuid",
      "produtoId": "uuid", // opcional
      "quantidade": 1,
      "precoUnit": 35.00
    }
  ]
}
```

### GET `/vendas/:id`
**Descrição:** Busca venda por ID  
**Roles:** ADMIN, GERENTE, BARBEIRO

### POST `/vendas/:id/pagamentos`
**Descrição:** Adiciona pagamento à venda  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Body:**
```json
{
  "valor": 35.00,
  "metodo": "dinheiro|cartao|pix"
}
```

### GET `/vendas/relatorio/:barbeariaId`
**Descrição:** Relatório de vendas  
**Roles:** ADMIN, GERENTE  
**Query Params:** `dataInicio`, `dataFim`

---

## 10. 💰 Caixa

### GET `/caixa/sessoes`
**Descrição:** Lista sessões de caixa  
**Roles:** ADMIN, GERENTE  
**Query Params:** `barbeariaId` (obrigatório)

### POST `/caixa/sessoes`
**Descrição:** Abre nova sessão de caixa  
**Roles:** ADMIN, GERENTE  
**Body:**
```json
{
  "barbeariaId": "uuid",
  "abertoPorUsuarioId": "uuid",
  "saldoInicial": 100.00
}
```

### PATCH `/caixa/sessoes/:id/fechar`
**Descrição:** Fecha sessão de caixa  
**Roles:** ADMIN, GERENTE

### GET `/caixa/saldo-atual`
**Descrição:** Consulta saldo atual  
**Roles:** ADMIN, GERENTE, BARBEIRO  
**Query Params:** `barbeariaId` (obrigatório)

### POST `/caixa/lancamentos`
**Descrição:** Registra lançamento manual  
**Roles:** ADMIN, GERENTE  
**Body:**
```json
{
  "caixaSessaoId": "uuid",
  "barbeariaId": "uuid",
  "tipo": "ENTRADA|SAIDA",
  "origem": "VENDA|DESPESA|AJUSTE",
  "metodo": "dinheiro|cartao|pix",
  "valor": 50.00,
  "descricao": "Descrição do lançamento"
}
```

### GET `/caixa/lancamentos`
**Descrição:** Lista lançamentos  
**Roles:** ADMIN, GERENTE  
**Query Params:** `barbeariaId`, `caixaSessaoId`, `dataInicio`, `dataFim`

---

## 11. 📦 Pacotes

### GET `/pacotes/barbearia/:barbeariaId`
**Descrição:** Lista pacotes da barbearia  
**Roles:** ADMIN, GERENTE, BARBEIRO

### POST `/pacotes`
**Descrição:** Cria novo pacote  
**Roles:** ADMIN, GERENTE  
**Body:**
```json
{
  "nome": "Pacote Completo",
  "descricao": "Corte + Barba + Sobrancelha",
  "preco": 80.00,
  "barbeariaId": "uuid",
  "servicos": ["servicoId1", "servicoId2"]
}
```

### GET `/pacotes/:id`
**Descrição:** Busca pacote por ID  
**Roles:** ADMIN, GERENTE, BARBEIRO

### PUT `/pacotes/:id`
**Descrição:** Atualiza pacote  
**Roles:** ADMIN, GERENTE

### DELETE `/pacotes/:id`
**Descrição:** Remove pacote  
**Roles:** ADMIN, GERENTE

---

## 12. 🏢 Fornecedores

### GET `/fornecedores`
**Descrição:** Lista fornecedores  
**Roles:** ADMIN, GERENTE  
**Query Params:** `barbeariaId` (obrigatório)

### POST `/fornecedores`
**Descrição:** Cria novo fornecedor  
**Roles:** ADMIN, GERENTE  
**Body:**
```json
{
  "nome": "Fornecedor XYZ",
  "contato": "João Silva",
  "telefone": "(11) 99999-9999",
  "email": "contato@fornecedor.com",
  "endereco": "Rua das Flores, 123",
  "barbeariaId": "uuid"
}
```

### GET `/fornecedores/:id`
**Descrição:** Busca fornecedor por ID  
**Roles:** ADMIN, GERENTE

### PUT `/fornecedores/:id`
**Descrição:** Atualiza fornecedor  
**Roles:** ADMIN, GERENTE

### DELETE `/fornecedores/:id`
**Descrição:** Remove fornecedor  
**Roles:** ADMIN, GERENTE

---

## 13. 💳 Planos

### GET `/planos`
**Descrição:** Lista planos disponíveis  
**Roles:** ADMIN

### POST `/planos`
**Descrição:** Cria novo plano  
**Roles:** ADMIN  
**Body:**
```json
{
  "nome": "Plano Premium",
  "descricao": "Plano com recursos avançados",
  "preco": 99.90,
  "duracao": 30,
  "recursos": ["recurso1", "recurso2"]
}
```

### GET `/planos/:id`
**Descrição:** Busca plano por ID  
**Roles:** ADMIN

### PUT `/planos/:id`
**Descrição:** Atualiza plano  
**Roles:** ADMIN

### DELETE `/planos/:id`
**Descrição:** Remove plano  
**Roles:** ADMIN

---

## 14. 📊 KPIs e Dashboard

### GET `/kpis/dashboard`
**Descrição:** Dados para dashboard principal  
**Roles:** ADMIN, GERENTE  
**Query Params:** `barbeariaId` (obrigatório), `periodo` (opcional)

**Response:**
```json
{
  "vendasHoje": 1250.00,
  "agendamentosHoje": 15,
  "clientesAtivos": 120,
  "faturamentoMes": 35000.00,
  "crescimentoMes": 12.5,
  "servicosMaisVendidos": [...],
  "barbeirosMaisAtivos": [...]
}
```

---

## 🔧 Códigos de Status HTTP

- **200** - Sucesso
- **201** - Criado com sucesso
- **400** - Erro de validação
- **401** - Não autorizado
- **403** - Acesso negado
- **404** - Não encontrado
- **500** - Erro interno do servidor

---

## 🎯 Roles do Sistema

- **ADMIN** - Acesso total ao sistema
- **GERENTE** - Gerenciamento da barbearia
- **BARBEIRO** - Operações básicas (agendamentos, vendas)

---

## 📝 Observações Importantes

1. **Tenant ID**: Todas as operações são isoladas por `barbeariaId`
2. **Paginação**: Endpoints de listagem suportam `page` e `limit`
3. **Filtros**: Muitos endpoints suportam filtros via query params
4. **Validação**: Todos os campos obrigatórios são validados
5. **Logs**: Todas as operações são logadas para auditoria

---

## 🚀 Próximos Passos para o Frontend

1. **Implementar autenticação** com JWT
2. **Criar contexto global** para dados da barbearia
3. **Implementar interceptors** para tratamento de erros
4. **Criar hooks customizados** para cada módulo
5. **Implementar cache** para dados frequentemente acessados

---

*Documentação atualizada em: Dezembro 2024*