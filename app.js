/* ===================== Mi Finanzas — App Logic ===================== */

const STORAGE_KEY = 'miFinanzasData_v1';

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTHS_SHORT_ES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const CATEGORY_EMOJI = {
  'Salario': '💰', 'Bono': '🎁', 'Ventas': '🛍️', 'Otros ingresos': '💵',
  'Alimentación': '🍔', 'Vivienda': '🏠', 'Transporte': '⛽', 'Entretenimiento': '🎬',
  'Salud': '⚕️', 'Educación': '📚', 'Ropa': '👕', 'Servicios': '💡', 'Compras': '🛒',
  'Tecnología': '💻', 'Viajes': '✈️', 'Otros': '📦',
  'Pago de deuda': '💳', 'Suscripciones': '🔄', 'Aporte a ahorro': '💰'
};

const ACCOUNT_EMOJI = { banco: '🏦', ahorros: '🏦', efectivo: '💵', tarjeta: '💳', digital: '📱', inversion: '📈', otro: '📦' };
const ASSET_EMOJI = { inversion: '📈', propiedad: '🏠', vehiculo: '🚗', otro: '📦' };
const CURRENCY_SYMBOL = { COP: '$', USD: '$', MXN: '$', EUR: '€', ARS: '$', PEN: 'S/', CLP: '$' };

