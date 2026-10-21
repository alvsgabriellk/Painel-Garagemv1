// sessao.js — controla a sessão do usuário no navegador (token + última página).
// Carregar ANTES do app.js (páginas do painel) e do auth-comum.js (login/cadastro).
//
// Regras:
//  - Token válido  -> abre o painel, na última página em que o usuário estava.
//  - Token expirado/ausente + já tem conta vai pro login fazer o acesso novamente.
//  - Nunca acessou (sem conta) vai pra cadastro ou login.
const Sessao = (() => {
  // Raiz do site, calculada a partir do local deste arquivo (js/sessao.js -> ../).
  // Assim funciona em qualquer pasta/hospedagem, sem depender de caminhos fixos.
  const RAIZ = new URL("../", document.currentScript.src).href;
  const URLS = {
    login: RAIZ + "templates/login/",
    cadastro: RAIZ + "templates/cadastro/",
    painel: RAIZ + "html/visao-geral.html",
  };
  const PAGINA_PERMITIDA = /^html\/[a-z-]+\.html$/; // só abre páginas do painel

  const ler = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const apagar = (k) => { try { localStorage.removeItem(k); } catch {} };

  // Lê a data de expiração (exp) de dentro do JWT, sem precisar chamar a API.
  function tokenValido() {
    const token = ler("token");
    if (!token) return false;
    try {
      const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
      return !payload.exp || payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  // Página atual relativa à principal ("html/manutencoes.html") ou null se não for do painel.
  function paginaAtual() {
    if (!location.href.startsWith(RAIZ)) return null;
    const rel = location.href.slice(RAIZ.length).split(/[?#]/)[0];
    return PAGINA_PERMITIDA.test(rel) && rel !== "html/index.html" ? rel : null;
  }

  function lembrarPagina() {
    const p = paginaAtual();
    if (p) gravar("ultimaPagina", p);
  }

  function destinoPainel() {
    const p = ler("ultimaPagina");
    return p && PAGINA_PERMITIDA.test(p) ? RAIZ + p : URLS.painel;
  }

  const irParaPainel = () => location.replace(destinoPainel());
  const irParaLogin = () => location.replace(URLS.login);

  return {
    RAIZ,
    tokenValido,
    marcarTemConta: () => gravar("jaTemConta", "1"),

    // Porta de entrada do site (index.html da raiz).
    entrar() {
      if (tokenValido()) return irParaPainel();
      if (ler("jaTemConta")) return location.replace(URLS.login);
      location.replace(URLS.cadastro);
    },

    // Chamar no início de toda página do painel.
    exigirLogin() {
      if (!tokenValido()) {
        apagar("token"); // limpa token vencido; mantém "ultimaPagina" pra voltar depois do login
        irParaLogin();
        return false;
      }
      lembrarPagina();
      return true;
    },

    // Chamar nas telas de login/cadastro: quem já está logado vai direto pro painel.
    redirecionarSeLogado() {
      if (tokenValido()) irParaPainel();
    },

    irParaPainel,

    // A API respondeu 401/422: sessão acabou.
    expirou() {
      apagar("token");
      irParaLogin();
    },

    // Logout manual: limpa tudo que é do usuário.
    sair() {
      ["token", "usuario", "ultimaPagina", "veiculoId"].forEach(apagar);
      irParaLogin();
    },

    montarBotaoSair() {
      const nav = document.querySelector(".nav");
      if (!nav || nav.querySelector("[data-sair]")) return;
      const a = document.createElement("a");
      a.className = "nav-item";
      a.href = "#";
      a.textContent = "Sair";
      a.dataset.sair = "";
      a.addEventListener("click", (e) => { e.preventDefault(); Sessao.sair(); });
      nav.append(a);
    },
  };
})();
