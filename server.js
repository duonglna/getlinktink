// server.js - Ultra Fast Version (No Puppeteer)
// Works within 5-minute trial limit
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Fast parallel crawl - completes in ~30 seconds
async function crawlFast(maxPages = 20) {
  const results = [];
  const seen = new Set();
  
  console.log(`\nFast crawl: ${maxPages} pages in parallel...`);
  const start = Date.now();
  
  // Create all requests at once (parallel)
  const requests = [];
  for (let page = 1; page <= maxPages; page++) {
    requests.push(
      axios.get('https://www.vietnamplus.vn/api/get-zone', {
        params: {
          page: page,
          zone: 438,
          type: 'zone',
          size: 30,
          layout: 'media'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
          'Referer': 'https://www.vietnamplus.vn/video/'
        },
        timeout: 8000
      }).catch(err => {
        console.log(`Page ${page} failed: ${err.message}`);
        return null;
      })
    );
  }
  
  // Execute all at once
  console.log('Fetching all pages in parallel...');
  const responses = await Promise.all(requests);
  
  // Process all responses
  responses.forEach((response, index) => {
    if (response && response.status === 200 && response.data) {
      const $ = cheerio.load(response.data);
      const links = $('a[href]');
      
      links.each((i, elem) => {
        let href = $(elem).attr('href');
        
        if (href && href.startsWith('/')) {
          href = 'https://www.vietnamplus.vn' + href;
        }
        
        if (href && href.includes('vietnamplus.vn')) {
          const lower = href.toLowerCase();
          
          // Flexible matching
          const match = lower.includes('chu-tich-nuoc') || 
                       lower.includes('chu_tich_nuoc') ||
                       lower.includes('luong-cuong') ||
                       lower.includes('luong_cuong') ||
                       lower.includes('chu-tich') && lower.includes('nuoc') ||
                       lower.includes('luong') && lower.includes('cuong');
          
          if (match && !seen.has(href)) {
            seen.add(href);
            
            const title = $(elem).attr('title') || 
                         $(elem).find('img').attr('alt') ||
                         $(elem).text().trim() || '';
            
            results.push({
              url: href,
              title: title.replace(/\s+/g, ' ').trim(),
              page: index + 1
            });
          }
        }
      });
    }
  });
  
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`Complete in ${elapsed}s: ${results.length} URLs\n`);
  
  return results;
}

// Alternative: Direct page scraping (even faster)
async function scrapeDirect() {
  console.log('\nDirect scraping from main page...');
  
  try {
    const response = await axios.get('https://www.vietnamplus.vn/video/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    const seen = new Set();
    
    $('a[href]').each((i, elem) => {
      let href = $(elem).attr('href');
      
      if (href && href.startsWith('/')) {
        href = 'https://www.vietnamplus.vn' + href;
      }
      
      if (href) {
        const lower = href.toLowerCase();
        const match = lower.includes('chu-tich-nuoc') || 
                     lower.includes('luong-cuong') ||
                     lower.includes('chu-tich') && lower.includes('nuoc');
        
        if (match && !seen.has(href)) {
          seen.add(href);
          results.push({
            url: href,
            title: $(elem).attr('title') || $(elem).text().trim() || '',
            source: 'direct'
          });
        }
      }
    });
    
    console.log(`Direct scraping: ${results.length} URLs\n`);
    return results;
    
  } catch (error) {
    console.log('Direct scraping failed:', error.message);
    return [];
  }
}

// Routes

app.get('/', (req, res) => {
  res.json({
    name: 'VietnamPlus Crawler - Ultra Fast',
    version: '4.0.0',
    note: 'Optimized for Fly.io 5-minute trial limit',
    speed: '~30 seconds for 20 pages',
    endpoints: {
      health: 'GET /health',
      crawl: 'GET /api/crawl?pages=20 (parallel, fast)',
      quick: 'GET /api/quick (direct scrape, 5 seconds)',
      both: 'GET /api/both (combined for maximum results)'
    },
    filters: ['chu-tich-nuoc', 'luong-cuong'],
    trialInfo: 'Works within 5-minute Fly.io trial limit'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    method: 'fast-api',
    trialSafe: true
  });
});

// Fast parallel crawl
app.get('/api/crawl', async (req, res) => {
  try {
    const pages = parseInt(req.query.pages) || 20;
    
    if (pages < 1 || pages > 50) {
      return res.status(400).json({
        error: 'pages must be 1-50'
      });
    }
    
    const start = Date.now();
    const results = await crawlFast(pages);
    const time = ((Date.now() - start) / 1000).toFixed(2);
    
    res.json({
      success: true,
      method: 'parallel-api',
      crawlTime: `${time}s`,
      pages: pages,
      totalUrls: results.length,
      filters: ['chu-tich-nuoc', 'luong-cuong'],
      trialSafe: true,
      data: results
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Quick direct scrape
app.get('/api/quick', async (req, res) => {
  try {
    const start = Date.now();
    const results = await scrapeDirect();
    const time = ((Date.now() - start) / 1000).toFixed(2);
    
    res.json({
      success: true,
      method: 'direct-scrape',
      crawlTime: `${time}s`,
      totalUrls: results.length,
      note: results.length === 0 ? 'Try /api/crawl instead' : 'Fast but limited results',
      data: results
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Both methods combined
app.get('/api/both', async (req, res) => {
  try {
    const start = Date.now();
    
    // Run both in parallel
    const [directResults, apiResults] = await Promise.all([
      scrapeDirect(),
      crawlFast(15)
    ]);
    
    // Combine and deduplicate
    const seen = new Set();
    const combined = [];
    
    [...directResults, ...apiResults].forEach(item => {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        combined.push(item);
      }
    });
    
    const time = ((Date.now() - start) / 1000).toFixed(2);
    
    res.json({
      success: true,
      method: 'combined',
      crawlTime: `${time}s`,
      totalUrls: combined.length,
      filters: ['chu-tich-nuoc', 'luong-cuong'],
      trialSafe: true,
      data: combined
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VietnamPlus Crawler - ULTRA FAST');
  console.log('='.repeat(60));
  console.log(`Server: http://0.0.0.0:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  /api/crawl?pages=20  - Fast parallel (~30s)`);
  console.log(`  /api/quick           - Direct scrape (~5s)`);
  console.log(`  /api/both            - Combined (~30s)`);
  console.log('='.repeat(60));
  console.log('\n✅ Trial-safe: Completes in under 5 minutes\n');
});
