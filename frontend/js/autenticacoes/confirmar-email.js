// confirmar-email.js — precisa do auth-comum.js carregado antes
// O link do e-mail deve abrir esta página assim: /confirmar-email/?token=XXXX

(async () => {
  const titulo = document.getElementById("confirm-title");
  const status = document.querySelector("[role='status']");

  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    titulo.textContent = "Link inválido";
    status.textContent =
      "Não encontramos o código de confirmação. Use o link completo enviado ao seu e-mail.";
    status.className = "status-error";
    return;
  }

  status.textContent = "Validando seu link...";

  const resp = await chamarApi(`/confirmar-email/${encodeURIComponent(token)}`, {
    metodo: "GET",
  });

  if (resp.ok) {
    titulo.textContent = "E-mail confirmado!";
    status.textContent = resp.dados.msg || "Seu e-mail foi confirmado. Já pode entrar.";
    status.className = "status-success";
  } else {
    // 400 "Token inválido ou expirado", 404 "Usuário não encontrado"
    titulo.textContent = "Não foi possível confirmar";
    status.textContent = mensagemDeErro(resp);
    status.className = "status-error";
  }
})();