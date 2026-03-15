// KNX2HA – Vollständige App-Logik
'use strict';

// ============================================================
// DPT → Home Assistant Typ Mapping
// ============================================================
const DPT_MAP = {
    '1.001': 'switch', '1.002': 'switch', '1.003': 'switch',
    '1.007': 'cover', '1.008': 'cover', '1.009': 'cover', '1.010': 'cover',
    '1.011': 'binary_sensor', '1.017': 'switch', '1.022': 'binary_sensor',
    '3.007': 'light', '3.008': 'cover',
    '5.001': 'sensor', '5.003': 'sensor', '5.004': 'sensor', '5.005': 'sensor', '5.010': 'sensor',
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
    '22.101': 'sensor',
};

// ============================================================
// Gerätetyp-Erkennung aus ETS ProductRefId
// ============================================================
function detectDeviceType(productRefId) {
    if (!productRefId) return 'sonstiges';
    // URL-Encoding in ETS: .2D = -, .2E = ., .20 = space
    const decoded = productRefId.toUpperCase()
        .replace(/\.2D/g, '-').replace(/\.2E/g, '.').replace(/\.20/g, ' ');
    if (/JAL/i.test(decoded)) return 'jalousieaktor';
    if (/AKS|AKI|AKU/i.test(decoded)) return 'schaltaktor';
    if (/REGHER/i.test(decoded)) return 'jalousieaktor';
    if (/REGHZ/i.test(decoded)) return 'ventilantrieb';
    if (/KRM.*SD|RAUMTEMP/i.test(decoded)) return 'raumregler';
    if (/TSM|TAST/i.test(decoded)) return 'taster';
    if (/MWW|PRAE/i.test(decoded)) return 'praesenzmelder';
    if (/847\d|407\d|LED/i.test(decoded)) return 'taster';
    return 'sonstiges';
}

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
    'M-0083': 'Jung', 'M-0001': 'ABB', 'M-0002': 'ABB', 'M-0064': 'ABB',
    'M-0013': 'MDT', 'M-0069': 'Theben', 'M-0004': 'Siemens',
    'M-0007': 'Hager', 'M-0024': 'Gira', 'M-00C8': 'Weinzierl',
};

// Priorität: Aktoren bestimmen den HA-Typ, nicht Sensoren/Taster
// Niedrigere Zahl = höhere Priorität (Aktor gewinnt über Taster/Raumregler)
const DEVICE_TYPE_PRIORITY = {
    'schaltaktor': 1,     // Schaltet Licht/Steckdosen → bestimmend
    'jalousieaktor': 1,   // Fährt Rolläden → bestimmend
    'ventilantrieb': 2,   // Heizungsventil → bestimmend für Stellgröße
    'raumregler': 3,      // Hat Taster + Temperatur → Eingang, nicht bestimmend
    'taster': 4,          // Nur Eingang
    'praesenzmelder': 4,  // Nur Eingang
    'sonstiges': 5,
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
// BENUTZER – fest im Code (Hashes, NICHT Klartext)
// ============================================================
const USERS = [
    { username: "admin", hash: "$2b$10$3iOrc980Hjvcjx.xsyPIEO7IIrfiTS2Kkh34VVFzLXA75VBBFhJh2", role: "admin" },
    { username: "007ritter", hash: "$2b$10$aVZReNiNhVgi.TsV6T9flezHXpXD5L0W1uodIYvwgh0hlx/rHydeC", role: "user" },
];

function findUser(username) {
    return USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
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

    initAuth();
    initTogglePw();
    initDropZones();
    initNavigation();
    initYamlActions();
    initAdmin();
});

