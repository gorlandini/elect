# Um voto pelo Senado

Site de acompanhamento de votos, com painel administrativo separado.

- `index.html` — site público
- `admin.html` — painel de administração (senha)
- `/api` — funções serverless (Vercel) que conversam com o banco
- Banco de dados: **Turso** (compatível com SQLite, gratuito, funciona em produção)

Todo o processo abaixo pode ser feito **sem instalar nada no seu computador** — só navegador.

## Passo 1 — Criar o banco no Turso

1. Crie uma conta grátis em https://turso.tech
2. Crie um banco de dados pelo painel web (botão "Create Database").
3. Copie a **Database URL** (começa com `libsql://`) e gere um **auth token** — ambos aparecem na página do banco.

## Passo 2 — Subir o projeto para o GitHub (pelo navegador)

1. Crie uma conta grátis em https://github.com, se ainda não tiver.
2. Clique em **New repository**, dê um nome (ex: `voto-pelo-senado`) e crie.
3. Na página do repositório vazio, clique em **uploading an existing file**.
4. Arraste todos os arquivos e pastas deste projeto (mantendo a estrutura de pastas `api/`, `lib/`, `scripts/`) para a área de upload.
5. Role até o final e clique em **Commit changes**.

## Passo 3 — Publicar na Vercel

1. Crie uma conta grátis em https://vercel.com — use **"Continue with GitHub"** para conectar direto.
2. Clique em **Add New Project**.
3. Selecione o repositório que você acabou de criar (`voto-pelo-senado`) e clique em **Import**.
4. Antes de clicar em Deploy, abra a seção **Environment Variables** e adicione três:
   - `TURSO_DATABASE_URL` → a URL que você copiou do Turso
   - `TURSO_AUTH_TOKEN` → o token que você gerou no Turso
   - `ADMIN_PASSWORD` → uma senha forte à sua escolha, para o painel admin
5. Clique em **Deploy**.

Em cerca de um minuto, a Vercel te dá uma URL pública (tipo `voto-pelo-senado.vercel.app`).

## Passo 4 — Inicializar o banco (um clique, sem terminal)

1. Acesse `https://SEU-PROJETO.vercel.app/admin.html`
2. Digite a senha que você colocou em `ADMIN_PASSWORD` e clique em **Entrar**.
3. No topo do painel, clique em **Inicializar / verificar banco**.
4. Isso cria as tabelas e insere os estados, candidatos e configurações padrão (incluindo os 523 votos iniciais). É seguro clicar mais de uma vez — não duplica nem apaga dados existentes.

Pronto — o site em `/` já deve mostrar o contador funcionando.

## Como usar o painel admin no dia a dia

Em `/admin.html`, depois de logado, dá para alterar:

- Meta de votos
- Título do site
- Texto de descrição
- Configurações do rate limit (envios por IP, janela de tempo, intervalo mínimo)

As mudanças aparecem no site público na próxima vez que a página for carregada.

## Segurança — pontos importantes

- A senha do admin é comparada diretamente no servidor a cada requisição (não há sessão/token). Isso é simples e funcional para uma campanha pequena, mas **não é uma autenticação robusta** — não reutilize essa senha em outro lugar, e troque-a (na Vercel, em Settings > Environment Variables) se desconfiar de vazamento.
- Se você compartilhou a URL ou o token do Turso em algum lugar (chat, mensagem, etc.), considere gerar um **novo token** no painel do Turso e usar só o novo.
- O rate limit por IP ajuda contra bots simples, mas pessoas atrás do mesmo IP compartilhado (Wi-Fi público, redes corporativas) dividem o mesmo limite, e alguém usando múltiplos proxies pode contornar.
- Adicionar candidatos por estado hoje exige editar `api/admin/seed.js` (ou `scripts/seed.js`) e rodar a inicialização de novo — ele não sobrescreve candidatos já existentes, então para adicionar um novo você precisaria ajustar a lógica. Se quiser isso editável direto pelo painel admin, é só pedir.

## Estrutura de arquivos

```
index.html               site público
admin.html                painel administrativo
api/votes.js              GET (contagem) / POST (registrar voto)
api/candidates.js         GET lista de candidatos
api/settings.js           GET configurações públicas (título, descrição, meta)
api/admin/login.js        valida a senha do admin
api/admin/settings.js     GET/POST configurações completas (autenticado)
api/admin/seed.js         cria tabelas e popula dados iniciais (chamado pelo botão no admin.html)
lib/db.js                 conexão com o Turso
lib/utils.js              blacklist de palavras e helpers
schema.sql                 schema do banco (referência)
scripts/seed.js            alternativa via terminal, caso prefira (opcional, não é mais necessário)
```