function defaultState() {
  return {
    settings: {
      nombre: '',
      moneda: 'COP',
      categoriasIngreso: ['Salario', 'Bono', 'Ventas', 'Otros ingresos'],
      categoriasGasto: ['Alimentación', 'Vivienda', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Compras', 'Servicios', 'Tecnología', 'Viajes', 'Otros', 'Pago de deuda', 'Suscripciones', 'Aporte a ahorro'],
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
    debts: [],
    obligaciones: [],
    subscriptions: [],
    assets: [],
    recurringIncomes: [],
    patrimonioHistory: []
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
    const settings = Object.assign({}, def.settings, parsed.settings);
    ['Pago de deuda', 'Suscripciones', 'Aporte a ahorro'].forEach(c => {
      if (!settings.categoriasGasto.includes(c)) settings.categoriasGasto.push(c);
    });
    return {
      settings,
      accounts: parsed.accounts && parsed.accounts.length ? parsed.accounts : def.accounts,
      movements: parsed.movements || [],
      budgets: parsed.budgets || [],
      goals: parsed.goals || [],
      debts: parsed.debts || [],
      obligaciones: parsed.obligaciones || [],
      subscriptions: parsed.subscriptions || [],
      assets: parsed.assets || [],
      recurringIncomes: parsed.recurringIncomes || [],
      patrimonioHistory: parsed.patrimonioHistory || []
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
  if (!iso) return false;
  const d = parseISO(iso);
  return d.getFullYear() === refDate.getFullYear() && d.getMonth() === refDate.getMonth();
}

function isDueByMonth(iso, refDate) {
  if (!iso) return false;
  const d = parseISO(iso);
  const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
  return d <= endOfMonth;
}

function formatDateShort(iso) {
  if (!iso) return '—';
  const d = parseISO(iso);
  return d.getDate() + ' ' + MONTHS_SHORT_ES[d.getMonth()];
}

function addMonthsISO(iso, months) {
  const d = parseISO(iso);
  const target = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  return target.getFullYear() + '-' + pad(target.getMonth() + 1) + '-' + pad(target.getDate());
}

function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function addDaysDate(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
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

function accountName(id) {
  const a = state.accounts.find(a => a.id === id);
  return a ? a.nombre : '—';
}

function accountOptionsHtml(withBalance) {
  return state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.nombre)}${withBalance ? ' (' + formatMoney(getAccountBalance(a.id)) + ')' : ''}</option>`).join('');
}

function obligEstado(o) {
  if (o.estado === 'pagado') return 'pagado';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = parseISO(o.fecha); d.setHours(0, 0, 0, 0);
  return d < today ? 'vencido' : 'pendiente';
}

function getObligacionesPendientesMes(refDate) {
  return state.obligaciones.reduce((sum, o) => {
    if (obligEstado(o) !== 'pagado' && isDueByMonth(o.fecha, refDate)) return sum + o.valor;
    return sum;
  }, 0);
}

function getCuotasDeudaMes(refDate) {
  return state.debts.reduce((sum, d) => {
    if (d.saldo > 0 && d.cuota && isDueByMonth(d.fecha, refDate)) return sum + d.cuota;
    return sum;
  }, 0);
}

function subMonthlyEquivalent(s) {
  if (s.frecuencia === 'mensual') return s.valor;
  if (s.frecuencia === 'anual') return s.valor / 12;
  if (s.frecuencia === 'semanal') return s.valor * 4.345;
  if (s.frecuencia === 'personalizada') return s.dias ? s.valor * (30 / s.dias) : s.valor;
  return s.valor;
}

function getSuscripcionesPendientesMes(refDate) {
  return state.subscriptions.reduce((sum, s) => {
    if (s.estado === 'activa' && isDueByMonth(s.fechaCobro, refDate)) return sum + s.valor;
    return sum;
  }, 0);
}

function getDisponibleReal(refDate) {
  const saldo = getTotalBalance();
  const oblig = getObligacionesPendientesMes(refDate);
  const deudas = getCuotasDeudaMes(refDate);
  const subs = getSuscripcionesPendientesMes(refDate);
  return { saldo, oblig, deudas, subs, total: saldo - oblig - deudas - subs };
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

function getPresupuestoUtilizadoPct(refDate) {
  if (!state.budgets.length) return 0;
  let totalLimite = 0, totalGastado = 0;
  state.budgets.forEach(b => { totalLimite += b.limite; totalGastado += getCategorySpent(b.categoria, refDate); });
  return totalLimite ? Math.round((totalGastado / totalLimite) * 100) : 0;
}

function getOtherAssetsTotal() {
  return state.assets.reduce((s, a) => s + (a.valor || 0), 0);
}

function getPatrimonio() {
  const activos = getTotalBalance() + getOtherAssetsTotal();
  const pasivos = state.debts.reduce((s, d) => s + Math.max(0, d.saldo), 0);
  return activos - pasivos;
}

function snapshotPatrimonio() {
  const now = new Date();
  const mes = now.getFullYear() + '-' + pad(now.getMonth() + 1);
  const valor = getPatrimonio();
  const existing = state.patrimonioHistory.find(h => h.mes === mes);
  if (existing) existing.valor = valor; else state.patrimonioHistory.push({ mes, valor });
  saveState();
}

function monthsBack(n) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    arr.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return arr;
}

function debtPaidTotal(d) {
  return (d.pagos || []).reduce((s, p) => s + p.valor, 0);
}

function registrarPagoDeuda(d, valor) {
  const saldoAnterior = d.saldo;
  const interes = d.tasa ? Math.round(saldoAnterior * (d.tasa / 100)) : 0;
  const capital = Math.max(0, valor - interes);
  d.saldo = Math.max(0, d.saldo - capital);
  if (!d.pagos) d.pagos = [];
  d.pagos.push({ fecha: todayISO(), valor, interes, capital });
  const cuentaId = d.cuentaPago || (state.accounts[0] && state.accounts[0].id);
  if (cuentaId) {
    state.movements.push({
      id: uid(), tipo: 'gasto', valor, descripcion: 'Pago: ' + d.nombre, categoria: 'Pago de deuda',
      cuenta: cuentaId, cuentaDestino: '', fecha: todayISO(), metodo: state.settings.metodosPago[0] || '',
      nota: '', createdAt: Date.now()
    });
  }
  if (d.saldo > 0 && d.fecha) d.fecha = addMonthsISO(d.fecha, 1);
  const mesKey = todayISO().slice(0, 7);
  if (!d.historialSaldo) d.historialSaldo = [];
  const existingHist = d.historialSaldo.find(h => h.mes === mesKey);
  if (existingHist) existingHist.saldo = d.saldo; else d.historialSaldo.push({ mes: mesKey, saldo: d.saldo });
}

function getAlerts() {
  const now = new Date();
  const soon = addDaysDate(now, 3);
  const alerts = [];
  state.obligaciones.forEach(o => {
    const estado = obligEstado(o);
    if (estado === 'vencido') alerts.push({ icon: '🔴', text: `Pago vencido: ${o.nombre} (${formatMoney(o.valor)})`, level: 'high' });
    else if (estado === 'pendiente' && parseISO(o.fecha) <= soon) alerts.push({ icon: '⚠️', text: `${o.nombre} vence el ${formatDateShort(o.fecha)}`, level: 'medium' });
  });
  state.subscriptions.filter(s => s.estado === 'activa').forEach(s => {
    if (s.fechaCobro && parseISO(s.fechaCobro) <= soon && parseISO(s.fechaCobro) >= now) {
      alerts.push({ icon: '⚠️', text: `Suscripción ${s.nombre} (${formatMoney(s.valor)}) cobra pronto`, level: 'medium' });
    }
  });
  state.debts.filter(d => d.saldo > 0 && d.fecha).forEach(d => {
    if (parseISO(d.fecha) <= soon) {
      alerts.push({ icon: parseISO(d.fecha) < now ? '🔴' : '⚠️', text: `Cuota de ${d.nombre} vence ${formatDateShort(d.fecha)}`, level: parseISO(d.fecha) < now ? 'high' : 'medium' });
    }
  });
  state.budgets.forEach(b => {
    const gastado = getCategorySpent(b.categoria, now);
    const pct = b.limite ? (gastado / b.limite) * 100 : 0;
    if (pct >= 100) alerts.push({ icon: '🔴', text: `Superaste el presupuesto de ${b.categoria}`, level: 'high' });
    else if (pct >= 80) alerts.push({ icon: '⚠️', text: `Presupuesto de ${b.categoria} al ${Math.round(pct)}%`, level: 'medium' });
  });
  state.goals.forEach(g => {
    if (g.objetivo && g.actual >= g.objetivo) alerts.push({ icon: '✓', text: `Meta "${g.nombre}" alcanzada 🎉`, level: 'good' });
  });
  return alerts;
}

function searchAll(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  state.movements.forEach(m => {
    if ((m.descripcion || '').toLowerCase().includes(q) || (m.categoria || '').toLowerCase().includes(q)) {
      results.push({ type: 'movimiento', id: m.id, label: (m.descripcion || m.categoria || 'Movimiento'), sub: formatMoney(m.valor) + ' · ' + formatDateShort(m.fecha) });
    }
  });
  state.debts.forEach(d => { if (d.nombre.toLowerCase().includes(q)) results.push({ type: 'deuda', id: d.id, label: d.nombre, sub: formatMoney(d.saldo) }); });
  state.subscriptions.forEach(s => { if (s.nombre.toLowerCase().includes(q)) results.push({ type: 'suscripcion', id: s.id, label: s.nombre, sub: formatMoney(s.valor) }); });
  state.accounts.forEach(a => { if (a.nombre.toLowerCase().includes(q)) results.push({ type: 'cuenta', id: a.id, label: a.nombre, sub: formatMoney(getAccountBalance(a.id)) }); });
  state.obligaciones.forEach(o => { if (o.nombre.toLowerCase().includes(q)) results.push({ type: 'obligacion', id: o.id, label: o.nombre, sub: formatMoney(o.valor) }); });
  state.goals.forEach(g => { if (g.nombre.toLowerCase().includes(q)) results.push({ type: 'meta', id: g.id, label: g.nombre, sub: formatMoney(g.actual) + ' / ' + formatMoney(g.objetivo) }); });
  return results.slice(0, 8);
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
function switchView(name) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === 'view-' + name));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === name));
  document.querySelectorAll('.bn-item').forEach(el => el.classList.toggle('active', el.dataset.view === name));
  document.getElementById('main').scrollTo({ top: 0 });
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

document.getElementById('bnMore').addEventListener('click', () => openModal('sheetMore'));
document.getElementById('moreMenuList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-view]');
  if (!btn) return;
  closeModal('sheetMore');
  switchView(btn.dataset.view);
});

function handleQuickAction(action) {
  closeModal('sheetQuickActions');
  if (action === 'ingreso' || action === 'gasto') openMovModal(action);
  else if (action === 'deuda') { switchView('deudas'); openDeudaModal(); }
  else if (action === 'suscripcion') { switchView('suscripciones'); openSuscripcionModal(); }
  else if (action === 'ahorro') openQuickAhorro();
}
document.querySelectorAll('[data-quick-action]').forEach(btn => {
  btn.addEventListener('click', () => handleQuickAction(btn.dataset.quickAction));
});
document.getElementById('bnFab').addEventListener('click', () => openModal('sheetQuickActions'));

function openQuickAhorro() {
  if (!state.goals.length) { switchView('metas'); openMetaModal(); return; }
  if (state.goals.length === 1) { switchView('metas'); openMetaModal(state.goals[0].id); return; }
  switchView('metas');
  toast('Elige una meta para registrar el aporte');
}

/* ===================== Render dispatcher ===================== */
function renderView(name) {
  if (name === 'inicio') renderInicio();
  else if (name === 'movimientos') renderMovimientos();
  else if (name === 'cuentas') renderCuentas();
  else if (name === 'ingresos') renderIngresos();
  else if (name === 'gastos') renderGastos();
  else if (name === 'obligaciones') renderObligaciones();
  else if (name === 'deudas') renderDeudas();
  else if (name === 'suscripciones') renderSuscripciones();
  else if (name === 'metas') renderMetas();
  else if (name === 'presupuesto') renderPresupuesto();
  else if (name === 'patrimonio') renderPatrimonio();
  else if (name === 'calendario') renderCalendario();
  else if (name === 'informes') renderInformes();
  else if (name === 'configuracion') renderConfiguracion();
  updateAlertsBadge();
}

function renderAll() {
  const active = document.querySelector('.view.active');
  if (active) renderView(active.id.replace('view-', ''));
}

/* ===================== INICIO ===================== */
function renderInicio() {
  const now = new Date();
  snapshotPatrimonio();
  const hour = now.getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = state.settings.nombre ? ', ' + state.settings.nombre : '';
  document.getElementById('greeting').textContent = `${saludo}${nombre} 👋`;
  document.getElementById('monthLabel').textContent = `Resumen financiero · ${cap(MONTHS_ES[now.getMonth()])} ${now.getFullYear()}`;

  const dr = getDisponibleReal(now);
  document.getElementById('saldoTotal').textContent = formatMoney(dr.saldo);
  document.getElementById('disponibleReal').textContent = formatMoney(dr.total);
  document.getElementById('drSaldo').textContent = formatMoney(dr.saldo);
  document.getElementById('drObligaciones').textContent = dr.oblig ? '-' + formatMoney(dr.oblig) : formatMoney(0);
  document.getElementById('drDeudas').textContent = dr.deudas ? '-' + formatMoney(dr.deudas) : formatMoney(0);
  document.getElementById('drSuscripciones').textContent = dr.subs ? '-' + formatMoney(dr.subs) : formatMoney(0);
  document.getElementById('drTotal').textContent = formatMoney(dr.total);

  const { ingresos, gastos } = getMonthTotals(now);
  document.getElementById('statIngresos').textContent = formatMoney(ingresos);
  document.getElementById('statGastos').textContent = formatMoney(gastos);

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevTotals = getMonthTotals(prevMonth);
  document.getElementById('trendIngresos').innerHTML = trendHtml(ingresos, prevTotals.ingresos, true);
  document.getElementById('trendGastos').innerHTML = trendHtml(gastos, prevTotals.gastos, false);

  document.getElementById('indAhorro').textContent = formatMoney(ingresos - gastos);
  document.getElementById('indDeudas').textContent = formatMoney(state.debts.reduce((s, d) => s + Math.max(0, d.saldo), 0));
  document.getElementById('indPagos').textContent = formatMoney(dr.oblig);
  document.getElementById('indSuscripciones').textContent = formatMoney(dr.subs);
  document.getElementById('indPresupuesto').textContent = getPresupuestoUtilizadoPct(now) + '%';
  document.getElementById('indPatrimonio').textContent = formatMoney(getPatrimonio());

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
document.getElementById('btnNuevoMovimiento').addEventListener('click', () => openMovModal('ingreso'));

document.getElementById('movTipoSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  setMovTipo(btn.dataset.tipo);
});

function setMovTipo(tipo) {
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
  document.getElementById('movCuenta').innerHTML = accountOptionsHtml(true);
  document.getElementById('movCuentaDestino').innerHTML = accountOptionsHtml(true);
  document.getElementById('metaCuenta').innerHTML = '<option value="">Ninguna</option>' + accountOptionsHtml(false);
}

function populateMetodoSelect(targetId) {
  targetId = targetId || 'movMetodo';
  document.getElementById(targetId).innerHTML = state.settings.metodosPago.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
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

/* ===================== INGRESOS RECURRENTES ===================== */
function nextFreqLabel(f) { return f === 'mensual' ? 'Mensual' : f === 'semanal' ? 'Semanal' : 'Anual'; }

function renderIngresos() {
  document.getElementById('recIncomeEmpty').hidden = state.recurringIncomes.length > 0;
  document.getElementById('recurringIncomesList').innerHTML = state.recurringIncomes.map(ri => `
    <div class="entity-card" data-ri-id="${ri.id}">
      <div class="entity-card-title">💵 ${escapeHtml(ri.nombre)} ${ri.estado === 'pausado' ? '<span class="status-badge pausada">Pausado</span>' : ''}</div>
      <div class="entity-card-value">${formatMoney(ri.valor)}</div>
      <div class="entity-card-sub">${nextFreqLabel(ri.frecuencia)} · Próximo: ${formatDateShort(ri.fecha)} · ${accountName(ri.cuenta)}</div>
    </div>`).join('');
  document.querySelectorAll('#recurringIncomesList [data-ri-id]').forEach(card => {
    card.addEventListener('click', () => openIngresoRecModal(card.dataset.riId));
  });
}

document.getElementById('btnNuevoIngresoRec').addEventListener('click', () => openIngresoRecModal());
attachMoneyFormatting(document.getElementById('ingRecValor'));

function openIngresoRecModal(id) {
  const form = document.getElementById('formIngresoRec');
  form.reset();
  document.getElementById('ingRecCuenta').innerHTML = accountOptionsHtml(false);
  document.getElementById('btnEliminarIngresoRec').hidden = true;
  document.getElementById('btnRegistrarIngresoRec').hidden = true;
  if (id) {
    const ri = state.recurringIncomes.find(x => x.id === id);
    document.getElementById('ingresoRecModalTitle').textContent = 'Editar ingreso recurrente';
    document.getElementById('ingRecId').value = ri.id;
    document.getElementById('ingRecNombre').value = ri.nombre;
    document.getElementById('ingRecValor').value = new Intl.NumberFormat('es-CO').format(ri.valor);
    document.getElementById('ingRecFrecuencia').value = ri.frecuencia;
    document.getElementById('ingRecFecha').value = ri.fecha;
    document.getElementById('ingRecCuenta').value = ri.cuenta || '';
    document.getElementById('btnEliminarIngresoRec').hidden = false;
    document.getElementById('btnRegistrarIngresoRec').hidden = false;
    document.getElementById('btnRegistrarIngresoRec').dataset.riId = ri.id;
  } else {
    document.getElementById('ingresoRecModalTitle').textContent = 'Nuevo ingreso recurrente';
    document.getElementById('ingRecId').value = '';
    document.getElementById('ingRecFecha').value = todayISO();
  }
  openModal('modalIngresoRec');
}

document.getElementById('formIngresoRec').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('ingRecId').value;
  const data = {
    nombre: document.getElementById('ingRecNombre').value.trim(),
    valor: parseMoneyInput(document.getElementById('ingRecValor').value),
    frecuencia: document.getElementById('ingRecFrecuencia').value,
    fecha: document.getElementById('ingRecFecha').value,
    cuenta: document.getElementById('ingRecCuenta').value
  };
  if (!data.nombre || !data.valor || !data.fecha) return;
  if (id) { Object.assign(state.recurringIncomes.find(r => r.id === id), data); toast('Ingreso recurrente actualizado'); }
  else { data.id = uid(); data.estado = 'activo'; state.recurringIncomes.push(data); toast('Ingreso recurrente creado'); }
  saveState();
  closeModal('modalIngresoRec');
  renderAll();
});

document.getElementById('btnEliminarIngresoRec').addEventListener('click', () => {
  const id = document.getElementById('ingRecId').value;
  askConfirm('Eliminar ingreso recurrente', 'Esta acción no se puede deshacer.', () => {
    state.recurringIncomes = state.recurringIncomes.filter(r => r.id !== id);
    saveState();
    closeModal('modalIngresoRec');
    renderAll();
    toast('Eliminado');
  });
});

document.getElementById('btnRegistrarIngresoRec').addEventListener('click', () => {
  const id = document.getElementById('btnRegistrarIngresoRec').dataset.riId;
  const ri = state.recurringIncomes.find(x => x.id === id);
  const categoria = state.settings.categoriasIngreso.find(c => c.toLowerCase() === ri.nombre.toLowerCase()) || state.settings.categoriasIngreso[0] || 'Otros ingresos';
  state.movements.push({
    id: uid(), tipo: 'ingreso', valor: ri.valor, descripcion: ri.nombre, categoria,
    cuenta: ri.cuenta, cuentaDestino: '', fecha: todayISO(), metodo: '', nota: 'Ingreso recurrente', createdAt: Date.now()
  });
  if (ri.frecuencia === 'mensual') ri.fecha = addMonthsISO(ri.fecha, 1);
  else if (ri.frecuencia === 'anual') ri.fecha = addMonthsISO(ri.fecha, 12);
  else if (ri.frecuencia === 'semanal') ri.fecha = addDaysISO(ri.fecha, 7);
  saveState();
  closeModal('modalIngresoRec');
  renderAll();
  toast('Ingreso registrado');
});

/* ===================== GASTOS (categorías) ===================== */
function renderGastos() {
  const now = new Date();
  document.getElementById('gastosMonthLabel').textContent = `${cap(MONTHS_ES[now.getMonth()])} ${now.getFullYear()}`;
  const data = state.settings.categoriasGasto
    .map(cat => ({ cat, val: getCategorySpent(cat, now) }))
    .filter(d => d.val > 0)
    .sort((a, b) => b.val - a.val);
  document.getElementById('gastosEmpty').hidden = data.length > 0;
  const max = data.length ? data[0].val : 1;
  const colors = ['#0c8a6c', '#3d6fd6', '#d68a1c', '#d64545', '#8a5cd6', '#0aa5c2', '#c25ba0'];
  document.getElementById('gastosCategoryChart').innerHTML = data.map((d, i) => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${CATEGORY_EMOJI[d.cat] || '📦'} ${escapeHtml(d.cat)}</div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${(d.val / max) * 100}%;background:${colors[i % colors.length]}"></div></div>
      <div class="chart-bar-value">${formatMoney(d.val)}</div>
    </div>`).join('');

  document.getElementById('gastoCategoryTags').innerHTML = state.settings.categoriasGasto.map(c => `<span class="tag-chip">${CATEGORY_EMOJI[c] || '📦'} ${escapeHtml(c)} <button data-cat="${escapeHtml(c)}">✕</button></span>`).join('');
  document.getElementById('gastoCategoryTags').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = state.settings.categoriasGasto.indexOf(btn.dataset.cat);
      if (idx >= 0) state.settings.categoriasGasto.splice(idx, 1);
      saveState();
      renderGastos();
    });
  });
}