// ============================================================
// AUTH MODULE
// ============================================================
function initAuth() {
    const loginForm = document.getElementById('login-form');
    loginForm.classList.remove('hidden');

    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Restore session
    const session = sessionStorage.getItem('knx2ha_session');
    if (session) {
        try {
            const s = JSON.parse(session);
            if (s && s.username && findUser(s.username)) {
                appState.currentUser = s;
                showApp();
            }
        } catch {}
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
    list.innerHTML = '';

    USERS.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-item';
        const isCurrentUser = appState.currentUser && appState.currentUser.username === u.username;
        div.innerHTML = `
            <div class="user-info">
                <span>${escHtml(u.username)}</span>
                <span class="role-badge">${u.role}</span>
                ${isCurrentUser ? '<span style="color:var(--success);font-size:0.75rem">(Du)</span>' : ''}
            </div>
        `;
        list.appendChild(div);
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
            allDocs.push({ doc, path });
        } catch (e) { /* skip */ }
    }

    progressFill.style.width = '30%';

    // ---- Phase 1: DeviceInstance → ComObjectInstanceRef → Links → GA-Suffix ----
    // ETS speichert die Zuordnung so:
    //   <DeviceInstance ProductRefId="M-0083_H-...">
    //     <ComObjectInstanceRef Links="GA-56 GA-338" DatapointType="DPST-1-1"/>
    //   </DeviceInstance>
    // Links enthält GA-Suffixe (z.B. "GA-56"), die GA-ID ist "P-xxxx-0_GA-56"

    const gaSuffixToManufacturer = new Map(); // "GA-56" → "Jung"
    const gaSuffixToDpt = new Map();          // "GA-56" → "1.001"
    const gaSuffixToDeviceType = new Map();   // "GA-56" → "schaltaktor"
    const gaSuffixToDeviceAddr = new Map();   // "GA-56" → "2" (physische Adresse)

    for (const { doc, path } of allDocs) {
        const devices = qAll(doc, 'DeviceInstance');
        if (devices.length === 0) continue;

        console.log(`KNX Parser: ${devices.length} DeviceInstances in ${path}`);

        for (const device of devices) {
            // Hersteller aus beliebigem Attribut extrahieren
            let manufacturer = 'Unbekannt';
            let mfrId = '';
            for (const attr of device.attributes) {
                const m = attr.value.match(/(M-[0-9A-Fa-f]{4})/i);
                if (m) {
                    mfrId = m[1].toUpperCase();
                    manufacturer = MANUFACTURER_MAP[mfrId] || mfrId;
                    break;
                }
            }
            if (manufacturer === 'Unbekannt') continue;

            // Gerätetyp aus ProductRefId erkennen
            const productRefId = device.getAttribute('ProductRefId') || '';
            const deviceType = detectDeviceType(productRefId);
            const deviceAddr = device.getAttribute('Address') || '';

            // ComObjectInstanceRef mit Links-Attribut suchen
            const comObjRefs = qAll(device, 'ComObjectInstanceRef');
            for (const ref of comObjRefs) {
                const links = ref.getAttribute('Links');
                if (!links) continue;

                const dpt = ref.getAttribute('DatapointType');
                const normalizedDpt = dpt ? normalizeDpt(dpt) : '';

                for (const gaSuffix of links.trim().split(/\s+/)) {
                    if (!gaSuffix) continue;
                    // Nur überschreiben wenn neuer Gerätetyp höhere Priorität hat (Aktor > Taster/Sensor)
                    const existingType = gaSuffixToDeviceType.get(gaSuffix);
                    const existingPrio = existingType ? (DEVICE_TYPE_PRIORITY[existingType] || 99) : 99;
                    const newPrio = DEVICE_TYPE_PRIORITY[deviceType] || 99;
                    if (newPrio <= existingPrio) {
                        gaSuffixToManufacturer.set(gaSuffix, manufacturer);
                        gaSuffixToDeviceType.set(gaSuffix, deviceType);
                        if (deviceAddr) gaSuffixToDeviceAddr.set(gaSuffix, deviceAddr);
                    }
                    if (normalizedDpt) gaSuffixToDpt.set(gaSuffix, normalizedDpt);
                }
            }

            // Fallback: GroupAddressRefId (andere ETS-Versionen)
            const allChildren = Array.from(device.getElementsByTagName('*'));
            for (const child of allChildren) {
                const gaRefId = child.getAttribute('GroupAddressRefId');
                if (gaRefId) {
                    const existingType = gaSuffixToDeviceType.get(gaRefId);
                    const existingPrio = existingType ? (DEVICE_TYPE_PRIORITY[existingType] || 99) : 99;
                    const newPrio = DEVICE_TYPE_PRIORITY[deviceType] || 99;
                    if (newPrio <= existingPrio) {
                        gaSuffixToManufacturer.set(gaRefId, manufacturer);
                        gaSuffixToDeviceType.set(gaRefId, deviceType);
                        if (deviceAddr) gaSuffixToDeviceAddr.set(gaRefId, deviceAddr);
                    }
                    const dpt = child.getAttribute('DatapointType');
                    if (dpt) gaSuffixToDpt.set(gaRefId, normalizeDpt(dpt));
                }
            }
        }
    }

    progressFill.style.width = '50%';
    // Gerätetyp-Statistik loggen
    const dtStats = {};
    gaSuffixToDeviceType.forEach(dt => dtStats[dt] = (dtStats[dt] || 0) + 1);
    console.log(`KNX Parser: ${gaSuffixToManufacturer.size} GA→Hersteller, Gerätetypen:`, dtStats);

    // ---- Phase 2: GroupAddresses extrahieren und mit Hersteller anreichern ----
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

            // GA-ID Suffix extrahieren: "P-0871-0_GA-56" → "GA-56"
            const suffix = id.includes('_') ? id.split('_').pop() : id;

            // DPT: direkt am GA-Element oder aus ComObjectInstanceRef
            let dpt = normalizeDpt(ga.getAttribute('DatapointType') || '');
            if (!dpt && gaSuffixToDpt.has(suffix)) dpt = gaSuffixToDpt.get(suffix);
            // Auch volle ID versuchen
            if (!dpt && gaSuffixToDpt.has(id)) dpt = gaSuffixToDpt.get(id);

            // Hersteller: über Suffix oder volle ID
            let manufacturer = gaSuffixToManufacturer.get(suffix)
                            || gaSuffixToManufacturer.get(id)
                            || 'Unbekannt';

            // Gerätetyp: über Suffix oder volle ID
            let deviceType = gaSuffixToDeviceType.get(suffix)
                          || gaSuffixToDeviceType.get(id)
                          || 'sonstiges';

            // Geräteadresse (physikalisch)
            let deviceAddr = gaSuffixToDeviceAddr.get(suffix)
                          || gaSuffixToDeviceAddr.get(id)
                          || '';

            // HA-Typ bestimmen: Gerätetyp (Aktor) ist maßgeblich
            let haType = 'unknown';
            if (deviceType === 'jalousieaktor') {
                haType = 'cover';
            } else if (deviceType === 'schaltaktor') {
                // Schaltaktor: Licht oder Steckdose, DPT 1.001 = switch
                haType = isLightGA(name, address) ? 'light' : 'switch';
            } else if (deviceType === 'ventilantrieb') {
                haType = 'sensor'; // Stellgröße → Heizung Sensor
            } else {
                // Kein Aktor → DPT-basiert, dann Name
                haType = dpt ? (DPT_MAP[dpt] || 'unknown') : 'unknown';
                if (haType === 'unknown') haType = guessTypeFromName(name);
            }

            groupAddresses.push({
                address, name: name.trim(), description: description.trim(),
                dpt: dpt || '—', manufacturer, haType,
                selected: !!(dpt || (deviceType !== 'sonstiges')), // DPT vorhanden ODER Aktor zugeordnet
                deviceType, deviceAddr,
            });
        }
    }

    progressFill.style.width = '80%';

    // Deduplizieren
    const seen = new Map();
    for (const ga of groupAddresses) {
        if (!seen.has(ga.address)) {
            seen.set(ga.address, ga);
        } else {
            const existing = seen.get(ga.address);
            if (existing.manufacturer === 'Unbekannt' && ga.manufacturer !== 'Unbekannt') existing.manufacturer = ga.manufacturer;
            if (existing.dpt === '—' && ga.dpt !== '—') existing.dpt = ga.dpt;
            if (existing.deviceType === 'sonstiges' && ga.deviceType !== 'sonstiges') existing.deviceType = ga.deviceType;
            if (!existing.deviceAddr && ga.deviceAddr) existing.deviceAddr = ga.deviceAddr;
        }
    }

    const unique = Array.from(seen.values()).sort((a, b) => {
        const pa = a.address.split('/').map(Number);
        const pb = b.address.split('/').map(Number);
        return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
    });

    // Statistik loggen
    const mfrStats = {};
    unique.forEach(g => mfrStats[g.manufacturer] = (mfrStats[g.manufacturer] || 0) + 1);
    console.log(`KNX Parser: ${unique.length} Gruppenadressen, Hersteller:`, mfrStats);

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
            <td><small>${escHtml(ga.deviceType || '')}</small></td>
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
// YAML GENERATION (Step 3) – Geräte-zentrierte GA-Gruppierung
// ============================================================
// Strategie: Adressstruktur + Gerätetyp bestimmen die Gruppierung
// Cover: Jalousieaktor-GAs oder Mittelgruppe 1 → Blöcke à 3-4 GAs
// Heizung: Hauptgruppe 8/9 → Mittelgruppe = Funktion (0=Ventil, 1=IST, 2=Soll, 4=Modus, 6=Meldung)
// Licht/Schalter: Mittelgruppe 0/2 → Status-GA in Mittelgruppe 5/6

