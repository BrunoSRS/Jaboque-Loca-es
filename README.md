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

## Acesso (desenvolvimento)

Na tela de login, escolha o **tipo de usuário** (Administrador, Técnico ou Atendente). Não há senha.

Na primeira vez (ou se o login falhar), crie o banco de demonstração:

```bash
npm run seed
```

**Windows:** se o backend não subir (`better-sqlite3` / Node 32-bit), use:

```bash
npm run dev
```

Isso usa scripts que forçam Node **64-bit** (LTS em https://nodejs.org/ ou o Node do Cursor).

## Credenciais (gestão de usuários / seed)

Usuários demo após `npm run seed`: perfis `admin`, `tecnico` e `atendente`.

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
