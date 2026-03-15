// KNX2HA – Vollständige App-Logik
'use strict';

// ============================================================
// DPT → Home Assistant Typ Mapping
// ============================================================
const DPT_MAP = {
    '1.001': 'switch', '1.002': 'switch', '1.003': 'switch',
    '1.008': 'cover', '1.009': 'cover', '1.010': 'cover',
    '1.011': 'switch', '1.017': 'switch', '1.022': 'binary_sensor',
    '3.007': 'light', '3.008': 'cover',
    '5.001': 'light', '5.003': 'sensor', '5.004': 'sensor', '5.005': 'sensor', '5.010': 'sensor',
    '7.001': 'sensor', '7.012': 'sensor', '7.013': 'sensor', '8.001': 'sensor',
    '9.001': 'sensor', '9.002': 'sensor', '9.003': 'sensor', '9.004': 'sensor',
    '9.005': 'sensor', '9.006': 'sensor', '9.007': 'sensor', '9.008': 'sensor',
    '9.010': 'sensor', '9.011': 'sensor', '9.021': 'sensor', '9.024': 'sensor',
    '9.025': 'sensor', '9.026': 'sensor', '9.027': 'sensor', '9.028': 'sensor',
    '10.001': 'sensor', '11.001': 'sensor', '12.001': 'sensor',
    '13.001': 'sensor', '13.002': 'sensor', '13.010': 'sensor', '13.013': 'sensor',
    '14.019': 'sensor', '14.027': 'sensor', '14.033': 'sensor',
    '14.056': 'sensor', '14.068': 'sensor', '14.076': 'sensor',
    '16.000': 'sensor', '16.001': 'sensor', '17.001': 'sensor',
    '20.102': 'climate', '20.105': 'climate',
};

const SENSOR_TYPE_MAP = {
    '9.001': 'temperature', '9.002': 'temperature', '9.003': 'temperature',
    '9.004': 'illuminance', '9.005': 'speed', '9.006': 'pressure',
    '9.007': 'humidity', '9.008': 'quality', '9.010': 'time', '9.011': 'time',
    '9.024': 'power', '9.025': 'volume_flow_rate', '9.026': 'speed', '9.028': 'speed',
    '12.001': 'total_increasing', '13.002': 'volume_flow_rate',
    '13.010': 'energy', '13.013': 'energy',
    '14.019': 'current', '14.027': 'current', '14.033': 'frequency',
    '14.056': 'power', '14.068': 'temperature', '14.076': 'voltage',
};

const MANUFACTURER_MAP = {
    'M-0083': 'Jung', 'M-0001': 'ABB', 'M-0064': 'ABB',
    'M-0013': 'MDT', 'M-0069': 'Theben', 'M-0004': 'Siemens',
    'M-0007': 'Hager', 'M-0024': 'Gira', 'M-00C8': 'Weinzierl',
};

// ============================================================
// State
// ============================================================
let appState = {
    failedAttempts: 0,
    lockoutUntil: 0,
    currentUser: null,
    parsedGAs: [],
    existingYaml: null,
    existingAddresses: new Set(),
    currentStep: 1,
};

// ============================================================
// STORAGE HELPERS – Multi-User
// ============================================================
// User storage format: knx2ha_users = [{username, hash, role}]
function getUsers() {
    try {
        return JSON.parse(localStorage.getItem('knx2ha_users') || '[]');
    } catch { return []; }
}

function saveUsers(users) {
    localStorage.setItem('knx2ha_users', JSON.stringify(users));
}

function hasAnyUser() {
    return getUsers().length > 0;
}

function findUser(username) {
    return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof dcodeIO === 'undefined' || !dcodeIO.bcrypt) {
        document.body.innerHTML = '<div style="color:#f85149;padding:2rem;text-align:center;font-family:sans-serif;">'
            + '<h2>Fehler: Bibliotheken konnten nicht geladen werden.</h2>'
            + '<p>Bitte Seite neu laden (Strg+Shift+R) oder Adblocker deaktivieren.</p></div>';
        return;
    }

    // Migrate old single-user hash to multi-user format
    migrateOldAuth();

    initAuth();
    initTogglePw();
    initDropZones();
    initNavigation();
    initYamlActions();
    initAdmin();
});

