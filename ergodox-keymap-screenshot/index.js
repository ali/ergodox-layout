const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"]
  });
  const page = await browser.newPage();
  await page.goto("https://configurator.inputclub.com/?layout=MDErgo1-Default");

  console.log(await page.content());

  await page.waitFor("#stage");
  await page.waitFor("#key-76");
  const $container = await page.$("#container");
  await $container.screenshot({ path: "screenshot.png" });

  await browser.close();
})();
