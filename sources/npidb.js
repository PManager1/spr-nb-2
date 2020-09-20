const cheerio = require('cheerio');
const { initPuppeteer } = require('../puppeteer');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;

// EMT
// let listingUrl = 'https://npidb.org/organizations/transportation_services/ambulance_341600000x/ak/';

// NEMT
let listingUrl = 'https://npidb.org/organizations/transportation_services/non-emergency-medical-transport-van_343900000x/ca/';


// function toTitleCase(str) {
//     return str.replace(
//         /\w\S*/g,
//         function(txt) {
//             return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
//         }
//     );
// }

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
                        // break;
                        continue;
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
        'city',
        'State',
        'Phone',
        'Website',
        'LBN Legal business name',
        'Authorized official',
        'Enumeration date',
        'Last updated'
    ]

    const csvWriter = createCsvWriter({
        header: header,
        path: './results/results.csv' ,
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
                    console.log(' <> <> <> <> pageUrl number=', x ); 
                    pageUrl = listings[x];
                    await page.goto(pageUrl, {
                        timeout: 0,
                        waitUntil: 'networkidle0',
                    });

                    console.log('131-  pageUrl = ', pageUrl );

                    let bodyHTML = await page.evaluate(() => document.body.innerHTML);
                    let $ = cheerio.load(bodyHTML);

                    let temp_companyName = $('.page-header > h1').text().trim(); 
                    temp_companyName = temp_companyName.toString(); 
                    console.log(' 143 - temp_companyName=', temp_companyName ); 
                    
                    const companyName = titleCase(temp_companyName);
                    
                    const description = $('.page-header > p').text().trim();
                    let address = $('address').text().trim();
                    //    address = (JSON.parse('"' + address + '"'));
                       
                   address = address.replace(/(\r\n|\n|\r)/gm," ");
                   address = address.replace(/[^\x00-\x7F]/g, "");
               
                   let   address_titleCase = ''; 
                //    if (address !== undefined || address !== null) {                    
                    if (address){
                         address_titleCase = titleCase(address );
                        } else {
                            address_titleCase =  '-';  
                    }


                  
                    // console.log( '139- address = ' , address ); 

                    let address_cap = address; 
                    let State = address_cap.split(',');
                    State = State[State.length - 1];
                    State = State.trim(); 
                    State = State.substring(0, 2);

                    
                    let city = address_titleCase.split(',');
                    // console.log('1-  city ', city ); 
                    city = city[0].split(' ');  
                    // console.log('2-  city ', city ); 
                    city = city[city.length - 1];
                    // console.log('3-  city ', city ); 
                    city =  titleCase(city);
                    // console.log('4-  city ', city ); 

                    // console.log( '139- address = ' , address ); 
                    let phone = $("span[itemprop='telephone']").text().trim();
                    console.log('180-  phone = ', phone ); 
                    
                    let website = $("span[itemprop='website']").text().trim();
                    console.log('182-  website = ', website );

                    let LBNLegalBusinessName = $('td:contains("LBN Legal business name")').next().text().trim();

                    //  if (LBNLegalBusinessName !== undefined || LBNLegalBusinessName !== null) {
                        if (LBNLegalBusinessName ) { 
                        console.log('189-  LBNLegalBusinessName =', LBNLegalBusinessName );                    
                        LBNLegalBusinessName = titleCase(LBNLegalBusinessName);
                        console.log('191-  LBNLegalBusinessName =', LBNLegalBusinessName );                    
                    } else {
                        LBNLegalBusinessName = '-';    
                        console.log('193-  LBNLegalBusinessName =', LBNLegalBusinessName );                    
                       }

                    console.log('197- outside if else LBNLegalBusinessName = '); 
                       
                     console.log('197- before  temp_authorizedOfficial = ');
                    const temp_authorizedOfficial = $('td:contains("Authorized official")').next().text().trim();
                    
                    let authorizedOfficial; // = temp_authorizedOfficial.replace(/(\r\n|\n|\r)/gm,"");

                        console.log('200-  authorizedOfficial = ' );
                
                            if (temp_authorizedOfficial ) { 
                            authorizedOfficial = temp_authorizedOfficial.replace(/(\r\n|\n|\r)/gm,"");                   
                            authorizedOfficial = titleCase(authorizedOfficial );
                            console.log('209- authorizedOfficial = ', authorizedOfficial); 
                         } else {
                             authorizedOfficial = '-';
                            }
                   
                    console.log('205-  authorizedOfficial = ', authorizedOfficial ); 

                    let enumerationDate = $('td:contains("Enumeration date")').next().text().trim();

                    // if (enumerationDate !== undefined || enumerationDate !== null) {                    
                        if (enumerationDate) {   
                        enumerationDate  = enumerationDate.slice(0,10);
                   } else {
                        enumerationDate  = '-';
                   }

                   console.log('215-  enumerationDate = ', enumerationDate ); 

                    let lastUpdated = $('td:contains("Last updated")').next().text().trim();
                    
                    // if (lastUpdated !== undefined || lastUpdated !== null) {                    
                        if (lastUpdated) {   
                        lastUpdated  = enumerationDate.slice(0,10);
                   } else {
                        lastUpdated  = '-';
                   }

                   console.log('255-  lastUpdated = ', lastUpdated ); 

                    const row = [
                        pageUrl,
                        companyName,
                        description,
                        address_titleCase,
                        city,
                        State,
                        phone,
                        website,
                        LBNLegalBusinessName,
                        authorizedOfficial,
                        enumerationDate,
                        lastUpdated
                    ];

                    const iterator = row.keys();

                    for (const key of iterator) {
                        console.log('254- <><> iterator <><> =', iterator ); 
                        if (row[key] === '' || row[key] === 'n/a') {
                            row[key] = '-'
                        }
                    }

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
    // await getListings();
    await getData();
    console.log('Scraping Completed !!!');
};

main()
    .then(value => console.log(value))
    .catch(console.error)

