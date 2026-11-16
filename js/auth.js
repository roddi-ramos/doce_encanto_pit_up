
(async function initAuth() {
  const client = window.requireDb();

  const loginLink = document.getElementById("login-link");
  const adminLink = document.getElementById("admin-link");
  const logoutButton = document.getElementById("logout-button");
  const greeting = document.getElementById("user-greeting");

  if (!loginLink || !logoutButton || !greeting) return;

  try {
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    const user = data.session?.user;

    // Usuário não autenticado
    if (!user) {
      loginLink.classList.remove("d-none");
      logoutButton.classList.add("d-none");
      greeting.classList.add("d-none");

      if (adminLink) {
        adminLink.classList.add("d-none");
      }

      return;
    }

    // Busca os dados do perfil
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("Não foi possível carregar o perfil:", profileError);
    }

    // Recupera o nome do perfil ou dos metadados
    const name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email;

    // Atualiza a identificação visual
    greeting.textContent = `Olá, ${name}!`;
    greeting.classList.remove("d-none");

    loginLink.classList.add("d-none");
    logoutButton.classList.remove("d-none");

    // Exibe administração somente para administradores
    if (adminLink) {
      if (profile?.role === "admin") {
        adminLink.classList.remove("d-none");
      } else {
        adminLink.classList.add("d-none");
      }
    }

  } catch (error) {
    console.error("Erro ao verificar autenticação:", error);
  }

  // Encerrar sessão
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      const { error } = await client.auth.signOut();

      if (error) throw error;

      window.location.href = "index.html";

    } catch (error) {
      alert("Não foi possível sair da conta: " + error.message);
      logoutButton.disabled = false;
    }
  });
})();
