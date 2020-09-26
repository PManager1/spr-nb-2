const cheerio = require('cheerio');
const { initPuppeteer } = require('../puppeteer');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;

// let AmbType = '-N-'; 
// let AmbType = '-E';

// NY

let listingUrl = 'https://npidb.org/organizations/transportation_services/ambulance_341600000x/ny/';


// West Virginia 
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/wv/

// NJ 
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/nj/

// Ohio 
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/oh/
// Illio 
//https://npidb.org/organizations/transportation_services/ambulance_341600000x/il/
// Indiana 
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/in/

// Michigan 
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/mi/

// TN 
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/tn/

// Iowa 
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/ia/

// NY 
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/ny/

// Georgia
// https://npidb.org/organizations/transportation_services/ambulance_341600000x/ga/

// NC   https://npidb.org/organizations/transportation_services/ambulance_341600000x/nc/

// FL https://npidb.org/organizations/transportation_services/ambulance_341600000x/fl/

// Illionois - https://npidb.org/organizations/transportation_services/ambulance_341600000x/il/




// N - c -


// let listingUrl = 'https://npidb.org/organizations/transportation_services/non-emergency-medical-transport-van_343900000x/co/'; 

// E - CO - 
//  'https://npidb.org/organizations/transportation_services/ambulance_341600000x/co/'; 

// N - AZ -  https://npidb.org/organizations/transportation_services/non-emergency-medical-transport-van_343900000x/az/
// E - AZ -  https://npidb.org/organizations/transportation_services/ambulance_341600000x/az/

// NEMT - WA
// EMT - WA

// NEMT - NE  https://npidb.org/organizations/transportation_services/non-emergency-medical-transport-van_343900000x/nv/
// EMT - NE https://npidb.org/organizations/transportation_services/ambulance_341600000x/nv/

// NEMT - NE
// EMT - NE

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
        'city',
        'State',
        'Phone',
        'Website',
        'LBN Legal business name',
        'Authorized official',
        'Enumeration date',
        'Last updated',
        'OrganizationOrSole',
    ]
// fileoutput
    const csvWriter = createCsvWriter({
        header: header,
        path: './results/NY-EMT.csv' ,
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

                    let bodyHTML = await page.evaluate(() => document.body.innerHTML);
                    // console.log('136-bodyHTML=', bodyHTML); 
                    let $ = cheerio.load(bodyHTML);

                    console.log('134- page pageUrl ' ,pageUrl); 
                    let temp_companyName = $('.page-header > h1').text().trim(); //.toTitleCase();
                    temp_companyName = temp_companyName.toString(); 
                    
                    let companyName = toTitleCase(temp_companyName);

                    // Jay- new to replace any multiple whitespaces with just one. 
                    //  temp_companyName = temp_companyName.replace(/\s\s+/g, ' ');
                        companyName =  companyName.replace(/  +/g, ' '); 

                    const description = $('.page-header > p').text().trim();
                    let address = $('address').text().trim();
                    console.log('141- initial address', address);  
                    //    address = (JSON.parse('"' + address + '"'));
                       
                   address = address.replace(/(\r\n|\n|\r)/gm," ");
                   address = address.replace(/[^\x00-\x7F]/g, "");
               
                   address = address.replace(/\s+/g, " ");

                   console.log('146- cleaned address ' ,address); 

                   let address_titleCase = titleCase(address).trim();

                    console.log( '139- address_titleCase = ' , address_titleCase ); 

                    let address_cap = address; 
                    let State = address_cap.split(',');
                    State = State[State.length - 1];
                    State = State.trim(); 
                    State = State.substring(0, 2);


                    let city = address_titleCase.split(',');
                    city = city[0].split(' ');
                    city = city[city.length - 1];
                    city =  titleCase(city);

                    // console.log( '139- address = ' , address ); 
                    const phone = $("span[itemprop='telephone']").text().trim();
                    const website = $("span[itemprop='website']").text().trim();

                    let LBNLegalBusinessName = $('td:contains("LBN Legal business name")').next().text().trim();

                     LBNLegalBusinessName = toTitleCase(LBNLegalBusinessName);

                    let temp_authorizedOfficial = $('td:contains("Authorized official")').next().text().trim();


                    let authorizedOfficial, OrganizationOrSole; 
                    if (temp_authorizedOfficial){
                            authorizedOfficial = temp_authorizedOfficial.replace(/(\r\n|\n|\r)/gm,"");
                            authorizedOfficial = authorizedOfficial.replace(/(\r\n|\n|\r)/gm," ");
                            authorizedOfficial = authorizedOfficial.replace(/[^\x00-\x7F]/g, "");
                            authorizedOfficial = authorizedOfficial.replace(/\s+/g, " ");
                            
                            authorizedOfficial = titleCase(authorizedOfficial );
                            console.log('192-  authorizedOfficial = ', authorizedOfficial );
                            OrganizationOrSole = 'Org'; 
                            // console.log('162-  authorizedOfficial = ', authorizedOfficial ); 
                    }else {
                        console.log(' <><><> SOLE PROPRIETER <><><>');
                        authorizedOfficial = 's-'+ companyName +'-'+  $('td:contains("Status")').next().text().trim();
                        // continue; 
                        OrganizationOrSole = 'Sole'; 
                    }





                    let enumerationDate = $('td:contains("Enumeration date")').next().text().trim();
                    enumerationDate  = enumerationDate.slice(0,10);

                    let lastUpdated = $('td:contains("Last updated")').next().text().trim();
                    lastUpdated  = lastUpdated.slice(0,10);

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
                        lastUpdated,
                        OrganizationOrSole,
                    ];

                    const iterator = row.keys();

                    for (const key of iterator) {
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
    await getListings(); 
    await getData();
    console.log('Scraping Completed !!!');
};

main()
    .then(value => console.log(value))
    .catch(console.error)
