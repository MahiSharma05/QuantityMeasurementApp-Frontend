/**
 * QuantiMeasure — app.js
 * ══════════════════════════════════════════════════════════════
 * Single JS file for the entire application.
 * Auto-detects the current page on load and boots the right
 * controller — no manual wiring in HTML beyond one script tag.
 *
 * Sections
 * ──────────────────────────────────────────────────────────────
 *  1. CONFIG          – base URL, localStorage keys, OAuth URLs
 *  2. UNIT_MAP        – available units per measurement type
 *  3. OP_META         – operation labels, endpoints, singleInput flag
 *  4. TokenStore      – localStorage session abstraction
 *  5. HistoryStore    – last-20 operation log
 *  6. UI              – DOM helpers, result renderer, history builder
 *  7. ApiService      – all fetch() calls to Spring Boot
 *  8. AuthController  – drives index.html (login · register · Google OAuth)
 *  9. DashboardController – drives dashboard.html (all operations)
 * 10. BOOT            – auto-detect page and init
 *
 * KEY BEHAVIOUR — singleInput flag
 * ──────────────────────────────────────────────────────────────
 * OP_META.convert.singleInput = true
 *   → The "two-quantity row" (#quantitiesRow) is HIDDEN.
 *   → The "Convert panel" (#targetUnitWrap) is SHOWN instead.
 *   → Only one numeric value is required and validated.
 *   → The backend receives thatQuantity.value = 0 (ignored by
 *     the convert endpoint).
 *
 * All other operations have singleInput = false
 *   → The two-quantity row is SHOWN, target panel is HIDDEN.
 *   → Both values are required and validated.
 * ══════════════════════════════════════════════════════════════
 */

'use strict';

/* ============================================================
   1. CONFIG
   ============================================================ */
const CONFIG = {
  BASE_URL:          'http://localhost:8080',

  // localStorage keys
  TOKEN_KEY:         'qm_jwt_token',
  EMAIL_KEY:         'qm_user_email',
  NAME_KEY:          'qm_user_name',    // Google display name
  AVATAR_KEY:        'qm_user_avatar',  // Google photo URL
  SOURCE_KEY:        'qm_login_source', // 'password' | 'google'
  HISTORY_KEY:       'qm_history',

  // Google OAuth
  // Flow:
  //   1) Browser → BASE_URL + OAUTH_ENDPOINT
  //   2) Spring Security → Google consent screen
  //   3) Google → Spring Boot /login/oauth2/code/google
  //   4) OAuth2SuccessHandler builds JWT, redirects to:
  //      OAUTH_CALLBACK_URL?token=<JWT>&email=…&name=…&avatar=…
  //   5) app.js reads the params, saves session → dashboard.html
  //
  // ⚠ Update OAUTH_CALLBACK_URL to wherever you serve your HTML.
  OAUTH_ENDPOINT:    '/oauth2/authorization/google',
  OAUTH_CALLBACK_URL:'http://localhost:63342/oauth2/callback.html',
};

/* ============================================================
   2. UNIT MAP
   ============================================================ */
const UNIT_MAP = {
  LengthUnit:      ['FEET','INCHES','CENTIMETER','YARDS'],
  TemperatureUnit: ['CELSIUS','FAHRENHEIT'],
  VolumeUnit:      ['LITER','MILLILITER','GALLON',],
  WeightUnit:      ['KILOGRAM','GRAM','POUND','TONNE','MILLIGRAM'],
};

/* ============================================================
   3. OPERATION METADATA
   singleInput: true  → only one numeric value is needed/validated.
                        The "thatQuantity" block is hidden; the
                        user just picks a target unit.
   singleInput: false → both values required (standard two-input).
   ============================================================ */
const OP_META = {
  convert:  {
    label:       'Unit Conversion',
    desc:        'Enter a value, choose its source unit, then pick the target unit — result is calculated automatically.',
    endpoint:    '/api/v1/quantities/convert',
    singleInput: true,
  },
  add:      {
    label:       'Addition',
    desc:        'Add two quantities together (result expressed in the target unit).',
    endpoint:    '/api/v1/quantities/add',
    singleInput: false,
  },
  subtract: {
    label:       'Subtraction',
    desc:        'Subtract the second quantity from the first.',
    endpoint:    '/api/v1/quantities/subtract',
    singleInput: false,
  },
  compare:  {
    label:       'Comparison',
    desc:        'Check whether two quantities are equal.',
    endpoint:    '/api/v1/quantities/compare',
    singleInput: false,
  },
  divide:   {
    label:       'Division',
    desc:        'Divide the first quantity by the second — returns a dimensionless ratio.',
    endpoint:    '/api/v1/quantities/divide',
    singleInput: false,
  },
};

