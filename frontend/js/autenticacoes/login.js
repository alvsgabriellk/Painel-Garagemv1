// login.js — precisa do auth-comum.js carregado antes

const formLogin = document.querySelector("form");
const avisoLogin = obterAviso(formLogin);
const botaoLogin = formLogin.querySelector('button[type="submit"]');

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  esconderAviso(avisoLogin);

  const email = formLogin.elements.email.value.trim();
  const senha = formLogin.elements.senha.value;

  const erroLocal = validarEmail(email) || (!senha ? "Digite sua senha." : null);
  if (erroLocal) {
    mostrarAviso(avisoLogin, erroLocal);
    return;
  }

  definirCarregando(botaoLogin, true, "Entrando...");
  const resp = await chamarApi("/login", { corpo: { email, senha } });
  definirCarregando(botaoLogin, false);

  if (!resp.ok) {
    // 401 "E-mail ou senha inválidos" / "Conta não verificada"
    // 403 "Essa conta está desativada"
    mostrarAviso(avisoLogin, mensagemDeErro(resp));
    return;
  }

  salvarSessao(resp.dados.token, resp.dados.usuario);
  mostrarAviso(avisoLogin, resp.dados.msg || "Login realizado com sucesso!", "sucesso");
  Sessao.irParaPainel(); // volta pra última página em que o usuário estava (ou Visão geral)
});