function generateYaml() {
    const selected = appState.parsedGAs.filter(g => g.selected);
    const toProcess = appState.existingAddresses.size > 0
        ? selected.filter(g => !appState.existingAddresses.has(g.address))
        : selected;

    if (toProcess.length === 0) {
        document.getElementById('yaml-output').querySelector('code').textContent =
            '# Keine neuen Gruppenadressen zum Generieren.\n';
        return;
    }

    const byAddr = new Map(toProcess.map(g => [g.address, g]));
    const used = new Set();
    const entities = { cover: [], climate: [], light: [], switch: [], sensor: [], binary_sensor: [] };

    // Phase 1: Rolläden gruppieren (adressbasiert + Gerätetyp)
    groupCovers(toProcess, byAddr, used, entities);

    // Phase 2: Heizung gruppieren (Hauptgruppe 8/9, Mittelgruppe = Funktion)
    groupHeating(toProcess, byAddr, used, entities);

    // Phase 3: Licht/Schalter mit Status-GA paaren
    groupLightsSwitches(toProcess, byAddr, used, entities);

    // Phase 4: Verbleibende GAs als Sensoren/Binärsensoren
    for (const ga of toProcess) {
        if (used.has(ga.address)) continue;
        // Taster und Präsenzmelder überspringen (keine standalone HA-Entitäten)
        if (ga.deviceType === 'taster' || ga.deviceType === 'praesenzmelder') {
            used.add(ga.address);
            continue;
        }
        const n = ga.name.toLowerCase();
        if (/status|meldung|rückm/i.test(n)) {
            entities.binary_sensor.push({ name: ga.name, state_address: ga.address });
        } else if (ga.haType === 'sensor' || /temperatur|feuchte|wind|lux|zähler/i.test(n)) {
            entities.sensor.push({ name: ga.name, state_address: ga.address, type: SENSOR_TYPE_MAP[ga.dpt] || null });
        } else if (ga.haType === 'binary_sensor') {
            entities.binary_sensor.push({ name: ga.name, state_address: ga.address });
        } else if (ga.haType !== 'unknown') {
            entities.switch.push({ name: ga.name, address: ga.address });
        }
        used.add(ga.address);
    }

    // YAML bauen
    const now = new Date().toISOString().split('T')[0];
    let y = `# Generiert von KNX2HA – https://code.ribee.de\n# Datum: ${now}\n\nknx:\n`;

    if (entities.cover.length) {
        y += '  cover:\n';
        for (const c of entities.cover) {
            y += `    - name: "${c.name}"\n`;
            y += `      move_long_address: "${c.move_long_address}"\n`;
            if (c.move_short_address) y += `      move_short_address: "${c.move_short_address}"\n`;
            if (c.stop_address) y += `      stop_address: "${c.stop_address}"\n`;
            if (c.position_address) y += `      position_address: "${c.position_address}"\n`;
            if (c.position_state_address) y += `      position_state_address: "${c.position_state_address}"\n`;
            y += `      travelling_time_down: 20\n`;
            y += `      travelling_time_up: 20\n`;
        }
    }

    if (entities.climate.length) {
        y += '  climate:\n';
        for (const c of entities.climate) {
            y += `    - name: "${c.name}"\n`;
            if (c.temperature_address) y += `      temperature_address: "${c.temperature_address}"\n`;
            if (c.target_temperature_address) {
                y += `      target_temperature_address: "${c.target_temperature_address}"\n`;
                y += `      target_temperature_state_address: "${c.target_temperature_address}"\n`;
            }
            if (c.operation_mode_address) {
                y += `      operation_mode_address: "${c.operation_mode_address}"\n`;
                y += `      operation_mode_state_address: "${c.operation_mode_address}"\n`;
            }
            y += '      min_temp: 16\n';
            y += '      max_temp: 28\n';
        }
    }

    if (entities.light.length) {
        y += '  light:\n';
        for (const l of entities.light) {
            y += `    - name: "${l.name}"\n`;
            y += `      address: "${l.address}"\n`;
            if (l.state_address) y += `      state_address: "${l.state_address}"\n`;
        }
    }

    if (entities.switch.length) {
        y += '  switch:\n';
        for (const s of entities.switch) {
            y += `    - name: "${s.name}"\n`;
            y += `      address: "${s.address}"\n`;
            if (s.state_address) y += `      state_address: "${s.state_address}"\n`;
        }
    }

    if (entities.sensor.length) {
        y += '  sensor:\n';
        for (const s of entities.sensor) {
            y += `    - name: "${s.name}"\n`;
            y += `      state_address: "${s.state_address}"\n`;
            if (s.type) y += `      type: ${s.type}\n`;
        }
    }

    if (entities.binary_sensor.length) {
        y += '  binary_sensor:\n';
        for (const b of entities.binary_sensor) {
            y += `    - name: "${b.name}"\n`;
            y += `      state_address: "${b.state_address}"\n`;
        }
    }

    if (Object.values(entities).every(arr => arr.length === 0)) {
        y += '  # Keine Gruppenadressen zum Generieren ausgewählt.\n';
    }

    document.getElementById('yaml-output').querySelector('code').textContent = y;
}