function migrateOldAuth() {
    const oldHash = localStorage.getItem('knx2ha_pw_hash');
    if (oldHash && !hasAnyUser()) {
        saveUsers([{ username: 'admin', hash: oldHash, role: 'admin' }]);
        localStorage.removeItem('knx2ha_pw_hash');
    }
}

// ============================================================
// AUTH MODULE
// ============================================================
function initAuth() {
    const setupForm = document.getElementById('setup-form');
    const loginForm = document.getElementById('login-form');

    if (hasAnyUser()) {
        loginForm.classList.remove('hidden');
    } else {
        setupForm.classList.remove('hidden');
    }

    setupForm.addEventListener('submit', handleSetup);
    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    initPasswordRequirements();

    // Restore session
    const session = sessionStorage.getItem('knx2ha_session');
    if (session) {
        try {
            const s = JSON.parse(session);
            if (s && s.username) {
                appState.currentUser = s;
                showApp();
            }
        } catch {}
    }
}

function initPasswordRequirements() {
    const setupPw = document.getElementById('setup-password');
    setupPw.addEventListener('input', () => {
        const v = setupPw.value;
        document.getElementById('req-length').classList.toggle('met', v.length >= 12);
        document.getElementById('req-upper').classList.toggle('met', /[A-Z]/.test(v));
        document.getElementById('req-lower').classList.toggle('met', /[a-z]/.test(v));
        document.getElementById('req-number').classList.toggle('met', /[0-9]/.test(v));
        document.getElementById('req-special').classList.toggle('met', /[^A-Za-z0-9]/.test(v));
    });
}

function validatePassword(pw) {
    if (pw.length < 12) return 'Mindestens 12 Zeichen erforderlich.';
    if (!/[A-Z]/.test(pw)) return 'Mindestens ein Großbuchstabe erforderlich.';
    if (!/[a-z]/.test(pw)) return 'Mindestens ein Kleinbuchstabe erforderlich.';
    if (!/[0-9]/.test(pw)) return 'Mindestens eine Zahl erforderlich.';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Mindestens ein Sonderzeichen erforderlich.';
    return null;
}

