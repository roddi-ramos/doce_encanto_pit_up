
const cartItems = document.getElementById("cart-items");
const cartSummary = document.getElementById("cart-summary");
const checkoutSection = document.getElementById("checkout-section");

const money = value =>
  Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

// ============================================
// 1. CARREGAR CARRINHO
// ============================================

async function loadCart() {
  const cart = window.Cart.get();

  if (!cart.length) {
    cartItems.innerHTML =
      '<div class="alert alert-light">Seu carrinho está vazio.</div>';

    cartSummary.innerHTML = "";
    checkoutSection.innerHTML = "";

    window.Cart.updateCount();
    return;
  }

  if (!window.db) {
    cartItems.innerHTML =
      '<div class="alert alert-danger">Não foi possível conectar ao Supabase.</div>';
    return;
  }

  const ids = cart.map(item => item.id);

  const { data, error } = await window.db
    .from("products")
    .select("id,name,price,image_url,stock_quantity")
    .in("id", ids)
    .eq("is_active", true)
    .gt("stock_quantity", 0);

  if (error) {
    cartItems.innerHTML =
      `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    return;
  }

  const products = data || [];
  const availableIds = new Set(products.map(p => p.id));

  const validCart = cart
    .filter(item => availableIds.has(item.id))
    .map(item => {
      const product = products.find(p => p.id === item.id);

      const quantity = Math.min(
        Math.max(1, Math.floor(Number(item.quantity) || 1)),
        Number(product.stock_quantity)
      );

      return {
        id: item.id,
        quantity
      };
    });

  window.Cart.save(validCart);

  if (!validCart.length) {
    cartItems.innerHTML =
      '<div class="alert alert-light">Os produtos do carrinho não estão mais disponíveis.</div>';

    cartSummary.innerHTML = "";
    checkoutSection.innerHTML = "";
    return;
  }

  let total = 0;

  cartItems.innerHTML = validCart.map(item => {
    const product = products.find(p => p.id === item.id);

    const quantity = item.quantity;
    const stock = Number(product.stock_quantity);

    const subtotal = Number(product.price) * quantity;
    total += subtotal;

    return `
      <div class="card mb-3">
        <div class="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">

          <div>
            <h5 class="fw-bold mb-1">
              ${escapeHtml(product.name)}
            </h5>

            <small class="text-secondary">
              ${money(product.price)} por unidade
            </small>
          </div>

          <div class="d-flex align-items-center gap-2">

            <button
              class="btn btn-outline-secondary btn-sm"
              data-action="decrease"
              data-id="${escapeHtml(product.id)}"
              data-stock="${stock}">
              −
            </button>

            <strong>${quantity}</strong>

            <button
              class="btn btn-outline-secondary btn-sm"
              data-action="increase"
              data-id="${escapeHtml(product.id)}"
              data-stock="${stock}"
              ${quantity >= stock ? "disabled" : ""}>
              +
            </button>

          </div>

          <div class="fw-bold">
            ${money(subtotal)}
          </div>

          <button
            class="btn btn-outline-danger btn-sm"
            data-action="remove"
            data-id="${escapeHtml(product.id)}">
            Remover
          </button>

        </div>
      </div>
    `;
  }).join("");

  cartSummary.innerHTML = `
    <div class="card">
      <div class="card-body d-flex justify-content-between align-items-center">
        <h4 class="mb-0">Total</h4>
        <h4 class="mb-0 fw-bold">${money(total)}</h4>
      </div>
    </div>
  `;

  renderCheckout();
}


// ============================================
// 2. FORMULARIO DE FINALIZACAO
// ============================================


function renderCheckout() {
  checkoutSection.innerHTML = `
    <div class="card">
      <div class="card-body">

        <h3 class="h4 fw-bold mb-3">
          Finalizar pedido
        </h3>

        <form id="checkout-form">

          <div class="mb-3">
            <label for="fulfillment-type" class="form-label">
              Como deseja receber?
            </label>

            <select class="form-select" id="fulfillment-type" required>
              <option value="pickup">Retirar no local</option>
              <option value="delivery">Receber por entrega</option>
            </select>
          </div>

          <div class="mb-3 d-none" id="delivery-address-wrapper">

            <h5 class="fw-bold mb-3">Endereço de entrega</h5>

            <div class="row">
              <div class="col-md-5 mb-3">
                <label for="delivery-cep" class="form-label">CEP</label>

                <input
                  type="text"
                  class="form-control"
                  id="delivery-cep"
                  placeholder="00000-000"
                  maxlength="9"
                  inputmode="numeric">
              </div>

              <div class="col-md-3 mb-3 d-flex align-items-end">
                <button
                  type="button"
                  class="btn btn-outline-primary w-100"
                  id="search-cep">
                  Consultar CEP
                </button>
              </div>
            </div>

            <div class="mb-3">
              <label for="delivery-street" class="form-label">Rua</label>
              <input
                type="text"
                class="form-control"
                id="delivery-street"
                placeholder="Rua ou avenida">
            </div>

            <div class="row">
              <div class="col-md-4 mb-3">
                <label for="delivery-number" class="form-label">Número</label>
                <input
                  type="text"
                  class="form-control"
                  id="delivery-number"
                  placeholder="Número">
              </div>

              <div class="col-md-8 mb-3">
                <label for="delivery-neighborhood" class="form-label">Bairro</label>
                <input
                  type="text"
                  class="form-control"
                  id="delivery-neighborhood"
                  placeholder="Bairro">
              </div>
            </div>

            <div class="row">
              <div class="col-md-8 mb-3">
                <label for="delivery-city" class="form-label">Cidade</label>
                <input
                  type="text"
                  class="form-control"
                  id="delivery-city"
                  placeholder="Cidade">
              </div>

              <div class="col-md-4 mb-3">
                <label for="delivery-state" class="form-label">Estado</label>
                <input
                  type="text"
                  class="form-control"
                  id="delivery-state"
                  placeholder="UF"
                  maxlength="2">
              </div>
            </div>

            <div class="mb-3">
              <label for="delivery-complement" class="form-label">
                Complemento (opcional)
              </label>

              <input
                type="text"
                class="form-control"
                id="delivery-complement"
                placeholder="Apartamento, bloco, referência...">
            </div>

            <div id="cep-message" class="mb-3"></div>

          </div>

          <div class="mb-3">
            <label for="payment-method" class="form-label">
              Forma de pagamento
            </label>

            <select class="form-select" id="payment-method" required>
              <option value="pix">Pix</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="cash">Dinheiro</option>
            </select>

            <small class="text-secondary">
              Pagamento simulado para fins acadêmicos.
            </small>
          </div>

          <div class="mb-3">
            <label for="order-notes" class="form-label">
              Observações (opcional)
            </label>

            <textarea
              class="form-control"
              id="order-notes"
              rows="2"
              placeholder="Alguma informação adicional sobre o pedido?">
            </textarea>
          </div>

          <div id="checkout-message" class="mb-3"></div>

          <button
            type="submit"
            class="btn btn-primary w-100"
            id="checkout-button">
            Confirmar pedido
          </button>

        </form>

      </div>
    </div>
  `;

  const fulfillmentSelect =
    document.getElementById("fulfillment-type");

  const addressWrapper =
    document.getElementById("delivery-address-wrapper");

  const cepInput =
    document.getElementById("delivery-cep");

  const cepMessage =
    document.getElementById("cep-message");

  // Exibe ou oculta o formulário de entrega.
  fulfillmentSelect.addEventListener("change", () => {
    const delivery = fulfillmentSelect.value === "delivery";

    addressWrapper.classList.toggle("d-none", !delivery);

    [
      "delivery-cep",
      "delivery-street",
      "delivery-number",
      "delivery-neighborhood",
      "delivery-city",
      "delivery-state"
    ].forEach(id => {
      document.getElementById(id).required = delivery;
    });
  });

  // Formata o CEP enquanto o usuário digita.
  cepInput.addEventListener("input", () => {
    let cep = cepInput.value.replace(/\D/g, "").slice(0, 8);

    if (cep.length > 5) {
      cep = cep.slice(0, 5) + "-" + cep.slice(5);
    }

    cepInput.value = cep;
  });

  // Consulta o endereço no ViaCEP.
  async function consultarCep() {
    const cep = cepInput.value.replace(/\D/g, "");

    if (cep.length !== 8) {
      cepMessage.innerHTML = `
        <div class="alert alert-warning">
          Informe um CEP válido com 8 números.
        </div>
      `;
      return;
    }

    const searchButton = document.getElementById("search-cep");

    searchButton.disabled = true;
    searchButton.textContent = "Consultando...";

    cepMessage.innerHTML = "";

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cep}/json/`
      );

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data = await response.json();

      if (data.erro) {
        throw new Error("CEP não encontrado. Verifique os números.");
      }

      document.getElementById("delivery-street").value =
        data.logradouro || "";

      document.getElementById("delivery-neighborhood").value =
        data.bairro || "";

      document.getElementById("delivery-city").value =
        data.localidade || "";

      document.getElementById("delivery-state").value =
        data.uf || "";

      cepMessage.innerHTML = `
        <div class="alert alert-success">
          Endereço encontrado! Confira os dados e informe o número.
        </div>
      `;

      document.getElementById("delivery-number").focus();

    } catch (error) {
      cepMessage.innerHTML = `
        <div class="alert alert-danger">
          ${escapeHtml(error.message)}
        </div>
      `;

    } finally {
      searchButton.disabled = false;
      searchButton.textContent = "Consultar CEP";
    }
  }

  document.getElementById("search-cep")
    .addEventListener("click", consultarCep);

  cepInput.addEventListener("blur", () => {
    if (cepInput.value.replace(/\D/g, "").length === 8) {
      consultarCep();
    }
  });
}


