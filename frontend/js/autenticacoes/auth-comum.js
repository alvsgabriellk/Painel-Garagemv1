// auth-comum.js — funções compartilhadas pelas telas de autenticação
// Lembrar de carregar este arquivo ANTES de qualquer script da página.

//  Configuração 
// Assume que o blueprint está registrado com url_prefix="/auth".
const API_URL = "http://127.0.0.1:5000/auth";
const PAGINA_APOS_LOGIN = "../../html/visao-geral.html"; // (o login usa Sessao.irParaPainel(), que volta pra última página)
const PAGINA_LOGIN = "../login/";

// Mensagens para o front, usadas quando a API não manda uma mensagem de retorno
const MENSAGENS_POR_STATUS = {
  400: "Dados inválidos. Confira os campos e tente novamente.",
  401: "Credenciais inválidas.",
  403: "Você não tem permissão para fazer isso.",
  404: "Recurso não encontrado.",
  409: "Esses dados já estão em uso.",
  429: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  500: "Erro no servidor. Tente novamente em instantes.",
};

// ---------- Chamada à API ----------
// Sempre devolve { ok, status, dados } e nunca lança erro.
async function chamarApi(caminho, { metodo = "POST", corpo, token } = {}) {
  const opcoes = { method: metodo, headers: {} };

  if (corpo !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }
  if (token) {
    opcoes.headers["Authorization"] = `Bearer ${token}`;
  }

  const controlador = new AbortController();
  opcoes.signal = controlador.signal;
  const timer = setTimeout(() => controlador.abort(), 15000);

  try {
    const resposta = await fetch(`${API_URL}${caminho}`, opcoes);

    let dados = {};
    try {
      dados = await resposta.json();
    } catch {
      // resposta sem JSON 
    }

    return { ok: resposta.ok, status: resposta.status, dados };
  } catch (erro) {
    const texto =
      erro.name === "AbortError"
        ? "O servidor demorou demais para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
    return { ok: false, status: 0, dados: { error: texto } };
  } finally {
    clearTimeout(timer);
  }
}

// Escolhe a melhor mensagem de erro para mostrar ao usuário
function mensagemDeErro(resp) {
  const d = resp.dados || {};
  return (
    d.error ||
    d.erro ||
    d.message ||
    d.msg ||
    MENSAGENS_POR_STATUS[resp.status] ||
    "Algo deu errado. Tente novamente."
  );
}

// Validações do front (espelham as do backend) 
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validarEmail(email) {
  return EMAIL_REGEX.test(email) ? null : "Digite um e-mail válido.";
}

function validarSenha(senha) {
  if (senha.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
  if (senha.length > 20) return "A senha deve ter no máximo 20 caracteres.";
  return null;
}

// Interface 
// Acha o aviso do formulário ([data-message]); se não existir, cria um acima do botão.
function obterAviso(form) {
  let aviso = form.querySelector("[data-message]");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.className = "notice";
    aviso.setAttribute("data-message", "");
    aviso.setAttribute("role", "alert");
    aviso.hidden = true;
    form.querySelector('button[type="submit"]').before(aviso);
  }
  return aviso;
}

// tipo: "erro" | "sucesso". Usa textContent (seguro contra injeção de HTML).
function mostrarAviso(aviso, texto, tipo = "erro") {
  aviso.textContent = texto;
  aviso.hidden = false;
  aviso.dataset.tipo = tipo;
  aviso.classList.remove("notice-error", "notice-success");
  aviso.classList.add(tipo === "sucesso" ? "notice-success" : "notice-error");
}

function esconderAviso(aviso) {
  aviso.hidden = true;
  aviso.textContent = "";
}

// Desabilita o botão e troca o texto enquanto a requisição acontece
function definirCarregando(botao, carregando, textoCarregando = "Aguarde...") {
  if (carregando) {
    botao.dataset.textoOriginal = botao.textContent;
    botao.textContent = textoCarregando;
    botao.disabled = true;
  } else {
    botao.textContent = botao.dataset.textoOriginal || botao.textContent;
    botao.disabled = false;
  }
}

// Sessão (JWT no localStorage) 
function salvarSessao(token, usuario) {
  try {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    localStorage.setItem("jaTemConta", "1");
  } catch {
    // localStorage bloqueado (modo privado restrito, por exemplo)
  }
}

function obterToken() {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

function encerrarSessao() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
  } catch {}
  window.location.href = PAGINA_LOGIN;
}