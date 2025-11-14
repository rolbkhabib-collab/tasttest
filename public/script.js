// عناصر DOM
const urlInput = document.getElementById('urlInput');
const bypassBtn = document.getElementById('bypassBtn');
const clipboardBtn = document.getElementById('clipboardBtn');
const resultModal = document.getElementById('resultModal');
const errorModal = document.getElementById('errorModal');
const originalUrl = document.getElementById('originalUrl');
const resolvedUrl = document.getElementById('resolvedUrl');
const openLinkBtn = document.getElementById('openLinkBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const newLinkBtn = document.getElementById('newLinkBtn');
const backHomeBtn = document.getElementById('backHomeBtn');

// حالة Auto Redirect
let isAutoRedirectEnabled = false;
let progressInterval;

// تحميل أولي
document.addEventListener('DOMContentLoaded', function() {
    urlInput.value = '';
    urlInput.focus();
    
    // تحميل إعدادات Auto Redirect
    const savedAutoRedirect = localStorage.getItem('autoRedirect');
    
    if (savedAutoRedirect === 'true') {
        isAutoRedirectEnabled = true;
        document.querySelector('.switch').classList.add('active');
        console.log('🔄 Auto Redirect loaded: ENABLED');
    } else {
        isAutoRedirectEnabled = false;
        localStorage.setItem('autoRedirect', 'false');
        console.log('🔄 Auto Redirect: DEFAULT DISABLED');
    }
    
    // تحميل السمة المحفوظة
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    console.log('🚀 Mitsuki Bypasser Loaded');
});

// اكتشاف الموقع المدعوم
function detectSite(url) {
    console.log('🔍 Checking URL:', url);
    
    if (!url) return null;
    
    const urlLower = url.toLowerCase();
    
    // shr2.link أولاً
    if (urlLower.includes('shr2.link')) {
        console.log('✅ SHR2.LINK DETECTED!');
        return 'shr2link';
    }
    
    // بقية المواقع
    if (urlLower.includes('yorurl.com')) return 'yorurl';
    if (urlLower.includes('linkjust.com')) return 'linkjust';
    if (urlLower.includes('nitro-link.com')) return 'nitro-link';
    
    console.log('❌ No supported site found');
    return null;
}






// معالجة الرابط - محسنة بشكل كامل
async function processLink() {
    const url = urlInput.value.trim();
    
    console.log('🚀 STARTING PROCESS for:', url);
    console.log('🔄 Auto Redirect status:', isAutoRedirectEnabled ? 'ENABLED' : 'DISABLED');
    
    if (!url) {
        showError('Please enter a valid URL to get started');
        return;
    }

    if (!/^https?:\/\//i.test(url)) {
        showError('Please enter a valid URL starting with http:// or https://');
        return;
    }

    const site = detectSite(url);
    console.log('📋 Site detection result:', site); 
    
    if (!site) {
        // ✅ التغيير هنا - استخدام الدالة الجديدة
        showErrorWithSupportedHint('This site is not supported.');
        return;
    }

    // 🔄 تحسين واجهة التحميل بشكل كبير
    startLoadingAnimation();

    try {
        // استخراج المسار من الرابط
        const urlPath = extractUrlPath(url);
        console.log(`🔗 URL Path: ${urlPath}`);
        console.log(`🎯 Final Site: ${site}`);
        
        // تحديث حالة التقدم
        updateProgressStatus('Connecting to server...', 20);
        
        // الاتصال بالخادم
        const response = await fetch('/api/bypass', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                site: site,
                urlPath: urlPath
            })
        });

        updateProgressStatus('Processing website...', 60);
        
        const result = await response.json();
        console.log('📦 Server Response:', result);
        
        updateProgressStatus('Finalizing...', 90);
        
        if (result.success) {
            updateProgressStatus('Completed!', 100);
            
            setTimeout(() => {
                originalUrl.textContent = result.originalUrl;
                resolvedUrl.textContent = result.downloadUrl;
                showModal(resultModal);
                
                // Auto-Redirect إذا كان مفعلاً
                if (isAutoRedirectEnabled && result.downloadUrl) {
                    console.log('🔄 Auto Redirect executing...');
                    setTimeout(() => {
                        window.open(result.downloadUrl, '_blank');
                        console.log('✅ Auto Redirect completed');
                    }, 1500);
                } else {
                    console.log('🔄 Auto Redirect: DISABLED - No redirect');
                }
            }, 500);
            
        } else {
            showError(result.error || 'Failed to bypass the link');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError('An error occurred - please try again');
    } finally {
        stopLoadingAnimation();
    }
}


function showErrorWithSupportedHint(message) {
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.innerHTML = `
        ${message}
        <div class="supported-hint">
            <div class="epic-svg-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 15l6 -6"></path>
                    <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"></path>
                    <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"></path>
                </svg>
            </div>
            <span class="hint-text">Check supported websites down below</span>
        </div>
    `;
    
    document.getElementById('errorModal').classList.add('show');
}


// دالة الخطأ العادية
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    document.getElementById('errorModal').classList.add('show');
}


















