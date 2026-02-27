/**
 * Extracts phone numbers and email addresses from unstructured text blocks.
 * Used primarily for parsing Google Search result snippets (Dorks).
 */

export interface ExtractedContact {
    emails: string[];
    phones: string[];
    socialLinks: { [platform: string]: string };
}

export function parseContactInfoFromText(text: string, sourceUrl?: string): ExtractedContact {
    const result: ExtractedContact = {
        emails: [],
        phones: [],
        socialLinks: {}
    };

    if (!text) return result;

    // 1. Extract Emails
    // Note: This regex handles basic email extraction. Might need refinement for edge cases.
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const foundEmails = text.match(emailRegex) || [];

    // Deduplicate and clean emails
    result.emails = [...new Set(foundEmails.map(e => e.toLowerCase().trim()))];

    // 2. Extract Phones
    // Very basic international phone number regex. Can be noisy.
    // Looks for +XX XXX XXXXXX formats or similar variations.
    const phoneRegex = /(\+?\d{1,4}[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;
    const foundPhones = text.match(phoneRegex) || [];

    // Filter out obvious false positives (e.g., years, short numbers)
    result.phones = [...new Set(foundPhones
        .map(p => p.trim())
        .filter(p => p.replace(/[^0-9]/g, '').length >= 10) // Must have at least 10 digits
    )];

    // 3. Extract WhatsApp links specifically if present
    const waRegex = /(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d+)/i;
    const waMatch = text.match(waRegex);
    if (waMatch && waMatch[1]) {
        result.phones.push(waMatch[1]);
        // Deduplicate again
        result.phones = [...new Set(result.phones)];
    }

    // 4. Record Source Social Link
    if (sourceUrl) {
        if (sourceUrl.includes('instagram.com')) result.socialLinks.instagram = sourceUrl;
        else if (sourceUrl.includes('linkedin.com')) result.socialLinks.linkedin = sourceUrl;
        else if (sourceUrl.includes('facebook.com')) result.socialLinks.facebook = sourceUrl;
        else if (sourceUrl.includes('twitter.com') || sourceUrl.includes('x.com')) result.socialLinks.twitter = sourceUrl;
    }

    return result;
}
