// KNX2HA – Vollständige App-Logik
'use strict';

// ============================================================
// DPT → Home Assistant Typ Mapping
// ============================================================
const DPT_MAP = {
    '1.001': 'switch',
    '1.002': 'switch',
    '1.003': 'switch',
    '1.008': 'cover',
    '1.009': 'cover',
    '1.010': 'cover',
    '1.011': 'switch',
    '1.017': 'switch',
    '1.022': 'binary_sensor',
    '3.007': 'light',
    '3.008': 'cover',
    '5.001': 'light',
    '5.003': 'sensor',
    '5.004': 'sensor',
    '5.005': 'sensor',
    '5.010': 'sensor',
    '7.001': 'sensor',
    '7.012': 'sensor',
    '7.013': 'sensor',
    '8.001': 'sensor',
    '9.001': 'sensor',
    '9.002': 'sensor',
    '9.003': 'sensor',
    '9.004': 'sensor',
    '9.005': 'sensor',
    '9.006': 'sensor',
    '9.007': 'sensor',
    '9.008': 'sensor',
    '9.010': 'sensor',
    '9.011': 'sensor',
    '9.021': 'sensor',
    '9.024': 'sensor',
    '9.025': 'sensor',
    '9.026': 'sensor',
    '9.027': 'sensor',
    '9.028': 'sensor',
    '10.001': 'sensor',
    '11.001': 'sensor',
    '12.001': 'sensor',
    '13.001': 'sensor',
    '13.002': 'sensor',
    '13.010': 'sensor',
    '13.013': 'sensor',
    '14.019': 'sensor',
    '14.027': 'sensor',
    '14.033': 'sensor',
    '14.056': 'sensor',
    '14.068': 'sensor',
    '14.076': 'sensor',
    '16.000': 'sensor',
    '16.001': 'sensor',
    '17.001': 'sensor',
    '20.102': 'climate',
    '20.105': 'climate',
};

// Sensor-Subtypen für spezifische DPTs
const SENSOR_TYPE_MAP = {
    '9.001': 'temperature',
    '9.002': 'temperature',
    '9.003': 'temperature',
    '9.004': 'illuminance',
    '9.005': 'speed',
    '9.006': 'pressure',
    '9.007': 'humidity',
    '9.008': 'quality',
    '9.010': 'time',
    '9.011': 'time',
    '9.024': 'power',
    '9.025': 'volume_flow_rate',
    '9.026': 'speed',
    '9.028': 'speed',
    '12.001': 'total_increasing',
    '13.002': 'volume_flow_rate',
    '13.010': 'energy',
    '13.013': 'energy',
    '14.019': 'current',
    '14.027': 'current',
    '14.033': 'frequency',
    '14.056': 'power',
    '14.068': 'temperature',
    '14.076': 'voltage',
};

// Hersteller-IDs
const MANUFACTURER_MAP = {
    'M-0083': 'Jung',
    'M-0001': 'ABB',
    'M-0064': 'ABB',     // Busch-Jaeger
    'M-0013': 'MDT',
    'M-0069': 'Theben',
    'M-0004': 'Siemens',
    'M-0007': 'Hager',
    'M-0024': 'Gira',
    'M-00C8': 'Weinzierl',
};

// ============================================================
// State
// ============================================================
let appState = {
    failedAttempts: 0,
    lockoutUntil: 0,
    parsedGAs: [],         // [{address, name, description, dpt, manufacturer, haType, selected}]
    existingYaml: null,    // Parsed existing YAML
    existingAddresses: new Set(),
    currentStep: 1,
};

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Prüfen ob Bibliotheken geladen sind
    if (typeof dcodeIO === 'undefined' || !dcodeIO.bcrypt) {
        console.error('bcryptjs nicht geladen!');
        document.body.innerHTML = '<div style="color:#f85149;padding:2rem;text-align:center;font-family:sans-serif;">'
            + '<h2>Fehler: Bibliotheken konnten nicht geladen werden.</h2>'
            + '<p>Bitte Seite neu laden (Strg+Shift+R) oder Adblocker deaktivieren.</p></div>';
        return;
    }
    console.log('KNX2HA: Alle Bibliotheken geladen', {
        bcrypt: typeof dcodeIO !== 'undefined',
        jszip: typeof JSZip !== 'undefined',
        jsyaml: typeof jsyaml !== 'undefined'
    });

    initAuth();
    initTogglePw();
    initDropZones();
    initNavigation();
    initYamlActions();
});

