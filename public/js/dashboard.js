
const fetchOptions = { credentials: 'include' };




function formatDate(isoString) {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function formatDateShort(isoString) {
  const dt = new Date(isoString);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}


const C = {
  primary:    '#00d4ff',
  accent:     '#00ffa3',
  danger:     '#ff4d6d',
  warning:    '#fbbf24',
  purple:     '#818cf8',
  grid:       'rgba(0, 212, 255, 0.07)',
  textMuted:  '#5a7898',
};


Chart.defaults.color          = C.textMuted;
Chart.defaults.font.family    = "'Inter', sans-serif";
Chart.defaults.font.size      = 12;
Chart.defaults.borderColor    = C.grid;
Chart.defaults.plugins.legend.labels.boxWidth = 10;


const charts = {};




async function carregarEquipamentos() {
  try {
    const res = await fetch('/api/equipamentos', fetchOptions);
    if (!res.ok) return;
    const equipamentos = await res.json();
    const sel = document.getElementById('equipamentoSelect');
    equipamentos.forEach(eq => {
      const opt = document.createElement('option');
      opt.value = eq.id;
      opt.textContent = eq.nome_equipamento;
      sel.appendChild(opt);
    });
  } catch {  }
}




document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', ...fetchOptions });
  window.location.href = '/index.html';
});




const periodoSelect     = document.getElementById('periodoSelect');
const equipamentoSelect = document.getElementById('equipamentoSelect');
const btnAplicarFiltro  = document.getElementById('btnAplicarFiltro');

if (periodoSelect)     periodoSelect.addEventListener('change', renderizarPainel);
if (equipamentoSelect) equipamentoSelect.addEventListener('change', renderizarPainel);
if (btnAplicarFiltro) {
  btnAplicarFiltro.addEventListener('click', (e) => {
    e.preventDefault();
    renderizarPainel();
  });
}




async function renderizarPainel() {
  const periodo      = periodoSelect ? periodoSelect.value : '30';
  const equipamentoId= equipamentoSelect ? equipamentoSelect.value : '';

  // Atualiza texto auxiliar do KPI de período
  document.querySelectorAll('.kpiPeriodo').forEach(el => el.textContent = periodo);

  let url = `/api/indicadores?periodo_dias=${encodeURIComponent(periodo)}`;
  if (equipamentoId && String(equipamentoId).trim() !== '') {
    url += `&equipamento_id=${encodeURIComponent(equipamentoId)}`;
  }

  try {
    const res = await fetch(url, fetchOptions);

    if (res.status === 401) {
      window.location.href = '/index.html';
      return;
    }

    if (!res.ok) {
      console.error('[HydroMetrics] Resposta de erro da API:', res.status);
      return;
    }

    const data = await res.json();
    if (!data || !data.kpis) {
      console.error('[HydroMetrics] Estrutura inesperada recebida da API:', data);
      return;
    }

    
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
      lastUpdateEl.textContent = `Atualizado em ${new Date().toLocaleTimeString('pt-BR')}`;
    }

    renderKPIs(data.kpis);
    renderLineChart(data.evolucao_eficiencia || []);
    renderDoughnutChart(data.distribuicao_status || { operacional: 0, falha: 0 });
    renderScatterChart(data.dispersao || []);
    renderBarChart(data.distribuicao_status?.detalhe_falhas || {});
    renderAlertas(data.alertas || []);

  } catch (err) {
    console.error('[HydroMetrics] Erro ao carregar dados do painel:', err);
  }
}




function renderKPIs(kpis) {
  document.getElementById('kpiEficiencia').textContent     = kpis.eficiencia_media_geral + '%';
  document.getElementById('kpiDisponibilidade').textContent= kpis.taxa_disponibilidade_percentual + '%';
  document.getElementById('kpiLeituras').textContent       = kpis.total_leituras.toLocaleString('pt-BR');
  document.getElementById('kpiFalhas').textContent         = kpis.total_falhas.toLocaleString('pt-BR');
}