function handleSetup(e) {
    e.preventDefault();
    const username = document.getElementById('setup-username').value.trim();
    const pw = document.getElementById('setup-password').value;
    const confirmPw = document.getElementById('setup-confirm').value;
    const errorEl = document.getElementById('setup-error');

    if (!username || username.length < 2) {
        showError(errorEl, 'Benutzername muss mindestens 2 Zeichen lang sein.');
        return;
    }

    const validationError = validatePassword(pw);
    if (validationError) { showError(errorEl, validationError); return; }

    if (pw !== confirmPw) {
        showError(errorEl, 'Passwörter stimmen nicht überein.');
        return;
    }

    const btn = document.getElementById('setup-btn');
    btn.disabled = true;
    btn.textContent = 'Wird gespeichert...';

    try {
        const bcrypt = dcodeIO.bcrypt;
        const hash = bcrypt.hashSync(pw, bcrypt.genSaltSync(10));
        saveUsers([{ username, hash, role: 'admin' }]);

        // Verify it was saved
        if (!hasAnyUser()) {
            throw new Error('Speichern fehlgeschlagen – localStorage blockiert?');
        }

        createSession(username, 'admin');
        showApp();
    } catch (err) {
        showError(errorEl, 'Fehler: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Admin-Konto erstellen';
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const pw = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const lockoutEl = document.getElementById('lockout-msg');
    const btn = document.getElementById('login-btn');

    if (Date.now() < appState.lockoutUntil) return;

    if (!username || !pw) {
        showError(errorEl, 'Bitte Benutzername und Passwort eingeben.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Prüfe...';
    errorEl.classList.add('hidden');

    try {
        const user = findUser(username);
        if (!user) {
            appState.failedAttempts++;
            handleFailedAttempt(errorEl, lockoutEl, btn);
            return;
        }

        const match = dcodeIO.bcrypt.compareSync(pw, user.hash);
        if (match) {
            appState.failedAttempts = 0;
            createSession(user.username, user.role);
            showApp();
        } else {
            appState.failedAttempts++;
            handleFailedAttempt(errorEl, lockoutEl, btn);
        }
    } catch (err) {
        showError(errorEl, 'Fehler: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Anmelden';
    }
}

function handleFailedAttempt(errorEl, lockoutEl, btn) {
    if (appState.failedAttempts >= 5) {
        startLockout(lockoutEl, btn);
    } else {
        const remaining = 5 - appState.failedAttempts;
        showError(errorEl, `Benutzername oder Passwort falsch. Noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}.`);
    }
    btn.disabled = false;
    btn.textContent = 'Anmelden';
}

function startLockout(lockoutEl, btn) {
    document.getElementById('login-error').classList.add('hidden');
    lockoutEl.classList.remove('hidden');
    btn.disabled = true;
    appState.lockoutUntil = Date.now() + 30000;
    let remaining = 30;
    const timer = setInterval(() => {
        remaining--;
        document.getElementById('lockout-timer').textContent = remaining;
        if (remaining <= 0) {
            clearInterval(timer);
            lockoutEl.classList.add('hidden');
            btn.disabled = false;
            appState.failedAttempts = 0;
        }
    }, 1000);
}

function handleLogout() {
    sessionStorage.removeItem('knx2ha_session');
    appState.currentUser = null;
    location.reload();
}

function createSession(username, role) {
    const session = { username, role, token: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) };
    sessionStorage.setItem('knx2ha_session', JSON.stringify(session));
    appState.currentUser = session;
}

function showApp() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('active');

    // Show current user
    if (appState.currentUser) {
        document.getElementById('current-user').textContent = appState.currentUser.username;
        if (appState.currentUser.role === 'admin') {
            document.getElementById('admin-btn').classList.remove('hidden');
        }
    }
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

function initTogglePw() {
    document.querySelectorAll('.toggle-pw').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            input.type = input.type === 'password' ? 'text' : 'password';
        });
    });
}

// ============================================================
// ADMIN MODULE – Benutzerverwaltung
// ============================================================
function initAdmin() {
    document.getElementById('admin-btn').addEventListener('click', openAdmin);
    document.getElementById('admin-close').addEventListener('click', closeAdmin);
    document.querySelector('.modal-backdrop')?.addEventListener('click', closeAdmin);
    document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
}

function openAdmin() {
    document.getElementById('admin-modal').classList.remove('hidden');
    renderUserList();
}

function closeAdmin() {
    document.getElementById('admin-modal').classList.add('hidden');
}

function renderUserList() {
    const list = document.getElementById('user-list');
    const users = getUsers();
    list.innerHTML = '';

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-item';
        const isCurrentUser = appState.currentUser && appState.currentUser.username === u.username;
        div.innerHTML = `
            <div class="user-info">
                <span>${escHtml(u.username)}</span>
                <span class="role-badge">${u.role}</span>
                ${isCurrentUser ? '<span style="color:var(--success);font-size:0.75rem">(Du)</span>' : ''}
            </div>
            ${!isCurrentUser ? `<button class="btn-delete" data-user="${escHtml(u.username)}" title="Benutzer löschen">&times;</button>` : ''}
        `;
        list.appendChild(div);
    });

    // Delete handler
    list.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.dataset.user;
            if (confirm(`Benutzer "${username}" wirklich löschen?`)) {
                const users = getUsers().filter(u => u.username !== username);
                saveUsers(users);
                renderUserList();
            }
        });
    });
}

function handleAddUser(e) {
    e.preventDefault();
    const username = document.getElementById('new-username').value.trim();
    const pw = document.getElementById('new-password').value;
    const errorEl = document.getElementById('add-user-error');
    const successEl = document.getElementById('add-user-success');

    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!username || username.length < 2) {
        showError(errorEl, 'Benutzername muss mindestens 2 Zeichen lang sein.');
        return;
    }

    if (findUser(username)) {
        showError(errorEl, 'Benutzername existiert bereits.');
        return;
    }

    const validationError = validatePassword(pw);
    if (validationError) { showError(errorEl, validationError); return; }

    try {
        const bcrypt = dcodeIO.bcrypt;
        const hash = bcrypt.hashSync(pw, bcrypt.genSaltSync(10));
        const users = getUsers();
        users.push({ username, hash, role: 'user' });
        saveUsers(users);

        successEl.textContent = `Benutzer "${username}" wurde angelegt.`;
        successEl.classList.remove('hidden');
        document.getElementById('new-username').value = '';
        document.getElementById('new-password').value = '';
        renderUserList();
    } catch (err) {
        showError(errorEl, 'Fehler: ' + err.message);
    }
}

