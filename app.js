/* ===================== Mi Finanzas — App Logic ===================== */

const STORAGE_KEY = 'miFinanzasData_v1';

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTHS_SHORT_ES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const DAYS_SHORT_ES = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];

const CATEGORY_EMOJI = {
  'Salario': '💰', 'Bono': '🎁', 'Ventas': '🛍️', 'Otros ingresos': '💵',
  'Alimentación': '🍔', 'Vivienda': '🏠', 'Transporte': '⛽', 'Entretenimiento': '🎬',
  'Salud': '⚕️', 'Educación': '📚', 'Ropa': '👕', 'Servicios': '💡', 'Otros': '📦'
};

const CURRENCY_SYMBOL = { COP: '$', USD: '$', MXN: '$', EUR: '€', ARS: '$', PEN: 'S/', CLP: '$' };

function defaultState() {
  return {
    settings: {
      nombre: '',
      moneda: 'COP',
      categoriasIngreso: ['Salario', 'Bono', 'Ventas', 'Otros ingresos'],
      categoriasGasto: ['Alimentación', 'Vivienda', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Otros'],
      metodosPago: ['Efectivo', 'Tarjeta débito', 'Tarjeta de crédito', 'Transferencia'],
      alertasPresupuesto: true,
      alertasPagos: true
    },
    accounts: [
      { id: uid(), nombre: 'Efectivo', tipo: 'efectivo', saldoInicial: 0, createdAt: Date.now() }
    ],
    movements: [],
    budgets: [],
    goals: [],
    debts: []
  };
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ===================== Persistence ===================== */
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const def = defaultState();
    return {
      settings: Object.assign({}, def.settings, parsed.settings),
      accounts: parsed.accounts && parsed.accounts.length ? parsed.accounts : def.accounts,
      movements: parsed.movements || [],
      budgets: parsed.budgets || [],
      goals: parsed.goals || [],
      debts: parsed.debts || []
    };
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ===================== Utilities ===================== */
function formatMoney(value) {
  const sym = CURRENCY_SYMBOL[state.settings.moneda] || '$';
  const neg = value < 0;
  const abs = Math.round(Math.abs(value));
  const withDots = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + sym + withDots;
}

function parseMoneyInput(str) {
  if (!str) return 0;
  const digits = str.toString().replace(/[^\d-]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function attachMoneyFormatting(input) {
  input.addEventListener('input', () => {
    const cursorFromEnd = input.value.length - input.selectionStart;
    const num = parseMoneyInput(input.value);
    input.value = num ? new Intl.NumberFormat('es-CO').format(num) : '';
    const pos = Math.max(0, input.value.length - cursorFromEnd);
    input.setSelectionRange(pos, pos);
  });
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function pad(n) { return n.toString().padStart(2, '0'); }

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameMonth(iso, refDate) {
  const d = parseISO(iso);
  return d.getFullYear() === refDate.getFullYear() && d.getMonth() === refDate.getMonth();
}

function formatDateShort(iso) {
  const d = parseISO(iso);
  return d.getDate() + ' ' + MONTHS_SHORT_ES[d.getMonth()];
}

function formatDateLong(iso) {
  const d = parseISO(iso);
  return d.getDate() + ' de ' + MONTHS_ES[d.getMonth()] + ' de ' + d.getFullYear();
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ===================== Domain calculations ===================== */
function accountEffect(mov, accountId) {
  let effect = 0;
  if (mov.tipo === 'ingreso' && mov.cuenta === accountId) effect += mov.valor;
  if (mov.tipo === 'gasto' && mov.cuenta === accountId) effect -= mov.valor;
  if (mov.tipo === 'transferencia') {
    if (mov.cuenta === accountId) effect -= mov.valor;
    if (mov.cuentaDestino === accountId) effect += mov.valor;
  }
  return effect;
}

function getAccountBalance(accountId) {
  const acc = state.accounts.find(a => a.id === accountId);
  if (!acc) return 0;
  let total = acc.saldoInicial || 0;
  state.movements.forEach(m => { total += accountEffect(m, accountId); });
  return total;
}

function getTotalBalance() {
  return state.accounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
}

function getPendingPayments() {
  return state.debts.reduce((sum, d) => sum + (d.saldo > 0 ? (d.cuota || 0) : 0), 0);
}

function getMovementsInRange(startDate, endDate) {
  return state.movements.filter(m => {
    const d = parseISO(m.fecha);
    return d >= startDate && d <= endDate;
  });
}

function getMonthTotals(refDate) {
  const monthMovs = state.movements.filter(m => isSameMonth(m.fecha, refDate));
  const ingresos = monthMovs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.valor, 0);
  const gastos = monthMovs.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.valor, 0);
  return { ingresos, gastos };
}

function getCategorySpent(categoria, refDate) {
  return state.movements
    .filter(m => m.tipo === 'gasto' && m.categoria === categoria && isSameMonth(m.fecha, refDate))
    .reduce((s, m) => s + m.valor, 0);
}

function getPatrimonio() {
  const activos = getTotalBalance();
  const pasivos = state.debts.reduce((s, d) => s + Math.max(0, d.saldo), 0);
  return activos - pasivos;
}

function monthsBack(n) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    arr.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return arr;
}

/* ===================== Modal helpers ===================== */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
});

let confirmCallback = null;
function askConfirm(title, message, onAccept) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  confirmCallback = onAccept;
  openModal('modalConfirm');
}
document.getElementById('confirmCancel').addEventListener('click', () => closeModal('modalConfirm'));
document.getElementById('confirmAccept').addEventListener('click', () => {
  closeModal('modalConfirm');
  if (confirmCallback) confirmCallback();
});