function renderLineChart(dados) {
  if (charts.line) charts.line.destroy();

  const ctx = document.getElementById('lineChart').getContext('2d');

  
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0,   'rgba(0, 212, 255, 0.18)');
  gradient.addColorStop(1,   'rgba(0, 212, 255, 0)');

  charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dados.map(e => formatDateShort(e.data)),
      datasets: [{
        label: 'Eficiência (%)',
        data: dados.map(e => parseFloat(e.eficiencia_media)),
        borderColor: C.primary,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: gradient,
        pointBackgroundColor: C.primary,
        pointRadius: dados.length > 60 ? 0 : 3,
        pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true,
      animation: { duration: 600 },
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        y: { min: 0, max: 100, grid: { color: C.grid }, ticks: { callback: v => v + '%' } },
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      },
    },
  });
}




function renderDoughnutChart(status) {
  if (charts.doughnut) charts.doughnut.destroy();

  const ctx = document.getElementById('doughnutChart').getContext('2d');
  charts.doughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Operacional', 'Em Falha'],
      datasets: [{
        data: [status.operacional, status.falha],
        backgroundColor: [C.accent, C.danger],
        borderColor: ['rgba(0,255,163,0.3)', 'rgba(255,77,109,0.3)'],
        borderWidth: 1,
        hoverOffset: 6,
      }],
    },
    options: {
      cutout: '72%',
      animation: { duration: 700 },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString('pt-BR')} leituras` } },
      },
    },
  });
}




function renderScatterChart(dispersao) {
  if (charts.scatter) charts.scatter.destroy();

  const ctx = document.getElementById('scatterChart').getContext('2d');
  const normal = dispersao.filter(d => d.status === 'Operacional');
  const falha  = dispersao.filter(d => d.status === 'Falha');

  charts.scatter = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Operacional',
          data: normal,
          backgroundColor: 'rgba(0, 255, 163, 0.45)',
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Falha',
          data: falha,
          backgroundColor: 'rgba(255, 77, 109, 0.55)',
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      animation: { duration: 500 },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } } },
      scales: {
        x: { title: { display: true, text: 'Velocidade (RPM)' }, grid: { color: C.grid } },
        y: { title: { display: true, text: 'Torque (Nm)' },      grid: { color: C.grid } },
      },
    },
  });
}




function renderBarChart(detalhesFalhas) {
  if (charts.bar) charts.bar.destroy();

  const ctx = document.getElementById('barChart').getContext('2d');
  const labels = Object.keys(detalhesFalhas);
  const values = Object.values(detalhesFalhas);

  
  const barGradient = ctx.createLinearGradient(0, 0, 0, 200);
  barGradient.addColorStop(0, C.warning);
  barGradient.addColorStop(1, 'rgba(251,191,36,0.3)');

  charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ocorrências',
        data: values,
        backgroundColor: barGradient,
        borderColor: C.warning,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      animation: { duration: 500 },
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: C.grid }, ticks: { precision: 0 } },
        x: { grid: { display: false } },
      },
    },
  });
}




function renderAlertas(alertas) {
  const tbody    = document.getElementById('alertsBody');
  const countEl  = document.getElementById('alertCount');
  tbody.innerHTML = '';

  countEl.textContent = `${alertas.length} eventos`;

  if (alertas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; color: var(--text-muted); padding: 2rem;">
          Nenhuma falha registrada no período selecionado.
        </td>
      </tr>`;
    return;
  }

  alertas.forEach(alerta => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono" style="font-size: 0.83rem; color: var(--text-muted);">${formatDate(alerta.data_leitura)}</td>
      <td style="font-weight: 500;">${alerta.nome_equipamento}</td>
      <td>
        <span class="badge badge-danger">
          <span class="status-dot" style="width:5px;height:5px;display:inline-block;border-radius:50%;background:var(--danger);margin-right:4px;animation:pulse-dot 2s infinite;"></span>
          ${alerta.tipo_falha}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}




async function carregarInfoUsuario() {
  try {
    
    const res = await fetch('/api/equipamentos', fetchOptions);
    if (res.status === 401) {
      window.location.href = '/index.html';
    }
    
    
    const nameEl   = document.getElementById('sidebarUserName');
    const avatarEl = document.getElementById('sidebarAvatar');
    
    if (res.ok) {
      
      nameEl.textContent   = 'Operador';
      avatarEl.textContent = 'OP';
    }
  } catch {  }
}




