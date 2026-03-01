/**
 * content/selectors.js
 * Centralized selector registry — every CSS/ARIA selector the extension uses.
 * When Google Maps changes class names, update ONLY this file.
 * Each entry is an array of fallbacks, tried in order (most-stable first).
 */

window.SELECTORS = {
    feed: {
        container: [
            'div[role="feed"]',
            'div.m6QErb[role="feed"]',
            'div.m6QErb.DxyBCb.kA9KIf',
            'div.m6QErb.DxyBCb',
            'div.m6QErb'
        ],
        article: ['div[role="article"]'],
        endOfList: [
            '.HlvSq',
            '.PbZDve',
            'p.fontBodyMedium span',
            'span.HlvSq'
        ]
    },

    card: {
        name: [
            '.qBF1Pd',
            '.fontHeadlineSmall',
            'div[role="article"] a[aria-label]'
        ],
        rating: [
            '.MW4etd',
            'span[aria-hidden="true"]'
        ],
        reviews: [
            '.UY7F9'
        ],
        link: [
            'a.hfpxzc',
            'a.hfpx0',
            'a[data-value="See details"]',
            'div[role="article"] a[href*="/maps/place/"]'
        ],
        clickTarget: [
            'a.hfpxzc',
            'a.hfpx0',
            'div.lI9IFe'
        ]
    },

    detail: {
        panelName: [
            'h1.DUwDvf',
            'div[role="main"] h1.DUwDvf',
            'div[role="main"] h1'
        ],
        category: [
            'button.DkEaL',
            'button[jsaction*="category"]',
            'span.DkEaL'
        ],
        address: [
            '[data-item-id="address"]',
            'button[data-tooltip="Copy address"]'
        ],
        addressText: ['.Io6YTe', '.rogA2c'],
        phone: [
            '[data-item-id^="phone:tel:"]',
            'a[href^="tel:"]',
            'button[data-tooltip="Copy phone number"]'
        ],
        website: [
            'a[data-item-id="authority"]',
            'a[data-tooltip="Open website"]'
        ],
        plusCode: [
            '[data-item-id="oloc"]'
        ],
        priceLevel: [
            'span[aria-label*="Price"]'
        ],
        hours: [
            '.t39EBf',
            '.OMl5r',
            '[aria-label*="hours"]',
            '[data-item-id="oh"]'
        ],
        serviceOptions: [
            '.LTs0Rc'
        ],
        description: [
            '.PYvSYb span',
            '.WeS02d'
        ],
        ratingDetail: [
            'div.F7nice span[aria-hidden="true"]'
        ],
        reviewCount: [
            'button[aria-label]'
        ],
        socialLinks: [
            'a[href*="facebook.com"]',
            'a[href*="instagram.com"]',
            'a[href*="linkedin.com"]',
            'a[href*="twitter.com"]',
            'a[href*="youtube.com"]'
        ]
    },

    navigation: {
        back: [
            'button[aria-label*="Back to"]',
            'button[aria-label="Back"]',
            'button[aria-label="back"]',
            'button[jsaction*="back"]',
            'button.hYkMEe',
            'button[aria-label="Collapse side panel"]',
            'button[aria-label="Close"]'
        ]
    }
};
