const path = require("path");
const fs = require("fs-extra");
const puppeteer = require("puppeteer");
const yargs = require("yargs");

const pkg = require("./package.json");

const argv = yargs.command(
  "$0",
  pkg.description,
  yargs => {
    return yargs.options({
      f: {
        alias: ["file", "layout"],
        demandOption: true,
        describe: "file path to a keyboard layout JSON file",
        string: true
      },
      d: {
        alias: ["dest", "screenshot"],
        describe: "file path to save the screenshot to",
        string: true,
        default: "screenshot.png"
      },
      headless: {
        describe: "run chromium in headless mode",
        boolean: true,
        default: true
      }
    });
  },
  argv => {
    return getKeyboardLayoutScreenshot(argv.file, argv.dest, argv.headless);
  }
).argv;

async function importLayout(page, layoutJson) {
  console.log("Clicking import button");
  await page.waitFor("button#import-map");
  const importButton = await page.$("button#import-map");
  await importButton.click();

  console.log("Waiting for popup");
  await page.waitFor(".popup textarea", { visisble: true });
  let popup = await page.$(".popup");

  console.log("Injecting layout");
  const layoutTextArea = await page.$(".popup textarea");
  await page.evaluate(
    (textarea, layoutJson) => {
      textarea.value = JSON.stringify(layoutJson, null, 2);
      return Promise.resolve(textarea.value);
    },
    layoutTextArea,
    layoutJson
  );

  console.log("Waiting");
  await page.waitFor(500);

  console.log("Clicking submit");
  const submit = await page.$(".popup button.button-read");
  await submit.click();

  console.log("Waiting for popup to disappear");
  return await page.waitFor(500);
}

async function saveScreenshot(page, filename) {
  console.log("Waiting for layout preview to appear");
  await Promise.all([page.waitFor("#stage"), page.waitFor("#stage .key")]);
  const container = await page.$("#container");

  console.log("Say cheese");
  return await container.screenshot({ path: filename });
}

async function getKeyboardLayoutScreenshot(
  pathToLayoutJson,
  screenshotFilename,
  headless
) {
  const layoutJson = await fs.readJson(path.resolve(pathToLayoutJson));
  const browser = await puppeteer.launch({
    headless,
    args: ["--disable-setuid-sandbox", "--no-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto("https://configurator.inputclub.com/?layout=MDErgo1-Default");

  await page.waitFor(".container");
  await importLayout(page, layoutJson);
  await saveScreenshot(page, screenshotFilename);

  console.log("Done");
  await browser.close();
}