(async function init() {
  await carregarInfoUsuario();
  await carregarEquipamentos();
  await carregarStatusSeguranca();
  await renderizarPainel();
})();




const equipModal       = document.getElementById('equipamentosModal');
const navEquip         = document.getElementById('navEquipamentos');
const closeEquipBtn    = document.getElementById('closeEquipModalBtn');
const closeEquipFooter = document.getElementById('closeEquipModalFooterBtn');
const equipGrid        = document.getElementById('equipamentosCardsGrid');

async function abrirModalEquipamentos() {
  if (!equipModal) return;
  equipModal.style.display = 'flex';

  try {
    const res = await fetch('/api/equipamentos', fetchOptions);
    if (!res.ok) return;
    const equipamentos = await res.json();

    if (!equipGrid) return;
    equipGrid.innerHTML = '';

    equipamentos.forEach(eq => {
      const card = document.createElement('div');
      card.className = 'equip-item-card';

      const critClass = eq.criticidade === 'Alta' ? 'badge-danger' : 'badge-warning';
      const typeOriginal = eq.codigo_patrimonio.includes('L') ? 'L (Low - 50%)' :
                           eq.codigo_patrimonio.includes('M') ? 'M (Medium - 30%)' : 'H (High - 20%)';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <span class="equip-code">${eq.codigo_patrimonio}</span>
          <span class="badge ${critClass}">${eq.criticidade}</span>
        </div>
        <div class="equip-name">${eq.nome_equipamento}</div>
        <div class="equip-meta">
          <strong>Tipo:</strong> ${eq.tipo}<br>
          <span style="font-size:0.72rem; color:var(--subtle);">Dataset AI4I: Type ${typeOriginal}</span>
        </div>
        <div class="equip-stats-row">
          <div>
            <div style="font-size:0.68rem; color:var(--muted); text-transform:uppercase;">Última Efic.</div>
            <div class="mono" style="font-size:1rem; font-weight:600; color:var(--good);">${eq.ultima_eficiencia ? eq.ultima_eficiencia + '%' : '--'}</div>
          </div>
          <div>
            <div style="font-size:0.68rem; color:var(--muted); text-transform:uppercase; text-align:right;">Amostras</div>
            <div class="mono" style="font-size:0.85rem; color:var(--text); text-align:right;">${Number(eq.total_leituras || 0).toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <button type="button" class="btn btn-ghost w-full btn-filter-action" style="margin-top:0.85rem; font-size:0.75rem; padding:0.4rem 0.5rem;">
          Filtrar no Dashboard →
        </button>
      `;

      const btnFilter = card.querySelector('.btn-filter-action');
      if (btnFilter) {
        btnFilter.addEventListener('click', (ev) => {
          ev.preventDefault();
          filtrarEquipamentoEFechar(eq.id);
        });
      }

      equipGrid.appendChild(card);
    });
  } catch {
    if (equipGrid) {
      equipGrid.innerHTML = '<div style="color:var(--danger); padding:1rem;">Erro ao carregar catálogo de equipamentos.</div>';
    }
  }
}

function fecharModalEquipamentos() {
  if (equipModal) {
    equipModal.style.display = 'none';
  }
  if (window.location.hash === '#equipamentos') {
    history.pushState('', document.title, window.location.pathname + window.location.search);
  }
}

function filtrarEquipamentoEFechar(equipamentoId) {
  if (equipamentoSelect) {
    equipamentoSelect.value = String(equipamentoId);
  }
  renderizarPainel();
  fecharModalEquipamentos();
}

if (navEquip) {
  navEquip.addEventListener('click', (e) => {
    e.preventDefault();
    abrirModalEquipamentos();
  });
}
if (closeEquipBtn) closeEquipBtn.addEventListener('click', fecharModalEquipamentos);
if (closeEquipFooter) closeEquipFooter.addEventListener('click', fecharModalEquipamentos);

if (equipModal) {
  equipModal.addEventListener('click', (e) => {
    if (e.target === equipModal) fecharModalEquipamentos();
  });
}




const secModal             = document.getElementById('segurancaModal');
const navSecurity          = document.getElementById('navSecurity');
const closeSecBtn          = document.getElementById('closeSecModalBtn');
const closeSecFooter       = document.getElementById('closeSecModalFooterBtn');
const sidebarSecBadge      = document.getElementById('sidebarSecBadge');
const totpStatusBadge      = document.getElementById('totpStatusBadge');


const totpAtivoInfo        = document.getElementById('totpAtivoInfo');
const totpSetupArea        = document.getElementById('totpSetupArea');
const totpSetupContent     = document.getElementById('totpSetupContent');
const btnIniciarTotpSetup  = document.getElementById('btnIniciarTotpSetup');
const totpSecretKey        = document.getElementById('totpSecretKey');
const btnCopiarTotpSecret  = document.getElementById('btnCopiarTotpSecret');
const totpUriLink          = document.getElementById('totpUriLink');
const inputConfirmTotp     = document.getElementById('inputConfirmTotp');
const btnConfirmarTotp     = document.getElementById('btnConfirmarTotp');
const btnSimularTotpSetup  = document.getElementById('btnSimularTotpSetup');
const totpSetupMsg         = document.getElementById('totpSetupMsg');
const totpSetupSuccess     = document.getElementById('totpSetupSuccess');


const formTrocarSenha      = document.getElementById('formTrocarSenha');
const inputSenhaAtual      = document.getElementById('inputSenhaAtual');
const inputNovaSenha       = document.getElementById('inputNovaSenha');
const inputConfirmarSenha  = document.getElementById('inputConfirmarSenha');
const inputTotpPass        = document.getElementById('inputTotpPass');
const btnSimularTotpPass   = document.getElementById('btnSimularTotpPass');
const btnSubmitTrocarSenha = document.getElementById('btnSubmitTrocarSenha');
const totpPassTimer        = document.getElementById('totpPassTimer');
const totpPassTimerText    = document.getElementById('totpPassTimerText');
const trocarSenhaMsg       = document.getElementById('trocarSenhaMsg');
const trocarSenhaSuccess   = document.getElementById('trocarSenhaSuccess');

async function carregarStatusSeguranca() {
  try {
    const res = await fetch('/api/seguranca/totp-status', fetchOptions);
    if (res.status === 401) return;
    if (!res.ok) return;

    const data = await res.json();
    const ativo = Boolean(data.totp_ativo);

    if (sidebarSecBadge) {
      if (ativo) {
        sidebarSecBadge.textContent = '2FA OK';
        sidebarSecBadge.className = 'badge badge-success';
      } else {
        sidebarSecBadge.textContent = '2FA PENDENTE';
        sidebarSecBadge.className = 'badge badge-warning';
      }
    }

    if (totpStatusBadge) {
      if (ativo) {
        totpStatusBadge.textContent = '✓ 2FA ATIVO & PROTEGIDO';
        totpStatusBadge.className = 'badge badge-success';
      } else {
        totpStatusBadge.textContent = '⚠ 2FA PENDENTE DE ATIVAÇÃO';
        totpStatusBadge.className = 'badge badge-warning';
      }
    }

    const secTrocarSenhaCard = document.getElementById('secTrocarSenhaCard');

    if (totpAtivoInfo && totpSetupArea) {
      if (ativo) {
        totpAtivoInfo.style.display = 'block';
        totpSetupArea.style.display = 'none';
        if (secTrocarSenhaCard) secTrocarSenhaCard.style.display = 'block';
      } else {
        totpAtivoInfo.style.display = 'none';
        totpSetupArea.style.display = 'block';
        if (secTrocarSenhaCard) secTrocarSenhaCard.style.display = 'none';
        if (totpSetupContent) totpSetupContent.style.display = 'none';
        if (btnIniciarTotpSetup) btnIniciarTotpSetup.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('[HydroMetrics] Erro ao obter status TOTP:', err);
  }
}

function abrirModalSeguranca() {
  if (secModal) {
    secModal.style.display = 'flex';
    carregarStatusSeguranca();
  }
}

function fecharModalSeguranca() {
  if (secModal) {
    secModal.style.display = 'none';
  }
  if (window.location.hash === '#seguranca') {
    history.pushState('', document.title, window.location.pathname + window.location.search);
  }
  limparMensagensSeguranca();
}

function limparMensagensSeguranca() {
  if (totpSetupMsg) {
    totpSetupMsg.textContent = '';
    totpSetupMsg.classList.remove('visible');
  }
  if (totpSetupSuccess) {
    totpSetupSuccess.textContent = '';
    totpSetupSuccess.classList.remove('visible');
  }
  if (trocarSenhaMsg) {
    trocarSenhaMsg.textContent = '';
    trocarSenhaMsg.classList.remove('visible');
  }
  if (trocarSenhaSuccess) {
    trocarSenhaSuccess.textContent = '';
    trocarSenhaSuccess.classList.remove('visible');
  }
}

async function iniciarConfiguracaoTotp() {
  limparMensagensSeguranca();
  try {
    const res = await fetch('/api/seguranca/totp-setup', {
      method: 'POST',
      ...fetchOptions
    });
    const data = await res.json();
    if (!res.ok) {
      if (totpSetupMsg) {
        totpSetupMsg.textContent = data.erro || 'Erro ao gerar chave de autenticação.';
        totpSetupMsg.classList.add('visible');
      }
      return;
    }

    if (totpSecretKey) totpSecretKey.textContent = data.secret;
    if (totpUriLink) {
      totpUriLink.href = data.uri;
      totpUriLink.textContent = data.uri;
    }
    const totpQrCode = document.getElementById('totpQrCode');
    if (totpQrCode && data.qrCode) {
      totpQrCode.src = data.qrCode;
      totpQrCode.style.display = 'block';
    }
    if (totpSetupContent) totpSetupContent.style.display = 'block';
    if (btnIniciarTotpSetup) btnIniciarTotpSetup.style.display = 'none';
    if (totpAtivoInfo) totpAtivoInfo.style.display = 'none';
    if (totpSetupArea) totpSetupArea.style.display = 'block';
    if (inputConfirmTotp) {
      inputConfirmTotp.value = '';
      inputConfirmTotp.focus();
    }
  } catch (err) {
    if (totpSetupMsg) {
      totpSetupMsg.textContent = 'Falha na comunicação ao gerar segredo do autenticador.';
      totpSetupMsg.classList.add('visible');
    }
  }
}

async function confirmarAtivacaoTotp() {
  limparMensagensSeguranca();
  const codigo = inputConfirmTotp ? inputConfirmTotp.value.trim() : '';

  if (!/^\d{6}$/.test(codigo)) {
    if (totpSetupMsg) {
      totpSetupMsg.textContent = 'Informe o código de exatamente 6 dígitos numéricos.';
      totpSetupMsg.classList.add('visible');
    }
    return;
  }

  try {
    const res = await fetch('/api/seguranca/totp-confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
      ...fetchOptions
    });

    const data = await res.json();
    if (!res.ok) {
      if (totpSetupMsg) {
        totpSetupMsg.textContent = data.erro || 'Código incorreto ou expirado.';
        totpSetupMsg.classList.add('visible');
      }
      return;
    }

    if (totpSetupSuccess) {
      totpSetupSuccess.textContent = data.mensagem || '2FA ativado com sucesso!';
      totpSetupSuccess.classList.add('visible');
    }

    setTimeout(() => {
      carregarStatusSeguranca();
    }, 1200);

  } catch (err) {
    if (totpSetupMsg) {
      totpSetupMsg.textContent = 'Erro ao confirmar ativação do 2FA.';
      totpSetupMsg.classList.add('visible');
    }
  }
}

async function handleTrocarSenha(e) {
  e.preventDefault();
  limparMensagensSeguranca();

  const senha_atual       = inputSenhaAtual ? inputSenhaAtual.value : '';
  const nova_senha        = inputNovaSenha ? inputNovaSenha.value : '';
  const confirmacao_senha = inputConfirmarSenha ? inputConfirmarSenha.value : '';
  const codigo_totp       = inputTotpPass ? inputTotpPass.value.trim() : '';

  if (!senha_atual || !nova_senha || !confirmacao_senha || !codigo_totp) {
    if (trocarSenhaMsg) {
      trocarSenhaMsg.textContent = 'Preencha todos os campos obrigatórios e o código TOTP.';
      trocarSenhaMsg.classList.add('visible');
    }
    return;
  }

  if (nova_senha !== confirmacao_senha) {
    if (trocarSenhaMsg) {
      trocarSenhaMsg.textContent = 'A nova senha e a confirmação não coincidem.';
      trocarSenhaMsg.classList.add('visible');
    }
    return;
  }

  if (nova_senha.length < 8) {
    if (trocarSenhaMsg) {
      trocarSenhaMsg.textContent = 'A nova senha deve ter no mínimo 8 caracteres.';
      trocarSenhaMsg.classList.add('visible');
    }
    return;
  }

  if (senha_atual === nova_senha) {
    if (trocarSenhaMsg) {
      trocarSenhaMsg.textContent = 'A nova senha deve ser diferente da senha atual.';
      trocarSenhaMsg.classList.add('visible');
    }
    return;
  }

  if (!/^\d{6}$/.test(codigo_totp)) {
    if (trocarSenhaMsg) {
      trocarSenhaMsg.textContent = 'O código TOTP deve ter exatamente 6 dígitos numéricos.';
      trocarSenhaMsg.classList.add('visible');
    }
    return;
  }

  if (btnSubmitTrocarSenha) {
    btnSubmitTrocarSenha.disabled = true;
    btnSubmitTrocarSenha.textContent = 'Validando segundo fator...';
  }

  try {
    const res = await fetch('/api/seguranca/trocar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha_atual, nova_senha, confirmacao_senha, codigo_totp }),
      ...fetchOptions
    });

    const data = await res.json();

    if (!res.ok) {
      if (trocarSenhaMsg) {
        trocarSenhaMsg.textContent = data.erro || 'Falha ao alterar senha.';
        trocarSenhaMsg.classList.add('visible');
      }
      return;
    }

    if (trocarSenhaSuccess) {
      trocarSenhaSuccess.textContent = data.mensagem || 'Senha alterada com sucesso com confirmação TOTP!';
      trocarSenhaSuccess.classList.add('visible');
    }

    if (formTrocarSenha) formTrocarSenha.reset();

  } catch (err) {
    if (trocarSenhaMsg) {
      trocarSenhaMsg.textContent = 'Erro ao processar solicitação de alteração de senha.';
      trocarSenhaMsg.classList.add('visible');
    }
  } finally {
    if (btnSubmitTrocarSenha) {
      btnSubmitTrocarSenha.disabled = false;
      btnSubmitTrocarSenha.textContent = 'Confirmar Alteração de Senha';
    }
  }
}


if (navSecurity) {
  navSecurity.addEventListener('click', (e) => {
    e.preventDefault();
    abrirModalSeguranca();
  });
}
if (closeSecBtn) closeSecBtn.addEventListener('click', fecharModalSeguranca);
if (closeSecFooter) closeSecFooter.addEventListener('click', fecharModalSeguranca);
if (secModal) {
  secModal.addEventListener('click', (e) => {
    if (e.target === secModal) fecharModalSeguranca();
  });
}

if (btnCopiarTotpSecret) {
  btnCopiarTotpSecret.addEventListener('click', async () => {
    const secret = totpSecretKey ? totpSecretKey.textContent.trim() : '';
    if (!secret || secret.includes('-')) return;
    try {
      await navigator.clipboard.writeText(secret);
      const original = btnCopiarTotpSecret.textContent;
      btnCopiarTotpSecret.textContent = 'Copiado!';
      setTimeout(() => { btnCopiarTotpSecret.textContent = original; }, 2000);
    } catch {
      /* clipboard fallback */
    }
  });
}

if (btnIniciarTotpSetup) btnIniciarTotpSetup.addEventListener('click', iniciarConfiguracaoTotp);
if (btnConfirmarTotp) btnConfirmarTotp.addEventListener('click', confirmarAtivacaoTotp);
if (formTrocarSenha) {
  formTrocarSenha.addEventListener('submit', handleTrocarSenha);
}


document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (equipModal && equipModal.style.display === 'flex') fecharModalEquipamentos();
    if (secModal && secModal.style.display === 'flex') fecharModalSeguranca();
  }
});


function verificarHashRota() {
  if (window.location.hash === '#equipamentos') {
    abrirModalEquipamentos();
  } else if (window.location.hash === '#seguranca') {
    abrirModalSeguranca();
  }
}

verificarHashRota();
window.addEventListener('hashchange', verificarHashRota);

