const puppeteer = require("puppeteer");
const fs = require("fs-extra");

async function importLayout(page, layoutJson) {
    console.log("Clicking import button")
  await page.waitFor("button#import-map");
  const importButton = await page.$("button#import-map");
  await importButton.click();

  console.log("Waiting for popup");
  await page.waitFor(".popup textarea", { visisble: true });
  let popup = await page.$(".popup");

  console.log("Injecting layout");
  const layoutTextArea = await page.$(".popup textarea");
  await page.evaluate((textarea, layoutJson) => {
    textarea.value = JSON.stringify(layoutJson, null, 2);
    return Promise.resolve(textarea.value)
  }, layoutTextArea, layoutJson);

  console.log("Waiting")
  await page.waitFor(500);

  console.log("Clicking submit")
  const submit = await page.$(".popup button.button-read");
  await submit.click();

  console.log("Waiting for popup to disappear")
  return await page.waitFor(500);
}

async function screenshotKeyboardLayout(page) {
    console.log("Waiting for layout preview to appear");
  await Promise.all([page.waitFor("#stage"), page.waitFor("#stage .key")]);
  const container = await page.$("#container");
    console.log("Say cheese");
  return await container.screenshot({ path: "screenshot.png" });
}

(async () => {
  const layoutJson = await fs.readJson("../MDErgo1-Default.json");
  const browser = await puppeteer.launch({
    // headless: false,
    args: ["--disable-setuid-sandbox", "--no-sandbox"]
  });
  const page = await browser.newPage();
  await page.goto("https://configurator.inputclub.com/?layout=MDErgo1-Default");

//   console.log(await page.content());

  await page.waitFor(".container");
  await importLayout(page, layoutJson);
  await screenshotKeyboardLayout(page);

  console.log("Done");
  await browser.close();
})();