// ============================================================
// NAVIGATION MODULE
// ============================================================
function initNavigation() {
    document.getElementById('to-step-2').addEventListener('click', () => goToStep(2));
    document.getElementById('back-to-step-1').addEventListener('click', () => goToStep(1));
    document.getElementById('skip-step-2').addEventListener('click', () => {
        appState.existingYaml = null;
        appState.existingAddresses.clear();
        goToStep(3);
    });
    document.getElementById('to-step-3').addEventListener('click', () => goToStep(3));
    document.getElementById('back-to-step-2').addEventListener('click', () => goToStep(2));
    document.getElementById('new-project').addEventListener('click', resetApp);
}

function goToStep(step) {
    if (step === 2 && appState.parsedGAs.length === 0) return;
    if (step === 3) generateYaml();
    appState.currentStep = step;

    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    const target = document.getElementById(`step-${step}`);
    target.classList.remove('hidden');
    target.classList.add('active');

    document.querySelectorAll('.step-indicator .step').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (s === step) el.classList.add('active');
        else if (s < step) el.classList.add('completed');
    });

    const lines = document.querySelectorAll('.step-line');
    lines.forEach((line, i) => line.classList.toggle('completed', i + 1 < step));
}

function resetApp() {
    appState.parsedGAs = [];
    appState.existingYaml = null;
    appState.existingAddresses.clear();
    document.getElementById('parse-results').classList.add('hidden');
    document.getElementById('parse-loading').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
    document.getElementById('yaml-results').classList.add('hidden');
    document.getElementById('yaml-error').classList.add('hidden');
    document.getElementById('ga-table-body').innerHTML = '';
    document.getElementById('yaml-output').querySelector('code').textContent = '';
    goToStep(1);
}

// ============================================================
// FILE DROP ZONES
// ============================================================
function initDropZones() {
    setupDropZone('drop-zone', 'file-input', handleKnxFile);
    setupDropZone('yaml-drop-zone', 'yaml-file-input', handleYamlFile);
}

function setupDropZone(zoneId, inputId, handler) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handler(e.dataTransfer.files[0]);
    });
    zone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') input.click();
    });
    input.addEventListener('change', () => { if (input.files[0]) handler(input.files[0]); });
}

// ============================================================
// KNX PROJECT PARSER – Namespace-agnostisch
// ============================================================
async function handleKnxFile(file) {
    if (!file.name.endsWith('.knxproj')) {
        alert('Bitte eine .knxproj-Datei auswählen.');
        return;
    }

    const dropZone = document.getElementById('drop-zone');
    const loading = document.getElementById('parse-loading');
    const progressFill = document.getElementById('parse-progress');

    dropZone.style.display = 'none';
    loading.classList.remove('hidden');
    progressFill.style.width = '10%';

    try {
        const zip = await JSZip.loadAsync(file);
        progressFill.style.width = '30%';
        const gasResult = await parseKnxProject(zip, progressFill);
        progressFill.style.width = '90%';
        appState.parsedGAs = gasResult;
        renderGATable(gasResult);
        progressFill.style.width = '100%';
        setTimeout(() => {
            loading.classList.add('hidden');
            document.getElementById('parse-results').classList.remove('hidden');
        }, 300);
    } catch (err) {
        console.error('Parse error:', err);
        loading.classList.add('hidden');
        dropZone.style.display = '';
        alert('Fehler beim Lesen der Datei:\n' + err.message);
    }
}

// Namespace-agnostischer Selektor: nutzt localName statt tagName
function qAll(doc, localName) {
    return Array.from(doc.getElementsByTagName('*')).filter(el => el.localName === localName);
}

