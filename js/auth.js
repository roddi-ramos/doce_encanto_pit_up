const { data, error } = await window.db.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      full_name: nome
    }
  }
});

if (error) {
  alert(error.message);
  return;
}

alert("Cadastro realizado com sucesso!");
window.location.href = "index.html";