// ============================================================
// AUTH MODULE
// ============================================================
function initAuth() {
    const hasPassword = localStorage.getItem('knx2ha_pw_hash');
    const setupForm = document.getElementById('setup-form');
    const loginForm = document.getElementById('login-form');

    if (hasPassword) {
        loginForm.classList.remove('hidden');
    } else {
        setupForm.classList.remove('hidden');
    }

    // Setup form
    setupForm.addEventListener('submit', handleSetup);
    initPasswordRequirements();

    // Login form
    loginForm.addEventListener('submit', handleLogin);

    // Reset password
    document.getElementById('reset-pw-btn').addEventListener('click', handleResetPassword);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Check existing session
    if (sessionStorage.getItem('knx2ha_session')) {
        showApp();
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

async function handleSetup(e) {
    e.preventDefault();
    const pw = document.getElementById('setup-password').value;
    const confirm = document.getElementById('setup-confirm').value;
    const errorEl = document.getElementById('setup-error');

    const validationError = validatePassword(pw);
    if (validationError) {
        showError(errorEl, validationError);
        return;
    }

    if (pw !== confirm) {
        showError(errorEl, 'Passwörter stimmen nicht überein.');
        return;
    }

    const btn = document.getElementById('setup-btn');
    btn.disabled = true;
    btn.textContent = 'Wird gespeichert...';

    try {
        console.log('Setup: Starte bcrypt hashing...');
        const bcrypt = dcodeIO.bcrypt;
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(pw, salt);
        console.log('Setup: Hash erstellt, speichere...');
        localStorage.setItem('knx2ha_pw_hash', hash);
        console.log('Setup: Hash gespeichert, erstelle Session...');

        // Create session
        createSession();
        console.log('Setup: Fertig, zeige App');
        showApp();
    } catch (err) {
        console.error('Setup Fehler:', err);
        showError(errorEl, 'Fehler beim Speichern: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Passwort speichern';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const pw = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const lockoutEl = document.getElementById('lockout-msg');
    const btn = document.getElementById('login-btn');

    // Rate limiting check
    if (Date.now() < appState.lockoutUntil) {
        return;
    }

    if (!pw) {
        showError(errorEl, 'Bitte Passwort eingeben.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Prüfe...';
    errorEl.classList.add('hidden');

    try {
        const hash = localStorage.getItem('knx2ha_pw_hash');
        const match = dcodeIO.bcrypt.compareSync(pw, hash);

        if (match) {
            appState.failedAttempts = 0;
            createSession();
            showApp();
        } else {
            appState.failedAttempts++;
            if (appState.failedAttempts >= 5) {
                startLockout(lockoutEl, btn);
            } else {
                const remaining = 5 - appState.failedAttempts;
                showError(errorEl, `Falsches Passwort. Noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}.`);
            }
        }
    } catch (err) {
        showError(errorEl, 'Fehler: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Anmelden';
    }
}

function startLockout(lockoutEl, btn) {
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');
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

function handleResetPassword() {
    if (confirm('Passwort wirklich zurücksetzen? Alle gespeicherten Daten werden gelöscht.')) {
        localStorage.removeItem('knx2ha_pw_hash');
        sessionStorage.removeItem('knx2ha_session');
        location.reload();
    }
}

function handleLogout() {
    sessionStorage.removeItem('knx2ha_session');
    location.reload();
}

function createSession() {
    const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    sessionStorage.setItem('knx2ha_session', token);
}

function showApp() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('active');
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
    if (step === 2 && appState.parsedGAs.length === 0) {
        return;
    }
    if (step === 3) {
        generateYaml();
    }

    appState.currentStep = step;

    // Update step content
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');

    // Update step indicator
    document.querySelectorAll('.step-indicator .step').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (s === step) el.classList.add('active');
        else if (s < step) el.classList.add('completed');
    });

    // Update step lines
    const lines = document.querySelectorAll('.step-line');
    lines.forEach((line, i) => {
        line.classList.toggle('completed', i + 1 < step);
    });
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
    // KNX project drop zone
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleKnxFile(file);
    });
    dropZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
            fileInput.click();
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleKnxFile(fileInput.files[0]);
    });

    // YAML drop zone
    const yamlDropZone = document.getElementById('yaml-drop-zone');
    const yamlInput = document.getElementById('yaml-file-input');

    yamlDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        yamlDropZone.classList.add('drag-over');
    });
    yamlDropZone.addEventListener('dragleave', () => yamlDropZone.classList.remove('drag-over'));
    yamlDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        yamlDropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleYamlFile(file);
    });
    yamlDropZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
            yamlInput.click();
        }
    });
    yamlInput.addEventListener('change', () => {
        if (yamlInput.files[0]) handleYamlFile(yamlInput.files[0]);
    });
}

