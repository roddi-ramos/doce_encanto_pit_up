const adminMessage = document.getElementById("admin-message");
const productRows = document.getElementById("admin-products");
function notifyAdmin(message, type = "danger") {
  adminMessage.textContent = message;
  adminMessage.className = `alert alert-${type}`;
}
function htmlSafe(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
async function guardAdmin() {
  const client = window.requireDb();
  const { data: { user } } = await client.auth.getUser();
  if (!user) { window.location.href = "login.html"; return false; }
  const { data, error } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (error || data?.role !== "admin") {
    notifyAdmin("Acesso restrito. Esta conta não possui perfil de administrador.");
    document.getElementById("product-form").classList.add("d-none");
    return false;
  }
  return true;
}
async function loadAdminProducts() {
  const { data, error } = await window.db.from("products")
    .select("id,name,price,stock_quantity,is_active").order("created_at", { ascending: false });
  if (error) { notifyAdmin(error.message); return; }
  productRows.innerHTML = (data || []).map(p => `
    <tr><td>${htmlSafe(p.name)}</td><td>${Number(p.price).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
    <td>${p.stock_quantity}</td><td>${p.is_active ? "Ativo" : "Inativo"}</td>
    <td><button class="btn btn-sm btn-outline-secondary" data-toggle-product="${p.id}" data-active="${p.is_active}">
      ${p.is_active ? "Desativar" : "Ativar"}</button></td></tr>`).join("") || '<tr><td colspan="5">Nenhum produto cadastrado.</td></tr>';
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!(await guardAdmin())) return;
    await loadAdminProducts();
    document.getElementById("product-form").addEventListener("submit", async event => {
      event.preventDefault();
      const payload = {
        name: document.getElementById("product-name").value.trim(),
        price: Number(document.getElementById("product-price").value),
        stock_quantity: Number(document.getElementById("product-stock").value),
        description: document.getElementById("product-description").value.trim(),
        image_url: document.getElementById("product-image").value.trim() || null,
        is_active: true
      };
      const { error } = await window.db.from("products").insert(payload);
      if (error) { notifyAdmin(error.message); return; }
      event.target.reset();
      notifyAdmin("Produto cadastrado com sucesso.", "success");
      await loadAdminProducts();
    });
    productRows.addEventListener("click", async event => {
      const button = event.target.closest("[data-toggle-product]");
      if (!button) return;
      const id = button.dataset.toggleProduct;
      const active = button.dataset.active === "true";
      const { error } = await window.db.from("products").update({ is_active: !active }).eq("id", id);
      if (error) { notifyAdmin(error.message); return; }
      await loadAdminProducts();
    });
  } catch (error) { notifyAdmin(error.message); }
});