/* ===================== Navigation ===================== */
const views = ['inicio', 'movimientos', 'cuentas', 'presupuesto', 'metas', 'deudas', 'informes', 'configuracion'];

function switchView(name) {
  views.forEach(v => {
    document.getElementById('view-' + v).classList.toggle('active', v === name);
  });
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === name));
  document.querySelectorAll('.bn-item').forEach(el => el.classList.toggle('active', el.dataset.view === name));
  document.getElementById('main').scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  window.scrollTo(0, 0);
  renderView(name);
}

document.querySelectorAll('.nav-item[data-view]').forEach(el => {
  el.addEventListener('click', () => switchView(el.dataset.view));
});
document.querySelectorAll('.bn-item[data-view]').forEach(el => {
  el.addEventListener('click', () => switchView(el.dataset.view));
});
document.querySelectorAll('[data-view-link]').forEach(el => {
  el.addEventListener('click', () => switchView(el.dataset.viewLink));
});
document.getElementById('bnFab').addEventListener('click', () => openMovModal('ingreso'));

/* ===================== Render dispatcher ===================== */
function renderView(name) {
  if (name === 'inicio') renderInicio();
  else if (name === 'movimientos') renderMovimientos();
  else if (name === 'cuentas') renderCuentas();
  else if (name === 'presupuesto') renderPresupuesto();
  else if (name === 'metas') renderMetas();
  else if (name === 'deudas') renderDeudas();
  else if (name === 'informes') renderInformes();
  else if (name === 'configuracion') renderConfiguracion();
}

function renderAll() {
  const active = document.querySelector('.view.active');
  if (active) renderView(active.id.replace('view-', ''));
}

/* ===================== INICIO ===================== */
function renderInicio() {
  const now = new Date();
  const hour = now.getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = state.settings.nombre ? ', ' + state.settings.nombre : '';
  document.getElementById('greeting').textContent = `${saludo}${nombre} 👋`;
  document.getElementById('monthLabel').textContent = `Resumen financiero · ${MONTHS_ES[now.getMonth()][0].toUpperCase()}${MONTHS_ES[now.getMonth()].slice(1)} ${now.getFullYear()}`;

  const saldoTotal = getTotalBalance();
  const pendientes = getPendingPayments();
  const disponibleReal = saldoTotal - pendientes;

  document.getElementById('saldoTotal').textContent = formatMoney(saldoTotal);
  document.getElementById('disponibleReal').textContent = formatMoney(disponibleReal);

  const { ingresos, gastos } = getMonthTotals(now);
  document.getElementById('statIngresos').textContent = formatMoney(ingresos);
  document.getElementById('statGastos').textContent = formatMoney(gastos);

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevTotals = getMonthTotals(prevMonth);
  document.getElementById('trendIngresos').innerHTML = trendHtml(ingresos, prevTotals.ingresos, true);
  document.getElementById('trendGastos').innerHTML = trendHtml(gastos, prevTotals.gastos, false);

  const disponibleMes = ingresos - gastos - pendientes;
  document.getElementById('puedesGastar').textContent = formatMoney(disponibleMes);
  document.getElementById('bIngresos').textContent = formatMoney(ingresos);
  document.getElementById('bGastos').textContent = '-' + formatMoney(gastos).replace('-', '');
  document.getElementById('bPendientes').textContent = pendientes ? '-' + formatMoney(pendientes).replace('-', '') : formatMoney(0);
  document.getElementById('bDisponible').textContent = formatMoney(disponibleMes);

  const recent = [...state.movements]
    .sort((a, b) => (b.fecha + b.createdAt).localeCompare(a.fecha + a.createdAt))
    .slice(0, 5);
  document.getElementById('recentMovements').innerHTML = recent.length
    ? recent.map(renderMovementRowHtml).join('')
    : '<p class="empty-state">Aún no hay movimientos registrados.</p>';
  attachMovementRowEvents(document.getElementById('recentMovements'));

  document.getElementById('homeChart').innerHTML = buildTrendChartSVG(monthsBack(6));
}

function trendHtml(current, previous, isIncome) {
  if (!previous) return '';
  const diff = current - previous;
  const pct = previous ? (diff / previous) * 100 : 0;
  const up = diff >= 0;
  const good = isIncome ? up : !up;
  const arrow = up ? '↑' : '↓';
  const color = good ? 'var(--income)' : 'var(--expense)';
  return `<span style="color:${color}">${arrow} ${Math.abs(pct).toFixed(1)}%</span> vs mes anterior`;
}

/* ===================== Movement row rendering ===================== */
function movementIcon(m) {
  if (m.tipo === 'transferencia') return '⇄';
  return CATEGORY_EMOJI[m.categoria] || (m.tipo === 'ingreso' ? '💰' : '💸');
}

function accountName(id) {
  const a = state.accounts.find(a => a.id === id);
  return a ? a.nombre : '—';
}

function renderMovementRowHtml(m) {
  const sign = m.tipo === 'ingreso' ? '+' : m.tipo === 'gasto' ? '-' : '';
  const cls = m.tipo === 'ingreso' ? 'income' : m.tipo === 'gasto' ? 'expense' : 'transfer';
  const sub = m.tipo === 'transferencia'
    ? `${accountName(m.cuenta)} → ${accountName(m.cuentaDestino)}`
    : (m.categoria || '—');
  return `
    <div class="movement-row" data-mov-id="${m.id}">
      <div class="mv-icon">${movementIcon(m)}</div>
      <div class="mv-info">
        <div class="mv-desc">${escapeHtml(m.descripcion || m.categoria || 'Movimiento')}</div>
        <div class="mv-cat">${escapeHtml(sub)} · ${formatDateShort(m.fecha)}</div>
      </div>
      <div class="mv-amount ${cls}">${sign}${formatMoney(m.valor)}</div>
    </div>`;
}

