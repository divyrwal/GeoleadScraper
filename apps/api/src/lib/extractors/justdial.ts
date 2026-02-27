import { type Page } from "playwright";
import { broadcastLog } from "../job-events";

export async function scrapeJustDialHeadless(browser: any, query: string, location: string, maxResults: number = 50, jobId: string = "unknown"): Promise<any[]> {
    const page: Page = await browser.newPage();
    const leads: any[] = [];

    // JustDial URL structure: https://www.justdial.com/{location}/{search-query}
    const formattedLocation = location.replace(/\s+/g, '-').toLowerCase();
    const formattedQuery = query.replace(/\s+/g, '-').toLowerCase();

    try {
        broadcastLog(jobId, 'info', `Navigating to JustDial for "${query} in ${location}"`);
        await page.goto(`https://www.justdial.com/${formattedLocation}/${formattedQuery}`);

        // Wait for results container
        await page.waitForSelector('.resultbox', { timeout: 15000 }).catch(() => null);

        // Infinite Scroll mechanism
        broadcastLog(jobId, 'info', `Initiating deep scroll in JustDial for up to ${maxResults} results...`);
        let previousCardCount = 0;
        let retries = 0;

        while (true) {
            const currentCards = await page.$$('.resultbox');

            if (currentCards.length >= maxResults) {
                broadcastLog(jobId, 'info', `Target of ${maxResults} reached.`);
                break;
            }

            if (currentCards.length === previousCardCount) {
                retries++;
                // If count hasn't increased in ~10 seconds, we hit the end
                if (retries > 5) {
                    broadcastLog(jobId, 'info', `Reached end of JD list with ${currentCards.length} results.`);
                    break;
                }
            } else {
                retries = 0;
            }

            previousCardCount = currentCards.length;

            // JD uses window-level scrolling to trigger lazy loading
            await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        const cards = await page.$$('.resultbox');
        broadcastLog(jobId, 'info', `Finished scrolling. Extracting data from ${cards.length} cards.`);

        const cardsToProcess = cards.slice(0, maxResults);

        for (const card of cardsToProcess) {
            try {
                const nameNode = await card.$('.resultbox_title_anchor');
                if (!nameNode) continue;

                const name = await nameNode.innerText();
                const addressNode = await card.$('.resultbox_address');
                const address = addressNode ? await addressNode.innerText() : "";

                // JD heavily obfuscates phone numbers with custom font-icons
                // We extract the raw HTML of the contact block and let the AI parser figure it out later
                const contactNode = await card.$('.contact-info');
                const contactHtml = contactNode ? await contactNode.innerHTML() : "";

                leads.push({
                    business_name: name,
                    address: address,
                    source: 'justdial',
                    raw_html: contactHtml // AI will parse phone numbers from this
                });
            } catch (err) {
                broadcastLog(jobId, 'warn', `Skipping a card due to error in parsing.`);
            }
        }

        return leads;
    } catch (error: any) {
        broadcastLog(jobId, 'error', `Failed to scrape JustDial: ${error.message}`);
        return leads;
    } finally {
        await page.close();
    }
}
