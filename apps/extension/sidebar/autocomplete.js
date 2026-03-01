/**
 * sidebar/autocomplete.js
 * Location autocomplete using the free Photon API (by Komoot, OSM-based).
 * Attaches search-as-you-type behavior to any input element.
 */

export class LocationAutocomplete {
    constructor(inputEl, options = {}) {
        if (!inputEl) return;

        this.input = inputEl;
        this.debounceMs = options.debounceMs || 300;
        this.limit = options.limit || 6;
        this.minChars = options.minChars || 2;
        this.activeIndex = -1;
        this.debounceTimer = null;
        this.abortController = null;

        this._createDropdown();
        this._bindEvents();

        // Disable browser autocomplete
        this.input.setAttribute('autocomplete', 'off');
    }

    _createDropdown() {
        // Wrap input if not already wrapped
        const parent = this.input.parentElement;
        if (!parent.classList.contains('autocomplete-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'autocomplete-wrapper';
            parent.insertBefore(wrapper, this.input);
            wrapper.appendChild(this.input);
        }

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'autocomplete-dropdown';
        this.dropdown.style.display = 'none';
        this.input.parentElement.appendChild(this.dropdown);
    }

    _bindEvents() {
        // Input: debounced search
        this.input.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            const query = this.input.value.trim();

            if (query.length < this.minChars) {
                this._hideDropdown();
                return;
            }

            this.debounceTimer = setTimeout(() => this._search(query), this.debounceMs);
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            if (this.dropdown.style.display === 'none') return;

            const items = this.dropdown.querySelectorAll('.autocomplete-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
                this._highlightItem(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.activeIndex = Math.max(this.activeIndex - 1, 0);
                this._highlightItem(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.activeIndex >= 0 && items[this.activeIndex]) {
                    items[this.activeIndex].click();
                }
            } else if (e.key === 'Escape') {
                this._hideDropdown();
            }
        });

        // Focus: re-show if we have results
        this.input.addEventListener('focus', () => {
            if (this.dropdown.children.length > 0 && this.input.value.length >= this.minChars) {
                this.dropdown.style.display = 'block';
            }
        });

        // Click outside: hide
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this._hideDropdown();
            }
        });
    }

    async _search(query) {
        // Cancel previous request
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        try {
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${this.limit}&osm_tag=place:city&osm_tag=place:town&lang=en`;

            const response = await fetch(url, {
                signal: this.abortController.signal
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const features = data.features || [];

            if (features.length === 0) {
                this._showNoResults();
                return;
            }

            this._renderResults(features);
        } catch (err) {
            if (err.name === 'AbortError') return; // Normal cancellation
            console.warn('[Autocomplete] Search failed:', err.message);
            this._hideDropdown();
        }
    }

    _renderResults(features) {
        this.dropdown.innerHTML = '';
        this.activeIndex = -1;

        features.forEach((feature, index) => {
            const props = feature.properties || {};
            const name = props.name || '';
            const state = props.state || '';
            const country = props.country || '';

            // Build display string
            const parts = [name];
            if (state && state !== name) parts.push(state);
            if (country) parts.push(country);
            const displayText = parts.join(', ');

            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="city-name">${this._escapeHtml(name)}</div>
                <div class="city-detail">${this._escapeHtml(parts.slice(1).join(', '))}</div>
            `;

            item.addEventListener('click', () => {
                this.input.value = displayText;
                this._hideDropdown();
                // Trigger events so form savers pick up the change
                this.input.dispatchEvent(new Event('input', { bubbles: true }));
                this.input.dispatchEvent(new Event('change', { bubbles: true }));
            });

            this.dropdown.appendChild(item);
        });

        this.dropdown.style.display = 'block';
    }

    _showNoResults() {
        this.dropdown.innerHTML = `
            <div class="autocomplete-item autocomplete-empty">
                <div class="city-detail">No cities found</div>
            </div>
        `;
        this.dropdown.style.display = 'block';
    }

    _highlightItem(items) {
        items.forEach((item, i) => {
            item.classList.toggle('active', i === this.activeIndex);
        });

        // Scroll active item into view
        if (this.activeIndex >= 0 && items[this.activeIndex]) {
            items[this.activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    _hideDropdown() {
        this.dropdown.style.display = 'none';
        this.activeIndex = -1;
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