// بدء تحميل الرسوم المتحركة
function startLoadingAnimation() {
    bypassBtn.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Processing...</span>
        <div class="progress-container">
            <div class="progress-bar" id="progressBar"></div>
        </div>
    `;
    bypassBtn.disabled = true;
    bypassBtn.classList.add('loading');
    
    // إضافة نص الحالة
    if (!document.querySelector('.status-text')) {
        const statusText = document.createElement('div');
        statusText.className = 'status-text';
        statusText.id = 'statusText';
        statusText.textContent = 'Initializing...';
        bypassBtn.parentNode.insertBefore(statusText, bypassBtn.nextSibling);
    }
    
    document.getElementById('statusText').style.display = 'block';
    
    // بدء مؤشر التقدم الوهمي
    let progress = 0;
    const progressBar = document.getElementById('progressBar');
    progressInterval = setInterval(() => {
        progress += 2;
        if (progress < 90) {
            progressBar.style.width = `${progress}%`;
        }
    }, 200);
}

// تحديث حالة التقدم
function updateProgressStatus(message, progressPercent) {
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');
    
    if (statusText) {
        statusText.textContent = message;
    }
    
    if (progressBar && progressPercent) {
        progressBar.style.width = `${progressPercent}%`;
        
        // تغيير لون شريط التقدم بناءً على المرحلة
        if (progressPercent >= 80) {
            progressBar.style.background = 'linear-gradient(90deg, #00ff26, #00ff88)';
        } else if (progressPercent >= 50) {
            progressBar.style.background = 'linear-gradient(90deg, #ffcc00, #ffaa00)';
        }
    }
}

// إيقاف تحميل الرسوم المتحركة
function stopLoadingAnimation() {
    clearInterval(progressInterval);
    
    setTimeout(() => {
        bypassBtn.innerHTML = 'Bypass Link !';
        bypassBtn.disabled = false;
        bypassBtn.classList.remove('loading');
        
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.style.display = 'none';
        }
    }, 500);
}

// استخراج المسار من الرابط
function extractUrlPath(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.replace(/^\//, '') + urlObj.search;
    } catch (error) {
        return url.replace(/^https?:\/\/[^\/]+\//, '').replace(/^\//, '');
    }
}

// إظهار/إخفاء المودال
function showModal(modal) {
    modal.classList.add('show');
}

function hideModal(modal) {
    modal.classList.remove('show');
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    showModal(errorModal);
}

// نسخ الرابط
function copyToClipboard() {
    const text = resolvedUrl.textContent;
    navigator.clipboard.writeText(text).then(() => {
        copyLinkBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyLinkBtn.textContent = 'Copy Link';
        }, 2000);
    });
}

// فتح الرابط
function openLink() {
    const url = resolvedUrl.textContent;
    if (url && url.startsWith('http')) {
        window.open(url, '_blank');
    }
}

// التحقق من الحافظة
async function checkClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text && (text.includes('http://') || text.includes('https://'))) {
            urlInput.value = text;
            urlInput.focus();
            
            // تأثير مرئي عند اللصق
            const originalHTML = clipboardBtn.innerHTML;
            clipboardBtn.innerHTML = '✓ Pasted!';
            clipboardBtn.style.background = 'rgba(0, 255, 38, 0.1)';
            clipboardBtn.style.borderColor = '#00ff26';
            clipboardBtn.style.color = '#00ff26';
            
            setTimeout(() => {
                clipboardBtn.innerHTML = originalHTML;
                clipboardBtn.style.background = 'transparent';
                clipboardBtn.style.borderColor = '#d111b8';
                clipboardBtn.style.color = '#d111b8';
            }, 2000);
        }
    } catch (error) {
        console.log('Could not read clipboard');
        showError('Cannot access clipboard. Please paste manually.');
    }
}

// ============================
// نظام Auto-Redirect
// ============================

// تفعيل/إلغاء Auto Redirect
document.querySelector('.switch').addEventListener('click', function() {
    this.classList.toggle('active');
    isAutoRedirectEnabled = !isAutoRedirectEnabled;
    
    // حفظ الإعداد
    localStorage.setItem('autoRedirect', isAutoRedirectEnabled.toString());
    
    console.log('🔄 Auto Redirect:', isAutoRedirectEnabled ? 'ENABLED' : 'DISABLED');
});

// الأحداث
bypassBtn.addEventListener('click', processLink);
clipboardBtn.addEventListener('click', checkClipboard);
copyLinkBtn.addEventListener('click', copyToClipboard);
openLinkBtn.addEventListener('click', openLink);

newLinkBtn.addEventListener('click', () => {
    hideModal(resultModal);
    urlInput.value = '';
    urlInput.focus();
});

backHomeBtn.addEventListener('click', () => {
    hideModal(errorModal);
    urlInput.focus();
});

// Enter للتشغيل التلقائي
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        processLink();
    }
});

// إغلاق المودال عند النقر خارجها
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        hideModal(resultModal);
        hideModal(errorModal);
    }
});

// تبديل السمة
document.querySelector('.theme-toggle').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// حل طارئ إضافي لـ shr2.link
console.log('🛡️ Emergency shr2.link protection loaded');
window.forceShr2Detection = function(url) {
    return url && url.toLowerCase().includes('shr2.link') ? 'shr2link' : null;
};