async function updateNavigation() {
  const client = window.db;
  const loginLink = document.getElementById("login-link");
  const adminLink = document.getElementById("admin-link");
  const logoutButton = document.getElementById("logout-button");
  if (!client) return;
  const { data: { user } } = await client.auth.getUser();
  if (loginLink) loginLink.classList.toggle("d-none", !!user);
  if (logoutButton) logoutButton.classList.toggle("d-none", !user);
  if (user && adminLink) {
    const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
    adminLink.classList.toggle("d-none", profile?.role !== "admin");
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  await updateNavigation();
  if (window.db) window.db.auth.onAuthStateChange(() => updateNavigation());
  const logout = document.getElementById("logout-button");
  logout?.addEventListener("click", async () => {
    await window.db.auth.signOut();
    window.location.href = "index.html";
  });
});
