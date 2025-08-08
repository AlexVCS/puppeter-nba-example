import puppeteer, { Browser, Page } from "puppeteer";

interface Job {
  title: string | null;
  link: string | null;
  company: string | null;
  location: string | null;
}

const getJobs = async (): Promise<void> => {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1366, height: 768 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript',
      ]
    });

    const strategies = [
      { name: "Direct approach", disableJS: true },
      { name: "With JavaScript", disableJS: false },
      { name: "Slow loading", disableJS: false, slow: true }
    ];

    for (const strategy of strategies) {
      let page: Page | null = null;

      try {
        page = await browser.newPage();

        if (!strategy.disableJS) {
          await page.setJavaScriptEnabled(true);
        }

        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const resourceType = request.resourceType();
          const url = request.url();

          if (resourceType === 'image' ||
            resourceType === 'stylesheet' ||
            url.includes('google-analytics') ||
            url.includes('facebook') ||
            url.includes('twitter') ||
            url.includes('ads') ||
            url.includes('tracking')) {
            request.abort();
          } else {
            request.continue();
          }
        });

        const navigationPromise = page.goto(
          "https://www.teamworkonline.com/basketball-jobs/utah-jazz-jobs/utah-jazz",
          {
            waitUntil: strategy.slow ? "networkidle0" : "domcontentloaded",
            timeout: 30000
          }
        );

        const response = await Promise.race([
          navigationPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Navigation timeout')), 30000)
          )
        ]) as any;

        if (!response || !response.ok()) {
          throw new Error(`Navigation failed: ${response?.status()}`);
        }

        let content = '';
        try {
          if (strategy.slow) {
            await page.waitForTimeout(5000);
          }
          content = await page.content();
        } catch (err) {
          continue;
        }

        const jobs = await extractJobsFromHTML(content);

        if (jobs.length > 0) {
          console.log(jobs);
          await page.close();
          return;
        }

      } catch (error) {
        // Silent fail, try next strategy
      } finally {
        if (page && !page.isClosed()) {
          try {
            await page.close();
          } catch (err) {
            // Silent cleanup
          }
        }
      }
    }

  } catch (error) {
    console.error('Scraping failed:', error);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        // Silent cleanup
      }
    }
  }
};

const extractJobsFromHTML = (html: string): Job[] => {
  const jobs: Job[] = [];

  let jobContainerRegex = /<div[^>]*class="[^"]*organization-portal__job-container[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let matches = [...html.matchAll(jobContainerRegex)];

  if (matches.length === 0) {
    jobContainerRegex = /<div[^>]*organization-portal__job-container[^>]*>([\s\S]*?)<\/div>/g;
    matches = [...html.matchAll(jobContainerRegex)];
  }

  if (matches.length === 0) {
    jobContainerRegex = /<div[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    matches = [...html.matchAll(jobContainerRegex)];
  }

  if (matches.length === 0) {
    return [];
  }

  matches.forEach((match) => {
    const jobHtml = match[1];

    try {
      let title = null;
      let link = null;

      let titleMatch = jobHtml.match(/<a[^>]*class="[^"]*organization-portal__job-title[^"]*"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/is);
      if (titleMatch) {
        link = titleMatch[1];
        title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
      } else {
        titleMatch = jobHtml.match(/<a[^>]*job-title[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/is);
        if (titleMatch) {
          link = titleMatch[1];
          title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
        } else {
          titleMatch = jobHtml.match(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/is);
          if (titleMatch) {
            link = titleMatch[1];
            title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
          }
        }
      }

      let company = null;
      let companyMatch = jobHtml.match(/<p[^>]*class="[^"]*organization-portal__job-category[^"]*"[^>]*>(.*?)<\/p>/is);
      if (!companyMatch) {
        companyMatch = jobHtml.match(/<p[^>]*job-category[^>]*>(.*?)<\/p>/is);
      }
      if (!companyMatch) {
        companyMatch = jobHtml.match(/<[^>]*class="[^"]*category[^"]*"[^>]*>(.*?)<\/[^>]*>/is);
      }
      if (companyMatch) {
        company = companyMatch[1].replace(/<[^>]*>/g, '').trim();
      }

      let location = null;
      let locationMatch = jobHtml.match(/<p[^>]*class="[^"]*organization-portal__job-location[^"]*"[^>]*>(.*?)<\/p>/is);
      if (!locationMatch) {
        locationMatch = jobHtml.match(/<p[^>]*job-location[^>]*>(.*?)<\/p>/is);
      }
      if (!locationMatch) {
        locationMatch = jobHtml.match(/<[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/[^>]*>/is);
      }
      if (locationMatch) {
        location = locationMatch[1].replace(/<[^>]*>/g, '').trim();
      }

      const job = {
        title,
        link: link ? (link.startsWith('http') ? link : `https://www.teamworkonline.com${link}`) : null,
        company,
        location
      };

      if (title || company || location) {
        jobs.push(job);
      }

    } catch (err) {
      // Silent fail for individual jobs
    }
  });

  return jobs;
};

getJobs().catch(console.error);