// --- Rolläden gruppieren ---
// Erkennung: (1) Gerätetyp jalousieaktor, (2) GA-Name mit Langzeit/Auf-Ab/Rollo,
// (3) Mittelgruppe 1 für Hauptgruppe 3/4
// Gruppierung: Basis-GA (Langzeit/Auf-Ab) + Kurzzeit(+1) + Position(+2) + evtl. Dummy(+3)
// 3-GA Cover: kein +3 → Position bei +2 wird position_state_address (read-only)
// 4-GA Cover: mit +3 → Position bei +2 wird position_address, +3 wird position_state_address
function groupCovers(gas, byAddr, used, entities) {
    // Finde alle Cover-Basis-GAs (Langzeit/Auf-Ab = Startpunkt eines Cover-Blocks)
    const coverBases = [];
    for (const ga of gas) {
        if (used.has(ga.address)) continue;
        const n = ga.name.toLowerCase();
        // Cover-Basis erkennen: "Langzeit" im Namen ODER DPT 1.008 (Up/Down) am Anfang eines Blocks
        if (/langzeit|auf.?ab/i.test(n) ||
            (ga.deviceType === 'jalousieaktor' && /fahren|auf|ab/i.test(n) && !/kurzzeit|position|dummy|stopp/i.test(n))) {
            coverBases.push(ga);
        }
    }

    for (const ga of coverBases) {
        if (used.has(ga.address)) continue;
        // Raumname extrahieren
        const baseName = ga.name
            .replace(/\s*(Langzeit|Auf.?Ab|fahren)\s*/gi, '')
            .replace(/\s+/g, ' ').trim();
        const [h, m, u] = ga.address.split('/').map(Number);

        const cover = { name: baseName || ga.name, move_long_address: ga.address };
        used.add(ga.address);

        // Kurzzeit/Stopp bei +1
        const kurzAddr = `${h}/${m}/${u + 1}`;
        if (byAddr.has(kurzAddr)) {
            const kn = byAddr.get(kurzAddr).name.toLowerCase();
            if (/kurzzeit|stopp|stop|step|schritt/i.test(kn) ||
                byAddr.get(kurzAddr).deviceType === 'jalousieaktor') {
                cover.move_short_address = kurzAddr;
                cover.stop_address = kurzAddr;
                used.add(kurzAddr);
            }
        }

        // Prüfe ob 4-GA Block (Dummy/State bei +3)
        const dummyAddr = `${h}/${m}/${u + 3}`;
        const has4thGA = byAddr.has(dummyAddr) && /dummy|position|state/i.test(byAddr.get(dummyAddr).name);

        // Position bei +2
        const posAddr = `${h}/${m}/${u + 2}`;
        if (byAddr.has(posAddr)) {
            if (has4thGA) {
                // 4-GA Block: +2 = position_address (write), +3 = position_state_address (read)
                cover.position_address = posAddr;
                cover.position_state_address = dummyAddr;
                used.add(posAddr);
                used.add(dummyAddr);
            } else {
                // 3-GA Block: +2 = position_state_address (read-only, kein Write!)
                cover.position_state_address = posAddr;
                used.add(posAddr);
            }
        }

        entities.cover.push(cover);
    }

    // Gesamt-Fahr-GAs (z.B. "EG Gesamt fahren") als einzelne Cover
    for (const ga of gas) {
        if (used.has(ga.address)) continue;
        if (ga.haType === 'cover' && /gesamt/i.test(ga.name) && !/kurzzeit|position|dummy|status/i.test(ga.name)) {
            entities.cover.push({ name: ga.name, move_long_address: ga.address });
            used.add(ga.address);
        }
    }
}

