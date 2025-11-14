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

// دالة استخراج الرابط - معدلة لـ Railway
async function extractDownloadLink(fullUrl, referer, site) {
    console.log('🚀 Starting bypass for:', fullUrl, 'Site:', site);
    
    let browser;
    try {
        // إعدادات Puppeteer لـ Railway
        const browserConfig = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--remote-debugging-port=0',
                '--disable-features=VizDisplayCompositor'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        };

        browser = await puppeteer.launch(browserConfig);
        const page = await browser.newPage();
        
        // إعدادات الصفحة
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Referer': referer,
            'Accept-Language': 'en-US,en;q=0.9'
        });

        // إخفاء WebDriver
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'chrome', { get: () => undefined });
        });

        console.log('🌐 Navigating to:', fullUrl);
        
        // الانتقال للصفحة مع معالجة أخطاء محسنة
        try {
            await page.goto(fullUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
        } catch (navError) {
            console.log('⚠️ Navigation timeout, continuing...');
        }

        // انتظار ذكي بناءً على الموقع
        const waitTime = site === 'linkjust' ? 8000 : 5000;
        console.log(`⏳ Waiting ${waitTime}ms for ${site}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // استخراج الرابط
        console.log('🔍 Extracting download link...');
        const downloadUrl = await page.evaluate(() => {
            const elements = document.querySelectorAll('button, a, div, span');
            
            for (let element of elements) {
                const text = element.textContent?.trim().toLowerCase();
                
                if (text && (text.includes('get link') || 
                             text.includes('getlink') || 
                             text.includes('download'))) {
                    
                    // إذا كان رابط مباشر
                    if (element.href && element.href.includes('http')) {
                        return element.href;
                    }
                    // إذا كان لديه onclick
                    if (element.getAttribute('onclick')) {
                        const onclick = element.getAttribute('onclick');
                        const urlMatch = onclick.match(/window\.open\('([^']+)'\)/) || 
                                       onclick.match(/location\.href=['"]([^'"]+)['"]/);
                        if (urlMatch) return urlMatch[1];
                    }
                    // إذا كان لديه data-url
                    if (element.getAttribute('data-url')) {
                        return element.getAttribute('data-url');
                    }
                }
            }
            return null;
        });

        if (downloadUrl) {
            console.log('✅ Download URL found:', downloadUrl);
        } else {
            console.log('❌ Download URL not found');
            
            // محاولة ثانية بعد انتظار إضافي
            await new Promise(resolve => setTimeout(resolve, 3000));
            const secondAttempt = await page.evaluate(() => {
                const links = document.querySelectorAll('a[href]');
                for (let link of links) {
                    const href = link.getAttribute('href');
                    if (href && href.includes('http') && 
                        (link.textContent.includes('Download') || link.textContent.includes('Get Link'))) {
                        return href;
                    }
                }
                return null;
            });
            
            if (secondAttempt) {
                console.log('✅ Download URL found in second attempt:', secondAttempt);
                return secondAttempt;
            }
        }

        return downloadUrl;

    } catch (error) {
        console.error('💥 Error in extractDownloadLink:', error.message);
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
                site: site,
                message: 'تم العثور على الرابط بنجاح'
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'لم يتم العثور على رابط التحميل' 
            });
        }
    } catch (error) {
        console.error('💥 Error in API:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في الخادم' 
        });
    }
});

// صفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// health check endpoint مهم لـ Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'URL Bypass API',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        version: '1.0.0'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log('✅ Ready for Railway deployment');
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
