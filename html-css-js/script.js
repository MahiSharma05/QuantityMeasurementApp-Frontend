/**
 * QuantiMeasure — script.js
 * Modular ES6+ frontend for Spring Boot Quantity Measurement App
 * Handles: Auth (Login/Register) + Dashboard (Convert/Add/Subtract/Compare/Divide)
 */

'use strict';

/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG = {
  BASE_URL: 'http://localhost:8080',
  TOKEN_KEY: 'qm_jwt_token',
  EMAIL_KEY: 'qm_user_email',
  HISTORY_KEY: 'qm_history',
};

/* ============================================================
   UNIT DEFINITIONS — maps measurementType → available units
   ============================================================ */
const UNIT_MAP = {
  LengthUnit: [
    'FEET', 'INCHES', 'METER', 'CENTIMETER', 'KILOMETER', 'MILLIMETER',
    'YARD', 'MILE',
  ],
  TemperatureUnit: [
    'CELSIUS', 'FAHRENHEIT', 'KELVIN',
  ],
  VolumeUnit: [
    'LITER', 'MILLILITER', 'GALLON', 'PINT', 'CUP', 'FLUID_OUNCE',
  ],
  WeightUnit: [
    'KILOGRAM', 'GRAM', 'POUND', 'OUNCE', 'TON', 'MILLIGRAM',
  ],
};

const OP_META = {
  convert:  { label: 'Unit Conversion',  desc: 'Convert a value from one unit to its equivalent in another', endpoint: '/api/v1/quantities/convert' },
  add:      { label: 'Addition',         desc: 'Add two quantities together (result in target unit)',          endpoint: '/api/v1/quantities/add' },
  subtract: { label: 'Subtraction',      desc: 'Subtract second quantity from first',                         endpoint: '/api/v1/quantities/subtract' },
  compare:  { label: 'Comparison',       desc: 'Check if two quantities are equal',                           endpoint: '/api/v1/quantities/compare' },
  divide:   { label: 'Division',         desc: 'Divide first quantity by second (returns a ratio)',            endpoint: '/api/v1/quantities/divide' },
};

/* ============================================================
   API SERVICE CLASS
   ============================================================ */
class ApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /** Build headers — optionally attach JWT */
  #headers(auth = false) {
    const h = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = TokenStore.get();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  }

  /** Generic POST helper */
  async post(endpoint, body, auth = false) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.#headers(auth),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      // Extract readable error message from Spring Boot error responses
      const msg = data?.message || data?.error || data || `HTTP ${response.status}`;
      throw new Error(String(msg));
    }
    return data;
  }

  /** Auth endpoints */
  async register(email, password) {
    return this.post('/auth/register', { email, password });
  }

  async login(email, password) {
    // Backend returns plain JWT string (not JSON object)
    return this.post('/auth/login', { email, password });
  }

  /** Quantity endpoints (JWT required) */
  async quantityOp(operation, thisQuantity, thatQuantity) {
    const meta = OP_META[operation];
    return this.post(meta.endpoint, { thisQuantity, thatQuantity }, true);
  }
}

/* ============================================================
   TOKEN STORE — localStorage abstraction
   ============================================================ */
class TokenStore {
  static get()               { return localStorage.getItem(CONFIG.TOKEN_KEY); }
  static set(token)          { localStorage.setItem(CONFIG.TOKEN_KEY, token); }
  static remove()            { localStorage.removeItem(CONFIG.TOKEN_KEY); }
  static getEmail()          { return localStorage.getItem(CONFIG.EMAIL_KEY); }
  static setEmail(email)     { localStorage.setItem(CONFIG.EMAIL_KEY, email); }
  static removeEmail()       { localStorage.removeItem(CONFIG.EMAIL_KEY); }
  static isAuthenticated()   { return !!TokenStore.get(); }
}

/* ============================================================
   HISTORY STORE
   ============================================================ */
class HistoryStore {
  static #key = CONFIG.HISTORY_KEY;
  static #max = 20;

