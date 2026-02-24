import * as cheerio from "cheerio";

export interface EnrichmentResult {
    email: string | null;
    social_links: {
        instagram?: string;
        facebook?: string;
        linkedin?: string;
        twitter?: string;
    };
}

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

export async function enrichLead(websiteUrl: string): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
        email: null,
        social_links: {}
    };

    if (!websiteUrl || typeof websiteUrl !== "string") {
        return result;
    }

    try {
        // Normalize URL
        let url = websiteUrl.trim();
        if (!url.startsWith("http")) {
            url = "http://" + url;
        }

        // Just basic URL parsing, safely
        let baseUrlStr = url;
        try {
            const urlObj = new URL(url);
            baseUrlStr = urlObj.origin;
        } catch {
            return result;
        }

        const baseUrl = baseUrlStr;
        const pagesToCheck = ["", "/contact", "/about", "/about-us"];

        const allEmails: Set<string> = new Set();
        const socialLinks: Set<string> = new Set();

        for (const page of pagesToCheck) {
            try {
                const targetUrl = baseUrl + page;
                const response = await fetch(targetUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Accept-Language": "en-US,en;q=0.9"
                    },
                    signal: AbortSignal.timeout(8000) // 8 second timeout per page
                });

                if (!response.ok) continue;

                // Make sure it's html before parsing
                const contentType = response.headers.get("content-type");
                if (contentType && !contentType.includes("text/html")) {
                    continue;
                }

                const html = await response.text();
                const $ = cheerio.load(html);

                // 1. Extract Emails from text
                const text = $("body").text();
                const textEmails = text.match(EMAIL_REGEX) || [];
                textEmails.forEach(e => allEmails.add(e.toLowerCase()));

                // Extract Emails from mailto links
                $("a[href^='mailto:']").each((_, el) => {
                    const href = $(el).attr("href") || "";
                    const email = href.replace("mailto:", "").split("?")[0].trim().toLowerCase();
                    if (email && email.match(EMAIL_REGEX)) {
                        allEmails.add(email);
                    }
                });

                // 2. Extract Social Links
                $("a[href]").each((_, el) => {
                    const href = $(el).attr("href");
                    if (!href) return;
                    socialLinks.add(href.toLowerCase());
                });

            } catch (err: any) {
                // Ignore timeouts/404s for individual pages
                if (err.name !== "TimeoutError" && err.name !== "AbortError") {
                    console.log(`[Enricher] Failed to fetch ${baseUrl + page} - ${err.message}`);
                }
            }
        }

        // Pick best email
        const validEmails = Array.from(allEmails).filter(e => {
            if (
                e.endsWith(".png") || e.endsWith(".jpg") || e.endsWith(".gif") ||
                e.endsWith(".jpeg") || e.endsWith(".wixpress.com") ||
                e.startsWith("sentry") || e.includes("example.com") ||
                e.includes("domain.com") || e.length > 50
            ) {
                return false;
            }
            return true;
        });

        if (validEmails.length > 0) {
            result.email = validEmails.find(e => e.startsWith("info@") || e.startsWith("contact@") || e.startsWith("hello@") || e.startsWith("admin@")) || validEmails[0];
        }

        // Process Socials
        Array.from(socialLinks).forEach(link => {
            if (link.includes("instagram.com/") && !result.social_links.instagram) {
                result.social_links.instagram = link;
            } else if (link.includes("facebook.com/") && !result.social_links.facebook) {
                result.social_links.facebook = link;
            } else if (link.includes("linkedin.com/company/") && !result.social_links.linkedin) {
                result.social_links.linkedin = link;
            } else if ((link.includes("twitter.com/") || link.includes("x.com/")) && !result.social_links.twitter) {
                // Ignore share intents
                if (!link.includes("intent/tweet")) {
                    result.social_links.twitter = link;
                }
            }
        });

        return result;

    } catch (error) {
        console.error("[Enricher] Fatal error for:", websiteUrl, error);
        return result;
    }
}
