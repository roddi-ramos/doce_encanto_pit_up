
const messageBox = document.getElementById("message");

function showMessage(message, type = "danger") {
  messageBox.textContent = message;
  messageBox.className = `alert alert-${type}`;
}

function friendlyError(error) {
  return error?.message || "Não foi possível concluir a operação.";
}

// LOGIN
document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const client = window.requireDb();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    window.location.href = "index.html";

  } catch (error) {
    showMessage(friendlyError(error));
  }
});

// CADASTRO
document.getElementById("signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const client = window.requireDb();

    const fullName = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) throw error;

    if (!data.session) {
      throw new Error(
        "O cadastro foi criado, mas não houve autenticação. Verifique a configuração de confirmação de e-mail no Supabase."
      );
    }

    showMessage("Cadastro realizado com sucesso!", "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);

  } catch (error) {
    showMessage(friendlyError(error));
  }
});
