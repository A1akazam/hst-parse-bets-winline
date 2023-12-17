const puppeteer = require('puppeteer');
const crypto = require('crypto');
const { writeFile } = require('node:fs/promises');
const dayjs = require('dayjs');

const LISTING_URL = 'https://winline.by/sport/102/1083/96';
const HOST = 'https://winline.by';

const DATAFILE_PATH = __dirname + '/data/rates.json';

const NEED_BLOCK_HEADER_TEXT = 'TOTAL';

async function main(args) {
    const browser = await puppeteer.launch({headless: 'new', args: ['--shm-size=1gb']});

    const page = await browser.newPage();

    await page.goto(LISTING_URL, {waitUntil: "domcontentloaded"});

    await new Promise(r => setTimeout(r, 10000));

    const matchLinks = await page.evaluate(() => {
        const headers = document.querySelectorAll('.events-tournament-header');
        let links = [];

        for (let header of Array.from(headers)) {
            if (header.innerText.trim() === 'USA, NHL') {
                let matchRow = header.nextSibling;

                while (matchRow && matchRow.classList.contains('events-item')) {
                    links.push(matchRow.querySelector('.events-item__stat__match__title').getAttribute('href'));

                    matchRow = matchRow.nextSibling;
                }
            }
        }

        return Promise.resolve(links);
    });

    for await (let matchLink of matchLinks) {
        console.log(matchLink);
        try {
            await page.goto(HOST + matchLink);

            await page.mainFrame().waitForSelector('.event-header-match');
            await page.mainFrame().waitForSelector('.mg-total:first-child .mg-total__markets-item');
            await new Promise(r => setTimeout(r, 1000));

            const matchData = await page.evaluate(() => {
                const data = {rates: []};

                const matchElement = document.querySelector('.event-header-match');
                data.t1 = matchElement.firstChild.innerText.trim();
                data.t2 = matchElement.lastChild.innerText.trim();

                let dateStr = matchElement.children[1].innerText.trim();

                let date = dateStr.split("\n")[0].split('/');
                let time =  dateStr.split("\n")[1];

                if (dateStr.split("\n")[0] === dateStr.split("\n")[0].split('/')[0]) {
                    const today = dateStr.split("\n")[0] === 'Today';
                    const now = new Date();
                    now.setDate(now.getDate() + (today ? 0 : 1));

                    date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
                } else {
                    date = '20' + date.reverse().join('-');
                }

                data.date = date + ' ' + time;


                const NEED_BLOCK_HEADER_TEXT = 'TOTAL';
                const totalElements = Array.from(document.querySelectorAll('.mg-total:first-child .mg-total__markets-item'));

                for (let totalElement of totalElements) {
                    if (NEED_BLOCK_HEADER_TEXT === totalElement.closest('.mg').querySelector('.mg-header > .mg-header__name').innerText.trim()) {
                        data.rates.push({
                            v: parseFloat(totalElement.firstChild.innerText.trim()),
                            u: parseFloat(totalElement.lastChild.firstChild.innerText.trim()) || null,
                            o: parseFloat(totalElement.lastChild.lastChild.innerText.trim()) || null,
                        });
                    }
                }

                return Promise.resolve(data);
            });

            matchData.hash = crypto.createHash('md5').update(matchData.t1 + matchData.t2 + matchData.date).digest('hex');
            matchData.parseData = dayjs().format('YYYY-MM-DD HH:mm');

            writeFile(DATAFILE_PATH, JSON.stringify(matchData) + "\n", {flag: 'a'});
        } catch (e) {
            console.log('SKIP');
        }
    }

    await browser.close();
}

function mapTeamName(shortName) {
    // [
    //     "Montreal Canadiens",
    //     "Pittsburgh Penguins",
    //     "New Jersey Devils",
    //     "Boston Bruins",
    //     "New York Islanders",
    //     "Anaheim Ducks",
    //     "Colorado Avalanche",
    //     "Buffalo Sabres",
    //     "Los Angeles Kings",
    //     "Winnipeg Jets",
    //     "Toronto Maple Leafs",
    //     "Columbus Blue Jackets",
    //     "Philadelphia Flyers",
    //     "Washington Capitals",
    //     "Detroit Red Wings",
    //     "Carolina Hurricanes",
    //     "St. Louis Blues",
    //     "Ottawa Senators",
    //     "Minnesota Wild",
    //     "Calgary Flames",
    //     "Edmonton Oilers",
    //     "Tampa Bay Lightning",
    //     "Vancouver Canucks",
    //     "Florida Panthers",
    //     "Seattle Kraken",
    //     "Chicago Blackhawks"
    // ]
}

(async () => {
    await main();
})()
