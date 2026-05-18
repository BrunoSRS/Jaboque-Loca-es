# Jaboque Locações

Sistema de gestão de oficina e locações de máquinas pesadas — React + Express + SQLite.

## Pré-requisitos

- Node.js 20+ (recomendado)
- npm

## Instalação

```bash
npm run install:all
npm run seed
```

## Executar em desenvolvimento

Em dois terminais:

```bash
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
```

Ou com um único comando (após `npm install` na raiz):

```bash
npm install
npm run dev
```

## Credenciais de demonstração

| Login   | Senha      | Perfil  |
|---------|------------|---------|
| admin   | admin123   | admin   |
| tecnico | tecnico123 | tecnico |

## Módulos

- **Dashboard** — KPIs, gráficos de OS e faturamento
- **Clientes e Máquinas** — cadastros
- **Oficina** — Ordens de serviço (wizard 4 passos), serviços e peças
- **Estoque** — compras, fornecedores, alertas
- **Financeiro** — pagamentos por OS
- **Usuários** — gestão (admin)
- **PDF** — geração de documento da OS

- **Produtividade** — quadro Kanban de demandas, ranking de técnicos, atividades do dia e relatório PDF diário

Locadora e Relatórios estão como placeholder para versões futuras.

## Estrutura

```
backend/   API Express + SQLite
frontend/  React + Vite + Tailwind
```

## API

Base: `http://localhost:3001/api`  
Health: `GET /api/health`  
Autenticação: `POST /api/auth/login` → Bearer token nas demais rotas.
