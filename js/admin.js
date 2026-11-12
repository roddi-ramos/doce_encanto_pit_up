
// ============================================
// PAINEL ADMINISTRATIVO
// ============================================

const db = window.db;

const message = document.getElementById("admin-message");
const productRows = document.getElementById("admin-products");
const orderContainer = document.getElementById("admin-orders");

const orderStatuses = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  out_for_delivery: "Saiu para entrega",
  completed: "Concluído",
  cancelled: "Cancelado"
};

const paymentStatuses = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado"
};

function notify(text, type = "danger") {
  message.textContent = text;
  message.className = `alert alert-${type}`;
}

function safe(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function date(value) {
  return new Date(value).toLocaleString("pt-BR");
}


// ============================================
// ACESSO ADMINISTRATIVO
// ============================================

async function checkAdmin() {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return false;
  }

  const { data, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || data?.role !== "admin") {
    document.getElementById("admin-content").classList.add("d-none");
    notify("Acesso restrito aos administradores.");
    return false;
  }

  return true;
}


// ============================================
// PRODUTOS
// ============================================

async function loadProducts() {
  const { data, error } = await db
    .from("products")
    .select("id,name,price,stock_quantity,is_active")
    .order("created_at", { ascending: false });

  if (error) {
    notify("Erro ao carregar produtos: " + error.message);
    return;
  }

  productRows.innerHTML = data.map(product => `
    <tr>
      <td>${safe(product.name)}</td>
      <td>${money(product.price)}</td>
      <td>${product.stock_quantity}</td>
      <td>${product.is_active ? "Ativo" : "Inativo"}</td>
      <td>
        <button
          class="btn btn-sm btn-outline-secondary"
          data-product="${product.id}"
          data-active="${product.is_active}">
          ${product.is_active ? "Desativar" : "Ativar"}
        </button>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="5">Nenhum produto cadastrado.</td></tr>
  `;
}


// ============================================
// PEDIDOS
// ============================================

async function loadOrders() {
  const { data: orders, error } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    notify("Erro ao carregar pedidos: " + error.message);
    return;
  }

  if (!orders.length) {
    orderContainer.innerHTML = `
      <div class="alert alert-light">Nenhum pedido recebido.</div>
    `;
    return;
  }

  const ids = orders.map(order => order.id);
  const customers = [...new Set(orders.map(o => o.customer_id).filter(Boolean))];

  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("*")
    .in("order_id", ids);

  if (itemsError) {
    notify("Erro ao carregar produtos dos pedidos: " + itemsError.message);
    return;
  }

  const { data: profiles, error: profilesError } = customers.length
    ? await db.from("profiles").select("id,full_name").in("id", customers)
    : { data: [], error: null };

  if (profilesError) {
    notify("Não foi possível consultar os nomes dos clientes.");
  }

  orderContainer.innerHTML = orders.map(order => {
    const customer = profiles?.find(p => p.id === order.customer_id);
    const orderItems = items.filter(item => item.order_id === order.id);

    const products = orderItems.map(item => `
      <tr>
        <td>${safe(item.product_name_snapshot)}</td>
        <td>${item.quantity}</td>
        <td>${money(item.line_total)}</td>
      </tr>
    `).join("");

    return `
      <div class="border rounded p-3 mb-3">

        <div class="d-flex justify-content-between flex-wrap gap-2">
          <div>
            <strong>Pedido #${safe(order.id.slice(0, 8))}</strong>
            <div class="small text-secondary">${date(order.created_at)}</div>
          </div>
          <strong>${money(order.total)}</strong>
        </div>

        <hr>

        <p><strong>Cliente:</strong> ${safe(customer?.full_name || "Não identificado")}</p>

        <p><strong>Pagamento:</strong> ${safe(order.payment_method)}</p>

        <p><strong>Modalidade:</strong>
          ${order.fulfillment_type === "delivery" ? "Entrega" : "Retirada"}
        </p>

        ${order.fulfillment_type === "delivery"
          ? `<p><strong>Endereço:</strong> ${safe(order.delivery_address || "Não informado")}</p>`
          : ""}

        <p><strong>Observações:</strong> ${safe(order.notes || "Nenhuma")}</p>

        <details class="mb-3">
          <summary>Ver produtos (${orderItems.length})</summary>

          <div class="table-responsive mt-2">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${products}</tbody>
            </table>
          </div>

          <p class="small text-end mb-1">Subtotal: ${money(order.subtotal)}</p>
          <p class="small text-end mb-1">Desconto: ${money(order.discount_total)}</p>
          <p class="small text-end mb-1">Entrega: ${money(order.delivery_fee)}</p>
          <p class="text-end fw-bold">Total: ${money(order.total)}</p>
        </details>

        <div class="row g-2">

          <div class="col-md-6">
            <label class="form-label">Status do pedido</label>
            <select class="form-select"
              data-order="${order.id}" data-field="status">
              ${Object.entries(orderStatuses).map(([value, label]) => `
                <option value="${value}" ${order.status === value ? "selected" : ""}>
                  ${label}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Status do pagamento</label>
            <select class="form-select"
              data-order="${order.id}" data-field="payment_status">
              ${Object.entries(paymentStatuses).map(([value, label]) => `
                <option value="${value}" ${order.payment_status === value ? "selected" : ""}>
                  ${label}
                </option>
              `).join("")}
            </select>
          </div>

        </div>
      </div>
    `;
  }).join("");
}


// ============================================
// EVENTOS
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!db || !(await checkAdmin())) return;

    await loadProducts();
    await loadOrders();

    // Cadastrar produto
    document.getElementById("product-form").addEventListener("submit", async event => {
      event.preventDefault();

      const product = {
        name: document.getElementById("product-name").value.trim(),
        price: Number(document.getElementById("product-price").value),
        stock_quantity: Number(document.getElementById("product-stock").value),
        description: document.getElementById("product-description").value.trim(),
        image_url: document.getElementById("product-image").value.trim() || null,
        is_active: true
      };

      const { error } = await db.from("products").insert(product);

      if (error) return notify(error.message);

      event.target.reset();
      notify("Produto cadastrado com sucesso!", "success");
      await loadProducts();
    });

    // Ativar ou desativar produto
    productRows.addEventListener("click", async event => {
      const button = event.target.closest("[data-product]");
      if (!button) return;

      const { error } = await db
        .from("products")
        .update({ is_active: button.dataset.active !== "true" })
        .eq("id", button.dataset.product);

      if (error) return notify(error.message);

      await loadProducts();
    });

    // Atualizar status do pedido ou pagamento
    orderContainer.addEventListener("change", async event => {
      const select = event.target.closest("[data-order]");
      if (!select) return;

      const field = select.dataset.field;

      if (!["status", "payment_status"].includes(field)) return;

      const { error } = await db
        .from("orders")
        .update({ [field]: select.value })
        .eq("id", select.dataset.order);

      if (error) {
        notify("Erro ao atualizar pedido: " + error.message);
        await loadOrders();
        return;
      }

      notify("Pedido atualizado com sucesso!", "success");
    });

    // Atualizar listagem
    document.getElementById("refresh-orders")
      .addEventListener("click", loadOrders);

  } catch (error) {
    notify("Erro no painel: " + error.message);
  }
});
