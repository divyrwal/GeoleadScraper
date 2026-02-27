import { type Page } from "playwright";
import { buildGoogleDork } from "../dork-builder";
import { parseContactInfoFromText, type ExtractedContact } from "../dork-parser";
import { broadcastLog } from "../job-events";

export async function scrapeLinkedInHeadless(browser: any, query: string, location: string, maxResults: number = 50, jobId: string = "unknown"): Promise<any[]> {
    const page: Page = await browser.newPage();
    const leads: any[] = [];

    try {
        broadcastLog(jobId, 'info', `Starting LinkedIn search (Note: Unauthenticated search is heavily restricted.)`);

        // We will perform two sequential Dork searches:
        // Pass 1: Decision Makers (Founders, CEOs)
        // Pass 2: Company Pages
        const dorksToRun = [
            buildGoogleDork({ intent: 'decision_maker', query, location, targetSite: 'linkedin.com/in' }),
            buildGoogleDork({ intent: 'company', query, location, targetSite: 'linkedin.com/company' })
        ];

        for (const dorkQuery of dorksToRun) {
            if (leads.length >= maxResults) break;

            console.log(`[LinkedInExtractor] Executing Dork: ${dorkQuery}`);
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}`);
            await page.waitForSelector('#search', { timeout: 15000 }).catch(() => null);

            let currentPage = 1;

            while (leads.length < maxResults && currentPage <= 10) { // Max 10 Google pages Deep
                console.log(`[LinkedInExtractor] Scraping Google Page ${currentPage}...`);
                const results = await page.$$('.g');

                for (const result of results) {
                    if (leads.length >= maxResults) break;

                    try {
                        const titleNode = await result.$('h3');
                        if (!titleNode) continue;

                        const title = await titleNode.innerText();
                        const linkNode = await result.$('a');
                        const url = linkNode ? await linkNode.getAttribute('href') : "";

                        const snippetNode = await result.$('.VwiC3b');
                        const snippet = snippetNode ? await snippetNode.innerText() : "";

                        // Title usually format: "Name - Title - Company | LinkedIn" or "Company Name - ... | LinkedIn"
                        const business_name = title.split('-')[0].split('|')[0].trim();

                        // Parse the snippet using our Universal Parser
                        const extractedContacts: ExtractedContact = parseContactInfoFromText(snippet, url || undefined);

                        leads.push({
                            business_name,
                            website_url: url,
                            source: 'linkedin',
                            emails: extractedContacts.emails.length > 0 ? extractedContacts.emails : undefined,
                            phones: extractedContacts.phones.length > 0 ? extractedContacts.phones : undefined,
                            social_links: Object.keys(extractedContacts.socialLinks).length > 0 ? extractedContacts.socialLinks : undefined,
                            raw_text: snippet
                        });
                    } catch (err) {
                        console.warn("[LinkedInExtractor] Skipping result");
                    }
                }

                if (leads.length >= maxResults) {
                    console.log(`[LinkedInExtractor] Reached target of ${maxResults} leads.`);
                    break;
                }

                // Try to paginate
                const nextButton = await page.$('a#pnnext');
                if (!nextButton) {
                    console.log(`[LinkedInExtractor] No more pages available. Stopping at ${leads.length} leads.`);
                    break;
                }

                console.log(`[LinkedInExtractor] Navigating to next page...`);
                await Promise.all([
                    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
                    nextButton.click()
                ]);

                // Wait a bit to avoid heavy bot detection
                await new Promise(r => setTimeout(r, 2000));
                currentPage++;
            }
        } // End of Dork loop

        return leads;
    } catch (error: any) {
        broadcastLog(jobId, 'error', `Failed to scrape LinkedIn: ${error.message}`);
        return leads;
    } finally {
        await page.close();
    }
}