function attachMovementRowEvents(container) {
  container.querySelectorAll('.movement-row').forEach(row => {
    row.addEventListener('click', () => openMovModal(null, row.dataset.movId));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===================== MOVIMIENTOS view ===================== */
let currentMovFilter = 'todos';
document.getElementById('movFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#movFilters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  currentMovFilter = btn.dataset.filter;
  renderMovimientos();
});

function renderMovimientos() {
  let list = [...state.movements];
  if (currentMovFilter !== 'todos') list = list.filter(m => m.tipo === currentMovFilter);
  list.sort((a, b) => (b.fecha + b.createdAt).localeCompare(a.fecha + a.createdAt));

  document.getElementById('movEmpty').hidden = list.length > 0;

  let html = '';
  let lastDate = null;
  list.forEach(m => {
    if (m.fecha !== lastDate) {
      html += `<div class="movement-group-label">${formatDateShort(m.fecha)}</div>`;
      lastDate = m.fecha;
    }
    html += renderMovementRowHtml(m);
  });
  document.getElementById('allMovements').innerHTML = html;
  attachMovementRowEvents(document.getElementById('allMovements'));
}

/* ===================== Movement modal ===================== */
let currentMovTipo = 'ingreso';

document.getElementById('btnNuevoMovimiento').addEventListener('click', () => openMovModal('ingreso'));

document.getElementById('movTipoSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  setMovTipo(btn.dataset.tipo);
});

function setMovTipo(tipo) {
  currentMovTipo = tipo;
  document.getElementById('movTipo').value = tipo;
  document.querySelectorAll('#movTipoSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tipo === tipo));
  document.getElementById('movCategoriaRow').hidden = tipo === 'transferencia';
  document.getElementById('movCuentaDestinoRow').hidden = tipo !== 'transferencia';
  document.getElementById('movCuentaLabel').textContent = tipo === 'transferencia' ? 'Cuenta origen' : 'Cuenta';
  populateCategorySelect(tipo);
}

function populateCategorySelect(tipo) {
  const sel = document.getElementById('movCategoria');
  const cats = tipo === 'ingreso' ? state.settings.categoriasIngreso : state.settings.categoriasGasto;
  sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function populateAccountSelects() {
  const opts = state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.nombre)} (${formatMoney(getAccountBalance(a.id))})</option>`).join('');
  document.getElementById('movCuenta').innerHTML = opts;
  document.getElementById('movCuentaDestino').innerHTML = opts;
  document.getElementById('metaCuenta').innerHTML = '<option value="">Ninguna</option>' + state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.nombre)}</option>`).join('');
}

function populateMetodoSelect() {
  document.getElementById('movMetodo').innerHTML = state.settings.metodosPago.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
}

function openMovModal(tipoDefault, movId) {
  populateAccountSelects();
  populateMetodoSelect();
  const form = document.getElementById('formMovimiento');
  form.reset();
  document.getElementById('btnEliminarMovimiento').hidden = true;

  if (movId) {
    const m = state.movements.find(x => x.id === movId);
    if (!m) return;
    document.getElementById('movModalTitle').textContent = 'Editar movimiento';
    document.getElementById('movId').value = m.id;
    setMovTipo(m.tipo);
    document.getElementById('movValor').value = new Intl.NumberFormat('es-CO').format(m.valor);
    document.getElementById('movDescripcion').value = m.descripcion || '';
    populateCategorySelect(m.tipo);
    document.getElementById('movCategoria').value = m.categoria || '';
    document.getElementById('movCuenta').value = m.cuenta || '';
    document.getElementById('movCuentaDestino').value = m.cuentaDestino || '';
    document.getElementById('movFecha').value = m.fecha;
    document.getElementById('movMetodo').value = m.metodo || '';
    document.getElementById('movNota').value = m.nota || '';
    document.getElementById('btnEliminarMovimiento').hidden = false;
  } else {
    document.getElementById('movModalTitle').textContent = 'Nuevo movimiento';
    document.getElementById('movId').value = '';
    setMovTipo(tipoDefault || 'ingreso');
    document.getElementById('movFecha').value = todayISO();
    if (state.accounts.length) document.getElementById('movCuenta').value = state.accounts[0].id;
  }
  openModal('modalMovimiento');
}

document.querySelectorAll('[data-quick]').forEach(btn => {
  btn.addEventListener('click', () => openMovModal(btn.dataset.quick));
});

attachMoneyFormatting(document.getElementById('movValor'));

document.getElementById('formMovimiento').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!state.accounts.length) { toast('Primero crea una cuenta'); return; }
  const id = document.getElementById('movId').value;
  const tipo = document.getElementById('movTipo').value;
  const valor = parseMoneyInput(document.getElementById('movValor').value);
  if (!valor) { toast('Ingresa un valor válido'); return; }
  const cuenta = document.getElementById('movCuenta').value;
  const cuentaDestino = document.getElementById('movCuentaDestino').value;
  if (tipo === 'transferencia' && cuenta === cuentaDestino) { toast('Elige cuentas distintas'); return; }

  const data = {
    tipo, valor,
    descripcion: document.getElementById('movDescripcion').value.trim(),
    categoria: tipo === 'transferencia' ? '' : document.getElementById('movCategoria').value,
    cuenta,
    cuentaDestino: tipo === 'transferencia' ? cuentaDestino : '',
    fecha: document.getElementById('movFecha').value || todayISO(),
    metodo: document.getElementById('movMetodo').value,
    nota: document.getElementById('movNota').value.trim()
  };

  if (id) {
    const idx = state.movements.findIndex(m => m.id === id);
    if (idx >= 0) state.movements[idx] = Object.assign(state.movements[idx], data);
    toast('Movimiento actualizado');
  } else {
    data.id = uid();
    data.createdAt = Date.now();
    state.movements.push(data);
    toast('Movimiento guardado');
  }
  saveState();
  closeModal('modalMovimiento');
  renderAll();
});

