const cheerio = require('cheerio');
const { initPuppeteer } = require('../puppeteer');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;


let listingUrl = 'https://npidb.org/organizations/transportation_services/ambulance_341600000x/ak/';


function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

function titleCase(str) {
    return str.toLowerCase().split(' ').map(function(val) { return val.replace(val[0], val[0].toUpperCase()); }).join(' ');

   }

   

const getListings = async (address, searchTerm, pageUrl=listingUrl) => {
    let listings = [];

    console.log('Scraping Starting...')

    const { browser, page } = await initPuppeteer({
        useStealth: true,
    });

    try {
        await new Promise(async (resolve, reject) => {
            try {
                await page.goto(pageUrl, {
                    timeout: 0,
                    waitUntil: 'networkidle0',
                });

                console.log('Page Loaded')

                while (true) {
                    await page.waitFor(2000)
                    await page.waitForSelector('table > tbody > tr.warning')

                    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
                    const $ = cheerio.load(bodyHTML);

                    let urlElements = $('table > tbody > tr:not(.warning)');
                    let url;
                    urlElements.map((key, item) => {
                        url = 'https://npidb.org' + $(item).find('h2 a').attr('href');

                        listings.push(url)
                    });

                    console.log(listings)

                    const nextPageLink = $(".pagination > li").last().find('a').attr('href');
                    if (nextPageLink === undefined || nextPageLink === '#')
                        break;
                    pageUrl = 'https://npidb.org' + nextPageLink;

                    await page.goto(pageUrl, {
                        timeout: 0,
                        waitUntil: 'networkidle0',
                    });
                }

                resolve();
            } catch (error) {
                reject(error);
            }
        });


        await browser.close();

        fs.writeFileSync('./results/listings.txt', listings.join('\n'), "utf8");

    } catch (error) {
        console.log(error);
    }
};

const getData = async () => {
    let listings = fs.readFileSync('./results/listings.txt').toString().split("\n");
    let header = [
        'url',
        'Company Name',
        'Description',
        'Address',
        'Phone',
        'Website',
        'LBN Legal business name',
        'Authorized official',
        'Enumeration date',
        'Last updated'
    ]

    const csvWriter = createCsvWriter({
        header: header,
        path: './results/results-CA-10.csv' ,
        append: true
    });

    await csvWriter.writeRecords([header])   // returns a promise
        .then(() => console.log('add header'))
        .catch(() => console.error());

    const { browser, page } = await initPuppeteer({
        useStealth: true,
    });

    try {
        await new Promise(async (resolve, reject) => {
            try {
                let x, pageUrl;
                for (x=0; x<listings.length; x++) {
                    pageUrl = listings[x];
                    await page.goto(pageUrl, {
                        timeout: 0,
                        waitUntil: 'networkidle0',
                    });

                    let bodyHTML = await page.evaluate(() => document.body.innerHTML);
                    let $ = cheerio.load(bodyHTML);

                    let temp_companyName = $('.page-header > h1').text().trim(); //.toTitleCase();
                    temp_companyName = temp_companyName.toString(); 
                    
                    const companyName = toTitleCase(temp_companyName);
                    
                    const description = $('.page-header > p').text().trim();
                    const address = $('address').text().trim();
                    const phone = $("span[itemprop='telephone']").text().trim();
                    const website = $("span[itemprop='website']").text().trim();

                    
                    const otherElement = $('div.panelx-body').last();

                     // $('div.panelx-body').last().find('table > tbody > tr:nth-child(2) > td').last().text().trim();
                    const LBNLegalBusinessName = otherElement.find('table > tbody > tr:nth-child(2) > td').last().text().trim();
                     
                    //          $('div.panelx-body').last().find('table > tbody > tr:nth-child(4) > td').last().text().trim();
                    // const authorizedOfficial = otherElement.find('table > tbody > tr:nth-child(4) > td').last().text().trim();
                    const temp_authorizedOfficial = $('td:contains("Authorized official")').next().text().trim(); 
                    
                    // const authorizedOfficial = toTitleCase(temp_authorizedOfficial);
                    // const authorizedOfficial = temp_authorizedOfficial;

                    let authorizedOfficial = temp_authorizedOfficial.replace(/(\r\n|\n|\r)/gm,"");
                        // authorizedOfficial = toTitleCase(temp_authorizedOfficial);

                    // const authorizedOfficial = titleCase(temp_authorizedOfficial);
                    console.log('158-  authorizedOfficial = ', authorizedOfficial ); 
            
                    authorizedOfficial = titleCase(authorizedOfficial );
                    console.log('162-  authorizedOfficial = ', authorizedOfficial ); 

                    // let enumerationDate = otherElement.find('table > tbody > tr:nth-child(7) > td').last().text().trim();

                    let enumerationDate = $('td:contains("Enumeration date")').next().text().trim(); 
                    enumerationDate  = enumerationDate.slice(0,10);

                    // const lastUpdated = otherElement.find('table > tbody > tr:nth-child(8) > td').last().text().trim();

                    let lastUpdated = $('td:contains("Last updated")').next().text().trim(); 
                    lastUpdated  = enumerationDate.slice(0,10);


                    const row = [
                        pageUrl,
                        companyName,
                        description,
                        address,
                        phone,
                        website,
                        LBNLegalBusinessName,
                        authorizedOfficial,
                        enumerationDate,
                        lastUpdated
                    ]

                    csvWriter.writeRecords([row])       // returns a promise
                        .then(() => console.log('add item', [row]))
                        .catch(() => console.error());

                    await page.waitFor(2000)
                }

                resolve();
            } catch (error) {
                reject(error);
            }
        });

        await browser.close();
    } catch (error) {
        console.log(error);
    }
};

const main = async () => {
     await getListings();
    await getData();
    console.log('Scraping Completed !!!');
};

main()
    .then(value => console.log(value))
    .catch(console.error)