async function parseKnxProject(zip, progressFill) {
    const xmlFiles = [];
    zip.forEach((path, entry) => {
        if (path.endsWith('.xml') && !entry.dir) xmlFiles.push({ path, entry });
    });

    if (xmlFiles.length === 0) throw new Error('Keine XML-Dateien gefunden.');
    console.log(`KNX Parser: ${xmlFiles.length} XML-Dateien`);

    // Load all XML files
    const allDocs = [];
    for (const { path, entry } of xmlFiles) {
        try {
            const content = await entry.async('text');
            const doc = new DOMParser().parseFromString(content, 'text/xml');
            allDocs.push({ doc, path, content });
        } catch (e) { /* skip */ }
    }

    progressFill.style.width = '40%';

    // Phase 1: Build GA-RefId → Manufacturer mapping via DeviceInstance → ComObjectInstanceRef → Send/Receive
    const gaRefToManufacturer = new Map();
    const gaRefToDpt = new Map();

    for (const { doc, path } of allDocs) {
        const devices = qAll(doc, 'DeviceInstance');
        if (devices.length === 0) continue;

        console.log(`KNX Parser: ${devices.length} DeviceInstances in ${path}`);

        for (const device of devices) {
            // Find manufacturer from ProductRefId or Hardware2ProgramRefId
            let manufacturer = 'Unbekannt';
            for (const attr of ['ProductRefId', 'Hardware2ProgramRefId', 'Id']) {
                const val = device.getAttribute(attr) || '';
                const m = val.match(/(M-[0-9A-Fa-f]{4})/i);
                if (m) {
                    manufacturer = MANUFACTURER_MAP[m[1].toUpperCase()] || m[1].toUpperCase();
                    break;
                }
            }

            if (manufacturer === 'Unbekannt') continue;

            // Find all Send and Receive connectors under this device
            const sends = qAll(device, 'Send');
            const receives = qAll(device, 'Receive');
            const connectors = [...sends, ...receives];

            for (const conn of connectors) {
                const gaRefId = conn.getAttribute('GroupAddressRefId');
                if (!gaRefId) continue;
                gaRefToManufacturer.set(gaRefId, manufacturer);

                // Try to get DPT from parent ComObjectInstanceRef
                const parent = conn.parentElement;
                if (parent) {
                    const dpt = parent.getAttribute('DatapointType');
                    if (dpt) gaRefToDpt.set(gaRefId, normalizeDpt(dpt));
                }
            }
        }
    }

    progressFill.style.width = '60%';
    console.log(`KNX Parser: ${gaRefToManufacturer.size} GA→Hersteller Zuordnungen`);

    // Phase 2: Extract GroupAddresses
    const groupAddresses = [];

    for (const { doc, path } of allDocs) {
        const gaElements = qAll(doc, 'GroupAddress');
        if (gaElements.length === 0) continue;

        console.log(`KNX Parser: ${gaElements.length} GroupAddresses in ${path}`);

        for (const ga of gaElements) {
            const address = parseGroupAddress(ga.getAttribute('Address'));
            const name = ga.getAttribute('Name') || '';
            const description = ga.getAttribute('Description') || '';
            const id = ga.getAttribute('Id') || '';

            if (!address) continue;

            // DPT from GA element or from connector mapping
            let dpt = normalizeDpt(ga.getAttribute('DatapointType') || '');
            if (!dpt && gaRefToDpt.has(id)) dpt = gaRefToDpt.get(id);

            // Manufacturer from connector mapping or from ID
            let manufacturer = gaRefToManufacturer.get(id) || 'Unbekannt';
            if (manufacturer === 'Unbekannt') {
                const m = id.match(/(M-[0-9A-Fa-f]{4})/i);
                if (m) manufacturer = MANUFACTURER_MAP[m[1].toUpperCase()] || m[1].toUpperCase();
            }

            // HA type
            let haType = dpt ? (DPT_MAP[dpt] || 'unknown') : 'unknown';
            if (haType === 'unknown') haType = guessTypeFromName(name);

            groupAddresses.push({ address, name: name.trim(), description: description.trim(), dpt: dpt || '—', manufacturer, haType, selected: true });
        }
    }

    progressFill.style.width = '80%';

    // Deduplicate
    const seen = new Map();
    for (const ga of groupAddresses) {
        if (!seen.has(ga.address)) {
            seen.set(ga.address, ga);
        } else {
            const existing = seen.get(ga.address);
            if (existing.manufacturer === 'Unbekannt' && ga.manufacturer !== 'Unbekannt') existing.manufacturer = ga.manufacturer;
            if (existing.dpt === '—' && ga.dpt !== '—') existing.dpt = ga.dpt;
        }
    }

    const unique = Array.from(seen.values()).sort((a, b) => {
        const pa = a.address.split('/').map(Number);
        const pb = b.address.split('/').map(Number);
        return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
    });

    console.log(`KNX Parser: ${unique.length} eindeutige Gruppenadressen`);
    if (gaRefToManufacturer.size === 0) {
        console.warn('KNX Parser: Keine Hersteller-Zuordnungen gefunden. Die .knxproj enthält möglicherweise keine Geräte-Zuordnungen.');
    }

    return unique;
}