// ============================================
// 3. CONFIRMAR PEDIDO
// ============================================

checkoutSection.addEventListener("submit", async event => {
  if (event.target.id !== "checkout-form") return;

  event.preventDefault();

  const button = document.getElementById("checkout-button");
  const message = document.getElementById("checkout-message");

  button.disabled = true;
  button.textContent = "Processando pedido...";

  try {

    // Verifica autenticacao.
    const {
      data: { user },
      error: authError
    } = await window.db.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      message.innerHTML = `
        <div class="alert alert-warning">
          Você precisa entrar na sua conta para finalizar o pedido.
          <a href="login.html">Fazer login</a>
        </div>
      `;

      return;
    }

    // Recupera os dados do formulario.
    const fulfillmentType =
      document.getElementById("fulfillment-type").value;

    const paymentMethod =
      document.getElementById("payment-method").value;

    
let deliveryAddress = "";

if (fulfillmentType === "delivery") {
  const cep = document.getElementById("delivery-cep").value.trim();
  const street = document.getElementById("delivery-street").value.trim();
  const number = document.getElementById("delivery-number").value.trim();
  const neighborhood = document.getElementById("delivery-neighborhood").value.trim();
  const city = document.getElementById("delivery-city").value.trim();
  const state = document.getElementById("delivery-state").value.trim();
  const complement = document.getElementById("delivery-complement").value.trim();

  if (!cep || !street || !number || !neighborhood || !city || !state) {
    throw new Error("Preencha todos os campos obrigatórios do endereço.");
  }

  deliveryAddress =
    `${street}, nº ${number}, ${neighborhood}, ${city}/${state}, CEP: ${cep}`;

  if (complement) {
    deliveryAddress += `, Complemento: ${complement}`;
  }
}

    const notes =
      document.getElementById("order-notes").value.trim();

    if (fulfillmentType === "delivery" && !deliveryAddress) {
      throw new Error("Informe o endereço de entrega.");
    }

    // Envia apenas os IDs e quantidades.
    // Os precos serao conferidos no banco.
    const items = window.Cart.get().map(item => ({
      product_id: item.id,
      quantity: item.quantity
    }));

    const { data, error } = await window.db.rpc(
      "create_order",
      {
        p_items: items,
        p_payment_method: paymentMethod,
        p_fulfillment_type: fulfillmentType,
        p_delivery_address: deliveryAddress || null,
        p_notes: notes || null
      }
    );

    if (error) throw error;

    if (!data) {
      throw new Error("Não foi possível identificar o pedido criado.");
    }

    // Limpa o carrinho somente depois do sucesso.
    window.Cart.save([]);

    cartItems.innerHTML = `
      <div class="alert alert-success">
        <h4 class="alert-heading">Pedido realizado com sucesso!</h4>
        <p class="mb-1">
          Obrigado por comprar na Doce Encanto.
        </p>
        <p class="mb-0">
          Seu número de pedido é:
          <strong>${escapeHtml(data)}</strong>
        </p>
      </div>
    `;

    cartSummary.innerHTML = "";
    checkoutSection.innerHTML = "";

  } catch (error) {

    message.innerHTML = `
      <div class="alert alert-danger">
        ${escapeHtml(error.message || "Não foi possível finalizar o pedido.")}
      </div>
    `;

  } finally {

    if (document.getElementById("checkout-button")) {
      button.disabled = false;
      button.textContent = "Confirmar pedido";
    }

  }
});


// ============================================
// 4. BOTOES DO CARRINHO
// ============================================

cartItems.addEventListener("click", event => {

  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  const cart = window.Cart.get();
  const item = cart.find(p => p.id === id);

  if (!item) return;

  if (action === "remove") {
    window.Cart.remove(id);
  }

  if (action === "increase") {
    window.Cart.setQuantity(
      id,
      item.quantity + 1,
      Number(button.dataset.stock)
    );
  }

  if (action === "decrease") {
    window.Cart.setQuantity(
      id,
      item.quantity - 1,
      Number(button.dataset.stock)
    );
  }

  loadCart();
});


// ============================================
// 5. INICIALIZACAO
// ============================================

document.addEventListener("DOMContentLoaded", loadCart);
