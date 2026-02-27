import { type Page } from "playwright";
import { broadcastLog } from "../job-events";

export async function scrapeGoogleMapsHeadless(browser: any, query: string, location: string, maxResults: number = 50, jobId: string = "unknown"): Promise<any[]> {
    const page: Page = await browser.newPage();
    const leads: any[] = [];
    const fullQuery = `${query} in ${location}`;

    try {
        broadcastLog(jobId, 'info', `Navigating to Google Maps for "${fullQuery}"`);
        await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(fullQuery)}`);

        // Wait for results container to load
        await page.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => null);

        // Scroll mechanism to load more leads in the feed
        broadcastLog(jobId, 'info', `Initiating deep scroll in Maps for up to ${maxResults} results...`);
        let previousCardCount = 0;
        let retries = 0;

        while (true) {
            const currentCards = await page.$$('div[role="article"]');

            if (currentCards.length >= maxResults) {
                broadcastLog(jobId, 'info', `Target of ${maxResults} reached.`);
                break;
            }

            if (currentCards.length === previousCardCount) {
                retries++;
                // If count hasn't increased in ~10 seconds, we hit the end
                if (retries > 5) {
                    broadcastLog(jobId, 'info', `Reached end of maps feed with ${currentCards.length} results.`);
                    break;
                }
            } else {
                retries = 0;
            }

            previousCardCount = currentCards.length;

            // Scroll the feed container to bottom
            await page.evaluate(() => {
                const feed = document.querySelector('div[role="feed"]');
                if (feed) feed.scrollTop = feed.scrollHeight;
            });

            // Wait for lazy load
            await new Promise(r => setTimeout(r, 2000));
        }

        const cards = await page.$$('div[role="article"]');
        broadcastLog(jobId, 'info', `Finished scrolling. Extracting data from ${cards.length} cards.`);

        // Limit cards to maxResults just in case we overshot
        const cardsToProcess = cards.slice(0, maxResults);

        for (const card of cardsToProcess) {
            try {
                // Extract basic data directly from the feed UI
                // Note: Google Maps DOM is highly obfuscated. These selectors are approximations
                // and might need ongoing maintenance.
                const name = await card.getAttribute('aria-label') || "";
                if (!name) continue;

                // We can't easily get full details without clicking each card,
                // but we can scrape the feed summary.
                const ariaText = await card.innerText();
                const textParts = ariaText.split('\n');

                let rating = 0;
                let reviewCount = 0;

                // Very rudimentary parse from feed text
                const ratingMatch = ariaText.match(/([\d.]+)\s*stars?/);
                if (ratingMatch) rating = parseFloat(ratingMatch[1]);

                const reviewMatch = ariaText.match(/\(([\d,]+)\)/);
                if (reviewMatch) reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''), 10);

                leads.push({
                    business_name: name,
                    google_rating: rating,
                    review_count: reviewCount,
                    source: 'google_maps',
                    raw_text: ariaText // Keep for AI to parse later
                });
            } catch (err) {
                broadcastLog(jobId, 'warn', `Skipping a card due to error in parsing.`);
            }
        }

        return leads;
    } catch (error: any) {
        broadcastLog(jobId, 'error', `Failed to scrape Maps: ${error.message}`);
        return leads;
    } finally {
        await page.close();
    }
}
