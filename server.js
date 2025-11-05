// server.js - Puppeteer Version (clicks real button)
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Crawl with Puppeteer - actually clicks "Xem thêm" button
async function crawlWithPuppeteer(maxClicks = 10) {
  let browser;
  const results = [];
  const seen = new Set();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log(`Starting Puppeteer crawl (${maxClicks} button clicks)...`);
    console.log('='.repeat(60));
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Go to video page
    console.log('\nLoading https://www.vietnamplus.vn/video/...');
    await page.goto('https://www.vietnamplus.vn/video/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Page loaded successfully');
    
    // Function to extract URLs from current page
    const extractUrls = async () => {
      return await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links.map(a => ({
          url: a.href,
          title: a.getAttribute('title') || a.textContent.trim() || ''
        }));
      });
    };
    
    // Extract initial URLs
    let pageUrls = await extractUrls();
    pageUrls.forEach(item => {
      const lowerUrl = item.url.toLowerCase();
      if ((lowerUrl.includes('chu-tich-nuoc') || lowerUrl.includes('luong-cuong')) && 
          !seen.has(item.url)) {
        seen.add(item.url);
        results.push({
          url: item.url,
          title: item.title.replace(/\s+/g, ' ').trim(),
          foundOnClick: 0
        });
      }
    });
    
    console.log(`Initial page: Found ${results.length} filtered URLs`);
    
    // Click "Xem thêm" button multiple times
    for (let click = 1; click <= maxClicks; click++) {
      try {
        console.log(`\nClick #${click}/${maxClicks} on "Xem thêm" button...`);
        
        // Wait for button to be available
        const buttonSelector = 'button.more-news.control__loadmore';
        await page.waitForSelector(buttonSelector, { timeout: 5000 });
        
        // Scroll button into view
        await page.evaluate((selector) => {
          const button = document.querySelector(selector);
          if (button) {
            button.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }, buttonSelector);
        
        await page.waitForTimeout(500);
        
        // Click the button
        await page.click(buttonSelector);
        console.log('  Button clicked!');
        
        // Wait for new content to load
        await page.waitForTimeout(2000);
        
        // Extract URLs again
        pageUrls = await extractUrls();
        let newUrlsCount = 0;
        
        pageUrls.forEach(item => {
          const lowerUrl = item.url.toLowerCase();
          if ((lowerUrl.includes('chu-tich-nuoc') || lowerUrl.includes('luong-cuong')) && 
              !seen.has(item.url)) {
            seen.add(item.url);
            newUrlsCount++;
            results.push({
              url: item.url,
              title: item.title.replace(/\s+/g, ' ').trim(),
              foundOnClick: click
            });
          }
        });
        
        console.log(`  ✓ Found ${newUrlsCount} new filtered URLs (total: ${results.length})`);
        
        // Check if button still exists (end of content)
        const buttonExists = await page.$(buttonSelector);
        if (!buttonExists) {
          console.log('  Button disappeared - no more content');
          break;
        }
        
      } catch (error) {
        console.log(`  ✗ Error on click ${click}: ${error.message}`);
        break;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Crawl complete: ${results.length} URLs found`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('Puppeteer error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return results;
}

// API Routes

app.get('/', (req, res) => {
  res.json({
    name: 'VietnamPlus Video Crawler API (Puppeteer)',
    version: '2.0.0',
    description: 'Actually clicks "Xem thêm" button using Puppeteer',
    method: 'Headless browser automation',
    endpoints: {
      health: 'GET /health',
      crawl: 'GET /api/crawl?clicks=10'
    },
    filters: ['chu-tich-nuoc', 'luong-cuong'],
    note: 'Uses Puppeteer to click real button and wait for content',
    usage: {
      example: 'curl https://getlinktink.fly.dev/api/crawl?clicks=10',
      maxClicks: 20
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    method: 'puppeteer'
  });
});

app.get('/api/crawl', async (req, res) => {
  try {
    const clicks = parseInt(req.query.clicks) || 10;
    
    if (clicks < 1 || clicks > 20) {
      return res.status(400).json({
        success: false,
        error: 'Clicks must be between 1 and 20'
      });
    }
    
    console.log(`\nAPI Request: ${clicks} button clicks`);
    
    const startTime = Date.now();
    const results = await crawlWithPuppeteer(clicks);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      crawlTime: `${elapsed}s`,
      buttonClicks: clicks,
      totalUrls: results.length,
      filters: ['chu-tich-nuoc', 'luong-cuong'],
      method: 'puppeteer',
      data: results
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VietnamPlus Crawler API (Puppeteer)');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://0.0.0.0:${PORT}`);
  console.log(`📍 Crawl:  http://localhost:${PORT}/api/crawl?clicks=10`);
  console.log('='.repeat(60));
  console.log('\n✨ Method: Puppeteer (clicks real button)');
  console.log('✨ Filters: chu-tich-nuoc OR luong-cuong\n');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