// ============================================================
// KNX PROJECT PARSER
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

async function parseKnxProject(zip, progressFill) {
    const groupAddresses = [];
    const manufacturers = {};

    // Find all XML files in the project
    const xmlFiles = [];
    zip.forEach((path, entry) => {
        if (path.endsWith('.xml') && !entry.dir) {
            xmlFiles.push({ path, entry });
        }
    });

    if (xmlFiles.length === 0) {
        throw new Error('Keine XML-Dateien in der .knxproj gefunden. Ist dies eine gültige ETS-Projektdatei?');
    }

    // Parse manufacturer info from Hardware.xml files
    for (const { path, entry } of xmlFiles) {
        if (path.includes('M-') && (path.includes('Hardware.xml') || path.includes('Catalog.xml'))) {
            try {
                const content = await entry.async('text');
                const doc = new DOMParser().parseFromString(content, 'text/xml');
                extractManufacturerInfo(doc, manufacturers, path);
            } catch (e) {
                // Skip problematic files
            }
        }
    }

    progressFill.style.width = '50%';

    // Parse project files (0.xml, project XMLs) for group addresses
    for (const { path, entry } of xmlFiles) {
        // Look for project data files
        if (path.match(/\/\d+\.xml$/) || path.includes('Project') || path.includes('GroupAddress')) {
            try {
                const content = await entry.async('text');
                const doc = new DOMParser().parseFromString(content, 'text/xml');
                extractGroupAddresses(doc, groupAddresses, manufacturers);
            } catch (e) {
                // Skip problematic files
            }
        }
    }

    progressFill.style.width = '80%';

    // Deduplicate by address
    const seen = new Set();
    const unique = [];
    for (const ga of groupAddresses) {
        if (!seen.has(ga.address)) {
            seen.add(ga.address);
            unique.push(ga);
        }
    }

    // Sort by address
    unique.sort((a, b) => {
        const pa = a.address.split('/').map(Number);
        const pb = b.address.split('/').map(Number);
        return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
    });

    return unique;
}

function extractManufacturerInfo(doc, manufacturers, filePath) {
    // Extract manufacturer ID from path (e.g., M-0083/...)
    const mMatch = filePath.match(/(M-[0-9A-Fa-f]{4})/);
    if (!mMatch) return;
    const mId = mMatch[1];
    const name = MANUFACTURER_MAP[mId] || mId;

    // Find device references
    const devices = doc.querySelectorAll('[Id]');
    devices.forEach(dev => {
        const id = dev.getAttribute('Id') || '';
        if (id.startsWith(mId)) {
            manufacturers[id] = name;
        }
    });

    // Store the general manufacturer ID mapping
    manufacturers[mId] = name;
}