document.getElementById('btnNuevoGastoDesdeGastos').addEventListener('click', () => openMovModal('gasto'));
document.getElementById('btnAddCategoriaGasto').addEventListener('click', () => {
  const nombre = prompt('Nombre de la nueva categoría de gasto:');
  if (!nombre) return;
  if (!state.settings.categoriasGasto.includes(nombre)) state.settings.categoriasGasto.push(nombre);
  saveState();
  renderGastos();
});

/* ===================== PAGOS Y OBLIGACIONES ===================== */
let obligFilter = 'todos';
document.getElementById('obligFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#obligFilters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  obligFilter = btn.dataset.filter;
  renderObligaciones();
});

function renderObligaciones() {
  let list = state.obligaciones.map(o => Object.assign({}, o, { _estado: obligEstado(o) }));
  if (obligFilter !== 'todos') list = list.filter(o => o._estado === obligFilter);
  list.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  document.getElementById('obligEmpty').hidden = list.length > 0;
  document.getElementById('obligacionesList').innerHTML = list.map(o => `
    <div class="movement-row" data-oblig-id="${o.id}">
      <div class="mv-icon">${o._estado === 'pagado' ? '✅' : o._estado === 'vencido' ? '🔴' : '📅'}</div>
      <div class="mv-info">
        <div class="mv-desc">${escapeHtml(o.nombre)} <span class="status-badge ${o._estado}">${o._estado === 'pagado' ? 'Pagado' : o._estado === 'vencido' ? 'Vencido' : 'Pendiente'}</span></div>
        <div class="mv-cat">${escapeHtml(o.categoria || 'Otros')} · ${formatDateShort(o.fecha)}${o.recurrente ? ' · 🔁 mensual' : ''}</div>
      </div>
      <div class="mv-amount expense">${formatMoney(o.valor)}</div>
    </div>`).join('');
  document.querySelectorAll('#obligacionesList [data-oblig-id]').forEach(row => {
    row.addEventListener('click', () => openObligacionModal(row.dataset.obligId));
  });
}

