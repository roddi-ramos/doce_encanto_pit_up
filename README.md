# Doce Encanto — aplicação web (base inicial)

Projeto acadêmico de loja de cupcakes gourmet. Esta primeira versão contém:
- Catálogo público de produtos;
- Cadastro e login com Supabase Auth;
- Perfil de cliente e perfil administrativo;
- Painel inicial para cadastrar/ativar/desativar produtos;
- Esquema PostgreSQL com políticas RLS.

## 1. Requisitos
- Conta no GitHub;
- Conta/projeto no Supabase;
- Navegador moderno;
- Editor de código (VS Code recomendado).

## 2. Configurar o Supabase
1. Crie um projeto no Supabase.
2. Abra **SQL Editor** e execute `database/schema.sql`.
3. Em **Project Settings > API**, copie a Project URL e a chave `anon`/publishable.
4. Cole os valores em `js/config.js`.
5. Em **Authentication > URL Configuration**, configure a URL local e, depois, a URL do GitHub Pages.
6. Para testes locais, use um servidor estático (por exemplo, Live Server no VS Code).

## 3. Criar o primeiro administrador
1. Cadastre uma conta pela tela `login.html`.
2. No Supabase, abra **Table Editor > profiles** e copie o `id` do usuário.
3. No SQL Editor, execute:
   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'UUID_DO_USUARIO';
   ```
4. Saia e entre novamente na aplicação.

## 4. Publicar no GitHub Pages
1. Envie os arquivos deste projeto para um repositório GitHub.
2. Abra **Settings > Pages**.
3. Em Build and deployment, escolha Deploy from a branch.
4. Selecione a branch principal e a pasta `/ (root)`.
5. Salve e aguarde a publicação.
6. Cadastre a URL publicada também nas URLs permitidas do Supabase Auth.

## 5. Estrutura
```text
cupcake_app/
├── index.html
├── login.html
├── admin.html
├── css/styles.css
├── js/config.js
├── js/supabase-client.js
├── js/auth.js
├── js/login.js
├── js/catalog.js
├── js/admin.js
└── database/schema.sql
```

## 6. Limites desta versão
- Pagamentos ainda não são reais; não há integração com adquirente ou gateway.
- O fluxo de criação de pedidos ainda não foi liberado no frontend. Isso será feito por Edge Function/RPC para validar preço, estoque, cupom e frete no servidor.
- Não armazene dados completos de cartão.
- O frontend é público. Segurança efetiva depende das políticas RLS e das validações no servidor.
- Para senha, o Supabase Auth gerencia o armazenamento seguro; a aplicação não deve criar uma coluna própria de senha.
- Antes de uso real, revisar as políticas, validações, proteção contra abuso e requisitos da LGPD.

## 7. Próxima etapa
Modelar e implementar a criação segura de pedidos, itens, agendamento, cálculo de frete e validação de cupons no backend.
