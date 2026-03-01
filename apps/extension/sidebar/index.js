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

document.addEventListener('DOMContentLoaded', () => {
    const term = new Terminal('terminal-log');
    const ui = new UIManager();
    const state = new AppState(ui, term);

    new ScraperController(ui, term, state);

    // City autocomplete on location input
    new LocationAutocomplete(document.getElementById('browser-location'));
});