function parseGroupAddress(raw) {
    if (!raw) return null;
    if (/^\d+\/\d+\/\d+$/.test(raw)) return raw;
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0 && num <= 65535) {
        return `${(num >> 11) & 0x1f}/${(num >> 8) & 0x07}/${num & 0xff}`;
    }
    if (/^\d+\/\d+$/.test(raw)) {
        const p = raw.split('/');
        return `${p[0]}/0/${p[1]}`;
    }
    return null;
}

function normalizeDpt(raw) {
    if (!raw) return '';
    let m = raw.match(/DPST?-(\d+)-(\d+)/i);
    if (m) return `${parseInt(m[1])}.${m[2].padStart(3, '0')}`;
    m = raw.match(/DPT-(\d+)/i);
    if (m) return `${parseInt(m[1])}.001`;
    m = raw.match(/^(\d+)\.(\d+)$/);
    if (m) return `${parseInt(m[1])}.${m[2].padStart(3, '0')}`;
    return '';
}

function guessTypeFromName(name) {
    const n = name.toLowerCase();
    if (/roll(o|aden|lade)|jalousie|lamel|beschatt|markise|rollo/i.test(n)) return 'cover';
    if (/auf.?ab|position|behang|fahr/i.test(n)) return 'cover';
    if (/heiz|temperatur|thermostat|ventil|stellgr|soll.?temp|ist.?temp|hvac|klima/i.test(n)) return 'climate';
    if (/licht|dimm|leucht|beleucht|lampe|spot|led|decke.*licht/i.test(n)) return 'light';
    if (/helligk/i.test(n) && !/sensor/i.test(n)) return 'light';
    if (/sensor|messung|mess|wind|regen|feuchte|co2|luft|außen.?temp/i.test(n)) return 'sensor';
    if (/helligk.*sensor|luxwert|helligkeit/i.test(n)) return 'sensor';
    if (/taster|taste|eingang|meld|status|rückm|alarm|fenster.*kontakt|präsenz/i.test(n)) return 'binary_sensor';
    if (/schalt|steckdose|steck|aktor|ausgang|pumpe|lüfter|ventilator/i.test(n)) return 'switch';
    return 'unknown';
}