  static getAll() {
    try { return JSON.parse(localStorage.getItem(this.#key)) || []; }
    catch { return []; }
  }

  static add(entry) {
    const all = this.getAll();
    all.unshift({ ...entry, time: new Date().toLocaleTimeString() });
    if (all.length > this.#max) all.pop();
    localStorage.setItem(this.#key, JSON.stringify(all));
  }

  static clear() { localStorage.removeItem(this.#key); }
}

/* ============================================================
   UI HELPERS
   ============================================================ */
const UI = {
  show: (el) => el?.classList.remove('hidden'),
  hide: (el) => el?.classList.add('hidden'),
  toggle: (el, show) => el?.classList.toggle('hidden', !show),

  setLoading(btn, loading) {
    const txt = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    UI.toggle(txt, !loading);
    UI.toggle(loader, loading);
  },

  showError(el, msg) {
    el.textContent = msg;
    UI.show(el);
  },

  hideError(el) { UI.hide(el); },

  showSuccess(el, msg) {
    el.textContent = msg;
    UI.show(el);
  },

  formatResult(op, data) {
    if (op === 'compare') {
      return `
        <div class="result-bool">${data === true ? '✓ Equal' : '✗ Not Equal'}</div>
        <p class="result-meta">The two quantities are ${data === true ? 'equivalent' : 'not equivalent'}.</p>
      `;
    }
    if (op === 'divide') {
      return `
        <div><span class="result-value">${typeof data === 'number' ? data.toFixed(6) : data}</span></div>
        <p class="result-meta">Ratio (dimensionless)</p>
      `;
    }
    // convert / add / subtract → QuantityDTO
    return `
      <div>
        <span class="result-value">${Number(data.value).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
        <span class="result-unit">${data.unit}</span>
      </div>
      <p class="result-meta">Type: ${data.measurementType}</p>
    `;
  },

  buildHistoryItem(entry) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="history-item-op">${entry.op}</span>
      <span class="history-item-expr">${entry.expr}</span>
      <span class="history-item-result">${entry.result}</span>
      <span class="history-item-time">${entry.time}</span>
    `;
    return div;
  },
};

/* ============================================================
   APP — handles Auth page (index.html)
   ============================================================ */
class AppController {
  constructor() {
    this.api = new ApiService(CONFIG.BASE_URL);
    this.currentTab = 'login';
    this.init();
  }

  init() {
    // If already logged in, go to dashboard
    if (TokenStore.isAuthenticated() && window.location.pathname.includes('index')) {
      window.location.href = 'dashboard.html';
      return;
    }

    this.#bindForms();
    this.#initTabIndicator();
  }

  #initTabIndicator() {
    const indicator = document.getElementById('tab-indicator');
    if (!indicator) return;
    if (this.currentTab === 'register') indicator.classList.add('right');
  }

  switchTab(tab) {
    this.currentTab = tab;
    const loginForm  = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const tabLogin   = document.getElementById('tab-login');
    const tabReg     = document.getElementById('tab-register');
    const indicator  = document.getElementById('tab-indicator');

    if (tab === 'login') {
      UI.show(loginForm);
      UI.hide(registerForm);
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
      indicator.classList.remove('right');
    } else {
      UI.hide(loginForm);
      UI.show(registerForm);
      tabReg.classList.add('active');
      tabLogin.classList.remove('active');
      indicator.classList.add('right');
    }
  }

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.style.opacity = isText ? '1' : '0.5';
  }

  #bindForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#handleLogin();
    });

    registerForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#handleRegister();
    });
  }

  async #handleLogin() {
    const emailEl    = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    const errorEl    = document.getElementById('login-error');
    const btn        = document.getElementById('loginBtn');

    UI.hideError(errorEl);

    const email    = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
      UI.showError(errorEl, 'Please fill in all fields.');
      return;
    }

    UI.setLoading(btn, true);
    try {
      const token = await this.api.login(email, password);
      // Backend returns plain string token
      TokenStore.set(typeof token === 'string' ? token : token.token || JSON.stringify(token));
      TokenStore.setEmail(email);
      window.location.href = 'dashboard.html';
    } catch (err) {
      UI.showError(errorEl, err.message || 'Login failed. Check your credentials.');
    } finally {
      UI.setLoading(btn, false);
    }
  }

  async #handleRegister() {
    const emailEl    = document.getElementById('reg-email');
    const passwordEl = document.getElementById('reg-password');
    const errorEl    = document.getElementById('register-error');
    const successEl  = document.getElementById('register-success');
    const btn        = document.getElementById('registerBtn');

    UI.hideError(errorEl);
    UI.hide(successEl);

    const email    = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
      UI.showError(errorEl, 'Please fill in all fields.'); return;
    }
    if (password.length < 6) {
      UI.showError(errorEl, 'Password must be at least 6 characters.'); return;
    }

    UI.setLoading(btn, true);
    try {
      await this.api.register(email, password);
      UI.showSuccess(successEl, '✓ Account created! You can now sign in.');
      emailEl.value = '';
      passwordEl.value = '';
      setTimeout(() => this.switchTab('login'), 1500);
    } catch (err) {
      UI.showError(errorEl, err.message || 'Registration failed. Try a different email.');
    } finally {
      UI.setLoading(btn, false);
    }
  }
}

/* ============================================================
   DASHBOARD CONTROLLER — handles dashboard.html
   ============================================================ */
class DashboardController {
  constructor() {
    this.api = new ApiService(CONFIG.BASE_URL);
    this.currentOp   = 'convert';
    this.currentType = 'LengthUnit';
    this.sidebarOpen = false;
    this.init();
  }

  init() {
    // Auth guard
    if (!TokenStore.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }

    this.#loadUserInfo();
    this.#populateUnits();
    this.#bindForm();
    this.#renderHistory();
  }

  #loadUserInfo() {
    const email = TokenStore.getEmail() || 'user';
    const emailEl  = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');
    if (emailEl)  emailEl.textContent  = email;
    if (avatarEl) avatarEl.textContent = email.charAt(0).toUpperCase();
  }

  #populateUnits() {
    const units = UNIT_MAP[this.currentType] || [];
    const thisUnit = document.getElementById('thisUnit');
    const thatUnit = document.getElementById('thatUnit');

    const makeOptions = (selected) => units.map((u, i) =>
      `<option value="${u}" ${i === selected ? 'selected' : ''}>${u}</option>`
    ).join('');

    if (thisUnit) thisUnit.innerHTML = makeOptions(0);
    if (thatUnit) thatUnit.innerHTML = makeOptions(1);
  }

  selectType(type, btn) {
    this.currentType = type;

    // Update pills
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');

    this.#populateUnits();
    this.closeResult();
  }

  setOperation(op, btn) {
    this.currentOp = op;
    const meta = OP_META[op];

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');

    // Update page header
    const titleEl = document.getElementById('pageTitle');
    const descEl  = document.getElementById('pageDesc');
    const badgeEl = document.getElementById('opBadge');
    const btnText = document.getElementById('convertBtnText');

    if (titleEl) titleEl.textContent = meta.label;
    if (descEl)  descEl.textContent  = meta.desc;
    if (badgeEl) badgeEl.textContent = op;
    if (btnText) btnText.textContent = meta.label.split(' ')[0]; // first word

    this.closeResult();
    this.#updateArrow(op);

    // Close sidebar on mobile
    if (this.sidebarOpen) this.toggleSidebar();
  }

  #updateArrow(op) {
    const arrow = document.getElementById('opArrow');
    if (!arrow) return;

    const icons = {
      convert:  `<svg viewBox="0 0 40 40" fill="none"><path d="M8 20h24M24 12l8 8-8 8" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      add:      `<svg viewBox="0 0 40 40" fill="none"><path d="M20 8v24M8 20h24" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>`,
      subtract: `<svg viewBox="0 0 40 40" fill="none"><path d="M8 20h24" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>`,
      compare:  `<svg viewBox="0 0 40 40" fill="none"><path d="M8 15h24M8 25h24" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>`,
      divide:   `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="12" r="2.5" fill="var(--accent)"/><circle cx="20" cy="28" r="2.5" fill="var(--accent)"/><path d="M8 20h24" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>`,
    };
    arrow.innerHTML = icons[op] || icons.convert;
  }

  #bindForm() {
    const form = document.getElementById('converterForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#handleConversion();
    });
  }

  async #handleConversion() {
    const errorEl = document.getElementById('convert-error');
    const btn     = document.getElementById('convertBtn');
    UI.hideError(errorEl);

    const thisValue = parseFloat(document.getElementById('thisValue').value);
    const thatValue = parseFloat(document.getElementById('thatValue').value);
    const thisUnit  = document.getElementById('thisUnit').value;
    const thatUnit  = document.getElementById('thatUnit').value;

    if (isNaN(thisValue) || isNaN(thatValue)) {
      UI.showError(errorEl, 'Please enter valid numeric values for both quantities.'); return;
    }

    const thisQuantity = { value: thisValue, unit: thisUnit, measurementType: this.currentType };
    const thatQuantity = { value: thatValue, unit: thatUnit, measurementType: this.currentType };

    UI.setLoading(btn, true);
    try {
      const result = await this.api.quantityOp(this.currentOp, thisQuantity, thatQuantity);
      this.#showResult(result);
      this.#addToHistory(thisQuantity, thatQuantity, result);
    } catch (err) {
      UI.showError(errorEl, err.message || 'Operation failed. Please check your inputs or try again.');
    } finally {
      UI.setLoading(btn, false);
    }
  }

  #showResult(data) {
    const panel = document.getElementById('resultPanel');
    const body  = document.getElementById('resultBody');
    if (!panel || !body) return;

    body.innerHTML = UI.formatResult(this.currentOp, data);
    UI.show(panel);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  closeResult() {
    const panel = document.getElementById('resultPanel');
    UI.hide(panel);
  }

  #addToHistory(thisQ, thatQ, result) {
    const expr   = `${thisQ.value} ${thisQ.unit} → ${thatQ.unit}`;
    let resultStr;
    if (this.currentOp === 'compare') {
      resultStr = result === true ? 'Equal' : 'Not Equal';
    } else if (this.currentOp === 'divide') {
      resultStr = typeof result === 'number' ? result.toFixed(4) : String(result);
    } else {
      resultStr = `${Number(result.value).toFixed(4)} ${result.unit}`;
    }

    HistoryStore.add({
      op: this.currentOp,
      expr,
      result: resultStr,
      type: this.currentType,
    });

    this.#renderHistory();
  }

  #renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;

    const items = HistoryStore.getAll();
    list.innerHTML = '';

    if (items.length === 0) {
      list.innerHTML = '<p class="history-empty mono">No operations yet. Run a calculation above.</p>';
      return;
    }

    items.forEach(entry => list.appendChild(UI.buildHistoryItem(entry)));
  }

  clearHistory() {
    HistoryStore.clear();
    this.#renderHistory();
  }

  resetForm() {
    document.getElementById('converterForm')?.reset();
    document.getElementById('thisValue').value = '';
    document.getElementById('thatValue').value = '';
    this.closeResult();
    UI.hideError(document.getElementById('convert-error'));
    this.#populateUnits();
  }

  logout() {
    TokenStore.remove();
    TokenStore.removeEmail();
    window.location.href = 'index.html';
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    sidebar?.classList.toggle('open', this.sidebarOpen);
    UI.toggle(overlay, this.sidebarOpen);
  }
}

/* ============================================================
   BOOT — detect current page and init correct controller
   ============================================================ */
(function boot() {
  const path = window.location.pathname;
  const isDashboard = path.includes('dashboard');

  if (isDashboard) {
    window.Dashboard = new DashboardController();
  } else {
    window.App = new AppController();
  }
})();