document.getElementById('btnNuevaObligacion').addEventListener('click', () => openObligacionModal());
attachMoneyFormatting(document.getElementById('obligValor'));

function openObligacionModal(id) {
  const form = document.getElementById('formObligacion');
  form.reset();
  document.getElementById('obligCuenta').innerHTML = accountOptionsHtml(false);
  document.getElementById('btnEliminarObligacion').hidden = true;
  document.getElementById('btnPagarObligacion').hidden = true;
  if (id) {
    const o = state.obligaciones.find(x => x.id === id);
    document.getElementById('obligModalTitle').textContent = 'Editar pago u obligación';
    document.getElementById('obligId').value = o.id;
    document.getElementById('obligNombre').value = o.nombre;
    document.getElementById('obligCategoria').value = o.categoria || '';
    document.getElementById('obligValor').value = new Intl.NumberFormat('es-CO').format(o.valor);
    document.getElementById('obligFecha').value = o.fecha;
    document.getElementById('obligCuenta').value = o.cuenta || '';
    document.getElementById('obligRecurrente').checked = !!o.recurrente;
    document.getElementById('btnEliminarObligacion').hidden = false;
    document.getElementById('btnPagarObligacion').hidden = obligEstado(o) === 'pagado';
    document.getElementById('btnPagarObligacion').dataset.obligId = o.id;
  } else {
    document.getElementById('obligModalTitle').textContent = 'Nuevo pago u obligación';
    document.getElementById('obligId').value = '';
    document.getElementById('obligFecha').value = todayISO();
  }
  openModal('modalObligacion');
}

document.getElementById('formObligacion').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('obligId').value;
  const data = {
    nombre: document.getElementById('obligNombre').value.trim(),
    categoria: document.getElementById('obligCategoria').value.trim(),
    valor: parseMoneyInput(document.getElementById('obligValor').value),
    fecha: document.getElementById('obligFecha').value,
    cuenta: document.getElementById('obligCuenta').value,
    recurrente: document.getElementById('obligRecurrente').checked
  };
  if (!data.nombre || !data.valor || !data.fecha) return;
  if (id) { Object.assign(state.obligaciones.find(o => o.id === id), data); toast('Obligación actualizada'); }
  else { data.id = uid(); data.estado = 'pendiente'; data.pagos = []; state.obligaciones.push(data); toast('Obligación registrada'); }
  saveState();
  closeModal('modalObligacion');
  renderAll();
});