/* ============================================================
   4. TOKEN STORE  (localStorage abstraction)
   ============================================================ */
class TokenStore {
  static get()              { return localStorage.getItem(CONFIG.TOKEN_KEY);  }
  static set(t)             { localStorage.setItem(CONFIG.TOKEN_KEY, t);      }

  static getEmail()         { return localStorage.getItem(CONFIG.EMAIL_KEY);  }
  static setEmail(v)        { localStorage.setItem(CONFIG.EMAIL_KEY, v);      }

  static getName()          { return localStorage.getItem(CONFIG.NAME_KEY);   }
  static setName(v)         { localStorage.setItem(CONFIG.NAME_KEY, v);       }

  static getAvatar()        { return localStorage.getItem(CONFIG.AVATAR_KEY); }
  static setAvatar(v)       { localStorage.setItem(CONFIG.AVATAR_KEY, v);     }

  static getSource()        { return localStorage.getItem(CONFIG.SOURCE_KEY); }
  static setSource(v)       { localStorage.setItem(CONFIG.SOURCE_KEY, v);     }

  static isAuthenticated()  { return !!TokenStore.get(); }

  /** Save an entire session in one call */
  static saveSession({ token, email = '', name = '', avatar = '', source = 'password' }) {
    TokenStore.set(token);
    TokenStore.setEmail(email);
    TokenStore.setName(name);
    TokenStore.setAvatar(avatar);
    TokenStore.setSource(source);
  }

  /** Remove all session data on logout */
  static clearSession() {
    [CONFIG.TOKEN_KEY, CONFIG.EMAIL_KEY, CONFIG.NAME_KEY,
     CONFIG.AVATAR_KEY, CONFIG.SOURCE_KEY].forEach(k => localStorage.removeItem(k));
  }
}

/* ============================================================
   5. HISTORY STORE
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
   6. UI HELPERS
   ============================================================ */
