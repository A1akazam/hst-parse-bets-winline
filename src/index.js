const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

async function main(args) {
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto('https://winline.by/sport/102/1083/96');
    const pageTitle = await page.title();

    console.log(pageTitle);

    await browser.close();
}

exports.main = main;

if (process.env.TEST) {
    main();
}