// ============================================================
// GA TABLE RENDERING
// ============================================================
function renderGATable(gas) {
    const tbody = document.getElementById('ga-table-body');
    tbody.innerHTML = '';
    document.getElementById('ga-count').textContent = `${gas.length} Adressen`;
    const mfrs = new Set(gas.map(g => g.manufacturer).filter(m => m !== 'Unbekannt'));
    document.getElementById('device-count').textContent = `${mfrs.size} Hersteller`;

    gas.forEach((ga, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.index = idx;
        tr.innerHTML = `
            <td><input type="checkbox" ${ga.selected ? 'checked' : ''} data-idx="${idx}"></td>
            <td><code>${escHtml(ga.address)}</code></td>
            <td title="${escHtml(ga.description)}">${escHtml(ga.name)}</td>
            <td>${escHtml(ga.dpt)}</td>
            <td>${escHtml(ga.manufacturer)}</td>
            <td>
                <select data-idx="${idx}" class="ha-type-select">
                    <option value="light" ${ga.haType === 'light' ? 'selected' : ''}>Licht</option>
                    <option value="switch" ${ga.haType === 'switch' ? 'selected' : ''}>Schalter</option>
                    <option value="cover" ${ga.haType === 'cover' ? 'selected' : ''}>Rolladen</option>
                    <option value="climate" ${ga.haType === 'climate' ? 'selected' : ''}>Heizung</option>
                    <option value="sensor" ${ga.haType === 'sensor' ? 'selected' : ''}>Sensor</option>
                    <option value="binary_sensor" ${ga.haType === 'binary_sensor' ? 'selected' : ''}>Binärsensor</option>
                    <option value="unknown" ${ga.haType === 'unknown' ? 'selected' : ''}>Unbekannt</option>
                </select>
            </td>
            <td><span class="type-badge ${ga.haType}">${typeLabel(ga.haType)}</span></td>
        `;
        tbody.appendChild(tr);
    });

    tbody.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            appState.parsedGAs[parseInt(e.target.dataset.idx)].selected = e.target.checked;
        }
        if (e.target.classList.contains('ha-type-select')) {
            const idx = parseInt(e.target.dataset.idx);
            appState.parsedGAs[idx].haType = e.target.value;
            const badge = e.target.closest('tr').querySelector('.type-badge');
            badge.className = `type-badge ${e.target.value}`;
            badge.textContent = typeLabel(e.target.value);
        }
    });

    document.getElementById('select-all').addEventListener('change', (e) => {
        const checked = e.target.checked;
        tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = checked;
            const idx = parseInt(cb.dataset.idx);
            if (!isNaN(idx)) appState.parsedGAs[idx].selected = checked;
        });
    });

    initTableFilters();
}