document.getElementById('btnEliminarObligacion').addEventListener('click', () => {
  const id = document.getElementById('obligId').value;
  askConfirm('Eliminar obligación', 'Esta acción no se puede deshacer.', () => {
    state.obligaciones = state.obligaciones.filter(o => o.id !== id);
    saveState();
    closeModal('modalObligacion');
    renderAll();
    toast('Eliminada');
  });
});

document.getElementById('btnPagarObligacion').addEventListener('click', () => {
  const id = document.getElementById('btnPagarObligacion').dataset.obligId;
  const o = state.obligaciones.find(x => x.id === id);
  if (!o.cuenta) { toast('Asigna una cuenta de pago primero'); return; }
  state.movements.push({
    id: uid(), tipo: 'gasto', valor: o.valor, descripcion: o.nombre, categoria: o.categoria || 'Otros',
    cuenta: o.cuenta, cuentaDestino: '', fecha: todayISO(), metodo: state.settings.metodosPago[0] || '', nota: '', createdAt: Date.now()
  });
  if (!o.pagos) o.pagos = [];
  o.pagos.push({ fecha: todayISO(), valor: o.valor });
  if (o.recurrente) { o.fecha = addMonthsISO(o.fecha, 1); o.estado = 'pendiente'; }
  else { o.estado = 'pagado'; o.pagadoFecha = todayISO(); }
  saveState();
  closeModal('modalObligacion');
  renderAll();
  toast('Pago registrado');
});

/* ===================== DEUDAS ===================== */
const DEBT_TYPE_LABEL = {
  tarjeta: 'Tarjeta de crédito', credito_bancario: 'Crédito bancario', prestamo_personal: 'Préstamo personal',
  vehiculo: 'Crédito de vehículo', hipotecario: 'Crédito hipotecario', familiar: 'Préstamo familiar', otro: 'Otra deuda'
};

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
        <div class="mv-cat">${formatDateShort(p.fecha)}${p.interes ? ` · Interés: ${formatMoney(p.interes)} · Capital: ${formatMoney(p.capital)}` : ''}</div>
      </div>
      <div class="mv-amount expense">-${formatMoney(p.valor)}</div>
    </div>`).join('');
}

function renderDeudaEvolucion(d) {
  const wrap = document.getElementById('deudaEvolucionWrap');
  const hist = [...(d.historialSaldo || [])].sort((a, b) => a.mes.localeCompare(b.mes));
  if (hist.length < 2) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const max = Math.max(1, ...hist.map(h => h.saldo));
  document.getElementById('deudaEvolucionChart').innerHTML = hist.map(h => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${h.mes}</div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.max(2, (h.saldo / max) * 100)}%;background:#d64545"></div></div>
      <div class="chart-bar-value">${formatMoney(h.saldo)}</div>
    </div>`).join('');
}

function openDeudaModal(debtId) {
  document.getElementById('deudaCuentaPago').innerHTML = accountOptionsHtml(false);
  const form = document.getElementById('formDeuda');
  form.reset();
  document.getElementById('btnEliminarDeuda').hidden = true;
  document.getElementById('btnPagarDeuda').hidden = true;
  if (debtId) {
    const d = state.debts.find(x => x.id === debtId);
    document.getElementById('deudaModalTitle').textContent = 'Editar deuda';
    document.getElementById('deudaId').value = d.id;
    document.getElementById('deudaNombre').value = d.nombre;
    document.getElementById('deudaTipo').value = d.tipo || 'otro';
    document.getElementById('deudaAcreedor').value = d.acreedor || '';
    document.getElementById('deudaMontoOriginal').value = d.montoOriginal ? new Intl.NumberFormat('es-CO').format(d.montoOriginal) : '';
    document.getElementById('deudaSaldo').value = new Intl.NumberFormat('es-CO').format(d.saldo);
    document.getElementById('deudaTasa').value = d.tasa || '';
    document.getElementById('deudaCuota').value = d.cuota ? new Intl.NumberFormat('es-CO').format(d.cuota) : '';
    document.getElementById('deudaNumCuotas').value = d.numCuotas || '';
    document.getElementById('deudaFecha').value = d.fecha || '';
    document.getElementById('deudaCuentaPago').value = d.cuentaPago || (state.accounts[0] && state.accounts[0].id) || '';
    document.getElementById('btnEliminarDeuda').hidden = false;
    document.getElementById('btnPagarDeuda').hidden = d.saldo <= 0;
    document.getElementById('btnPagarDeuda').dataset.debtId = d.id;
    renderDeudaHistorial(d);
    renderDeudaEvolucion(d);
  } else {
    document.getElementById('deudaModalTitle').textContent = 'Nueva deuda';
    document.getElementById('deudaId').value = '';
    document.getElementById('deudaHistorialWrap').hidden = true;
    document.getElementById('deudaEvolucionWrap').hidden = true;
    document.getElementById('deudaFecha').value = todayISO();
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
    tipo: document.getElementById('deudaTipo').value,
    acreedor: document.getElementById('deudaAcreedor').value.trim(),
    saldo,
    montoOriginal: montoOriginal || saldo,
    tasa: parseFloat(document.getElementById('deudaTasa').value) || 0,
    cuota: parseMoneyInput(document.getElementById('deudaCuota').value),
    numCuotas: parseInt(document.getElementById('deudaNumCuotas').value, 10) || 0,
    fecha: document.getElementById('deudaFecha').value,
    cuentaPago: document.getElementById('deudaCuentaPago').value
  };
  if (!data.nombre) return;
  if (id) { Object.assign(state.debts.find(d => d.id === id), data); toast('Deuda actualizada'); }
  else { data.id = uid(); data.pagos = []; data.historialSaldo = []; state.debts.push(data); toast('Deuda registrada'); }
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
    registrarPagoDeuda(d, valor);
    saveState();
    closeModal('modalDeuda');
    renderAll();
    toast(d.saldo <= 0 ? '¡Deuda pagada por completo! 🎉' : 'Pago registrado');
  });
});

document.getElementById('btnActualizarDeudasMes').addEventListener('click', () => {
  const eligible = state.debts.filter(d => d.saldo > 0);
  if (!eligible.length) { toast('No hay deudas pendientes'); return; }
  const list = document.getElementById('actualizarDeudasList');
  list.innerHTML = eligible.map(d => `
    <div class="update-debt-row" data-debt-id="${d.id}">
      <div class="update-debt-name">💳 ${escapeHtml(d.nombre)}</div>
      <div class="update-debt-nums">Saldo anterior: ${formatMoney(d.saldo)}</div>
      <div class="form-row">
        <label>Pago de este mes</label>
        <input type="text" inputmode="numeric" class="upd-pago-input" value="${d.cuota ? new Intl.NumberFormat('es-CO').format(d.cuota) : ''}">
      </div>
      <div class="update-debt-preview muted">Nuevo saldo: <span class="upd-preview-saldo"></span></div>
    </div>`).join('');
  list.querySelectorAll('.upd-pago-input').forEach(attachMoneyFormatting);
  list.querySelectorAll('.update-debt-row').forEach(row => {
    const debtId = row.dataset.debtId;
    const d = eligible.find(x => x.id === debtId);
    const input = row.querySelector('.upd-pago-input');
    const preview = row.querySelector('.upd-preview-saldo');
    const updatePreview = () => {
      const valor = parseMoneyInput(input.value);
      const interes = d.tasa ? Math.round(d.saldo * (d.tasa / 100)) : 0;
      const capital = Math.max(0, valor - interes);
      preview.textContent = formatMoney(Math.max(0, d.saldo - capital));
    };
    input.addEventListener('input', updatePreview);
    updatePreview();
  });
  openModal('modalActualizarDeudas');
});