const UI = {
  show:   el => el?.classList.remove('hidden'),
  hide:   el => el?.classList.add('hidden'),
  toggle: (el, visible) => el?.classList.toggle('hidden', !visible),

  setLoading(btn, loading) {
    const txt    = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    UI.toggle(txt,    !loading);
    UI.toggle(loader,  loading);
  },

  showError(el, msg)   { if (!el) return; el.textContent = msg; UI.show(el); },
  hideError(el)        { if (!el) return; UI.hide(el); el.textContent = ''; },
  showSuccess(el, msg) { if (!el) return; el.textContent = msg; UI.show(el); },

  /** Format an API result into HTML for the result panel */
  formatResult(op, data) {
    if (op === 'compare') {
      const yes = data === true;
      return `
        <div class="result-bool ${yes ? 'yes' : 'no'}">${yes ? '✓ Equal' : '✗ Not Equal'}</div>
        <p class="result-meta">The two quantities are ${yes ? 'equivalent' : 'not equivalent'}.</p>`;
    }
    if (op === 'divide') {
      const val = typeof data === 'number' ? data.toFixed(6) : data;
      return `
        <div><span class="result-value">${val}</span></div>
        <p class="result-meta">Ratio (dimensionless)</p>`;
    }
    // convert / add / subtract → QuantityDTO { value, unit, measurementType }
    return `
      <div>
        <span class="result-value">
          ${Number(data.value).toLocaleString(undefined, { maximumFractionDigits: 6 })}
        </span>
        <span class="result-unit">${data.unit}</span>
      </div>
      <p class="result-meta">Type: ${data.measurementType}</p>`;
  },

  /** Build one history row element */
  buildHistoryItem(entry) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="history-item-op">${entry.op}</span>
      <span class="history-item-expr">${entry.expr}</span>
      <span class="history-item-result">${entry.result}</span>
      <span class="history-item-time">${entry.time}</span>`;
    return div;
  },
};

/* ============================================================
   7. API SERVICE  (all HTTP to Spring Boot)
   ============================================================ */
class ApiService {
  constructor(baseUrl = CONFIG.BASE_URL) { this.baseUrl = baseUrl; }

  // Build request headers; attach JWT when auth = true
  #headers(auth = false) {
    const h = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = TokenStore.get();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  }

  // Generic POST — handles plain-string and JSON responses from Spring Boot
  async post(endpoint, body, auth = false) {
    const res  = await fetch(`${this.baseUrl}${endpoint}`, {
      method:  'POST',
      headers: this.#headers(auth),
      body:    JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) {
      const msg = data?.message || data?.error || data || `HTTP ${res.status}`;
      throw new Error(String(msg));
    }
    return data;
  }

  // POST /auth/register  →  User object
  async register(email, password) {
    return this.post('/auth/register', { email, password });
  }

  // POST /auth/login  →  plain JWT string
  async login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  // POST /api/v1/quantities/<op>  (JWT required)
  async quantityOp(operation, thisQuantity, thatQuantity) {
    return this.post(OP_META[operation].endpoint, { thisQuantity, thatQuantity }, true);
  }
}

// Shared singleton used by both controllers
const api = new ApiService();

/* ============================================================
   8. AUTH CONTROLLER  (index.html)
   Handles: login · register · Google OAuth initiation · callback
   ============================================================ */
class AuthController {
  #currentTab = 'login';

  constructor() { this.#init(); }

  #init() {
    // ① Check for OAuth callback FIRST (URL contains ?token=…)
    if (this.#handleOAuthCallback()) return;

    // ② Already authenticated → skip login page
    if (TokenStore.isAuthenticated()) {
      window.location.href = 'dashboard.html';
      return;
    }

    // ③ Normal login/register page setup
    this.#bindForms();
    this.#checkOAuthError();
  }

  // ── OAuth callback handler ─────────────────────────────────
  // Spring Boot's OAuth2SuccessHandler redirects here with:
  //   ?token=<JWT>&email=<e>&name=<n>&avatar=<photoUrl>
  // Supports both query-string and hash-fragment delivery.
  #handleOAuthCallback() {
    const isCallback =
      window.location.pathname.includes('callback') ||
      window.location.search.includes('token=')     ||
      window.location.hash.includes('token=');

    if (!isCallback) return false;

    const qp = new URLSearchParams(window.location.search);
    const hp = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const token  = qp.get('token')  || hp.get('token');
    const email  = qp.get('email')  || hp.get('email')  || '';
    const name   = qp.get('name')   || hp.get('name')   || '';
    const avatar = qp.get('avatar') || hp.get('avatar') || '';
    const error  = qp.get('error')  || hp.get('error');

    if (error) {
      window.location.href = `index.html?oauthError=${encodeURIComponent(error)}`;
      return true;
    }

    if (token) {
      TokenStore.saveSession({ token, email, name, avatar, source: 'google' });
      // Remove token from browser history (security)
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.href = 'dashboard.html';
      return true;
    }

    window.location.href = 'index.html?oauthError=missing_token';
    return true;
  }

  // Show error banner if we were redirected here after a failed OAuth attempt
  #checkOAuthError() {
    const err = new URLSearchParams(window.location.search).get('oauthError');
    if (err) {
      UI.showError(
        document.getElementById('login-error'),
        `Google sign-in failed: ${err.replace(/_/g, ' ')}`
      );
    }
  }

  // ── Google OAuth initiation ───────────────────────────────
  // Navigates to Spring Boot's OAuth2 entry point — Spring Security
  // then redirects the browser to Google. No AJAX needed.
  initiateGoogleLogin() {
    const btn = document.getElementById('googleBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="google-logo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </span>
        <span>Connecting to Google…</span>`;
    }
    window.location.href = `${CONFIG.BASE_URL}${CONFIG.OAUTH_ENDPOINT}`;
  }

  // ── Tab switching ──────────────────────────────────────────
  switchTab(tab) {
    this.#currentTab = tab;
    const isLogin = tab === 'login';
    UI.toggle(document.getElementById('form-login'),    isLogin);
    UI.toggle(document.getElementById('form-register'), !isLogin);
    document.getElementById('tab-login')?.classList.toggle('active',  isLogin);
    document.getElementById('tab-register')?.classList.toggle('active', !isLogin);
    document.getElementById('tab-indicator')?.classList.toggle('right', !isLogin);
  }

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.style.opacity = isText ? '1' : '0.5';
  }

  // ── Form bindings ──────────────────────────────────────────
  #bindForms() {
    document.getElementById('loginForm')
      ?.addEventListener('submit', e => { e.preventDefault(); this.#handleLogin(); });
    document.getElementById('registerForm')
      ?.addEventListener('submit', e => { e.preventDefault(); this.#handleRegister(); });
  }

  // ── Email/password LOGIN ───────────────────────────────────
  async #handleLogin() {
    const emailEl    = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    const errorEl    = document.getElementById('login-error');
    const btn        = document.getElementById('loginBtn');

    UI.hideError(errorEl);
    const email    = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
      UI.showError(errorEl, 'Please fill in all fields.'); return;
    }

    UI.setLoading(btn, true);
    try {
      // Spring Boot returns a plain JWT string (not a JSON object)
      const token = await api.login(email, password);
      TokenStore.saveSession({
        token:  typeof token === 'string' ? token : (token.token || JSON.stringify(token)),
        email,
        source: 'password',
      });
      window.location.href = 'dashboard.html';
    } catch (err) {
      UI.showError(errorEl, err.message || 'Login failed. Check your credentials.');
    } finally {
      UI.setLoading(btn, false);
    }
  }

  // ── REGISTER ──────────────────────────────────────────────
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

    if (!email || !password) { UI.showError(errorEl, 'Please fill in all fields.'); return; }
    if (password.length < 6) { UI.showError(errorEl, 'Password must be at least 6 characters.'); return; }

    UI.setLoading(btn, true);
    try {
      await api.register(email, password);
      UI.showSuccess(successEl, '✓ Account created! You can now sign in.');
      emailEl.value = ''; passwordEl.value = '';
      setTimeout(() => this.switchTab('login'), 1600);
    } catch (err) {
      UI.showError(errorEl, err.message || 'Registration failed. Try a different email.');
    } finally {
      UI.setLoading(btn, false);
    }
  }
}