function extractGroupAddresses(doc, results, manufacturers) {
    // ETS5/ETS6: GroupAddress elements
    const gaElements = doc.querySelectorAll('GroupAddress');

    gaElements.forEach(ga => {
        const address = parseGroupAddress(ga.getAttribute('Address'));
        const name = ga.getAttribute('Name') || '';
        const description = ga.getAttribute('Description') || '';
        const id = ga.getAttribute('Id') || '';

        if (!address) return;

        // Try to find DPT from DatapointType attribute or from connections
        let dpt = ga.getAttribute('DatapointType') || '';
        dpt = normalizeDpt(dpt);

        // Determine manufacturer from device connections
        let manufacturer = 'Unbekannt';
        const pId = ga.getAttribute('Puid') || id;
        for (const [key, mName] of Object.entries(manufacturers)) {
            if (pId.includes(key) || id.includes(key)) {
                manufacturer = mName;
                break;
            }
        }

        // If manufacturer not found from ID, try from path-based mapping
        if (manufacturer === 'Unbekannt') {
            for (const [mId, mName] of Object.entries(MANUFACTURER_MAP)) {
                if (id.includes(mId)) {
                    manufacturer = mName;
                    break;
                }
            }
        }

        // Determine HA type
        let haType = dpt ? (DPT_MAP[dpt] || 'unknown') : 'unknown';

        // Heuristic from name if no DPT
        if (haType === 'unknown') {
            haType = guessTypeFromName(name);
        }

        results.push({
            address,
            name: name.trim(),
            description: description.trim(),
            dpt: dpt || '—',
            manufacturer,
            haType,
            selected: true,
        });
    });

    // Also check for GroupAddressRange (ETS structure)
    if (gaElements.length === 0) {
        const gaRanges = doc.querySelectorAll('GroupRange GroupAddress, GroupAddresses GroupAddress');
        gaRanges.forEach(ga => {
            const address = parseGroupAddress(ga.getAttribute('Address'));
            const name = ga.getAttribute('Name') || '';
            const dpt = normalizeDpt(ga.getAttribute('DatapointType') || '');

            if (!address) return;

            let haType = dpt ? (DPT_MAP[dpt] || 'unknown') : 'unknown';
            if (haType === 'unknown') haType = guessTypeFromName(name);

            results.push({
                address,
                name: name.trim(),
                description: '',
                dpt: dpt || '—',
                manufacturer: 'Unbekannt',
                haType,
                selected: true,
            });
        });
    }
}

function parseGroupAddress(raw) {
    if (!raw) return null;

    // Already in 3-level format
    if (/^\d+\/\d+\/\d+$/.test(raw)) return raw;

    // Numeric (16-bit integer) → convert to 3-level
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0 && num <= 65535) {
        const main = (num >> 11) & 0x1f;
        const middle = (num >> 8) & 0x07;
        const sub = num & 0xff;
        return `${main}/${middle}/${sub}`;
    }

    // 2-level format
    if (/^\d+\/\d+$/.test(raw)) {
        const parts = raw.split('/');
        return `${parts[0]}/0/${parts[1]}`;
    }

    return null;
}

function normalizeDpt(raw) {
    if (!raw) return '';

    // Handle ETS format like "DPST-1-1" or "DPT-1" or "1.001"
    let match = raw.match(/DPST?-(\d+)-(\d+)/i);
    if (match) return `${parseInt(match[1])}.${match[2].padStart(3, '0')}`;

    match = raw.match(/DPT-(\d+)/i);
    if (match) return `${parseInt(match[1])}.001`;

    match = raw.match(/^(\d+)\.(\d+)$/);
    if (match) return `${parseInt(match[1])}.${match[2].padStart(3, '0')}`;

    return '';
}

