# Doce Encanto — Loja de Cupcakes | PIT II

Aplicação web full-stack desenvolvida como parte do **Projeto Integrador Transdisciplinar em Engenharia de Software**.

A Doce Encanto é uma loja virtual de cupcakes gourmet que permite aos clientes consultar produtos, adicionar itens ao carrinho, realizar pedidos e acompanhar suas compras. A aplicação também conta com um painel administrativo para gerenciamento de produtos, estoque e pedidos.

**Aplicação publicada:** https://doceencantopitup.vercel.app/

**Repositório:** https://github.com/roddi-ramos/doce_encanto_pit_up

## Funcionalidades

- Catálogo dinâmico de produtos organizado por categorias.
- Exibição de imagens, descrições, preços e disponibilidade em estoque.
- Carrinho de compras com persistência no `localStorage`.
- Cadastro de clientes e autenticação de usuários.
- Identificação visual do usuário autenticado.
- Checkout com opção de entrega ou retirada no local.
- Consulta automática de endereço por CEP utilizando a API ViaCEP.
- Seleção de formas de pagamento: PIX, cartão de crédito, cartão de débito e dinheiro.
- Cálculo automático de troco para pagamentos em dinheiro.
- Validação de preços e estoque durante a criação dos pedidos.
- Painel administrativo com controle de acesso por perfil.
- Cadastro, listagem e ativação ou desativação de produtos.
- Gerenciamento de pedidos e atualização dos status de pedido e pagamento.
- Filtros, contador e paginação na listagem de pedidos administrativos.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front-end | HTML5, CSS3 e JavaScript |
| Interface | Bootstrap 5.3 |
| Back-end / BaaS | Supabase |
| Banco de dados | PostgreSQL |
| Autenticação | Supabase Auth |
| Segurança de dados | Row Level Security (RLS) |
| Operações de pedidos | PostgreSQL Functions / RPC |
| Integração externa | API ViaCEP |
| Hospedagem | Vercel |
| Controle de versão | Git e GitHub |

## Estrutura do projeto

```text
doce_encanto_pit_up/
│
├── css/
│   └── styles.css
│
├── database/
│   └── schema.sql
│
├── js/
│   ├── config.js
│   ├── supabase-client.js
│   ├── auth.js
│   ├── login.js
│   ├── catalog.js
│   ├── cart.js
│   ├── carrinho.js
│   └── admin.js
│
├── index.html
├── login.html
├── carrinho.html
├── admin.html
│
└── README.md
```

## Pré-requisitos

- Conta no GitHub.
- Projeto criado no Supabase.
- Navegador atualizado.
- Editor de código, preferencialmente Visual Studio Code.
- Extensão Live Server para execução local (ou outro servidor HTTP estático).

Não é necessário instalar Node.js, Java ou Maven para executar esta aplicação.

## 1. Configuração do banco de dados

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Acesse o SQL Editor do projeto.
3. Abra o arquivo `database/schema.sql` deste repositório.
4. Copie e execute o conteúdo no SQL Editor.

O script configura as estruturas necessárias para o funcionamento da aplicação, incluindo:

- Perfis de usuários e níveis de acesso.
- Categorias e produtos.
- Pedidos e itens dos pedidos.
- Índices para consultas.
- Políticas de segurança RLS.
- Função `create_order` para processamento dos pedidos.

O banco de dados utiliza PostgreSQL e é hospedado diretamente pelo Supabase.

## 2. Configuração da aplicação

No painel do Supabase:

1. Acesse as configurações do projeto.
2. Localize as informações de API.
3. Copie a Project URL e a chave pública `anon` ou publishable, conforme disponibilizada pelo projeto.

Abra o arquivo:

```text
js/config.js
```

Configure os valores correspondentes:

```javascript
const SUPABASE_URL = "SUA_PROJECT_URL";
const SUPABASE_ANON_KEY = "SUA_CHAVE_PUBLICA";
```

Utilize os nomes das variáveis já existentes no arquivo original, caso sejam diferentes.

**Importante:** nunca disponibilize a chave `service_role` no código do front-end ou em repositórios públicos.

## 3. Executar localmente

Após configurar o Supabase:

1. Abra a pasta do projeto no Visual Studio Code.
2. Instale e utilize a extensão Live Server.
3. Clique com o botão direito no arquivo `index.html`.
4. Selecione a opção **Open with Live Server**.

A aplicação será aberta no navegador por meio de um servidor HTTP local.