/* ============================================================
   9. DASHBOARD CONTROLLER  (dashboard.html)

   Works identically for password users AND Google OAuth users.
   Both login paths write a JWT to localStorage — this controller
   reads that token and attaches it to every API call.

   Single-input mode (Convert)
   ────────────────────────────
   When op = "convert":
     • #quantitiesRow  (two-input row)  → HIDDEN
     • #targetUnitWrap (convert panel)  → SHOWN
     • Only convertValue is validated; thatValue is not touched.
     • API call sends thatQuantity.value = 0 (backend ignores it).

   Two-input mode (all other ops)
   ────────────────────────────────
     • #quantitiesRow  → SHOWN
     • #targetUnitWrap → HIDDEN
     • Both thisValue and thatValue are validated.
   ============================================================ */
class DashboardController {
  #currentOp   = 'convert';
  #currentType = 'LengthUnit';
  #sidebarOpen = false;

  constructor() { this.#init(); }

  // ── Bootstrap ──────────────────────────────────────────────
  #init() {
    if (!TokenStore.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }
    this.#loadUserInfo();
    this.#showLoginBadge();
    this.#populateAllUnits();
    this.#bindForm();
    this.#renderHistory();
    // Apply Convert mode immediately (default op on page load)
    this.#applyInputMode(OP_META[this.#currentOp].singleInput);
  }

  // ── Sidebar user info ──────────────────────────────────────
  #loadUserInfo() {
    const email   = TokenStore.getEmail()  || 'user@app.com';
    const name    = TokenStore.getName()   || '';
    const avatar  = TokenStore.getAvatar() || '';
    const display = name || email;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('userEmail', email);
    set('userName',  display);

    const avatarEl    = document.getElementById('userAvatar');
    const avatarImgEl = document.getElementById('userAvatarImg');

