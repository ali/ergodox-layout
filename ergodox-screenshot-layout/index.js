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
        describe:
          "file path to a keyboard layout JSON file. if omitted, the default layout will be used.",
        normalize: true,
        string: true
      },
      d: {
        alias: ["dest", "screenshot"],
        describe: "file path to save the screenshot to",
        normalize: true,
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
    return getKeyboardLayoutScreenshot({
      pathToLayoutJson: argv.file,
      screenshotFilename: argv.dest,
      headless: argv.headless
    }).catch(error => {
      console.error(error);
      console.error(new Error("Crashed. 👻"));
      process.exit(1);
    });
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
      // this is a lot faster than elementHandle.type (which emulates keystrokes)
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

async function getKeyboardLayoutScreenshot({
  pathToLayoutJson,
  screenshotFilename,
  headless
}) {
  const browser = await puppeteer.launch({
    headless,
    args: ["--disable-setuid-sandbox", "--no-sandbox"] // 🙈 https://github.com/GoogleChrome/puppeteer/issues/290#issuecomment-322852784
  });

  const page = await browser.newPage();
  await page.goto("https://configurator.inputclub.com/?layout=MDErgo1-Default");

  await page.waitFor(".container");

  if (pathToLayoutJson) {
    let layoutJson;
    try {
      layoutJson = await fs.readJson(path.resolve(pathToLayoutJson));
    } catch (e) {
      console.error(e);
      throw new Error(
        `Could not read keyboard layout from ${pathToLayoutJson}`
      );
    }
    await importLayout(page, layoutJson);
  } else {
    console.warn("Using default keyboard layout");
  }
  await saveScreenshot(page, screenshotFilename);

  console.log("Done");
  await browser.close();
}