document.getElementById('btnConfirmarActualizarDeudas').addEventListener('click', () => {
  const rows = document.querySelectorAll('#actualizarDeudasList .update-debt-row');
  let count = 0;
  rows.forEach(row => {
    const debtId = row.dataset.debtId;
    const d = state.debts.find(x => x.id === debtId);
    const valor = parseMoneyInput(row.querySelector('.upd-pago-input').value);
    if (d && valor > 0) { registrarPagoDeuda(d, valor); count++; }
  });
  saveState();
  closeModal('modalActualizarDeudas');
  renderAll();
  toast(count ? `${count} deuda(s) actualizada(s)` : 'Nada para actualizar');
});

/* ===================== SUSCRIPCIONES ===================== */
let subFilter = 'activa';
document.getElementById('subFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#subFilters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  subFilter = btn.dataset.filter;
  renderSuscripciones();
});

function subEstadoLabel(e) { return e === 'activa' ? 'Activa' : e === 'pausada' ? 'Pausada' : 'Cancelada'; }

function renderSuscripciones() {
  const activas = state.subscriptions.filter(s => s.estado === 'activa');
  document.getElementById('subActivasCount').textContent = activas.length;
  const costoMensual = activas.reduce((s, sub) => s + subMonthlyEquivalent(sub), 0);
  document.getElementById('subCostoMensual').textContent = formatMoney(costoMensual);
  document.getElementById('subCostoAnual').textContent = formatMoney(costoMensual * 12);

  let list = subFilter === 'todos' ? state.subscriptions : state.subscriptions.filter(s => s.estado === subFilter);
  list = [...list].sort((a, b) => (a.fechaCobro || '').localeCompare(b.fechaCobro || ''));
  document.getElementById('subEmpty').hidden = list.length > 0;
  document.getElementById('subscriptionsList').innerHTML = list.map(s => `
    <div class="movement-row" data-sub-id="${s.id}">
      <div class="mv-icon">🔄</div>
      <div class="mv-info">
        <div class="mv-desc">${escapeHtml(s.nombre)} <span class="status-badge ${s.estado}">${subEstadoLabel(s.estado)}</span></div>
        <div class="mv-cat">${escapeHtml(s.categoria || 'Suscripciones')} · ${s.frecuencia}${s.estado === 'activa' ? ' · Próx: ' + formatDateShort(s.fechaCobro) : ''}</div>
      </div>
      <div class="mv-amount expense">${formatMoney(s.valor)}</div>
    </div>`).join('');
  document.querySelectorAll('#subscriptionsList [data-sub-id]').forEach(row => {
    row.addEventListener('click', () => openSuscripcionModal(row.dataset.subId));
  });
}

document.getElementById('btnNuevaSuscripcion').addEventListener('click', () => openSuscripcionModal());
attachMoneyFormatting(document.getElementById('subValor'));
document.getElementById('subFrecuencia').addEventListener('change', (e) => {
  document.getElementById('subDiasRow').hidden = e.target.value !== 'personalizada';
});

function openSuscripcionModal(id) {
  document.getElementById('subCuenta').innerHTML = accountOptionsHtml(false);
  populateMetodoSelect('subMetodo');
  const form = document.getElementById('formSuscripcion');
  form.reset();
  document.getElementById('subDiasRow').hidden = true;
  ['btnEliminarSuscripcion', 'btnPausarSuscripcion', 'btnCancelarSuscripcion', 'btnPagarSuscripcion'].forEach(bid => document.getElementById(bid).hidden = true);
  if (id) {
    const s = state.subscriptions.find(x => x.id === id);
    document.getElementById('subModalTitle').textContent = 'Editar suscripción';
    document.getElementById('subId').value = s.id;
    document.getElementById('subNombre').value = s.nombre;
    document.getElementById('subCategoria').value = s.categoria || '';
    document.getElementById('subValor').value = new Intl.NumberFormat('es-CO').format(s.valor);
    document.getElementById('subFrecuencia').value = s.frecuencia;
    document.getElementById('subDiasRow').hidden = s.frecuencia !== 'personalizada';
    document.getElementById('subDias').value = s.dias || '';
    document.getElementById('subFecha').value = s.fechaCobro;
    document.getElementById('subCuenta').value = s.cuenta || '';
    document.getElementById('subMetodo').value = s.metodo || '';
    document.getElementById('btnEliminarSuscripcion').hidden = false;
    document.getElementById('btnPagarSuscripcion').hidden = s.estado !== 'activa';
    document.getElementById('btnPausarSuscripcion').hidden = s.estado === 'cancelada';
    document.getElementById('btnPausarSuscripcion').textContent = s.estado === 'pausada' ? '▶ Reanudar' : '⏸ Pausar';
    document.getElementById('btnCancelarSuscripcion').hidden = s.estado === 'cancelada';
    document.getElementById('btnPagarSuscripcion').dataset.subId = s.id;
    document.getElementById('btnPausarSuscripcion').dataset.subId = s.id;
    document.getElementById('btnCancelarSuscripcion').dataset.subId = s.id;
  } else {
    document.getElementById('subModalTitle').textContent = 'Nueva suscripción';
    document.getElementById('subId').value = '';
    document.getElementById('subFecha').value = todayISO();
  }
  openModal('modalSuscripcion');
}

document.getElementById('formSuscripcion').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('subId').value;
  const data = {
    nombre: document.getElementById('subNombre').value.trim(),
    categoria: document.getElementById('subCategoria').value.trim(),
    valor: parseMoneyInput(document.getElementById('subValor').value),
    frecuencia: document.getElementById('subFrecuencia').value,
    dias: parseMoneyInput(document.getElementById('subDias').value) || null,
    fechaCobro: document.getElementById('subFecha').value,
    cuenta: document.getElementById('subCuenta').value,
    metodo: document.getElementById('subMetodo').value
  };
  if (!data.nombre || !data.valor || !data.fechaCobro) return;
  if (id) { Object.assign(state.subscriptions.find(s => s.id === id), data); toast('Suscripción actualizada'); }
  else { data.id = uid(); data.estado = 'activa'; data.pagos = []; state.subscriptions.push(data); toast('Suscripción creada'); }
  saveState();
  closeModal('modalSuscripcion');
  renderAll();
});

