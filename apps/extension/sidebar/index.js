/**
 * sidebar/index.js
 * Entry point for the GeoLead sidebar.
 * v7.0 — Clean initialization, no autopilot.
 */

import { Terminal } from './terminal.js';
import { UIManager } from './ui.js';
import { AppState } from './state.js';
import { ScraperController } from './scraper.js';
import { LocationAutocomplete } from './autocomplete.js';
import { fetchCountries, fetchStates } from './locations-data.js';

document.addEventListener('DOMContentLoaded', async () => {
    const term = new Terminal('terminal-log');
    const ui = new UIManager();
    const state = new AppState(ui, term);

    new ScraperController(ui, term, state);

    // City autocomplete on location input
    new LocationAutocomplete(document.getElementById('browser-location'));

    // Populate Countries
    const countrySelect = document.getElementById('browser-country');
    const stateSelect = document.getElementById('browser-state');

    const countries = await fetchCountries();
    countries.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.code;
        opt.textContent = c.name;
        countrySelect.appendChild(opt);
    });

    countrySelect.addEventListener('change', async () => {
        const code = countrySelect.value;
        
        // Reset dependent fields
        stateSelect.innerHTML = '<option value="">Select State</option>';
        stateSelect.disabled = true;
        const cityInput = document.getElementById('browser-location');
        if (cityInput) cityInput.value = '';

        if (code) {
            stateSelect.innerHTML = '<option value="">Loading states...</option>';
            const states = await fetchStates(code);
            stateSelect.innerHTML = '<option value="">Select State</option>';
            
            if (states.length > 0) {
                states.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.code;
                    opt.textContent = s.name;
                    stateSelect.appendChild(opt);
                });
                stateSelect.disabled = false;
            } else {
                stateSelect.innerHTML = '<option value="">No states found</option>';
            }
        }
    });

    stateSelect.addEventListener('change', () => {
        const cityInput = document.getElementById('browser-location');
        if (cityInput) cityInput.value = '';
    });
});