// --- Heizung gruppieren ---
// Hauptgruppe 8 (EG) und 9 (OG): gleiche Untergruppe y = gleicher Raum
// Mittelgruppe bestimmt die Funktion:
//   0 = Ventil/Stellgröße (→ sensor percent)
//   1 = IST-Temperatur (→ climate temperature_address)
//   2 = Soll-Temperatur (→ climate target_temperature_address)
//   3 = Basis-Sollwert (überspringen, intern)
//   4 = Betriebsmodus (→ climate operation_mode_address)
//   5 = Reglerstatus (→ sensor)
//   6 = Heizmeldung (→ binary_sensor)
function groupHeating(gas, byAddr, used, entities) {
    // Alle GAs in Hauptgruppe 8 und 9 sammeln
    const heatingGAs = gas.filter(g => {
        if (used.has(g.address)) return false;
        const h = parseInt(g.address.split('/')[0]);
        return h === 8 || h === 9;
    });
    if (heatingGAs.length === 0) return;

    // Auch GAs mit "Heiz/Stellgr" im Namen aus anderen Gruppen
    const extraHeating = gas.filter(g => {
        if (used.has(g.address)) return false;
        const h = parseInt(g.address.split('/')[0]);
        if (h === 8 || h === 9) return false; // Bereits erfasst
        return g.deviceType === 'ventilantrieb' || g.deviceType === 'raumregler' ||
               /heiz|stellgr/i.test(g.name);
    });

    const allHeating = [...heatingGAs, ...extraHeating];

    // Nach Hauptgruppe + Untergruppe gruppieren (gleicher Raum)
    const groups = new Map();

    for (const ga of allHeating) {
        const [h, m, u] = ga.address.split('/').map(Number);
        const key = `${h}/${u}`; // Hauptgruppe/Untergruppe = Raum-Identifikator

        if (!groups.has(key)) groups.set(key, { hauptgruppe: h });
        const group = groups.get(key);

        // Funktion aus Mittelgruppe ableiten (zuverlässiger als Name)
        if (h === 8 || h === 9) {
            switch (m) {
                case 0: group.valve = ga; break;    // Stellgröße
                case 1: group.ist = ga; break;      // IST-Temperatur
                case 2: group.soll = ga; break;     // Soll-Temperatur
                case 3: group.basis = ga; break;    // Basis-Sollwert
                case 4: group.mode = ga; break;     // Betriebsmodus
                case 5: group.regler = ga; break;   // Reglerstatus
                case 6: group.meldung = ga; break;  // Heizmeldung
            }
        } else {
            // Für GAs aus anderen Gruppen: Name-basiert
            const n = ga.name;
            if (/IST\s*Temp|IST$/i.test(n)) group.ist = ga;
            else if (/Soll\s*Temp|Solltemp/i.test(n)) group.soll = ga;
            else if (/Stellgr/i.test(n)) group.valve = ga;
            else if (/Betriebsumschalt|Betriebsmodus/i.test(n)) group.mode = ga;
            else if (/Meldung\s*Heiz/i.test(n)) group.meldung = ga;
        }

        used.add(ga.address);
    }

    // Entitäten erzeugen
    for (const [key, group] of groups) {
        // Raumname aus IST- oder Soll-GA extrahieren
        const sourceGA = group.ist || group.soll || group.valve;
        let roomName = '';
        if (sourceGA) {
            roomName = sourceGA.name
                .replace(/^Heizung\s*/i, '')
                .replace(/IST\s*Temp.*|Soll\s*Temp.*|Solltemp.*|Stellgröße|stellgröße|Basis\s*Soll.*|Betriebsumschalt.*|Reglerstatus|Relerstatus|Meldung\s*Heiz.*|Ventil|IST$|\s*Wert$/gi, '')
                .trim();
        }
        if (!roomName) roomName = `Zone ${key}`;
        const displayName = `Heizung ${roomName}`;

        // Climate-Entität (braucht mindestens IST oder Soll)
        if (group.ist || group.soll) {
            const climate = { name: displayName };
            if (group.ist) climate.temperature_address = group.ist.address;
            if (group.soll) climate.target_temperature_address = group.soll.address;
            if (group.mode) climate.operation_mode_address = group.mode.address;
            entities.climate.push(climate);
        }

        // Ventil-Sensor (Stellgröße → percent)
        if (group.valve) {
            entities.sensor.push({
                name: `${displayName} Ventil`,
                state_address: group.valve.address,
                type: 'percent',
            });
        }

        // Heizmeldung als binary_sensor
        if (group.meldung) {
            entities.binary_sensor.push({
                name: `${displayName} aktiv`,
                state_address: group.meldung.address,
            });
        }

        // Reglerstatus als Sensor (optional, wenn vorhanden)
        if (group.regler) {
            entities.sensor.push({
                name: `${displayName} Reglerstatus`,
                state_address: group.regler.address,
            });
        }

        // Basis-Sollwert überspringen (interner Theben-Parameter)
    }
}

