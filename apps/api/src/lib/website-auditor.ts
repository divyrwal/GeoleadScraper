import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
// @ts-ignore
import whois from 'whois';
import { URL } from 'url';

export interface AuditResult {
    tech_stack: string[];
    has_ssl: boolean;
    domain_creation_date: string | null;
    title: string | null;
    meta_description: string | null;
    headings: string[];
}

const TECH_SIGNATURES: Record<string, RegExp> = {
    WordPress: /wp-content|wp-includes/i,
    Shopify: /cdn\.shopify\.com|Shopify/i,
    Wix: /wix\.com|wix-site/i,
    Squarespace: /static\d+\.squarespace\.com/i,
    Webflow: /webflow\.com/i,
    GoDaddy: /secureserver\.net|godaddy/i,
    React: /data-reactroot|_reactRoot/i,
    NextJS: /_next\/static/i,
    NuxtJS: /_nuxt/i,
    Bootstrap: /bootstrap(\.min)?\.css/i,
    Tailwind: /tailwind(\.min)?\.css/i,
    jQuery: /jquery(\.min)?\.js/i,
    GoogleAnalytics: /googletagmanager\.com|google-analytics\.com/i,
    FacebookPixel: /connect\.facebook\.net/i,
};

export async function auditWebsite(url: string): Promise<AuditResult | null> {
    try {
        // Ensure valid URL
        let fetchUrl = url;
        if (!fetchUrl.startsWith('http')) {
            fetchUrl = `https://${fetchUrl}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(fetchUrl, {
            headers: {
                // Mimic a standard browser to prevent bot blocking
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            signal: controller.signal as any,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.warn(`[Website Auditor] Failed to fetch ${url}: ${response.statusText}`);
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. SSL Check
        const has_ssl = response.url.startsWith('https://');

        // 2. Domain Age (RDAP / Whois Lookup)
        let domain_creation_date: string | null = null;
        try {
            const hostname = new URL(response.url).hostname.replace(/^www\./, '');

            // Try RDAP First (Modern, JSON-based WHOIS)
            try {
                const rdapController = new AbortController();
                const rdapTimeout = setTimeout(() => rdapController.abort(), 3000);

                const rdapRes = await fetch(`https://rdap.org/domain/${hostname}`, {
                    headers: { 'Accept': 'application/rdap+json' },
                    signal: rdapController.signal as any
                });

                clearTimeout(rdapTimeout);

                if (rdapRes.ok) {
                    const data = await rdapRes.json() as any;
                    const registrationEvent = data.events?.find((e: any) => e.eventAction === 'registration');
                    if (registrationEvent?.eventDate) {
                        const d = new Date(registrationEvent.eventDate);
                        if (!isNaN(d.getTime())) domain_creation_date = d.toISOString().split('T')[0];
                    }
                }
            } catch (rdapErr) {
                // Ignore RDAP errors and fallback
            }

            // Fallback to legacy WHOIS
            if (!domain_creation_date) {
                domain_creation_date = await new Promise<string | null>((resolve) => {
                    whois.lookup(hostname, { timeout: 3000 }, (err: any, data: any) => {
                        if (err || !data) {
                            resolve(null);
                            return;
                        }

                        const match = data.match(/Creation Date:\s*([^\r\n]+)|created:\s*([^\r\n]+)|Registered on:\s*([^\r\n]+)/i);
                        if (match) {
                            const dateStr = match[1] || match[2] || match[3];
                            try {
                                const date = new Date(dateStr.trim());
                                resolve(isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]);
                            } catch {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    });
                });
            }
        } catch (domainErr) {
            console.warn(`[Website Auditor] WHOIS/RDAP lookup failed for ${url}`);
        }

        // 3. SEO Content Extraction
        const title = $('title').text().trim() || null;
        const meta_description = $('meta[name="description"]').attr('content')?.trim() ||
            $('meta[property="og:description"]').attr('content')?.trim() || null;

        const headings: string[] = [];
        $('h1, h2').each((_, el) => {
            const text = $(el).text().trim().replace(/\s+/g, ' ');
            if (text && text.length > 5 && text.length < 100) {
                headings.push(text);
            }
        });

        // 3. Tech Stack Detection
        const tech_stack: string[] = [];
        for (const [tech, regex] of Object.entries(TECH_SIGNATURES)) {
            if (regex.test(html)) {
                tech_stack.push(tech);
            }
        }

        return {
            tech_stack,
            has_ssl,
            domain_creation_date,
            title,
            meta_description,
            headings: headings.slice(0, 5), // Keep top 5 to avoid blowing up AI prompt payload
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.warn(`[Website Auditor] Timeout auditing ${url}`);
        } else {
            console.warn(`[Website Auditor] Error auditing ${url}:`, error.message);
        }
        return null; // Don't crash the server if a lead's website is down
    }
}