function initTableFilters() {
    const search = document.getElementById('ga-search');
    const typeFilter = document.getElementById('ga-type-filter');
    const mfrFilter = document.getElementById('ga-manufacturer-filter');

    const applyFilters = () => {
        const q = search.value.toLowerCase();
        const type = typeFilter.value;
        const mfr = mfrFilter.value;
        document.querySelectorAll('#ga-table-body tr').forEach((row, idx) => {
            const ga = appState.parsedGAs[idx];
            if (!ga) return;
            let show = true;
            if (q && !ga.name.toLowerCase().includes(q) && !ga.address.includes(q) && !ga.description.toLowerCase().includes(q)) show = false;
            if (type && ga.haType !== type) show = false;
            if (mfr) {
                if (mfr === 'unknown' && ga.manufacturer !== 'Unbekannt') show = false;
                else if (mfr !== 'unknown' && ga.manufacturer !== mfr) show = false;
            }
            row.style.display = show ? '' : 'none';
        });
    };

    search.addEventListener('input', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    mfrFilter.addEventListener('change', applyFilters);
}

function typeLabel(type) {
    return { light: 'Licht', switch: 'Schalter', cover: 'Rolladen', climate: 'Heizung', sensor: 'Sensor', binary_sensor: 'Binärsensor', unknown: 'Unbekannt' }[type] || type;
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// YAML FILE HANDLER (Step 2)
// ============================================================
async function handleYamlFile(file) {
    const errorEl = document.getElementById('yaml-error');
    const errorText = document.getElementById('yaml-error-text');
    const results = document.getElementById('yaml-results');

    errorEl.classList.add('hidden');
    results.classList.add('hidden');

    try {
        const content = await file.text();
        const parsed = jsyaml.load(content);
        if (!parsed || typeof parsed !== 'object') throw new Error('Keine gültigen YAML-Daten.');

        appState.existingYaml = parsed;
        appState.existingAddresses = extractExistingAddresses(parsed);

        const selected = appState.parsedGAs.filter(g => g.selected);
        let existingCount = 0, newCount = 0;
        selected.forEach(ga => {
            if (appState.existingAddresses.has(ga.address)) existingCount++;
            else newCount++;
        });

        document.getElementById('existing-count').textContent = existingCount;
        document.getElementById('new-count').textContent = newCount;
        results.classList.remove('hidden');
    } catch (err) {
        errorText.textContent = err.mark ? `Zeile ${err.mark.line + 1}: ${err.reason || err.message}` : err.message;
        errorEl.classList.remove('hidden');
    }
}

function extractExistingAddresses(yaml) {
    const addresses = new Set();
    const addrFields = ['address', 'state_address', 'brightness_address', 'brightness_state_address',
        'move_long_address', 'stop_address', 'position_address', 'position_state_address',
        'temperature_address', 'target_temperature_address', 'target_temperature_state_address',
        'setpoint_address', 'setpoint_state_address'];

    function search(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(search); return; }
        for (const f of addrFields) {
            if (obj[f] && typeof obj[f] === 'string') addresses.add(obj[f]);
        }
        for (const v of Object.values(obj)) search(v);
    }
    search(yaml);
    return addresses;
}

// ============================================================
// YAML GENERATION (Step 3)
// ============================================================
function generateYaml() {
    const selected = appState.parsedGAs.filter(g => g.selected && g.haType !== 'unknown');
    const toGenerate = appState.existingAddresses.size > 0
        ? selected.filter(g => !appState.existingAddresses.has(g.address))
        : selected;

    const groups = {};
    for (const ga of toGenerate) {
        if (!groups[ga.haType]) groups[ga.haType] = [];
        groups[ga.haType].push(ga);
    }

    const now = new Date().toISOString().split('T')[0];
    let y = `# Generiert von KNX2HA – https://code.ribee.de\n# Datum: ${now}\n\nknx:\n`;

    if (groups.light) {
        y += `  light:\n`;
        for (const ga of groups.light) {
            y += `    - name: "${ga.name}"\n      address: "${ga.address}"\n`;
            if (ga.dpt === '3.007' || ga.dpt === '5.001') y += `      brightness_address: "${ga.address}"\n`;
            y += `\n`;
        }
    }
    if (groups.switch) {
        y += `  switch:\n`;
        for (const ga of groups.switch) y += `    - name: "${ga.name}"\n      address: "${ga.address}"\n\n`;
    }
    if (groups.cover) {
        y += `  cover:\n`;
        for (const ga of groups.cover) y += `    - name: "${ga.name}"\n      move_long_address: "${ga.address}"\n\n`;
    }
    if (groups.climate) {
        y += `  climate:\n`;
        for (const ga of groups.climate) {
            y += `    - name: "${ga.name}"\n`;
            y += (ga.dpt === '9.001' || ga.dpt === '9.002' || ga.dpt === '9.003')
                ? `      temperature_address: "${ga.address}"\n\n`
                : `      target_temperature_address: "${ga.address}"\n\n`;
        }
    }
    if (groups.binary_sensor) {
        y += `  binary_sensor:\n`;
        for (const ga of groups.binary_sensor) y += `    - name: "${ga.name}"\n      state_address: "${ga.address}"\n\n`;
    }
    if (groups.sensor) {
        y += `  sensor:\n`;
        for (const ga of groups.sensor) {
            y += `    - name: "${ga.name}"\n      state_address: "${ga.address}"\n`;
            const st = SENSOR_TYPE_MAP[ga.dpt];
            if (st) y += `      type: ${st}\n`;
            y += `\n`;
        }
    }
    if (Object.keys(groups).length === 0) {
        y += `  # Keine Gruppenadressen zum Generieren ausgewählt.\n`;
    }

    document.getElementById('yaml-output').querySelector('code').textContent = y;
}

// ============================================================
// YAML ACTIONS
// ============================================================
function initYamlActions() {
    document.getElementById('copy-yaml').addEventListener('click', () => {
        const yaml = document.getElementById('yaml-output').querySelector('code').textContent;
        navigator.clipboard.writeText(yaml).then(showToast).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = yaml;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast();
        });
    });

    document.getElementById('download-yaml').addEventListener('click', () => {
        const yaml = document.getElementById('yaml-output').querySelector('code').textContent;
        const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'knx_configuration.yaml';
        a.click();
        URL.revokeObjectURL(url);
    });
}

function showToast() {
    const toast = document.getElementById('copy-toast');
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2000);
}
