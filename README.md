# Bruno Online - Sistema para Barbearia 💈

Sistema web feito para ajudar na gestão de uma barbearia. Com ele é possível controlar clientes, agendamentos, barbeiros, produtos e muito mais, tudo pelo celular ou computador.

## Sobre o projeto

O **Bruno Online** é um sistema completo (PWA) voltado para barbeiros autônomos que precisam de uma forma simples de organizar o dia a dia do negócio. O foco principal é facilitar o controle de atendimentos, comissões dos barbeiros e a venda de produtos pela loja online.

### O que dá pra fazer

- **Dashboard** - Visão geral com faturamento, atendimentos do dia e gráficos
- **Clientes** - Cadastro e histórico completo de cada cliente
- **Barbeiros** - Gerenciamento dos barbeiros e suas comissões
- **Atendimentos** - Registro de serviços realizados com data, horário e valor
- **Produtos** - Cadastro de produtos para venda na loja
- **Loja Online** - Página pública para os clientes verem e comprarem produtos
- **Planos/Assinaturas** - Criação de planos recorrentes para clientes
- **Pedidos** - Controle dos pedidos feitos pela loja
- **WhatsApp** - Integração com WhatsApp para envio de mensagens e lembretes
- **Configurações** - Personalização geral do sistema

## Tecnologias utilizadas

- **React** - Biblioteca para construção da interface
- **TypeScript** - JavaScript com tipagem para menos erros
- **Vite** - Ferramenta de build rápida para desenvolvimento
- **Tailwind CSS** - Framework CSS para estilização
- **shadcn/ui** - Componentes de interface prontos e bonitos
- **React Query** - Gerenciamento de dados vindos da API
- **React Router** - Navegação entre as páginas
- **Zustand** - Gerenciamento de estado global
- **Recharts** - Gráficos do dashboard
- **Lucide React** - Ícones

## Como rodar o projeto

Você precisa ter o **Node.js** instalado na sua máquina.

```bash
# 1. Clone o repositório
git clone <URL_DO_REPO>

# 2. Entre na pasta do projeto
cd WEB

# 3. Instale as dependências
npm install

# 4. Rode o projeto
npm run dev
```

O projeto vai abrir no navegador em `http://localhost:5173`

## Estrutura de pastas

```
src/
├── api/          # Chamadas para a API do backend
├── components/   # Componentes reutilizáveis (botões, cards, inputs...)
├── hooks/        # Hooks customizados (useClients, useProducts, etc.)
├── lib/          # Funções utilitárias
├── pages/        # Páginas da aplicação
│   └── store/    # Páginas da loja pública
├── stores/       # Estado global (Zustand)
└── types/        # Tipagens TypeScript
```

## Observações

- O frontend se conecta a uma API backend separada (pasta `API/`)
- O sistema usa tema escuro por padrão
- É um PWA, então pode ser instalado no celular como um app
