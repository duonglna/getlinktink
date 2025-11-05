// server.js - VietnamPlus Video Crawler API
// Single file - no dependencies needed except: npm install express axios cheerio

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Main crawl function
async function crawlVietnamPlus(maxPages = 10) {
  const results = [];
  const seen = new Set();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting crawl for ${maxPages} pages...`);
  console.log(`Filters: chu-tich-nuoc OR luong-cuong`);
  console.log('='.repeat(60));
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      console.log(`\nPage ${page}/${maxPages}...`);
      
      // API call matching button attributes
      const response = await axios.get('https://www.vietnamplus.vn/api/get-zone', {
        params: {
          page: page,        // data-page (increments)
          zone: 438,         // data-zone="438"
          type: 'zone',      // data-type="zone"
          size: 30,          // data-size="30"
          layout: 'media'    // data-layout="media"
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
          'Referer': 'https://www.vietnamplus.vn/video/'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data) {
        const $ = cheerio.load(response.data);
        const links = $('a[href]');
        
        // Stop if no content
        if (links.length === 0) {
          console.log('No more content. Stopping.');
          break;
        }
        
        let foundOnPage = 0;
        
        links.each((i, elem) => {
          let href = $(elem).attr('href');
          
          // Make absolute URL
          if (href && href.startsWith('/')) {
            href = 'https://www.vietnamplus.vn' + href;
          }
          
          // Filter: contains "chu-tich-nuoc" OR "luong-cuong"
          if (href && href.includes('vietnamplus.vn')) {
            const lowerHref = href.toLowerCase();
            if (lowerHref.includes('chu-tich-nuoc') || lowerHref.includes('luong-cuong')) {
              
              // Only add unique URLs
              if (!seen.has(href)) {
                seen.add(href);
                foundOnPage++;
                
                // Extract title
                const title = $(elem).attr('title') || 
                             $(elem).find('img').attr('alt') ||
                             $(elem).text().trim() || '';
                
                results.push({
                  url: href,
                  title: title.replace(/\s+/g, ' ').trim(),
                  page: page
                });
              }
            }
          }
        });
        
        console.log(`  ✓ Found ${foundOnPage} new URLs (total: ${results.length})`);
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } else {
        console.log(`  ✗ No data (status: ${response.status})`);
        break;
      }
      
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      break;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Crawl complete: ${results.length} URLs found`);
  console.log('='.repeat(60) + '\n');
  
  return results;
}

// API Routes

// Root - API info
app.get('/', (req, res) => {
  res.json({
    name: 'VietnamPlus Video Crawler API',
    version: '1.0.0',
    description: 'Crawl VietnamPlus videos with pagination filtering',
    endpoints: {
      health: 'GET /health',
      crawl: 'GET /api/crawl?pages=10',
      urls: 'GET /api/urls?pages=10 (simple URL list)'
    },
    pagination: {
      button: 'Xem thêm (Load More)',
      parameters: {
        'data-page': 'Increments from 1 to N',
        'data-zone': '438',
        'data-type': 'zone',
        'data-size': '30',
        'data-layout': 'media'
      }
    },
    filters: ['chu-tich-nuoc', 'luong-cuong'],
    usage: {
      example: 'curl http://localhost:3000/api/crawl?pages=10',
      maxPages: 50
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main crawl endpoint - full details
app.get('/api/crawl', async (req, res) => {
  try {
    const pages = parseInt(req.query.pages) || 10;
    
    if (pages < 1 || pages > 50) {
      return res.status(400).json({
        success: false,
        error: 'Pages must be between 1 and 50'
      });
    }
    
    console.log(`\nAPI Request: Crawl ${pages} pages`);
    
    const startTime = Date.now();
    const results = await crawlVietnamPlus(pages);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      crawlTime: `${elapsed}s`,
      totalUrls: results.length,
      filters: ['chu-tich-nuoc', 'luong-cuong'],
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

// Simple URLs endpoint - just array of URLs
app.get('/api/urls', async (req, res) => {
  try {
    const pages = parseInt(req.query.pages) || 10;
    
    if (pages < 1 || pages > 50) {
      return res.status(400).json({
        success: false,
        error: 'Pages must be between 1 and 50'
      });
    }
    
    const results = await crawlVietnamPlus(pages);
    const urls = results.map(item => item.url);
    
    res.json({
      success: true,
      total: urls.length,
      urls: urls
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VietnamPlus Video Crawler API');
  console.log('='.repeat(60));
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`📍 API Info:         http://localhost:${PORT}/`);
  console.log(`📍 Health Check:     http://localhost:${PORT}/health`);
  console.log(`📍 Crawl Endpoint:   http://localhost:${PORT}/api/crawl?pages=10`);
  console.log(`📍 URLs Endpoint:    http://localhost:${PORT}/api/urls?pages=10`);
  console.log('='.repeat(60));
  console.log('\n✨ Filters: chu-tich-nuoc OR luong-cuong');
  console.log('✨ Max pages: 50\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
