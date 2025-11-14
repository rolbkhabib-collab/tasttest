import express from 'express';
import puppeteer from "puppeteer";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// بيانات المواقع المدعومة
const sites = {
    "yorurl": {
        baseUrl: "https://go.yorurl.com/",
        referer: "https://how2guidess.com/"
    },
    "linkjust": {
        baseUrl: "https://linkjust.com/",
        referer: "https://yjiur.xyz/"
    },
    "shr2link": {
        baseUrl: "https://shr2.link/",
        referer: "https://bigcarinsurance.com/"
    },
    "nitro-link": {
        baseUrl: "https://nitro-link.com/",
        referer: "https://finestart.online/"
    }
};

// دالة استخراج الرابط - معدلة للـ Render
async function extractDownloadLink(fullUrl, referer, site) {
    console.log('🚀 Starting bypass for:', fullUrl, 'Site:', site);
    
    let browser;
    try {
        // إعدادات Puppeteer للـ Render
        const browserConfig = {
            headless: true, // دائماً headless في السيرفر
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--single-process'
            ]
        };

        // إذا كان في Render، أضف إعدادات إضافية
        if (process.env.RENDER) {
            browserConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        browser = await puppeteer.launch(browserConfig);
        const page = await browser.newPage();
        
        // إعدادات الصفحة
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Referer': referer
        });

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        console.log('🌐 Navigating to:', fullUrl);
        
        await page.goto(fullUrl, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // استخراج الرابط
        const downloadUrl = await page.evaluate(() => {
            const elements = document.querySelectorAll('button, a, div, span');
            
            for (let element of elements) {
                const text = element.textContent?.trim().toLowerCase();
                
                if (text && (text.includes('get link') || 
                             text.includes('getlink') || 
                             text.includes('download'))) {
                    
                    if (element.href && element.href.includes('http')) {
                        return element.href;
                    }
                    
                    if (element.getAttribute('onclick')) {
                        const onclick = element.getAttribute('onclick');
                        const urlMatch = onclick.match(/window\.open\('([^']+)'\)/) || 
                                       onclick.match(/location\.href=['"]([^'"]+)['"]/);
                        if (urlMatch) return urlMatch[1];
                    }
                }
            }
            return null;
        });

        if (downloadUrl) {
            console.log('✅ Download URL found:', downloadUrl);
        } else {
            console.log('❌ Download URL not found');
        }

        return downloadUrl;

    } catch (error) {
        console.error('💥 Error:', error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// API endpoint
app.post('/api/bypass', async (req, res) => {
    const { site, urlPath } = req.body;

    console.log('📥 Received request - Site:', site, 'Path:', urlPath);

    // التحقق من البيانات
    if (!site || !urlPath) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing site or urlPath' 
        });
    }

    const siteInfo = sites[site];
    if (!siteInfo) {
        return res.status(400).json({ 
            success: false, 
            error: `Unsupported site: ${site}` 
        });
    }

    try {
        const cleanPath = urlPath.replace(/^https?:\/\/[^\/]+\//, '').replace(/^\//, '');
        const fullUrl = siteInfo.baseUrl + cleanPath;

        console.log('🔗 Full URL:', fullUrl);
        
        const downloadUrl = await extractDownloadLink(fullUrl, siteInfo.referer, site);
        
        if (downloadUrl) {
            res.json({
                success: true,
                originalUrl: fullUrl,
                downloadUrl: downloadUrl,
                site: site
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Download link not found' 
            });
        }
    } catch (error) {
        console.error('💥 Error in API:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// صفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});