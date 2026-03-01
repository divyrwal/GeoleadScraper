const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Go to Dubai Tech Firms
    await page.goto('https://www.google.com/maps/search/tech+firms+in+dubai/@25.0742823,54.8967527,10z', {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    console.log("Waiting for results feed...");

    // Find feed
    const feedSelector = 'div[role="feed"]';
    await page.waitForSelector(feedSelector, { timeout: 15000 });

    console.log("Found feed. Scrolling...");

    let lastCount = 0;
    let staleCount = 0;

    while (staleCount < 10) {
        const count = await page.evaluate((sel) => {
            const feed = document.querySelector(sel);
            if (!feed) return 0;

            feed.scrollTop = feed.scrollHeight;
            const articles = feed.querySelectorAll('div[role="article"]');

            if (articles.length > 0) {
                articles[articles.length - 1].scrollIntoView({ behavior: 'instant', block: 'end' });
            }
            return articles.length;
        }, feedSelector);

        console.log(`Current items: ${count}`);

        if (count === lastCount) {
            staleCount++;
        } else {
            staleCount = 0;
            lastCount = count;
        }

        // Wait for potential network load
        await new Promise(r => setTimeout(r, 2000));

        // Check if "You've reached the end of the list." is present
        const endOfList = await page.evaluate((sel) => {
            const feed = document.querySelector(sel);
            if (!feed) return false;
            return feed.innerText.includes("You've reached the end of the list");
        }, feedSelector);

        if (endOfList) {
            console.log("Found end of list text!");
            break;
        }
    }

    console.log(`Finished scrolling. Total items loaded: ${lastCount}`);
    await browser.close();
})();
