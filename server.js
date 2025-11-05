// server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main crawling function
async function crawlVietnamPlus(pages = 10) {
  const baseUrl = 'https://www.vietnamplus.vn';
  const apiUrl = 'https://www.vietnamplus.vn/api/get-zone';
  const allUrls = new Set();
  const results = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    'Referer': 'https://www.vietnamplus.vn/video/'
  };

  console.log(`Starting crawl for ${pages} pages...`);

  for (let page = 1; page <= pages; page++) {
    try {
      console.log(`Crawling page ${page}...`);

      const params = {
        page: page,
        zone: 438,
        type: 'zone',
        size: 30,
        layout: 'media'
      };

      const response = await axios.get(apiUrl, {
        params,
        headers,
        timeout: 15000
      });

      if (response.status === 200 && response.data) {
        const $ = cheerio.load(response.data);
        const links = $('a[href]');

        links.each((i, elem) => {
          let href = $(elem).attr('href');
          
          if (href) {
            // Make absolute URL
            if (href.startsWith('/')) {
              href = baseUrl + href;
            }

            // Filter for keywords
            if (href.includes('vietnamplus.vn') && 
                (href.includes('chu-tich-nuoc') || href.includes('luong-cuong'))) {
              
              if (!allUrls.has(href)) {
                allUrls.add(href);
                
                // Extract title if available
                const title = $(elem).attr('title') || $(elem).text().trim() || '';
                
                results.push({
                  url: href,
                  title: title,
                  foundOnPage: page
                });
              }
            }
          }
        });

        console.log(`Page ${page}: Found ${links.length} total links, ${allUrls.size} unique filtered URLs so far`);

        // Be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 1000));

      } else {
        console.log(`Page ${page}: No data returned`);
      }

    } catch (error) {
      console.error(`Error on page ${page}:`, error.message);
      // Continue to next page even if one fails
    }
  }

  return results;
}

// API endpoint to get crawled URLs
app.get('/api/crawl', async (req, res) => {
  try {
    const pages = parseInt(req.query.pages) || 10;
    
    if (pages < 1 || pages > 50) {
      return res.status(400).json({
        error: 'Pages must be between 1 and 50'
      });
    }

    const startTime = Date.now();
    const results = await crawlVietnamPlus(pages);
    const endTime = Date.now();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      crawlTime: `${((endTime - startTime) / 1000).toFixed(2)}s`,
      pagesScanned: pages,
      totalUrls: results.length,
      filters: ['chu-tich-nuoc', 'luong-cuong'],
      data: results
    });

  } catch (error) {
    console.error('Crawl error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'VietnamPlus Video Crawler API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      crawl: 'GET /api/crawl?pages=10'
    },
    usage: {
      description: 'Crawl VietnamPlus video section for specific keywords',
      parameters: {
        pages: 'Number of pages to crawl (1-50, default: 10)'
      },
      filters: ['chu-tich-nuoc', 'luong-cuong'],
      example: '/api/crawl?pages=10'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VietnamPlus Crawler API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Crawl endpoint: http://localhost:${PORT}/api/crawl?pages=10`);
});
