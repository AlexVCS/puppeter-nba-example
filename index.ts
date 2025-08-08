import puppeteer, { Browser, Page } from "puppeteer";

interface Job {
  title: string;
  postedDate: string;
  link: string;
}

const getJobs = async (): Promise<void> => {
  const browser: Browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page: Page = await browser.newPage();

  await page.goto(
    "https://wd1.myworkdaysite.com/en-US/recruiting/hawks/External",
    { waitUntil: "domcontentloaded" }
  );

  // Wait for the job list to load
  await page.waitForSelector('[role="list"]');

  const jobs: Job[] = await page.evaluate(() => {
    const ul = document.querySelector<HTMLElement>('[role="list"]');
    if (!ul) return [];

    const jobItems = ul.querySelectorAll("li");

    return Array.from(jobItems)
      .map((job): Job | null => {
        const titleElement = job.querySelector<HTMLElement>(
          '[data-automation-id="jobTitle"]'
        );
        const postedDateElement = job.querySelector<HTMLElement>(
          '[data-automation-id="postedOn"]'
        );
        const linkElement = job.querySelector<HTMLAnchorElement>(
          'a[data-automation-id="jobTitle"]'
        );

        const title = titleElement?.innerText.trim();
        const postedRaw = postedDateElement?.innerText.trim();
        const link = linkElement?.href;

        if (!title || !postedRaw || !link) return null; // skip incomplete

        const postedParts = postedRaw.split("\n");
        const postedDate =
          postedParts[postedParts.length - 1] || postedRaw;

        return { title, postedDate, link };
      })
      .filter((job): job is Job => job !== null); // type guard
  });

  console.log(jobs);

  await browser.close();
};

getJobs();