document.getElementById('btnPagarSuscripcion').addEventListener('click', () => {
  const s = state.subscriptions.find(x => x.id === document.getElementById('btnPagarSuscripcion').dataset.subId);
  if (!s.cuenta) { toast('Asigna una cuenta a la suscripción primero'); return; }
  state.movements.push({
    id: uid(), tipo: 'gasto', valor: s.valor, descripcion: s.nombre, categoria: s.categoria || 'Suscripciones',
    cuenta: s.cuenta, cuentaDestino: '', fecha: todayISO(), metodo: s.metodo || '', nota: '', createdAt: Date.now()
  });
  if (!s.pagos) s.pagos = [];
  s.pagos.push({ fecha: todayISO(), valor: s.valor });
  if (s.frecuencia === 'mensual') s.fechaCobro = addMonthsISO(s.fechaCobro, 1);
  else if (s.frecuencia === 'anual') s.fechaCobro = addMonthsISO(s.fechaCobro, 12);
  else if (s.frecuencia === 'semanal') s.fechaCobro = addDaysISO(s.fechaCobro, 7);
  else if (s.frecuencia === 'personalizada') s.fechaCobro = addDaysISO(s.fechaCobro, s.dias || 30);
  saveState();
  closeModal('modalSuscripcion');
  renderAll();
  toast('Pago registrado');
});

document.getElementById('btnPausarSuscripcion').addEventListener('click', () => {
  const s = state.subscriptions.find(x => x.id === document.getElementById('btnPausarSuscripcion').dataset.subId);
  s.estado = s.estado === 'pausada' ? 'activa' : 'pausada';
  saveState();
  closeModal('modalSuscripcion');
  renderAll();
  toast(s.estado === 'pausada' ? 'Suscripción pausada' : 'Suscripción reanudada');
});

document.getElementById('btnCancelarSuscripcion').addEventListener('click', () => {
  const subId = document.getElementById('btnCancelarSuscripcion').dataset.subId;
  askConfirm('Cancelar suscripción', '¿Deseas cancelarla? Podrás verla en el filtro "Canceladas".', () => {
    const s = state.subscriptions.find(x => x.id === subId);
    s.estado = 'cancelada';
    s.fechaFin = todayISO();
    saveState();
    closeModal('modalSuscripcion');
    renderAll();
    toast('Suscripción cancelada');
  });
});

