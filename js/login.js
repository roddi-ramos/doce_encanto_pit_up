const messageBox = document.getElementById("message");
function showMessage(message, type = "danger") {
  messageBox.textContent = message;
  messageBox.className = `alert alert-${type}`;
}
function friendlyError(error) {
  return error?.message || "Não foi possível concluir a operação.";
}
document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const client = window.requireDb();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = "index.html";
  } catch (error) { showMessage(friendlyError(error)); }
});
document.getElementById("signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const client = window.requireDb();
    const fullName = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const { data, error } = await client.auth.signUp({
      email, password, options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    showMessage(data.session
      ? "Cadastro realizado! Você já pode acessar a loja."
      : "Cadastro iniciado. Verifique seu e-mail para confirmar a conta.", "success");
  } catch (error) { showMessage(friendlyError(error)); }
});
