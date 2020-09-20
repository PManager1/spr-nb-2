const chromium = require('chrome-aws-lambda');

const getPuppeteer = (useStealth) => {
  if (useStealth) {
    const puppeteerExtra = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteerExtra.use(StealthPlugin());
    return puppeteerExtra;
  }
  return chromium.puppeteer;
};

const {
  NODE_ENV,
  HEADLESS,
} = process.env;

const isDevelopment = NODE_ENV !== 'production';

const getSettings = async (launchSettings = {}) => (isDevelopment ? {
  ...launchSettings,
  defaultViewport: launchSettings.defaultViewport || null,
  // headless: !!HEADLESS,
  headless: true,
  slowMo: 100 || launchSettings.slowMo,
  // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  executablePath: './node_modules/puppeteer/.local-chromium/linux-722234/chrome-linux/chrome',
} : {
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath,
  headless: chromium.headless,
});

const initPuppeteer = (launchSettings) => new Promise(async (res, rej) => {
  try {
    setTimeout(() => {
      rej(new Error('Puppeteer took too long'));
    }, 10000);

    const settings = await getSettings(launchSettings);

    // const puppeteer = getPuppeteer(launchSettings.useStealth);

    // const browser = await puppeteer.launch(await getSettings(settings));
    const browser = await chromium.puppeteer.launch(settings);

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');

    res({ browser, page });
  } catch (err) {
    rej(err);
  }
});

const clearTextInputAndType = async (input, text) => {
  await input.click({ clickCount: 3 });
  await input.type(text);
};

module.exports = {
  initPuppeteer,
  clearTextInputAndType
};