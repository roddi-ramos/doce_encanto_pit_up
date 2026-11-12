
const productsContainer = document.getElementById("products-list");
const statusLabel = document.getElementById("catalog-status");

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

async function loadCatalog() {
  if (!window.db) {
    productsContainer.innerHTML =
      '<div class="col-12"><div class="alert alert-warning">Configure o Supabase em <code>js/config.js</code> para carregar o catálogo.</div></div>';
    return;
  }

  statusLabel.textContent = "Atualizado agora";

  const { data, error } = await window.db
    .from("products")
    .select("id,name,description,price,image_url,stock_quantity")
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .order("name");

  if (error) {
    productsContainer.innerHTML =
      `<div class="col-12"><div class="alert alert-danger">${escapeHtml(error.message)}</div></div>`;
    return;
  }

  if (!data?.length) {
    productsContainer.innerHTML =
      '<div class="col-12"><div class="alert alert-light">Nenhum produto disponível no momento.</div></div>';
    return;
  }

  productsContainer.innerHTML = data.map(product => `
    <div class="col-sm-6 col-lg-4">
      <article class="card product-card h-100">

        ${product.image_url
          ? `<img src="${escapeHtml(product.image_url)}" class="card-img-top" alt="${escapeHtml(product.name)}" loading="lazy">`
          : '<div class="product-placeholder" aria-hidden="true">🧁</div>'}

        <div class="card-body d-flex flex-column">

          <h3 class="h5 fw-bold">
            ${escapeHtml(product.name)}
          </h3>

          <p class="text-secondary flex-grow-1">
            ${escapeHtml(product.description || "Uma delícia artesanal.")}
          </p>

          <div class="fw-bold fs-5 mb-2">
            ${money(product.price)}
          </div>

          <small class="text-secondary mb-3">
            Disponíveis: ${Number(product.stock_quantity)}
          </small>

          <button
            class="btn btn-primary w-100 add-cart-button"
            data-product-id="${escapeHtml(product.id)}"
            data-stock="${Number(product.stock_quantity)}">
            🛒 Adicionar ao carrinho
          </button>

        </div>
      </article>
    </div>
  `).join("");

  productsContainer.querySelectorAll(".add-cart-button")
    .forEach(button => {
      button.addEventListener("click", () => {
        window.Cart.add(
          button.dataset.productId,
          Number(button.dataset.stock)
        );
      });
    });
}

document.addEventListener("DOMContentLoaded", loadCatalog);
