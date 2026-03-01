const { test, describe } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const extractorsCode = fs.readFileSync(path.join(__dirname, '../content/extractors.js'), 'utf8');

describe('GeoLeadExtractors', () => {
    test('extractCardBasics should successfully parse standard Google Maps list card', () => {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div role="article">
                        <div class="qBF1Pd fontHeadlineSmall">Acme Tech Solutions</div>
                        <div class="MW4etd">4.7</div>
                        <span class="UY7F9">(128)</span>
                        <a class="hfpxzc" href="https://maps.google.com/!3d25.1972!4d55.2744!1s0x3e5f433:0x4123">View Acme Tech</a>
                    </div>
                </body>
            </html>
        `);

        // Mock the extension environment window
        const { window } = dom;
        const script = `
            window = arguments[0];
            ${extractorsCode}
        `;
        const fn = new Function(script);
        fn(window);

        const card = window.document.querySelector('div[role="article"]');
        const result = window.GeoLeadExtractors.extractCardBasics(card);

        assert.ok(result, 'Result should not be null');
        assert.strictEqual(result.business_name, 'Acme Tech Solutions');
        assert.strictEqual(result.google_rating, 4.7);
        assert.strictEqual(result.review_count, 128);
        assert.strictEqual(result.location_lat, 25.1972);
        assert.strictEqual(result.location_long, 55.2744);
        assert.strictEqual(result.google_place_id, '0x3e5f433:0x4123');
    });

    test('extractCardBasics should return null if business name is missing', () => {
        const dom = new JSDOM(`
            <div role="article">
                <!-- missing .qBF1Pd -->
                <div class="MW4etd">4.7</div>
            </div>
        `);

        const { window } = dom;
        const fn = new Function(`window = arguments[0]; ${extractorsCode}`);
        fn(window);

        const card = window.document.querySelector('div[role="article"]');
        const result = window.GeoLeadExtractors.extractCardBasics(card);

        assert.strictEqual(result, null);
    });
});
