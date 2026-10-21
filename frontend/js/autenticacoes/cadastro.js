// cadastro.js — precisa do auth-comum.js carregado antes

const formCadastro = document.getElementById("fazerCadastro");
const avisoCadastro = document.getElementById("notificacao");
const botaoCadastro = formCadastro.querySelector('button[type="submit"]');

formCadastro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  esconderAviso(avisoCadastro);

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  // Validação no front (o backend valida de novo, isso é só pra resposta rápida)
  const erroLocal =
    (nome.length < 2 || nome.length > 35
      ? "O nome deve ter entre 2 e 35 caracteres."
      : null) ||
    validarEmail(email) ||
    validarSenha(senha);

  if (erroLocal) {
    mostrarAviso(avisoCadastro, erroLocal);
    return;
  }

  definirCarregando(botaoCadastro, true, "Criando conta...");
  const resp = await chamarApi("/cadastro", { corpo: { nome, email, senha } });
  definirCarregando(botaoCadastro, false);

  if (!resp.ok) {
    // 409 -> "Esse e-mail já está cadastrado", 400 -> erro de validação, etc.
    mostrarAviso(avisoCadastro, mensagemDeErro(resp));
    return;
  }

  Sessao.marcarTemConta(); // próximas visitas caem no login, não no cadastro
  formCadastro.reset();
  mostrarAviso(
    avisoCadastro,
    resp.dados.msg ||
      "Conta criada! Enviamos um link de confirmação para o seu e-mail.",
    "sucesso"
  );
});