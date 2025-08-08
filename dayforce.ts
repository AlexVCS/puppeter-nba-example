import puppeteer, { Browser, Page } from "puppeteer";

interface Job {
  title: string;
  link: string;
}

const getJobs = async (): Promise<void> => {
  const browser: Browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page: Page = await browser.newPage();

  await page.goto(
    "http://dayforcehcm.com/CandidatePortal/en-US/bensonenterprises/SITE/SAINTSPELSCAREERS",
    { waitUntil: "networkidle2" }
  );

  // Wait for the job results container to be loaded
  await page.waitForSelector('div[test-id="job-results"]');

  const jobs: Job[] = await page.evaluate(() => {
    const jobCards = document.querySelectorAll<HTMLDivElement>(
      'div[test-id="job-results"] ul li div[test-id="job-posting-card"]'
    );

    return Array.from(jobCards)
      .map(card => {
        const linkEl = card.querySelector<HTMLAnchorElement>('a[job-posting-id]');
        const title = linkEl?.innerText.trim() || "";
        const link = linkEl?.href || "";
        if (!title || !link) return null;
        return { title, link };
      })
      .filter((job): job is Job => job !== null);
  });

  console.log(jobs);

  await browser.close();
};

getJobs();
