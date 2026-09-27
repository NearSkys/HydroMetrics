
const tabLogin    = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm   = document.getElementById('loginForm');
const registerForm= document.getElementById('registerForm');




function showError(msgEl, textEl, msg) {
  textEl.textContent = msg;
  msgEl.classList.add('visible');
}
function hideError(msgEl) {
  msgEl.classList.remove('visible');
}
function setLoading(btn, textEl, loading, defaultText) {
  btn.disabled = loading;
  textEl.textContent = loading ? 'Aguarde...' : defaultText;
  btn.style.opacity  = loading ? '0.7' : '1';
}




tabLogin.addEventListener('click', () => switchTab('login'));
tabRegister.addEventListener('click', () => switchTab('register'));

function switchTab(tab) {
  const isLogin = tab === 'login';

  tabLogin.classList.toggle('active', isLogin);
  tabRegister.classList.toggle('active', !isLogin);
  tabLogin.setAttribute('aria-selected', isLogin);
  tabRegister.setAttribute('aria-selected', !isLogin);

  loginForm.style.display    = isLogin ? 'block' : 'none';
  registerForm.style.display = isLogin ? 'none'  : 'block';

  
  hideError(document.getElementById('errorMsg'));
  hideError(document.getElementById('regErrorMsg'));
  hideError(document.getElementById('regSuccessMsg'));
}




loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email   = document.getElementById('email').value.trim();
  const senha   = document.getElementById('senha').value;
  const errorEl = document.getElementById('errorMsg');
  const textEl  = document.getElementById('errorText');
  const btn     = document.getElementById('loginBtn');
  const btnText = document.getElementById('loginBtnText');

  hideError(errorEl);
  setLoading(btn, btnText, true, 'Acessar Painel');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    if (res.ok) {
      btnText.textContent = '✓ Autenticado — redirecionando...';
      setTimeout(() => { window.location.href = '/dashboard.html'; }, 600);
    } else {
      const data = await res.json();
      showError(errorEl, textEl, data.erro || 'Credenciais inválidas.');
      setLoading(btn, btnText, false, 'Acessar Painel');
    }
  } catch {
    showError(errorEl, textEl, 'Erro de rede. Verifique a conexão com o servidor.');
    setLoading(btn, btnText, false, 'Acessar Painel');
  }
});




registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome             = document.getElementById('regNome').value.trim();
  const email            = document.getElementById('regEmail').value.trim();
  const senha            = document.getElementById('regSenha').value;
  const confirmacao_senha= document.getElementById('regConfirmacao').value;

  const errorEl   = document.getElementById('regErrorMsg');
  const errorText = document.getElementById('regErrorText');
  const successEl = document.getElementById('regSuccessMsg');
  const successTxt= document.getElementById('regSuccessText');
  const btn       = document.getElementById('registerBtn');
  const btnText   = document.getElementById('registerBtnText');

  hideError(errorEl);
  hideError(successEl);

  if (senha !== confirmacao_senha) {
    showError(errorEl, errorText, 'As senhas não coincidem.');
    return;
  }

  setLoading(btn, btnText, true, 'Criar Conta');

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, confirmacao_senha }),
    });

    if (res.ok) {
      registerForm.reset();
      successTxt.textContent = 'Solicitação recebida! Faça login para acessar o painel.';
      successEl.classList.add('visible');
      setLoading(btn, btnText, false, 'Criar Conta');
      setTimeout(() => switchTab('login'), 2500);
    } else {
      const data = await res.json();
      showError(errorEl, errorText, data.erro || 'Falha no cadastro. Tente novamente.');
      setLoading(btn, btnText, false, 'Criar Conta');
    }
  } catch {
    showError(errorEl, errorText, 'Erro de rede. Verifique a conexão com o servidor.');
    setLoading(btn, btnText, false, 'Criar Conta');
  }
});