document.getElementById('btnEliminarMovimiento').addEventListener('click', () => {
  const id = document.getElementById('movId').value;
  askConfirm('Eliminar movimiento', 'Esta acción no se puede deshacer.', () => {
    state.movements = state.movements.filter(m => m.id !== id);
    saveState();
    closeModal('modalMovimiento');
    renderAll();
    toast('Movimiento eliminado');
  });
});

/* ===================== CUENTAS ===================== */
const ACCOUNT_EMOJI = { banco: '🏦', efectivo: '💵', tarjeta: '💳', otro: '📦' };

function renderCuentas() {
  const grid = document.getElementById('accountsGrid');
  grid.innerHTML = state.accounts.map(a => {
    const balance = getAccountBalance(a.id);
    const count = state.movements.filter(m => m.cuenta === a.id || m.cuentaDestino === a.id).length;
    return `
      <div class="entity-card" data-account-id="${a.id}">
        <div class="entity-card-title"><span>${ACCOUNT_EMOJI[a.tipo] || '📦'}</span> ${escapeHtml(a.nombre)}</div>
        <div class="entity-card-value ${balance < 0 ? 'negative' : ''}">${formatMoney(balance)}</div>
        <div class="entity-card-sub">${count} movimiento${count === 1 ? '' : 's'}</div>
      </div>`;
  }).join('') + `<div class="entity-card" id="addAccountCard" style="align-items:center;justify-content:center;color:var(--primary);font-weight:700;cursor:pointer;">＋ Agregar cuenta</div>`;

  grid.querySelectorAll('[data-account-id]').forEach(card => {
    card.addEventListener('click', () => openCuentaModal(card.dataset.accountId));
  });
  document.getElementById('addAccountCard').addEventListener('click', () => openCuentaModal());
}

document.getElementById('btnNuevaCuenta').addEventListener('click', () => openCuentaModal());
attachMoneyFormatting(document.getElementById('cuentaSaldo'));

function openCuentaModal(accountId) {
  const form = document.getElementById('formCuenta');
  form.reset();
  document.getElementById('btnEliminarCuenta').hidden = true;
  if (accountId) {
    const a = state.accounts.find(x => x.id === accountId);
    document.getElementById('cuentaModalTitle').textContent = 'Editar cuenta';
    document.getElementById('cuentaId').value = a.id;
    document.getElementById('cuentaNombre').value = a.nombre;
    document.getElementById('cuentaTipo').value = a.tipo;
    document.getElementById('cuentaSaldo').value = new Intl.NumberFormat('es-CO').format(a.saldoInicial);
    document.getElementById('btnEliminarCuenta').hidden = false;
  } else {
    document.getElementById('cuentaModalTitle').textContent = 'Nueva cuenta';
    document.getElementById('cuentaId').value = '';
  }
  openModal('modalCuenta');
}

document.getElementById('formCuenta').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('cuentaId').value;
  const data = {
    nombre: document.getElementById('cuentaNombre').value.trim(),
    tipo: document.getElementById('cuentaTipo').value,
    saldoInicial: parseMoneyInput(document.getElementById('cuentaSaldo').value)
  };
  if (!data.nombre) return;
  if (id) {
    const acc = state.accounts.find(a => a.id === id);
    Object.assign(acc, data);
    toast('Cuenta actualizada');
  } else {
    data.id = uid();
    data.createdAt = Date.now();
    state.accounts.push(data);
    toast('Cuenta creada');
  }
  saveState();
  closeModal('modalCuenta');
  renderAll();
});

document.getElementById('btnEliminarCuenta').addEventListener('click', () => {
  const id = document.getElementById('cuentaId').value;
  const inUse = state.movements.some(m => m.cuenta === id || m.cuentaDestino === id);
  askConfirm('Eliminar cuenta', inUse ? 'Esta cuenta tiene movimientos asociados. Se eliminará igualmente.' : 'Esta acción no se puede deshacer.', () => {
    state.accounts = state.accounts.filter(a => a.id !== id);
    saveState();
    closeModal('modalCuenta');
    renderAll();
    toast('Cuenta eliminada');
  });
});

