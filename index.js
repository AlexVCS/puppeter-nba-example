import puppeteer from "puppeteer";

const getJobs = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto(
    "https://wd1.myworkdaysite.com/en-US/recruiting/hawks/External",
    {
      waitUntil: "domcontentloaded",
    }
  );

  // Wait for the job list to load
  await page.waitForSelector('[role="list"]');

  const jobs = await page.evaluate(() => {
    const ul = document.querySelector('[role="list"]');
    if (!ul) return [];

    const jobItems = ul.querySelectorAll("li");

    return Array.from(jobItems)
      .map((job) => {
        const titleElement = job.querySelector(
          '[data-automation-id="jobTitle"]'
        );
        const postedDateElement = job.querySelector(
          '[data-automation-id="postedOn"]'
        );
        const linkElement = job.querySelector(
          'a[data-automation-id="jobTitle"]'
        );

        const title = titleElement?.innerText.trim();
        const postedRaw = postedDateElement?.innerText.trim();
        const link = linkElement?.href;

        if (!title || !postedRaw || !link) return null; // skip incomplete

        const postedParts = postedRaw.split("\n");
        const postedDate = postedParts.at(-1); // take only the last line (e.g., "Posted 2 Days Ago")

        return {title, postedDate, link};
      })
      .filter(Boolean); // remove nulls
  });

  console.log(jobs)
  
  await browser.close();
};

getJobs();
