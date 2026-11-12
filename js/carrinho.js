
const cartItems = document.getElementById("cart-items");
const cartSummary = document.getElementById("cart-summary");

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

async function loadCart() {
  const cart = window.Cart.get();

  if (!cart.length) {
    cartItems.innerHTML =
      '<div class="alert alert-light">Seu carrinho está vazio.</div>';

    cartSummary.innerHTML = "";
    window.Cart.updateCount();
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

  const validCart = cart.filter(item => availableIds.has(item.id));

  window.Cart.save(validCart);

  if (!validCart.length) {
    cartItems.innerHTML =
      '<div class="alert alert-light">Os produtos do carrinho não estão mais disponíveis.</div>';

    cartSummary.innerHTML = "";
    return;
  }

  let total = 0;

  cartItems.innerHTML = validCart.map(item => {
    const product = products.find(p => p.id === item.id);

    const quantity = Math.min(
      item.quantity,
      Number(product.stock_quantity)
    );

    if (quantity !== item.quantity) {
      item.quantity = quantity;
    }

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
              data-stock="${Number(product.stock_quantity)}">
              −
            </button>

            <strong>${quantity}</strong>

            <button
              class="btn btn-outline-secondary btn-sm"
              data-action="increase"
              data-id="${escapeHtml(product.id)}"
              data-stock="${Number(product.stock_quantity)}"
              ${quantity >= Number(product.stock_quantity) ? "disabled" : ""}>
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

  window.Cart.save(validCart);

  cartSummary.innerHTML = `
    <div class="card">
      <div class="card-body d-flex justify-content-between align-items-center">
        <h4 class="mb-0">Total</h4>
        <h4 class="mb-0 fw-bold">${money(total)}</h4>
      </div>
    </div>
  `;
}

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

document.addEventListener("DOMContentLoaded", loadCart);