/* ===================== PRESUPUESTO ===================== */
function renderPresupuesto() {
  const now = new Date();
  document.getElementById('budgetMonthLabel').textContent = `${cap(MONTHS_ES[now.getMonth()])} ${now.getFullYear()}`;

  const list = document.getElementById('budgetList');
  const alertsBox = document.getElementById('budgetAlerts');
  document.getElementById('budgetEmpty').hidden = state.budgets.length > 0;
  alertsBox.hidden = true;

  let alertsHtml = '';
  list.innerHTML = state.budgets.map(b => {
    const gastado = getCategorySpent(b.categoria, now);
    const pct = b.limite ? Math.min(999, Math.round((gastado / b.limite) * 100)) : 0;
    const barClass = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : '';
    if (state.settings.alertasPresupuesto && pct >= 100) {
      alertsHtml += `<div class="budget-alert">🚨 Superaste tu presupuesto de <strong>${escapeHtml(b.categoria)}</strong> por ${formatMoney(gastado - b.limite)}.</div>`;
    } else if (state.settings.alertasPresupuesto && pct >= 80) {
      alertsHtml += `<div class="budget-alert">⚠️ Has utilizado el ${pct}% de tu presupuesto de ${escapeHtml(b.categoria)}.</div>`;
    }
    return `
      <div class="budget-item" data-budget-id="${b.id}">
        <div class="budget-item-head"><span>${CATEGORY_EMOJI[b.categoria] || '📦'} ${escapeHtml(b.categoria)}</span><span>${pct}%</span></div>
        <div class="progress-track"><div class="progress-fill ${barClass}" style="width:${Math.min(100, pct)}%"></div></div>
        <div class="budget-item-nums"><span>${formatMoney(gastado)} de ${formatMoney(b.limite)}</span><span>${formatMoney(Math.max(0, b.limite - gastado))} disponible</span></div>
      </div>`;
  }).join('');

  if (alertsHtml) { alertsBox.innerHTML = alertsHtml; alertsBox.hidden = false; }

  list.querySelectorAll('[data-budget-id]').forEach(item => {
    item.addEventListener('click', () => openPresupuestoModal(item.dataset.budgetId));
  });
}

document.getElementById('btnNuevoPresupuesto').addEventListener('click', () => openPresupuestoModal());
attachMoneyFormatting(document.getElementById('presupuestoLimite'));

function openPresupuestoModal(budgetId) {
  const form = document.getElementById('formPresupuesto');
  form.reset();
  document.getElementById('presupuestoCategoria').innerHTML = state.settings.categoriasGasto.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  document.getElementById('btnEliminarPresupuesto').hidden = true;
  if (budgetId) {
    const b = state.budgets.find(x => x.id === budgetId);
    document.getElementById('presupuestoId').value = b.id;
    document.getElementById('presupuestoCategoria').value = b.categoria;
    document.getElementById('presupuestoLimite').value = new Intl.NumberFormat('es-CO').format(b.limite);
    document.getElementById('btnEliminarPresupuesto').hidden = false;
  } else {
    document.getElementById('presupuestoId').value = '';
  }
  openModal('modalPresupuesto');
}

document.getElementById('formPresupuesto').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('presupuestoId').value;
  const categoria = document.getElementById('presupuestoCategoria').value;
  const limite = parseMoneyInput(document.getElementById('presupuestoLimite').value);
  if (!limite) return;
  if (id) {
    Object.assign(state.budgets.find(b => b.id === id), { categoria, limite });
    toast('Presupuesto actualizado');
  } else {
    const existing = state.budgets.find(b => b.categoria === categoria);
    if (existing) { existing.limite = limite; toast('Presupuesto actualizado'); }
    else { state.budgets.push({ id: uid(), categoria, limite }); toast('Presupuesto creado'); }
  }
  saveState();
  closeModal('modalPresupuesto');
  renderAll();
});

document.getElementById('btnEliminarPresupuesto').addEventListener('click', () => {
  const id = document.getElementById('presupuestoId').value;
  askConfirm('Eliminar presupuesto', 'Esta acción no se puede deshacer.', () => {
    state.budgets = state.budgets.filter(b => b.id !== id);
    saveState();
    closeModal('modalPresupuesto');
    renderAll();
    toast('Presupuesto eliminado');
  });
});

/* ===================== METAS ===================== */
function renderMetas() {
  const grid = document.getElementById('goalsGrid');
  document.getElementById('goalsEmpty').hidden = state.goals.length > 0;
  grid.innerHTML = state.goals.map(g => {
    const pct = g.objetivo ? Math.min(100, Math.round((g.actual / g.objetivo) * 100)) : 0;
    return `
      <div class="entity-card" data-goal-id="${g.id}">
        <div class="entity-card-title">🎯 ${escapeHtml(g.nombre)}</div>
        <div class="entity-card-value">${formatMoney(g.actual)} <span style="font-size:13px;color:var(--text-muted);font-weight:500;">/ ${formatMoney(g.objetivo)}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="entity-card-sub">${pct}% completado${g.fecha ? ' · meta: ' + formatDateShort(g.fecha) : ''}</div>
      </div>`;
  }).join('');
  grid.querySelectorAll('[data-goal-id]').forEach(card => {
    card.addEventListener('click', () => openMetaModal(card.dataset.goalId));
  });
}

document.getElementById('btnNuevaMeta').addEventListener('click', () => openMetaModal());
[['metaObjetivo'], ['metaActual'], ['metaAporte']].forEach(([id]) => attachMoneyFormatting(document.getElementById(id)));

function openMetaModal(goalId) {
  const form = document.getElementById('formMeta');
  form.reset();
  populateAccountSelects();
  document.getElementById('btnEliminarMeta').hidden = true;
  document.getElementById('btnAportarMeta').hidden = true;
  if (goalId) {
    const g = state.goals.find(x => x.id === goalId);
    document.getElementById('metaModalTitle').textContent = 'Editar meta';
    document.getElementById('metaId').value = g.id;
    document.getElementById('metaNombre').value = g.nombre;
    document.getElementById('metaObjetivo').value = new Intl.NumberFormat('es-CO').format(g.objetivo);
    document.getElementById('metaActual').value = new Intl.NumberFormat('es-CO').format(g.actual || 0);
    document.getElementById('metaFecha').value = g.fecha || '';
    document.getElementById('metaAporte').value = g.aporte ? new Intl.NumberFormat('es-CO').format(g.aporte) : '';
    document.getElementById('metaCuenta').value = g.cuenta || '';
    document.getElementById('btnEliminarMeta').hidden = false;
    document.getElementById('btnAportarMeta').hidden = false;
    document.getElementById('btnAportarMeta').dataset.goalId = g.id;
  } else {
    document.getElementById('metaModalTitle').textContent = 'Nueva meta';
    document.getElementById('metaId').value = '';
  }
  openModal('modalMeta');
}

