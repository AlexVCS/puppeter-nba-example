import puppeteer, { Browser, Page } from "puppeteer";

interface Job {
  title: string | null;
  link: string | null;
  description: string | null;
  postedDate: string | null;
}

const getJobs = async (): Promise<void> => {
  const browser: Browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page: Page = await browser.newPage();

  await page.goto(
    "https://recruiting.ultipro.com/HOR1011HORNT/JobBoard/5b257d2d-0813-4167-b64c-95fb001e0d96/?q=&o=postedDateDesc",
    { waitUntil: "networkidle0" }
  );

  await page.waitForSelector('[data-automation="opportunity"]');

  const jobs: Job[] = await page.evaluate(() => {
    const jobNodes = document.querySelectorAll<HTMLElement>(
      '[data-automation="opportunity"]'
    );
    return Array.from(jobNodes).map(job => {
      const titleEl = job.querySelector<HTMLAnchorElement>(
        'a[data-automation="job-title"]'
      );
      const descEl = job.querySelector<HTMLDivElement>(
        'div[data-automation="job-brief-description"]'
      );
      const postedDateEl =
        job.querySelector<HTMLElement>(".row.paragraph") ||
        job.querySelector<HTMLElement>('[data-automation="posted-date"]');

      return {
        title: titleEl?.innerText.trim() || null,
        link: titleEl ? titleEl.href : null,
        description: descEl?.innerText.trim() || null,
        postedDate: postedDateEl?.innerText.trim() || null,
      };
    });
  });

  console.log(jobs);

  await browser.close();
};

getJobs();
