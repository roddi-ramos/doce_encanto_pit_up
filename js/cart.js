
const CART_KEY = "doceEncantoCart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;

  const total = getCart().reduce(
    (sum, item) => sum + item.quantity, 0
  );

  badge.textContent = total;
  badge.classList.toggle("d-none", total === 0);
}

function addToCart(productId, stock) {
  const cart = getCart();
  const item = cart.find(p => p.id === productId);

  if (item) {
    if (item.quantity >= stock) {
      alert("Você atingiu o limite de estoque deste produto.");
      return;
    }

    item.quantity++;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

  saveCart(cart);
  alert("Produto adicionado ao carrinho!");
}

function setCartQuantity(productId, quantity, stock) {
  const cart = getCart();
  const item = cart.find(p => p.id === productId);

  if (!item) return;

  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  item.quantity = Math.min(quantity, stock);
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter(p => p.id !== productId);
  saveCart(cart);
}

document.addEventListener("DOMContentLoaded", updateCartCount);

window.Cart = {
  get: getCart,
  save: saveCart,
  add: addToCart,
  setQuantity: setCartQuantity,
  remove: removeFromCart,
  updateCount: updateCartCount
};