function guessTypeFromName(name) {
    const n = name.toLowerCase();

    // Cover / Rolladen
    if (/roll(o|aden|lade)|jalousie|lamel|beschatt|markise|rollo/i.test(n)) return 'cover';
    if (/auf.?ab|position|behang|fahr/i.test(n)) return 'cover';

    // Climate / Heating
    if (/heiz|temperatur|thermostat|ventil|stellgr|soll.?temp|ist.?temp|hvac|klima/i.test(n)) return 'climate';

    // Light / Dimming
    if (/licht|dimm|leucht|beleucht|lampe|spot|led|decke.*licht/i.test(n)) return 'light';
    if (/helligk/i.test(n) && !/sensor/i.test(n)) return 'light';

    // Sensor
    if (/sensor|messung|mess|wind|regen|feuchte|co2|luft|außen.?temp/i.test(n)) return 'sensor';
    if (/helligk.*sensor|luxwert|helligkeit/i.test(n)) return 'sensor';

    // Binary Sensor
    if (/taster|taste|eingang|meld|status|rückm|alarm|fenster.*kontakt|präsenz/i.test(n)) return 'binary_sensor';

    // Switch
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

    // Count unique manufacturers
    const mfrs = new Set(gas.map(g => g.manufacturer));
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

    // Event: checkbox toggle
    tbody.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const idx = parseInt(e.target.dataset.idx);
            appState.parsedGAs[idx].selected = e.target.checked;
        }
        if (e.target.classList.contains('ha-type-select')) {
            const idx = parseInt(e.target.dataset.idx);
            appState.parsedGAs[idx].haType = e.target.value;
            // Update badge
            const badge = e.target.closest('tr').querySelector('.type-badge');
            badge.className = `type-badge ${e.target.value}`;
            badge.textContent = typeLabel(e.target.value);
        }
    });

    // Select all
    document.getElementById('select-all').addEventListener('change', (e) => {
        const checked = e.target.checked;
        tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = checked;
            const idx = parseInt(cb.dataset.idx);
            if (!isNaN(idx)) appState.parsedGAs[idx].selected = checked;
        });
    });

    // Filter
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
        const rows = document.querySelectorAll('#ga-table-body tr');

        rows.forEach((row, idx) => {
            const ga = appState.parsedGAs[idx];
            if (!ga) return;

            let show = true;
            if (q && !ga.name.toLowerCase().includes(q) && !ga.address.includes(q) && !ga.description.toLowerCase().includes(q)) {
                show = false;
            }
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
    const labels = {
        light: 'Licht', switch: 'Schalter', cover: 'Rolladen',
        climate: 'Heizung', sensor: 'Sensor', binary_sensor: 'Binärsensor',
        unknown: 'Unbekannt',
    };
    return labels[type] || type;
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

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Die Datei enthält keine gültigen YAML-Daten.');
        }

        appState.existingYaml = parsed;
        appState.existingAddresses = extractExistingAddresses(parsed);

        // Count existing vs new
        const selected = appState.parsedGAs.filter(g => g.selected);
        let existingCount = 0;
        let newCount = 0;

        selected.forEach(ga => {
            if (appState.existingAddresses.has(ga.address)) {
                existingCount++;
            } else {
                newCount++;
            }
        });

        document.getElementById('existing-count').textContent = existingCount;
        document.getElementById('new-count').textContent = newCount;
        results.classList.remove('hidden');

    } catch (err) {
        if (err.mark) {
            errorText.textContent = `Zeile ${err.mark.line + 1}: ${err.reason || err.message}`;
        } else {
            errorText.textContent = err.message;
        }
        errorEl.classList.remove('hidden');
    }
}

function extractExistingAddresses(yaml) {
    const addresses = new Set();

    function searchObj(obj) {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            obj.forEach(item => searchObj(item));
            return;
        }

        // Check for known address fields
        const addrFields = ['address', 'state_address', 'brightness_address', 'brightness_state_address',
            'move_long_address', 'stop_address', 'position_address', 'position_state_address',
            'temperature_address', 'target_temperature_address', 'target_temperature_state_address',
            'setpoint_address', 'setpoint_state_address'];

        for (const field of addrFields) {
            if (obj[field] && typeof obj[field] === 'string') {
                addresses.add(obj[field]);
            }
        }

        for (const value of Object.values(obj)) {
            searchObj(value);
        }
    }

    searchObj(yaml);
    return addresses;
}