    if (avatar && avatarImgEl) {
      avatarImgEl.src = avatar;
      avatarImgEl.classList.remove('hidden');
      avatarEl?.classList.add('hidden');
    } else if (avatarEl) {
      avatarEl.textContent = display.charAt(0).toUpperCase();
    }
  }

  // "🔵 Signed in with Google" or "🔑 Signed in with Password"
  #showLoginBadge() {
    const source  = TokenStore.getSource() || 'password';
    const badgeEl = document.getElementById('loginSourceBadge');
    if (!badgeEl) return;
    badgeEl.textContent = source === 'google'
      ? '🔵 Signed in with Google'
      : '🔑 Signed in with Password';
    badgeEl.classList.toggle('badge-google', source === 'google');
    UI.show(badgeEl);
  }

  // ── Populate all unit dropdowns ────────────────────────────
  // Fills thisUnit, thatUnit (two-input row) and
  // convertFromUnit, targetUnit (convert panel).
  #populateAllUnits() {
    const units    = UNIT_MAP[this.#currentType] || [];
    const makeOpts = (selectedIndex) => units.map((u, i) =>
      `<option value="${u}" ${i === selectedIndex ? 'selected' : ''}>${u}</option>`
    ).join('');

    const fill = (id, idx) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = makeOpts(idx);
    };

    fill('thisUnit',        0); // two-input row: from unit
    fill('thatUnit',        1); // two-input row: to unit
    fill('convertFromUnit', 0); // convert panel: source unit
    fill('targetUnit',      1); // convert panel: target unit
  }

  // ── Public: measurement type selection ─────────────────────
  selectType(type, btn) {
    this.#currentType = type;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    this.#populateAllUnits();
    this.closeResult();
  }

  // ── Public: operation selection ────────────────────────────
  setOperation(op, btn) {
    this.#currentOp = op;
    const meta = OP_META[op];

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');

    // Update page header text
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('pageTitle',      meta.label);
    set('pageDesc',       meta.desc);
    set('opBadge',        op);
    set('convertBtnText', meta.label.split(' ')[0]);

    // Switch between single-input (Convert) and two-input (others)
    this.#applyInputMode(meta.singleInput);

    this.closeResult();
    this.#updateArrow(op);
    if (this.#sidebarOpen) this.toggleSidebar();
  }

  // ── Toggle UI between single-input and two-input modes ─────
  //
  // singleInput = true  (Convert):
  //   Hide: #quantitiesRow (two-input row)
  //   Show: #targetUnitWrap (convert panel)
  //   Remove `required` from thatValue so validation skips it.
  //
  // singleInput = false (Add/Subtract/Compare/Divide):
  //   Show: #quantitiesRow
  //   Hide: #targetUnitWrap
  //   Restore `required` on thatValue.
  //
  #applyInputMode(singleInput) {
    const quantitiesRow   = document.getElementById('quantitiesRow');
    const targetUnitWrap  = document.getElementById('targetUnitWrap');
    const thatValueEl     = document.getElementById('thatValue');

    if (singleInput) {
      UI.hide(quantitiesRow);
      UI.show(targetUnitWrap);
      if (thatValueEl) { thatValueEl.value = ''; thatValueEl.removeAttribute('required'); }
    } else {
      UI.show(quantitiesRow);
      UI.hide(targetUnitWrap);
      if (thatValueEl) thatValueEl.setAttribute('required', '');
    }
  }

  // Update the operator icon between the two quantity blocks
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

  // ── Form submission ────────────────────────────────────────
  #bindForm() {
    document.getElementById('converterForm')
      ?.addEventListener('submit', e => { e.preventDefault(); this.#handleConversion(); });
  }

  async #handleConversion() {
    const errorEl  = document.getElementById('convert-error');
    const btn      = document.getElementById('convertBtn');
    UI.hideError(errorEl);

    const meta     = OP_META[this.#currentOp];
    const isSingle = meta.singleInput;

    // ── Build request quantities ───────────────────────────
    let thisQ, thatQ;

    if (isSingle) {
      // ── CONVERT mode: single numeric value required ────────
      const val  = parseFloat(document.getElementById('convertValue')?.value);
      const from = document.getElementById('convertFromUnit')?.value;
      const to   = document.getElementById('targetUnit')?.value;

      if (isNaN(val)) {
        UI.showError(errorEl, 'Please enter a valid numeric value.'); return;
      }

      thisQ = { value: val,  unit: from, measurementType: this.#currentType };
      thatQ = { value: 0,    unit: to,   measurementType: this.#currentType };
      // thatQuantity.value = 0 — the convert endpoint ignores it.

    } else {
      // ── TWO-INPUT mode: both values required ───────────────
      const thisVal  = parseFloat(document.getElementById('thisValue')?.value);
      const thatVal  = parseFloat(document.getElementById('thatValue')?.value);
      const thisUnit = document.getElementById('thisUnit')?.value;
      const thatUnit = document.getElementById('thatUnit')?.value;

      if (isNaN(thisVal) || isNaN(thatVal)) {
        UI.showError(errorEl, 'Please enter valid numeric values for both quantities.'); return;
      }

      thisQ = { value: thisVal, unit: thisUnit, measurementType: this.#currentType };
      thatQ = { value: thatVal, unit: thatUnit, measurementType: this.#currentType };
    }

    UI.setLoading(btn, true);
    try {
      const result = await api.quantityOp(this.#currentOp, thisQ, thatQ);
      this.#showResult(result);
      this.#addToHistory(thisQ, thatQ, result);
    } catch (err) {
      // Handle expired JWT
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('unauthorized')) {
        UI.showError(errorEl, 'Session expired. Redirecting to login…');
        setTimeout(() => this.logout(), 2000);
      } else {
        UI.showError(errorEl, err.message || 'Operation failed. Please check your inputs.');
      }
    } finally {
      UI.setLoading(btn, false);
    }
  }

  // ── Result panel ───────────────────────────────────────────
  #showResult(data) {
    const panel = document.getElementById('resultPanel');
    const body  = document.getElementById('resultBody');
    if (!panel || !body) return;
    body.innerHTML = UI.formatResult(this.#currentOp, data);
    UI.show(panel);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  closeResult() { UI.hide(document.getElementById('resultPanel')); }

  // ── History ────────────────────────────────────────────────
  #addToHistory(thisQ, thatQ, result) {
    const expr = `${thisQ.value} ${thisQ.unit} → ${thatQ.unit}`;
    let resultStr;
    if (this.#currentOp === 'compare')
      resultStr = result === true ? 'Equal' : 'Not Equal';
    else if (this.#currentOp === 'divide')
      resultStr = typeof result === 'number' ? result.toFixed(4) : String(result);
    else
      resultStr = `${Number(result.value).toFixed(4)} ${result.unit}`;

    HistoryStore.add({ op: this.#currentOp, expr, result: resultStr, type: this.#currentType });
    this.#renderHistory();
  }

  #renderHistory() {
    const list  = document.getElementById('historyList');
    if (!list) return;
    const items = HistoryStore.getAll();
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<p class="history-empty mono">No operations yet. Run a calculation above.</p>';
      return;
    }
    items.forEach(e => list.appendChild(UI.buildHistoryItem(e)));
  }

  clearHistory() { HistoryStore.clear(); this.#renderHistory(); }

  // ── Form reset ─────────────────────────────────────────────
  resetForm() {
    document.getElementById('converterForm')?.reset();
    // Clear all numeric inputs
    ['thisValue', 'thatValue', 'convertValue'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    this.closeResult();
    UI.hideError(document.getElementById('convert-error'));
    this.#populateAllUnits();
  }

  // ── Logout ─────────────────────────────────────────────────
  logout() {
    TokenStore.clearSession();
    window.location.href = 'index.html';
  }

  // ── Mobile sidebar ─────────────────────────────────────────
  toggleSidebar() {
    this.#sidebarOpen = !this.#sidebarOpen;
    document.getElementById('sidebar')?.classList.toggle('open', this.#sidebarOpen);
    UI.toggle(document.getElementById('sidebarOverlay'), this.#sidebarOpen);
  }
}

/* ============================================================
   10. BOOT — auto-detect page and init the right controller
   ============================================================ */
(function boot() {
  const path = window.location.pathname;

  if (path.includes('dashboard')) {
    window.Dashboard = new DashboardController();
  } else {
    // index.html  OR  oauth2/callback.html
    // AuthController handles both the login UI and the OAuth
    // callback — they are the same class.
    window.App = new AuthController();
  }
})();