document.getElementById('btnEliminarSuscripcion').addEventListener('click', () => {
  const id = document.getElementById('subId').value;
  askConfirm('Eliminar suscripción', 'Esta acción no se puede deshacer.', () => {
    state.subscriptions = state.subscriptions.filter(s => s.id !== id);
    saveState();
    closeModal('modalSuscripcion');
    renderAll();
    toast('Suscripción eliminada');
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
['metaObjetivo', 'metaActual', 'metaAporte'].forEach(id => attachMoneyFormatting(document.getElementById(id)));

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
    if (g.cuenta) {
      state.movements.push({
        id: uid(), tipo: 'gasto', valor, descripcion: 'Aporte: ' + g.nombre, categoria: 'Aporte a ahorro',
        cuenta: g.cuenta, cuentaDestino: '', fecha: todayISO(), metodo: '', nota: '', createdAt: Date.now()
      });
    }
    saveState();
    closeModal('modalMeta');
    renderAll();
    toast('Aporte registrado');
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

/* ===================== PATRIMONIO ===================== */
function renderPatrimonio() {
  snapshotPatrimonio();
  const cuentasBreakdown = state.accounts.map(a => ({ label: a.nombre, val: getAccountBalance(a.id) }));
  const assetsBreakdown = state.assets.map(a => ({ label: a.nombre, val: a.valor }));
  const activosTotal = getTotalBalance() + getOtherAssetsTotal();

  document.getElementById('activosBreakdown').innerHTML = [...cuentasBreakdown, ...assetsBreakdown].map(x => `
    <div class="breakdown-row"><span>${escapeHtml(x.label)}</span><span>${formatMoney(x.val)}</span></div>`).join('') || '<p class="empty-state">Sin activos registrados.</p>';
  document.getElementById('activosTotal').textContent = formatMoney(activosTotal);

  const pasivosTotal = state.debts.reduce((s, d) => s + Math.max(0, d.saldo), 0);
  document.getElementById('pasivosBreakdown').innerHTML = state.debts.filter(d => d.saldo > 0).map(d => `
    <div class="breakdown-row"><span>${escapeHtml(d.nombre)}</span><span>${formatMoney(d.saldo)}</span></div>`).join('') || '<p class="empty-state">Sin deudas registradas.</p>';
  document.getElementById('pasivosTotal').textContent = formatMoney(pasivosTotal);

  document.getElementById('patrimonioTotal').textContent = formatMoney(activosTotal - pasivosTotal);

  document.getElementById('assetsEmpty').hidden = state.assets.length > 0;
  document.getElementById('assetsList').innerHTML = state.assets.map(a => `
    <div class="movement-row" data-asset-id="${a.id}">
      <div class="mv-icon">${ASSET_EMOJI[a.tipo] || '📦'}</div>
      <div class="mv-info"><div class="mv-desc">${escapeHtml(a.nombre)}</div><div class="mv-cat">${cap(a.tipo)}</div></div>
      <div class="mv-amount">${formatMoney(a.valor)}</div>
    </div>`).join('');
  document.querySelectorAll('#assetsList [data-asset-id]').forEach(row => row.addEventListener('click', () => openActivoModal(row.dataset.assetId)));

  const hist = [...state.patrimonioHistory].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
  const maxH = Math.max(1, ...hist.map(h => Math.abs(h.valor)));
  document.getElementById('patrimonioChart').innerHTML = hist.length ? hist.map(h => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${h.mes}</div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.max(2, (Math.abs(h.valor) / maxH) * 100)}%;background:${h.valor < 0 ? '#d64545' : '#0c8a6c'}"></div></div>
      <div class="chart-bar-value">${formatMoney(h.valor)}</div>
    </div>`).join('') : '<p class="empty-state">Aún no hay historial suficiente.</p>';
}

document.getElementById('btnNuevoActivo').addEventListener('click', () => openActivoModal());
attachMoneyFormatting(document.getElementById('activoValor'));

function openActivoModal(id) {
  const form = document.getElementById('formActivo');
  form.reset();
  document.getElementById('btnEliminarActivo').hidden = true;
  if (id) {
    const a = state.assets.find(x => x.id === id);
    document.getElementById('activoModalTitle').textContent = 'Editar activo';
    document.getElementById('activoId').value = a.id;
    document.getElementById('activoNombre').value = a.nombre;
    document.getElementById('activoTipo').value = a.tipo;
    document.getElementById('activoValor').value = new Intl.NumberFormat('es-CO').format(a.valor);
    document.getElementById('btnEliminarActivo').hidden = false;
  } else {
    document.getElementById('activoModalTitle').textContent = 'Nuevo activo';
    document.getElementById('activoId').value = '';
  }
  openModal('modalActivo');
}

document.getElementById('formActivo').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('activoId').value;
  const data = {
    nombre: document.getElementById('activoNombre').value.trim(),
    tipo: document.getElementById('activoTipo').value,
    valor: parseMoneyInput(document.getElementById('activoValor').value)
  };
  if (!data.nombre || !data.valor) return;
  if (id) { Object.assign(state.assets.find(a => a.id === id), data); toast('Activo actualizado'); }
  else { data.id = uid(); state.assets.push(data); toast('Activo registrado'); }
  saveState();
  closeModal('modalActivo');
  renderAll();
});

document.getElementById('btnEliminarActivo').addEventListener('click', () => {
  const id = document.getElementById('activoId').value;
  askConfirm('Eliminar activo', 'Esta acción no se puede deshacer.', () => {
    state.assets = state.assets.filter(a => a.id !== id);
    saveState();
    closeModal('modalActivo');
    renderAll();
    toast('Activo eliminado');
  });
});

/* ===================== CALENDARIO ===================== */
let calOffset = 0;
function renderCalendario() {
  const base = new Date();
  const target = new Date(base.getFullYear(), base.getMonth() + calOffset, 1);
  document.getElementById('calMonthLabel').textContent = `${cap(MONTHS_ES[target.getMonth()])} ${target.getFullYear()}`;

  const events = [];
  state.obligaciones.forEach(o => { if (isSameMonth(o.fecha, target)) events.push({ fecha: o.fecha, icon: obligEstado(o) === 'pagado' ? '✅' : '📅', label: o.nombre, val: o.valor }); });
  state.subscriptions.filter(s => s.estado === 'activa').forEach(s => { if (s.fechaCobro && isSameMonth(s.fechaCobro, target)) events.push({ fecha: s.fechaCobro, icon: '🔄', label: s.nombre, val: s.valor }); });
  state.debts.filter(d => d.saldo > 0 && d.fecha).forEach(d => { if (isSameMonth(d.fecha, target)) events.push({ fecha: d.fecha, icon: '💳', label: d.nombre, val: d.cuota || 0 }); });
  state.recurringIncomes.filter(r => r.estado !== 'pausado').forEach(r => { if (r.fecha && isSameMonth(r.fecha, target)) events.push({ fecha: r.fecha, icon: '💵', label: r.nombre, val: r.valor, income: true }); });

  events.sort((a, b) => a.fecha.localeCompare(b.fecha));
  document.getElementById('calEmpty').hidden = events.length > 0;
  let html = ''; let lastDate = null;
  events.forEach(ev => {
    if (ev.fecha !== lastDate) { html += `<div class="movement-group-label">${formatDateShort(ev.fecha)}</div>`; lastDate = ev.fecha; }
    html += `<div class="movement-row" style="cursor:default;">
      <div class="mv-icon">${ev.icon}</div>
      <div class="mv-info"><div class="mv-desc">${escapeHtml(ev.label)}</div></div>
      <div class="mv-amount ${ev.income ? 'income' : 'expense'}">${ev.income ? '+' : ''}${formatMoney(ev.val)}</div>
    </div>`;
  });
  document.getElementById('calendarList').innerHTML = html;
}
document.getElementById('calPrev').addEventListener('click', () => { calOffset--; renderCalendario(); });
document.getElementById('calNext').addEventListener('click', () => { calOffset++; renderCalendario(); });

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

  const debtsPaidInRange = state.debts.reduce((s, d) => s + (d.pagos || []).filter(p => { const dt = parseISO(p.fecha); return dt >= start && dt <= end; }).reduce((s2, p) => s2 + p.valor, 0), 0);
  const subsInRange = state.subscriptions.reduce((s, sub) => s + (sub.pagos || []).filter(p => { const dt = parseISO(p.fecha); return dt >= start && dt <= end; }).reduce((s2, p) => s2 + p.valor, 0), 0);
  document.getElementById('reportDeudasPagadas').textContent = formatMoney(debtsPaidInRange);
  document.getElementById('reportSuscripciones').textContent = formatMoney(subsInRange);
}

function buildTrendChartSVG(months) {
  const data = months.map(m => Object.assign({ date: m, label: MONTHS_SHORT_ES[m.getMonth()] }, getMonthTotals(m)));
  const max = Math.max(1, ...data.map(d => Math.max(d.ingresos, d.gastos)));
  const barW = 16, groupW = barW * 2 + 6, groupGap = 22;
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

document.getElementById('btnExportarCSV').addEventListener('click', () => {
  const header = ['Fecha', 'Tipo', 'Descripcion', 'Categoria', 'Cuenta', 'Valor', 'Metodo', 'Nota'];
  const rows = [...state.movements].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(m => [
    m.fecha, m.tipo, m.descripcion || '', m.categoria || '', accountName(m.cuenta), m.valor, m.metodo || '', m.nota || ''
  ]);
  const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movimientos-${todayISO()}.csv`;
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

/* ===================== BÚSQUEDA GLOBAL ===================== */
const SEARCH_ICON = { movimiento: '💳', deuda: '💳', suscripcion: '🔄', cuenta: '🏦', obligacion: '📅', meta: '🎯' };
const SEARCH_VIEW = { movimiento: 'movimientos', deuda: 'deudas', suscripcion: 'suscripciones', cuenta: 'cuentas', obligacion: 'obligaciones', meta: 'metas' };

document.getElementById('globalSearch').addEventListener('input', (e) => {
  const results = searchAll(e.target.value);
  const box = document.getElementById('searchResults');
  if (!results.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.innerHTML = results.map(r => `<div class="search-result-item" data-type="${r.type}" data-id="${r.id}"><span>${SEARCH_ICON[r.type]}</span><div><div class="sr-label">${escapeHtml(r.label)}</div><div class="sr-sub">${r.sub}</div></div></div>`).join('');
  box.hidden = false;
  box.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.type, id = item.dataset.id;
      document.getElementById('globalSearch').value = '';
      box.hidden = true;
      switchView(SEARCH_VIEW[type]);
      if (type === 'movimiento') openMovModal(null, id);
      else if (type === 'deuda') openDeudaModal(id);
      else if (type === 'suscripcion') openSuscripcionModal(id);
      else if (type === 'cuenta') openCuentaModal(id);
      else if (type === 'obligacion') openObligacionModal(id);
      else if (type === 'meta') openMetaModal(id);
    });
  });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) document.getElementById('searchResults').hidden = true;
});

/* ===================== ALERTAS ===================== */
document.getElementById('btnAlerts').addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('alertsPanel');
  if (panel.hidden) { renderAlertsPanel(); panel.hidden = false; } else panel.hidden = true;
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.alerts-panel') && !e.target.closest('#btnAlerts')) document.getElementById('alertsPanel').hidden = true;
});

function renderAlertsPanel() {
  const alerts = getAlerts();
  document.getElementById('alertsList').innerHTML = alerts.length
    ? alerts.map(a => `<div class="alert-row ${a.level}">${a.icon} ${escapeHtml(a.text)}</div>`).join('')
    : '<p class="empty-state">Sin alertas por ahora ✓</p>';
}

function updateAlertsBadge() {
  const count = getAlerts().length;
  const badge = document.getElementById('alertsBadge');
  badge.hidden = count === 0;
  badge.textContent = count;
}

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
updateAlertsBadge();
