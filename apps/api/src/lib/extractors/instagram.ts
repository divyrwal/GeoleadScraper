import { type Page } from "playwright";
import { buildGoogleDork } from "../dork-builder";
import { parseContactInfoFromText, type ExtractedContact } from "../dork-parser";
import { broadcastLog } from "../job-events";

export async function scrapeInstagramHeadless(browser: any, query: string, location: string, maxResults: number = 50, jobId: string = "unknown"): Promise<any[]> {
    const page: Page = await browser.newPage();
    const leads: any[] = [];

    try {
        broadcastLog(jobId, 'info', `Searching for Instagram Profiles with implicit Contact Info...`);
        // Use the Dork Builder to hunt for profiles containing emails or WhatsApp numbers
        const dorkQuery = buildGoogleDork({ intent: 'contact_info', query, location, targetSite: 'instagram.com' });
        broadcastLog(jobId, 'info', `Executing Dork: ${dorkQuery}`);

        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}`);
        await page.waitForSelector('#search', { timeout: 15000 }).catch(() => null);

        let currentPage = 1;

        while (leads.length < maxResults && currentPage <= 10) {
            broadcastLog(jobId, 'info', `Scraping Google Page ${currentPage} for Instagram...`);
            const results = await page.$$('.g');

            for (const result of results) {
                if (leads.length >= maxResults) break;

                try {
                    const titleNode = await result.$('h3');
                    if (!titleNode) continue;

                    const title = await titleNode.innerText();
                    const linkNode = await result.$('a');
                    const url = linkNode ? await linkNode.getAttribute('href') : "";

                    if (!url?.includes("instagram.com/p/")) { // Ignore specific posts, focus on profiles
                        const snippetNode = await result.$('.VwiC3b');
                        const snippet = snippetNode ? await snippetNode.innerText() : "";

                        // Extract potential username/name from title
                        // Usually "Name (@username) • Instagram photos and videos"
                        let business_name = title.split('(')[0].trim();

                        // Parse the snippet using our Universal Parser
                        const extractedContacts: ExtractedContact = parseContactInfoFromText(snippet, url || undefined);

                        // Merge the explicit instagram URL into socialLinks
                        extractedContacts.socialLinks.instagram = url || "";

                        leads.push({
                            business_name,
                            source: 'instagram',
                            emails: extractedContacts.emails.length > 0 ? extractedContacts.emails : undefined,
                            phones: extractedContacts.phones.length > 0 ? extractedContacts.phones : undefined,
                            social_links: extractedContacts.socialLinks,
                            raw_text: snippet
                        });
                    }
                } catch (err) {
                    broadcastLog(jobId, 'warn', `Skipping an Instagram result due to formatting.`);
                }
            }

            if (leads.length >= maxResults) {
                broadcastLog(jobId, 'info', `Reached target of ${maxResults} leads.`);
                break;
            }

            const nextButton = await page.$('a#pnnext');
            if (!nextButton) {
                broadcastLog(jobId, 'info', `No more pages available. Stopping at ${leads.length} leads.`);
                break;
            }

            broadcastLog(jobId, 'info', `Navigating to next page...`);
            await Promise.all([
                page.waitForNavigation({ waitUntil: "domcontentloaded" }),
                nextButton.click()
            ]);

            await new Promise(r => setTimeout(r, 2000));
            currentPage++;
        }

        return leads;
    } catch (error: any) {
        broadcastLog(jobId, 'error', `Failed to scrape Instagram: ${error.message}`);
        return leads;
    } finally {
        await page.close();
    }
}
