// recuperar-senha.js — precisa do auth-comum.js carregado antes

// ---------- 1) Pedir o código por e-mail ----------
const formEsqueci = document.querySelector(".form-stack:not(.reset-form)");
const avisoEsqueci = obterAviso(formEsqueci);
const botaoEsqueci = formEsqueci.querySelector('button[type="submit"]');

formEsqueci.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  esconderAviso(avisoEsqueci);

  const email = formEsqueci.elements.email.value.trim();
  const erroLocal = validarEmail(email);
  if (erroLocal) {
    mostrarAviso(avisoEsqueci, erroLocal);
    return;
  }

  definirCarregando(botaoEsqueci, true, "Enviando...");
  const resp = await chamarApi("/esqueci-senha", { corpo: { email } });
  definirCarregando(botaoEsqueci, false);

  if (!resp.ok) {
    mostrarAviso(avisoEsqueci, mensagemDeErro(resp));
    return;
  }

  // A API responde igual exista o e-mail ou não (de propósito, por segurança)
  mostrarAviso(
    avisoEsqueci,
    resp.dados.msg || "Se esse e-mail estiver cadastrado, enviamos as instruções.",
    "sucesso"
  );
});

// ---------- 2) Trocar a senha com o código ----------
const formReset = document.querySelector(".reset-form");
const avisoReset = obterAviso(formReset);
const botaoReset = formReset.querySelector('button[type="submit"]');

formReset.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  esconderAviso(avisoReset);

  const token = formReset.elements.token.value.trim();
  const novaSenha = formReset.elements.nova_senha.value;

  const erroLocal =
    (!token ? "Cole o código recebido por e-mail." : null) ||
    validarSenha(novaSenha);
  if (erroLocal) {
    mostrarAviso(avisoReset, erroLocal);
    return;
  }

  definirCarregando(botaoReset, true, "Alterando...");
  // O token vai na URL (rota /resetar-senha/<token>); a nova senha vai no corpo
  const resp = await chamarApi(`/resetar-senha/${encodeURIComponent(token)}`, {
    corpo: { nova_senha: novaSenha },
  });
  definirCarregando(botaoReset, false);

  if (!resp.ok) {
    // 400 "Token inválido ou expirado", 404 "Usuário não encontrado"
    mostrarAviso(avisoReset, mensagemDeErro(resp));
    return;
  }

  formReset.reset();
  mostrarAviso(
    avisoReset,
    (resp.dados.msg || "Senha redefinida com sucesso!") + " Redirecionando para o login...",
    "sucesso"
  );
  setTimeout(() => {
    window.location.href = PAGINA_LOGIN;
  }, 2500);
});