// ============================================================
// YAML GENERATION (Step 3)
// ============================================================
function generateYaml() {
    const selected = appState.parsedGAs.filter(g => g.selected && g.haType !== 'unknown');

    // Filter out existing addresses if YAML was loaded
    const toGenerate = appState.existingAddresses.size > 0
        ? selected.filter(g => !appState.existingAddresses.has(g.address))
        : selected;

    // Group by HA type
    const groups = {};
    for (const ga of toGenerate) {
        if (!groups[ga.haType]) groups[ga.haType] = [];
        groups[ga.haType].push(ga);
    }

    // Build YAML structure
    const now = new Date().toISOString().split('T')[0];
    let yamlStr = `# Generiert von KNX2HA – https://code.ribee.de\n`;
    yamlStr += `# Datum: ${now}\n\n`;
    yamlStr += `knx:\n`;

    // Lights
    if (groups.light) {
        yamlStr += `  light:\n`;
        for (const ga of groups.light) {
            yamlStr += `    - name: "${ga.name}"\n`;
            yamlStr += `      address: "${ga.address}"\n`;
            if (isDimmDpt(ga.dpt)) {
                yamlStr += `      brightness_address: "${ga.address}"\n`;
            }
            yamlStr += `\n`;
        }
    }

    // Switches
    if (groups.switch) {
        yamlStr += `  switch:\n`;
        for (const ga of groups.switch) {
            yamlStr += `    - name: "${ga.name}"\n`;
            yamlStr += `      address: "${ga.address}"\n`;
            yamlStr += `\n`;
        }
    }

    // Covers
    if (groups.cover) {
        yamlStr += `  cover:\n`;
        for (const ga of groups.cover) {
            yamlStr += `    - name: "${ga.name}"\n`;
            yamlStr += `      move_long_address: "${ga.address}"\n`;
            yamlStr += `\n`;
        }
    }

    // Climate
    if (groups.climate) {
        yamlStr += `  climate:\n`;
        for (const ga of groups.climate) {
            yamlStr += `    - name: "${ga.name}"\n`;
            if (isTemperatureDpt(ga.dpt)) {
                yamlStr += `      temperature_address: "${ga.address}"\n`;
            } else {
                yamlStr += `      target_temperature_address: "${ga.address}"\n`;
            }
            yamlStr += `\n`;
        }
    }

    // Binary Sensors
    if (groups.binary_sensor) {
        yamlStr += `  binary_sensor:\n`;
        for (const ga of groups.binary_sensor) {
            yamlStr += `    - name: "${ga.name}"\n`;
            yamlStr += `      state_address: "${ga.address}"\n`;
            yamlStr += `\n`;
        }
    }

    // Sensors
    if (groups.sensor) {
        yamlStr += `  sensor:\n`;
        for (const ga of groups.sensor) {
            yamlStr += `    - name: "${ga.name}"\n`;
            yamlStr += `      state_address: "${ga.address}"\n`;
            const sensorType = SENSOR_TYPE_MAP[ga.dpt];
            if (sensorType) {
                yamlStr += `      type: ${sensorType}\n`;
            }
            yamlStr += `\n`;
        }
    }

    // If nothing to generate
    if (Object.keys(groups).length === 0) {
        yamlStr += `  # Keine Gruppenadressen zum Generieren ausgewählt.\n`;
        yamlStr += `  # Bitte wähle in Schritt 1 die gewünschten Adressen aus.\n`;
    }

    document.getElementById('yaml-output').querySelector('code').textContent = yamlStr;
}

function isDimmDpt(dpt) {
    return dpt === '3.007' || dpt === '5.001';
}

function isTemperatureDpt(dpt) {
    return dpt === '9.001' || dpt === '9.002' || dpt === '9.003';
}

// ============================================================
// YAML ACTIONS (Copy / Download)
// ============================================================
function initYamlActions() {
    document.getElementById('copy-yaml').addEventListener('click', () => {
        const yaml = document.getElementById('yaml-output').querySelector('code').textContent;
        navigator.clipboard.writeText(yaml).then(() => {
            showToast();
        }).catch(() => {
            // Fallback
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