// --- Licht/Schalter mit Status-GA paaren ---
// Schalt-GAs (Mittelgruppe 0) + Status-GAs (Mittelgruppe 5/6) zusammenführen
// Steckdosen (Mittelgruppe 2) + Status-GAs (Mittelgruppe 5/6) zusammenführen
function groupLightsSwitches(gas, byAddr, used, entities) {
    // Index: Alle Status-GAs nach Basisname
    const statusByName = new Map();
    // Index: Status-GAs nach Adressmuster (gleiche Haupt- und Untergruppe)
    const statusByPosition = new Map();

    for (const ga of gas) {
        if (used.has(ga.address)) continue;
        const [h, m, u] = ga.address.split('/').map(Number);
        const n = ga.name.toLowerCase();

        // Status-GAs erkennen: Mittelgruppe 5/6 ODER "Status" im Namen
        if (m === 5 || m === 6 || /\bstatus\b/i.test(ga.name)) {
            const baseName = ga.name.replace(/\s*Status\s*/i, '').trim().toLowerCase();
            if (!statusByName.has(baseName)) statusByName.set(baseName, ga);
            // Auch nach Position indexieren: h/u → Status-GA
            const posKey = `${h}/${u}`;
            if (!statusByPosition.has(posKey)) statusByPosition.set(posKey, ga);
        }
    }

    // Schalt-GAs verarbeiten
    for (const ga of gas) {
        if (used.has(ga.address)) continue;
        const [h, m, u] = ga.address.split('/').map(Number);

        // Nur Mittelgruppe 0 (Schalten) und 2 (Steckdosen) verarbeiten
        // Oder GAs von Schaltaktoren die keine Cover/Heizung sind
        const isSchaltGA = m === 0 || m === 2 ||
            (ga.deviceType === 'schaltaktor' && ga.haType !== 'cover' && ga.haType !== 'climate');

        if (!isSchaltGA) continue;
        // Keine Cover-, Heizungs-, Sensor-GAs
        if (ga.haType === 'cover' || ga.haType === 'climate') continue;
        if (/heiz|stellgr|langzeit|kurzzeit|position|dummy/i.test(ga.name)) continue;
        if (/\bstatus\b/i.test(ga.name)) continue; // Status-GAs nicht als Entity

        // Status-GA finden: 1) nach Name, 2) nach Adressposition
        const nameLower = ga.name.trim().toLowerCase();
        let statusGA = statusByName.get(nameLower);

        // Fallback: Adressbasiert – gleiche Haupt+Untergruppe, Status-Mittelgruppe
        if (!statusGA) {
            // Mittelgruppe 0 → Status in 5 oder 6 (gleiche Untergruppe)
            // Mittelgruppe 2 → Status in 5 oder 6
            for (const statusMid of [5, 6]) {
                const statusAddr = `${h}/${statusMid}/${u}`;
                if (byAddr.has(statusAddr) && !used.has(statusAddr)) {
                    statusGA = byAddr.get(statusAddr);
                    break;
                }
            }
        }

        const isLight = isLightGA(ga.name, ga.address);
        const entity = { name: ga.name, address: ga.address };

        if (statusGA) {
            entity.state_address = statusGA.address;
            used.add(statusGA.address);
        }

        if (isLight) {
            entities.light.push(entity);
        } else {
            entities.switch.push(entity);
        }
        used.add(ga.address);
    }
}

// Entscheidet ob eine GA ein Licht oder ein Schalter ist
function isLightGA(name, address) {
    const n = name.toLowerCase();
    // Explizit Schalter/Steckdose
    if (/steckdose|lüft|rückstau|herd|ventil|pumpe|klappe|garage|tor|automatik/i.test(n)) return false;
    // Explizit Licht
    if (/licht|leucht|beleucht|decke|spiegel|halogen|indirekt|spot|led|lampe|bühne|aussenleuchte/i.test(n)) return true;
    // Adresse: Mittelgruppe 0 = Schalten (meist Licht), Mittelgruppe 2 = Steckdosen
    if (address) {
        const mid = parseInt(address.split('/')[1]);
        if (mid === 2) return false; // Steckdosen
        if (mid === 0) return true;  // Licht
    }
    return true;
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