document.getElementById('formMeta').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('metaId').value;
  const data = {
    nombre: document.getElementById('metaNombre').value.trim(),
    objetivo: parseMoneyInput(document.getElementById('metaObjetivo').value),
    actual: parseMoneyInput(document.getElementById('metaActual').value),
    fecha: document.getElementById('metaFecha').value,
    aporte: parseMoneyInput(document.getElementById('metaAporte').value),
    cuenta: document.getElementById('metaCuenta').value
  };
  if (!data.nombre || !data.objetivo) return;
  if (id) { Object.assign(state.goals.find(g => g.id === id), data); toast('Meta actualizada'); }
  else { data.id = uid(); state.goals.push(data); toast('Meta creada'); }
  saveState();
  closeModal('modalMeta');
  renderAll();
});

document.getElementById('btnEliminarMeta').addEventListener('click', () => {
  const id = document.getElementById('metaId').value;
  askConfirm('Eliminar meta', 'Esta acción no se puede deshacer.', () => {
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
    closeModal('modalMeta');
    renderAll();
    toast('Meta eliminada');
  });
});

document.getElementById('btnAportarMeta').addEventListener('click', () => {
  const goalId = document.getElementById('btnAportarMeta').dataset.goalId;
  openMontoModal('Registrar aporte', 'Valor del aporte', (valor) => {
    const g = state.goals.find(x => x.id === goalId);
    g.actual = (g.actual || 0) + valor;
    saveState();
    closeModal('modalMeta');
    renderAll();
    toast('Aporte registrado');
  });
});

/* ===================== DEUDAS ===================== */
function addMonthsISO(iso, months) {
  const d = parseISO(iso);
  const target = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  return target.getFullYear() + '-' + pad(target.getMonth() + 1) + '-' + pad(target.getDate());
}

function debtPaidTotal(d) {
  return (d.pagos || []).reduce((s, p) => s + p.valor, 0);
}

