
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

            <select
              class="form-select"
              id="fulfillment-type"
              required>

              <option value="pickup">Retirar no local</option>
              <option value="delivery">Receber por entrega</option>

            </select>
          </div>

          <div class="mb-3 d-none" id="delivery-address-wrapper">

            <label for="delivery-address" class="form-label">
              Endereço de entrega
            </label>

            <textarea
              class="form-control"
              id="delivery-address"
              rows="2"
              placeholder="Rua, número, bairro e complemento">
            </textarea>

          </div>

          <div class="mb-3">

            <label for="payment-method" class="form-label">
              Forma de pagamento
            </label>

            <select
              class="form-select"
              id="payment-method"
              required>

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

  const addressInput =
    document.getElementById("delivery-address");

  fulfillmentSelect.addEventListener("change", () => {
    const delivery = fulfillmentSelect.value === "delivery";

    addressWrapper.classList.toggle("d-none", !delivery);
    addressInput.required = delivery;
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

    const deliveryAddress =
      document.getElementById("delivery-address").value.trim();

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