Também é necessário configurar a URL local nas opções de autenticação do Supabase, em Authentication > URL Configuration, incluindo os endereços de redirecionamento utilizados durante os testes.

## 4. Configuração do acesso administrativo

A aplicação utiliza perfis de acesso para diferenciar clientes e administradores.

- **Cliente:** pode consultar o catálogo, realizar pedidos e utilizar as funcionalidades disponíveis para sua conta.
- **Administrador:** possui acesso ao painel administrativo, podendo gerenciar produtos, estoque e pedidos.

Para configurar o primeiro administrador:

1. Cadastre uma conta pela página `login.html`.
2. Localize o perfil correspondente na tabela `profiles` do Supabase.
3. O responsável pelo projeto deve conceder o perfil administrativo por meio do SQL Editor, respeitando a proteção de alteração de permissões configurada no banco.

O cadastro público não concede automaticamente privilégios administrativos.

## 5. Publicação

A aplicação está hospedada na plataforma Vercel.

Para realizar uma nova publicação:

1. Acesse [Vercel](https://vercel.com/).
2. Importe o repositório do GitHub.
3. Configure a pasta raiz do projeto.
4. Utilize a configuração de aplicação estática, sem comando de build.
5. Aguarde a conclusão da implantação.

Após a publicação, configure o domínio gerado pela Vercel nas URLs permitidas do Supabase Auth.

A cada atualização enviada à branch principal do GitHub, a Vercel pode realizar uma nova implantação automática, conforme as configurações do projeto.

## 6. Segurança e processamento de pedidos

O projeto utiliza políticas de Row Level Security (RLS) para controlar o acesso aos registros do banco de dados.

A função PostgreSQL `create_order` é responsável pelo processamento dos pedidos, realizando verificações como:

- Existência de usuário autenticado.
- Validade dos dados enviados.
- Disponibilidade dos produtos.
- Quantidade disponível em estoque.
- Conferência dos preços diretamente no banco de dados.
- Registro do pedido e de seus respectivos itens.
- Atualização do estoque após a criação do pedido.

Essas operações evitam que os valores enviados pelo navegador sejam considerados como fonte confiável para a definição dos preços.

**Observação sobre pagamentos:** as formas de pagamento disponíveis são utilizadas para fins de demonstração acadêmica. O projeto não possui integração com gateways ou adquirentes de pagamento, portanto não realiza cobranças financeiras reais.

## 7. Melhorias implementadas após os testes de usabilidade

Após a disponibilização da aplicação, foram realizados testes com cinco participantes, que avaliaram as funcionalidades e apresentaram sugestões de aprimoramento.

Com base nos apontamentos, foram implementadas as seguintes melhorias:

1. **Preenchimento automático por CEP:** integração com a API ViaCEP para facilitar o cadastro do endereço de entrega.
2. **Identificação do usuário:** exibição de saudação personalizada após a autenticação.
3. **Confirmação ao adicionar produtos:** retorno visual no catálogo após a inclusão de itens no carrinho.
4. **Cálculo de troco:** campo para informar o valor entregue em dinheiro e cálculo automático do troco.
5. **Organização administrativa:** implementação de filtros, contador de pedidos, paginação e identificação visual alternada dos registros.

As alterações foram documentadas no Laudo de Qualidade e registradas no histórico de commits do repositório.

## 8. Fluxo sugerido para demonstração

1. Acesse a loja e navegue pelo catálogo de cupcakes.
2. Selecione um produto e adicione-o ao carrinho.
3. Realize o cadastro de um cliente ou entre com uma conta existente.
4. Acesse o carrinho e confira os produtos selecionados.
5. Escolha entre entrega e retirada.
6. Informe o endereço de entrega e demonstre a consulta automática por CEP.
7. Selecione uma forma de pagamento e, se optar por dinheiro, informe o valor entregue.
8. Finalize o pedido.
9. Acesse o painel administrativo e demonstre o gerenciamento de pedidos e produtos.

## Considerações finais

A Doce Encanto foi desenvolvida com o objetivo de aplicar conceitos de Engenharia de Software no desenvolvimento de uma aplicação web funcional, integrando interface, autenticação, banco de dados, regras de negócio e gerenciamento administrativo.

O projeto também passou por uma etapa de avaliação de usabilidade, permitindo identificar oportunidades de melhoria e evoluir a aplicação a partir das sugestões dos participantes.

**Projeto acadêmico — Projeto Integrador Transdisciplinar em Engenharia de Software.**