function renderDeudas() {
  const grid = document.getElementById('debtsGrid');
  document.getElementById('debtsEmpty').hidden = state.debts.length > 0;
  document.getElementById('deudaTotal').textContent = formatMoney(state.debts.reduce((s, d) => s + Math.max(0, d.saldo), 0));
  grid.innerHTML = state.debts.map(d => {
    const original = d.montoOriginal || (d.saldo + debtPaidTotal(d));
    const pagado = debtPaidTotal(d);
    const pct = original ? Math.min(100, Math.round((pagado / original) * 100)) : 0;
    return `
    <div class="entity-card" data-debt-id="${d.id}">
      <div class="entity-card-title">💳 ${escapeHtml(d.nombre)}</div>
      <div class="entity-card-value ${d.saldo > 0 ? 'negative' : ''}">${d.saldo > 0 ? formatMoney(d.saldo) : 'Pagada ✅'}</div>
      ${original ? `<div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>` : ''}
      <div class="entity-card-sub">
        ${original ? `${pct}% pagado de ${formatMoney(original)}` : ''}
        ${d.saldo > 0 ? `${original ? ' · ' : ''}Cuota: ${formatMoney(d.cuota || 0)}${d.fecha ? ' · Vence: ' + formatDateShort(d.fecha) : ''}` : ''}
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-debt-id]').forEach(card => {
    card.addEventListener('click', () => openDeudaModal(card.dataset.debtId));
  });
}

document.getElementById('btnNuevaDeuda').addEventListener('click', () => openDeudaModal());
attachMoneyFormatting(document.getElementById('deudaMontoOriginal'));
attachMoneyFormatting(document.getElementById('deudaSaldo'));
attachMoneyFormatting(document.getElementById('deudaCuota'));

function renderDeudaHistorial(d) {
  const wrap = document.getElementById('deudaHistorialWrap');
  const list = document.getElementById('deudaHistorial');
  const pagos = [...(d.pagos || [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!pagos.length) { wrap.hidden = true; list.innerHTML = ''; return; }
  wrap.hidden = false;
  list.innerHTML = pagos.map(p => `
    <div class="movement-row" style="cursor:default;">
      <div class="mv-icon">💳</div>
      <div class="mv-info">
        <div class="mv-desc">Pago registrado</div>
        <div class="mv-cat">${formatDateShort(p.fecha)}</div>
      </div>
      <div class="mv-amount expense">-${formatMoney(p.valor)}</div>
    </div>`).join('');
}

function openDeudaModal(debtId) {
  const form = document.getElementById('formDeuda');
  form.reset();
  document.getElementById('btnEliminarDeuda').hidden = true;
  document.getElementById('btnPagarDeuda').hidden = true;
  if (debtId) {
    const d = state.debts.find(x => x.id === debtId);
    document.getElementById('deudaModalTitle').textContent = 'Editar deuda';
    document.getElementById('deudaId').value = d.id;
    document.getElementById('deudaNombre').value = d.nombre;
    document.getElementById('deudaMontoOriginal').value = d.montoOriginal ? new Intl.NumberFormat('es-CO').format(d.montoOriginal) : '';
    document.getElementById('deudaSaldo').value = new Intl.NumberFormat('es-CO').format(d.saldo);
    document.getElementById('deudaCuota').value = d.cuota ? new Intl.NumberFormat('es-CO').format(d.cuota) : '';
    document.getElementById('deudaFecha').value = d.fecha || '';
    document.getElementById('btnEliminarDeuda').hidden = false;
    document.getElementById('btnPagarDeuda').hidden = d.saldo <= 0;
    document.getElementById('btnPagarDeuda').dataset.debtId = d.id;
    renderDeudaHistorial(d);
  } else {
    document.getElementById('deudaModalTitle').textContent = 'Nueva deuda';
    document.getElementById('deudaId').value = '';
    document.getElementById('deudaHistorialWrap').hidden = true;
  }
  openModal('modalDeuda');
}

document.getElementById('formDeuda').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('deudaId').value;
  const saldo = parseMoneyInput(document.getElementById('deudaSaldo').value);
  const montoOriginal = parseMoneyInput(document.getElementById('deudaMontoOriginal').value);
  const data = {
    nombre: document.getElementById('deudaNombre').value.trim(),
    saldo,
    montoOriginal: montoOriginal || saldo,
    cuota: parseMoneyInput(document.getElementById('deudaCuota').value),
    fecha: document.getElementById('deudaFecha').value
  };
  if (!data.nombre) return;
  if (id) { Object.assign(state.debts.find(d => d.id === id), data); toast('Deuda actualizada'); }
  else { data.id = uid(); data.pagos = []; state.debts.push(data); toast('Deuda registrada'); }
  saveState();
  closeModal('modalDeuda');
  renderAll();
});

document.getElementById('btnEliminarDeuda').addEventListener('click', () => {
  const id = document.getElementById('deudaId').value;
  askConfirm('Eliminar deuda', 'Esta acción no se puede deshacer.', () => {
    state.debts = state.debts.filter(d => d.id !== id);
    saveState();
    closeModal('modalDeuda');
    renderAll();
    toast('Deuda eliminada');
  });
});

document.getElementById('btnPagarDeuda').addEventListener('click', () => {
  const debtId = document.getElementById('btnPagarDeuda').dataset.debtId;
  const d = state.debts.find(x => x.id === debtId);
  openMontoModal('Registrar pago', 'Valor del pago', (valor) => {
    d.saldo = Math.max(0, d.saldo - valor);
    if (!d.pagos) d.pagos = [];
    d.pagos.push({ fecha: todayISO(), valor });
    if (d.saldo > 0 && d.cuota && d.fecha) d.fecha = addMonthsISO(d.fecha, 1);
    saveState();
    closeModal('modalDeuda');
    renderAll();
    toast(d.saldo <= 0 ? '¡Deuda pagada por completo! 🎉' : 'Pago registrado');
  });
});

/* ===================== Monto modal (aportes/pagos rápidos) ===================== */
let montoCallback = null;
attachMoneyFormatting(document.getElementById('montoValor'));

function openMontoModal(title, label, callback) {
  document.getElementById('montoTitle').textContent = title;
  document.getElementById('montoLabel').textContent = label;
  document.getElementById('montoValor').value = '';
  montoCallback = callback;
  openModal('modalMonto');
}

document.getElementById('formMonto').addEventListener('submit', (e) => {
  e.preventDefault();
  const valor = parseMoneyInput(document.getElementById('montoValor').value);
  if (!valor) return;
  closeModal('modalMonto');
  if (montoCallback) montoCallback(valor);
});

/* ===================== INFORMES ===================== */
let reportRange = 3;
document.getElementById('reportFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#reportFilters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  reportRange = parseInt(btn.dataset.range, 10);
  renderInformes();
});

function renderInformes() {
  const months = monthsBack(reportRange);
  document.getElementById('reportTrendChart').innerHTML = buildTrendChartSVG(months);

  const start = months[0];
  const end = new Date(months[months.length - 1].getFullYear(), months[months.length - 1].getMonth() + 1, 0);
  const rangeMovs = getMovementsInRange(start, end);
  const ingresos = rangeMovs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.valor, 0);
  const gastos = rangeMovs.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.valor, 0);

  const byCategory = {};
  rangeMovs.filter(m => m.tipo === 'gasto').forEach(m => {
    byCategory[m.categoria] = (byCategory[m.categoria] || 0) + m.valor;
  });
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries.length ? catEntries[0][1] : 1;
  const colors = ['#0c8a6c', '#3d6fd6', '#d68a1c', '#d64545', '#8a5cd6', '#0aa5c2', '#c25ba0'];

  document.getElementById('reportCategoryChart').innerHTML = catEntries.length
    ? catEntries.map(([cat, val], i) => `
      <div class="chart-bar-row">
        <div class="chart-bar-label">${CATEGORY_EMOJI[cat] || '📦'} ${escapeHtml(cat)}</div>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${(val / maxCat) * 100}%;background:${colors[i % colors.length]}"></div></div>
        <div class="chart-bar-value">${formatMoney(val)}</div>
      </div>`).join('')
    : '<p class="empty-state">Sin gastos registrados en este periodo.</p>';

  const ahorro = ingresos - gastos;
  document.getElementById('reportAhorro').textContent = formatMoney(ahorro);
  document.getElementById('reportAhorroPct').textContent = ingresos ? `${((ahorro / ingresos) * 100).toFixed(1)}% de los ingresos` : 'Sin ingresos en el periodo';
  document.getElementById('reportPatrimonio').textContent = formatMoney(getPatrimonio());
}

function buildTrendChartSVG(months) {
  const data = months.map(m => Object.assign({ date: m, label: MONTHS_SHORT_ES[m.getMonth()] }, getMonthTotals(m)));
  const max = Math.max(1, ...data.map(d => Math.max(d.ingresos, d.gastos)));
  const barW = 16, gap = 10, groupW = barW * 2 + 6, groupGap = 22;
  const chartH = 140;
  const width = data.length * (groupW + groupGap);
  let bars = '';
  data.forEach((d, i) => {
    const x = i * (groupW + groupGap) + groupGap / 2;
    const hIn = (d.ingresos / max) * chartH;
    const hGa = (d.gastos / max) * chartH;
    bars += `<rect x="${x}" y="${chartH - hIn}" width="${barW}" height="${hIn}" rx="3" fill="#0c8a6c"/>`;
    bars += `<rect x="${x + barW + 4}" y="${chartH - hGa}" width="${barW}" height="${hGa}" rx="3" fill="#d64545"/>`;
    bars += `<text x="${x + barW + 2}" y="${chartH + 18}" font-size="11" fill="var(--text-muted)" text-anchor="middle">${d.label}</text>`;
  });
  return `
    <svg viewBox="0 0 ${width} ${chartH + 30}" width="100%" height="${chartH + 30}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">
      <line x1="0" y1="${chartH}" x2="${width}" y2="${chartH}" stroke="var(--border)" stroke-width="1"/>
      ${bars}
    </svg>
    <div class="legend">
      <div class="legend-item"><span class="legend-dot" style="background:#0c8a6c"></span>Ingresos</div>
      <div class="legend-item"><span class="legend-dot" style="background:#d64545"></span>Gastos</div>
    </div>`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ===================== CONFIGURACIÓN ===================== */
function renderConfiguracion() {
  document.getElementById('cfgNombre').value = state.settings.nombre;
  document.getElementById('cfgMoneda').value = state.settings.moneda;
  document.getElementById('cfgAlertasPresupuesto').checked = state.settings.alertasPresupuesto;
  document.getElementById('cfgAlertasPagos').checked = state.settings.alertasPagos;

  document.getElementById('categoryList').innerHTML = [...state.settings.categoriasIngreso.map(c => ({ c, tipo: 'ingreso' })), ...state.settings.categoriasGasto.map(c => ({ c, tipo: 'gasto' }))]
    .map(({ c, tipo }) => `<span class="tag-chip">${CATEGORY_EMOJI[c] || (tipo === 'ingreso' ? '💰' : '📦')} ${escapeHtml(c)} <button data-cat="${escapeHtml(c)}" data-tipo="${tipo}">✕</button></span>`).join('');

  document.getElementById('paymentMethodList').innerHTML = state.settings.metodosPago
    .map(m => `<span class="tag-chip">${escapeHtml(m)} <button data-metodo="${escapeHtml(m)}">✕</button></span>`).join('');

  document.getElementById('categoryList').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = btn.dataset.tipo === 'ingreso' ? state.settings.categoriasIngreso : state.settings.categoriasGasto;
      const idx = list.indexOf(btn.dataset.cat);
      if (idx >= 0) list.splice(idx, 1);
      saveState();
      renderConfiguracion();
    });
  });
  document.getElementById('paymentMethodList').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = state.settings.metodosPago.indexOf(btn.dataset.metodo);
      if (idx >= 0) state.settings.metodosPago.splice(idx, 1);
      saveState();
      renderConfiguracion();
    });
  });
}

document.getElementById('cfgNombre').addEventListener('input', (e) => { state.settings.nombre = e.target.value; saveState(); });
document.getElementById('cfgMoneda').addEventListener('change', (e) => { state.settings.moneda = e.target.value; saveState(); renderAll(); });
document.getElementById('cfgAlertasPresupuesto').addEventListener('change', (e) => { state.settings.alertasPresupuesto = e.target.checked; saveState(); });
document.getElementById('cfgAlertasPagos').addEventListener('change', (e) => { state.settings.alertasPagos = e.target.checked; saveState(); });

document.getElementById('btnAddCategoria').addEventListener('click', () => {
  const nombre = prompt('Nombre de la nueva categoría:');
  if (!nombre) return;
  const tipo = confirm('¿Es una categoría de INGRESO? (Cancelar = gasto)') ? 'ingreso' : 'gasto';
  const list = tipo === 'ingreso' ? state.settings.categoriasIngreso : state.settings.categoriasGasto;
  if (!list.includes(nombre)) list.push(nombre);
  saveState();
  renderConfiguracion();
});

document.getElementById('btnAddMetodo').addEventListener('click', () => {
  const nombre = prompt('Nombre del nuevo método de pago:');
  if (!nombre) return;
  if (!state.settings.metodosPago.includes(nombre)) state.settings.metodosPago.push(nombre);
  saveState();
  renderConfiguracion();
});

document.getElementById('btnExportar').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mi-finanzas-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btnImportar').addEventListener('click', () => document.getElementById('fileImportar').click());
document.getElementById('fileImportar').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      askConfirm('Importar datos', 'Esto reemplazará todos tus datos actuales. ¿Continuar?', () => {
        state = Object.assign(defaultState(), parsed);
        saveState();
        renderAll();
        toast('Datos importados');
      });
    } catch (err) { toast('Archivo inválido'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('btnReset').addEventListener('click', () => {
  askConfirm('Borrar todos los datos', 'Se eliminarán todas las cuentas, movimientos, metas y deudas de forma permanente.', () => {
    state = defaultState();
    saveState();
    renderAll();
    toast('Datos borrados');
  });
});

/* ===================== PWA install ===================== */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('btnInstall').hidden = false;
});
document.getElementById('btnInstall').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('btnInstall').hidden = true;
});
window.addEventListener('appinstalled', () => {
  document.getElementById('btnInstall').hidden = true;
  toast('¡Aplicación instalada!');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ===================== Init ===================== */
setMovTipo('ingreso');
renderInicio();
