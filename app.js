// KNX2HA – App Logic (Platzhalter, wird im nächsten Schritt implementiert)
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Auth: Setup vs. Login entscheiden ---
    const hasPassword = localStorage.getItem('knx2ha_pw_hash');
    const setupForm = document.getElementById('setup-form');
    const loginForm = document.getElementById('login-form');

    if (hasPassword) {
        loginForm.classList.remove('hidden');
    } else {
        setupForm.classList.remove('hidden');
    }

    // --- Passwort anzeigen/verbergen ---
    document.querySelectorAll('.toggle-pw').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            input.type = input.type === 'password' ? 'text' : 'password';
        });
    });

    // --- Passwort-Anforderungen live prüfen ---
    const setupPw = document.getElementById('setup-password');
    if (setupPw) {
        setupPw.addEventListener('input', () => {
            const v = setupPw.value;
            document.getElementById('req-length').classList.toggle('met', v.length >= 12);
            document.getElementById('req-upper').classList.toggle('met', /[A-Z]/.test(v));
            document.getElementById('req-lower').classList.toggle('met', /[a-z]/.test(v));
            document.getElementById('req-number').classList.toggle('met', /[0-9]/.test(v));
            document.getElementById('req-special').classList.toggle('met', /[^A-Za-z0-9]/.test(v));
        });
    }

    console.log('KNX2HA geladen – app.js Platzhalter aktiv');
});
