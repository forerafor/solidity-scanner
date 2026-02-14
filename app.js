// ============================================
// 🚀 Solidity Scanner v3.0 - النسخة المتكاملة مع Backend
// يعمل مع Render Backend https://solidity-scanner-backend.onrender.com
// ============================================

const App = {
    // ========== الإعدادات الأساسية ==========
    API_URL: 'https://solidity-scanner-backend.onrender.com', // رابط Backend على Render
    GITHUB_TOKEN: null,
    
    // ========== عناصر DOM ==========
    elements: {},
    
    // ========== حالة التطبيق ==========
    state: {
        isScanning: false,
        currentRepo: '',
        results: null,
        startTime: null
    },

    // ========== التهيئة ==========
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.loadSettings();
        this.checkBackendHealth();
        console.log('✅ Solidity Scanner جاهز للعمل');
    },

    // ========== تخزين عناصر DOM ==========
    cacheElements() {
        const ids = [
            'repoUrl', 'scanBtn', 'clearBtn', 'progressArea', 'resultsArea',
            'logBox', 'progressFill', 'progressPercent', 'currentFileSpan',
            'resultsContent', 'githubToken', 'saveTokenBtn', 'rateLimitDisplay',
            'tokenSection', 'exampleBtns'
        ];
        
        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        // أزرار الأمثلة
        this.elements.exampleBtns = document.querySelectorAll('.example-btn');
    },

    // ========== إعداد مستمعات الأحداث ==========
    setupEventListeners() {
        if (this.elements.scanBtn) {
            this.elements.scanBtn.addEventListener('click', () => this.startScan());
        }

        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this.clearAll());
        }

        if (this.elements.saveTokenBtn) {
            this.elements.saveTokenBtn.addEventListener('click', () => this.saveToken());
        }

        if (this.elements.exampleBtns) {
            this.elements.exampleBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const url = btn.getAttribute('data-url');
                    if (url && this.elements.repoUrl) {
                        this.elements.repoUrl.value = url;
                    }
                });
            });
        }

        // Enter key في حقل الإدخال
        if (this.elements.repoUrl) {
            this.elements.repoUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.startScan();
            });
        }
    },

    // ========== تحميل الإعدادات المحفوظة ==========
    loadSettings() {
        this.GITHUB_TOKEN = localStorage.getItem('github_token') || null;
        
        if (this.elements.githubToken && this.GITHUB_TOKEN) {
            this.elements.githubToken.value = this.GITHUB_TOKEN;
        }

        const lastUrl = localStorage.getItem('last_repo_url');
        if (lastUrl && this.elements.repoUrl) {
            this.elements.repoUrl.value = lastUrl;
        }
    },

    // ========== حفظ الإعدادات ==========
    saveSettings() {
        if (this.state.currentRepo) {
            localStorage.setItem('last_repo_url', this.state.currentRepo);
        }
    },

    // ========== التحقق من صحة Backend ==========
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.API_URL}/api/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Backend متصل:', data);
                this.updateRateLimit();
            } else {
                console.warn('⚠️ Backend غير متصل');
            }
        } catch (error) {
            console.warn('⚠️ لا يمكن الاتصال بالـ Backend:', error.message);
        }
    },

    // ========== تحديث معلومات Rate Limit ==========
    async updateRateLimit() {
        if (!this.elements.rateLimitDisplay) return;

        try {
            const response = await fetch(`${this.API_URL}/api/rate-limit`, {
                headers: this.GITHUB_TOKEN ? { 'Authorization': `Bearer ${this.GITHUB_TOKEN}` } : {}
            });
            
            if (response.ok) {
                const data = await response.json();
                this.elements.rateLimitDisplay.innerHTML = `
                    <i class="fas fa-chart-line"></i>
                    ${data.remaining}/${data.limit} طلب
                `;
            }
        } catch (error) {
            console.error('فشل تحديث rate limit:', error);
        }
    },

    // ========== حفظ التوكن ==========
    saveToken() {
        if (this.elements.githubToken) {
            this.GITHUB_TOKEN = this.elements.githubToken.value.trim();
            if (this.GITHUB_TOKEN) {
                localStorage.setItem('github_token', this.GITHUB_TOKEN);
                this.showNotification('✅ تم حفظ التوكن بنجاح', 'success');
                this.updateRateLimit();
            } else {
                localStorage.removeItem('github_token');
                this.showNotification('🗑️ تم إزالة التوكن', 'info');
            }
        }
    },

    // ========== بدء الفحص ==========
    async startScan() {
        const url = this.elements.repoUrl?.value.trim();
        
        if (!url) {
            this.showNotification('❌ الرجاء إدخال رابط GitHub', 'error');
            return;
        }

        if (!url.includes('github.com')) {
            this.showNotification('❌ الرجاء إدخال رابط GitHub صحيح', 'error');
            return;
        }

        if (this.state.isScanning) {
            this.showNotification('⚠️ فحص قيد التنفيذ... الرجاء الانتظار', 'warning');
            return;
        }

        // التحقق من اتصال Backend
        try {
            await fetch(`${this.API_URL}/api/health`, { method: 'HEAD' });
        } catch (error) {
            this.showNotification('❌ لا يمكن الاتصال بالخادم الخلفي', 'error');
            return;
        }

        this.state.isScanning = true;
        this.state.currentRepo = url;
        this.state.startTime = Date.now();
        
        this.showProgress();
        this.addLog('🚀 بدء الفحص...', 'start');
        
        try {
            // استخراج معلومات المستودع
            const repoInfo = this.parseGitHubUrl(url);
            this.addLog(`📡 جاري فحص: ${repoInfo.owner}/${repoInfo.repo}`, 'info');
            this.saveSettings();

            // الاتصال بالـ Backend
            const response = await fetch(`${this.API_URL}/api/scan`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(this.GITHUB_TOKEN && { 'Authorization': `Bearer ${this.GITHUB_TOKEN}` })
                },
                body: JSON.stringify({
                    repoUrl: url,
                    token: this.GITHUB_TOKEN
                })
            });

            if (!response.ok) {
                throw new Error(`فشل الاتصال بالخادم: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('الخادم لم يرسل بيانات');
            }

            // معالجة التدفق (Streaming)
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(5));
                            await this.handleStreamData(data);
                        } catch (e) {
                            console.warn('خطأ في معالجة البيانات:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('خطأ في الفحص:', error);
            this.addLog(`❌ ${error.message}`, 'error');
            this.showNotification(`❌ فشل الفحص: ${error.message}`, 'error');
        } finally {
            this.state.isScanning = false;
            this.hideProgress();
            this.updateRateLimit();
        }
    },

    // ========== معالجة بيانات التدفق ==========
    async handleStreamData(data) {
        switch(data.type) {
            case 'progress':
                this.updateProgress(data.percent, data.file);
                break;
                
            case 'log':
                this.addLog(data.message, data.level);
                break;
                
            case 'file':
                if (this.elements.currentFileSpan) {
                    this.elements.currentFileSpan.textContent = data.name;
                }
                break;
                
            case 'vulnerability':
                this.addVulnerability(data.vuln);
                break;
                
            case 'result':
                await this.displayResults(data.results);
                break;
                
            case 'error':
                this.addLog(`❌ ${data.message}`, 'error');
                this.showNotification(`❌ ${data.message}`, 'error');
                break;
        }
    },

    // ========== إضافة ثغرة للعرض ==========
    addVulnerability(vuln) {
        const container = this.elements.resultsContent;
        if (!container) return;

        // البحث عن قسم الثغرات أو إنشاؤه
        let vulnSection = container.querySelector('.vulnerabilities-section');
        if (!vulnSection) {
            vulnSection = document.createElement('div');
            vulnSection.className = 'vulnerabilities-section';
            container.appendChild(vulnSection);
        }

        const severityColor = vuln.severity === 'critical' ? '#ef4444' : 
                             vuln.severity === 'high' ? '#f59e0b' : '#3b82f6';

        const card = document.createElement('div');
        card.className = `vuln-card ${vuln.severity}`;
        card.style.borderRightColor = severityColor;
        
        card.innerHTML = `
            <div class="vuln-header">
                <div>
                    <h3 style="color: ${severityColor}">
                        <i class="fas fa-bug"></i> ${vuln.name}
                    </h3>
                    <span class="vuln-file">📁 ${vuln.file}:${vuln.line}</span>
                </div>
                <span class="severity-badge" style="background: ${severityColor}20; color: ${severityColor}">
                    ${vuln.severity === 'critical' ? 'حرجة' : vuln.severity === 'high' ? 'عالية' : 'متوسطة'}
                </span>
            </div>
            <p class="vuln-description">${vuln.description}</p>
            <div class="vuln-meta">
                <span><i class="fas fa-chart-line"></i> ثقة ${vuln.confidence}%</span>
                ${vuln.cwe ? `<span><i class="fas fa-tag"></i> ${vuln.cwe}</span>` : ''}
            </div>
            <div class="code-block">
                <pre><code class="solidity">${this.escapeHtml(vuln.code)}</code></pre>
            </div>
            <button onclick="App.showFix('${vuln.type}')" class="btn-small btn-primary">
                <i class="fas fa-wrench"></i> عرض الإصلاح
            </button>
        `;

        vulnSection.appendChild(card);

        // تحديث syntax highlighting
        if (window.hljs) {
            card.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    },

    // ========== عرض النتائج الكاملة ==========
    async displayResults(results) {
        this.state.results = results;
        
        if (this.elements.resultsArea) {
            this.elements.resultsArea.classList.remove('hidden');
        }

        const container = this.elements.resultsContent;
        if (!container) return;

        // مسح المحتوى السابق
        container.innerHTML = '';

        // عنوان النتائج
        const header = document.createElement('div');
        header.className = 'results-header';
        header.innerHTML = `
            <div class="repo-info">
                <h2><i class="fab fa-github"></i> ${results.metadata.repository}</h2>
                <span class="scan-time">⏱️ ${Math.round(results.metadata.scanTime / 1000)} ثانية</span>
            </div>
            <div class="scan-stats">
                <div class="stat">
                    <i class="fas fa-file-code"></i>
                    <span class="stat-value">${results.stats.totalFiles}</span>
                    <span class="stat-label">ملف</span>
                </div>
                <div class="stat">
                    <i class="fas fa-bug"></i>
                    <span class="stat-value">${results.vulnerabilities.length}</span>
                    <span class="stat-label">ثغرة</span>
                </div>
                <div class="stat critical">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="stat-value">${results.stats.criticalCount}</span>
                    <span class="stat-label">حرجة</span>
                </div>
            </div>
        `;
        container.appendChild(header);

        // عرض الثغرات
        if (results.vulnerabilities.length === 0) {
            const safeMsg = document.createElement('div');
            safeMsg.className = 'safe-message';
            safeMsg.innerHTML = `
                <i class="fas fa-shield-check"></i>
                <h3>🎉 لا توجد ثغرات!</h3>
                <p>المشروع يبدو آمناً. استمر في المراجعة الدورية.</p>
            `;
            container.appendChild(safeMsg);
        }

        // إحصائيات إضافية
        const stats = document.createElement('div');
        stats.className = 'additional-stats';
        stats.innerHTML = `
            <div class="stat-row">
                <span><i class="fas fa-cube"></i> ملفات من الكاش: ${results.stats.cachedFiles || 0}</span>
                <span><i class="fas fa-bolt"></i> طلبات موفرة: ${results.stats.requestsSaved || 0}</span>
                <span><i class="fas fa-clock"></i> ${new Date(results.metadata.timestamp).toLocaleString('ar-EG')}</span>
            </div>
        `;
        container.appendChild(stats);

        this.showNotification(`✅ اكتمل الفحص - ${results.vulnerabilities.length} ثغرة`, 'success');
    },

    // ========== استخراج معلومات من رابط GitHub ==========
    parseGitHubUrl(url) {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error('رابط GitHub غير صالح');
        return { owner: match[1], repo: match[2].replace('.git', '') };
    },

    // ========== إظهار شريط التقدم ==========
    showProgress() {
        if (this.elements.progressArea) {
            this.elements.progressArea.classList.remove('hidden');
        }
        if (this.elements.resultsArea) {
            this.elements.resultsArea.classList.add('hidden');
        }
        if (this.elements.logBox) {
            this.elements.logBox.innerHTML = '';
        }
        this.updateProgress(0, 'جاري التحضير...');
        
        // بدء تحديث الوقت
        this.startTimeUpdate();
    },

    // ========== تحديث الوقت ==========
    startTimeUpdate() {
        const updateTimer = () => {
            if (!this.state.isScanning) return;
            
            const elapsed = ((Date.now() - this.state.startTime) / 1000).toFixed(1);
            const timerEl = document.getElementById('scanTimer');
            if (timerEl) {
                timerEl.textContent = `${elapsed} ثانية`;
            }
            requestAnimationFrame(updateTimer);
        };
        requestAnimationFrame(updateTimer);
    },

    // ========== تحديث التقدم ==========
    updateProgress(percent, file) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percent}%`;
        }
        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent = `${percent}%`;
        }
        if (file && this.elements.currentFileSpan) {
            this.elements.currentFileSpan.textContent = file;
        }
    },

    // ========== إضافة سجل ==========
    addLog(message, level = 'info') {
        if (!this.elements.logBox) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${level}`;
        
        const time = new Date().toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        let icon = '•';
        switch(level) {
            case 'success': icon = '✅'; break;
            case 'warning': icon = '⚠️'; break;
            case 'error': icon = '❌'; break;
            case 'start': icon = '🚀'; break;
            default: icon = '📌';
        }

        entry.innerHTML = `<span class="log-time">${time}</span> <span>${icon} ${message}</span>`;
        
        this.elements.logBox.appendChild(entry);
        this.elements.logBox.scrollTop = this.elements.logBox.scrollHeight;
    },

    // ========== إخفاء شريط التقدم ==========
    hideProgress() {
        setTimeout(() => {
            if (this.elements.progressArea) {
                this.elements.progressArea.classList.add('hidden');
            }
        }, 500);
    },

    // ========== مسح الكل ==========
    clearAll() {
        if (this.elements.repoUrl) {
            this.elements.repoUrl.value = '';
        }
        if (this.elements.progressArea) {
            this.elements.progressArea.classList.add('hidden');
        }
        if (this.elements.resultsArea) {
            this.elements.resultsArea.classList.add('hidden');
        }
        if (this.elements.resultsContent) {
            this.elements.resultsContent.innerHTML = '';
        }
        if (this.elements.logBox) {
            this.elements.logBox.innerHTML = '';
        }
        
        this.state.isScanning = false;
        this.state.results = null;
        
        this.showNotification('🧹 تم مسح جميع النتائج', 'info');
    },

    // ========== إظهار الإشعارات ==========
    showNotification(message, type = 'info') {
        // استخدام alert للمشاريع البسيطة
        alert(message);
        
        // يمكنك إضافة Toast notifications هنا
        console.log(`[${type.toUpperCase()}] ${message}`);
    },

    // ========== تعيين مثال ==========
    setExample(url) {
        if (this.elements.repoUrl) {
            this.elements.repoUrl.value = url;
        }
    },

    // ========== هروب HTML ==========
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ========== عرض الإصلاح ==========
    showFix(type) {
        const fixes = {
            reentrancy: `// ✅ الإصلاح الصحيح لثغرة Reentrancy
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // 1. تحديث الرصيد أولاً (Effects)
    balances[msg.sender] -= amount;
    
    // 2. ثم إرسال الأموال (Interactions)
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}

// أو استخدام ReentrancyGuard من OpenZeppelin
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeContract is ReentrancyGuard {
    function withdraw(uint256 amount) public nonReentrant {
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}`,

            txorigin: `// ✅ استخدام msg.sender بدلاً من tx.origin
contract SafeWallet {
    address public owner;
    
    constructor() {
        owner = msg.sender;  // ✅ صحيح
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");  // ✅ صحيح
        _;
    }
    
    function withdrawAll() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}`,

            overflow: `// ✅ الترقية إلى Solidity 0.8.0+
pragma solidity ^0.8.0;  // overflow/underflow محمية تلقائياً

// ✅ أو استخدام SafeMath
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SafeToken {
    using SafeMath for uint256;
    
    function transfer(address to, uint256 amount) public {
        balances[msg.sender] = balances[msg.sender].sub(amount);
        balances[to] = balances[to].add(amount);
    }
}`,

            delegatecall: `// ✅ التحقق من العنوان قبل delegatecall
function execute(address target, bytes memory data) public onlyOwner {
    require(isContract(target), "Target must be a contract");
    require(approvedTargets[target], "Target not approved");
    
    (bool success, ) = target.delegatecall(data);
    require(success, "Delegatecall failed");
}`,

            default: `// ✅ راجع أفضل ممارسات الأمان:
// - استخدم مكتبات OpenZeppelin
// - اتبع نمط Checks-Effects-Interactions
// - أضف اختبارات للهجمات المحتملة`
        };

        const fix = fixes[type] || fixes.default;
        
        // نسخ الإصلاح إلى الحافظة
        navigator.clipboard.writeText(fix).then(() => {
            alert('✅ تم نسخ الإصلاح إلى الحافظة\n\n' + fix.substring(0, 200) + '...');
        }).catch(() => {
            alert('📋 الإصلاح:\n\n' + fix);
        });
    },

    // ========== تحديث معلومات الملف ==========
    updateFileInfo(data) {
        // يمكن إضافة منطق لتحديث معلومات الملف الحالي
        if (data.name && this.elements.currentFileSpan) {
            this.elements.currentFileSpan.textContent = data.name;
        }
    }
};

// ========== بدء التطبيق ==========
document.addEventListener('DOMContentLoaded', () => {
    // التحقق من وجود العناصر الأساسية
    if (!document.getElementById('repoUrl')) {
        console.error('❌ عناصر HTML الأساسية غير موجودة');
        return;
    }

    // بدء التطبيق
    App.init();

    // إضافة أنماط CSS إضافية للنتائج
    const style = document.createElement('style');
    style.textContent = `
        .results-header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #334155;
        }
        
        .repo-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .scan-stats {
            display: flex;
            gap: 30px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            display: block;
            font-size: 2rem;
            font-weight: 800;
            color: white;
        }
        
        .stat-label {
            color: #94a3b8;
            font-size: 0.9rem;
        }
        
        .vuln-card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #334155;
        }
        
        .vuln-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }
        
        .vuln-file {
            color: #94a3b8;
            font-family: monospace;
            font-size: 0.9rem;
        }
        
        .vuln-description {
            color: #e2e8f0;
            margin-bottom: 15px;
            line-height: 1.6;
        }
        
        .vuln-meta {
            display: flex;
            gap: 20px;
            margin-bottom: 15px;
            color: #94a3b8;
            font-size: 0.9rem;
        }
        
        .code-block {
            background: #020617;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
        }
        
        .code-block pre {
            margin: 0;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
        }
        
        .btn-small {
            padding: 8px 16px;
            font-size: 0.9rem;
        }
        
        .safe-message {
            background: rgba(16, 185, 129, 0.1);
            border-right: 6px solid #10b981;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
        }
        
        .safe-message i {
            font-size: 3rem;
            color: #10b981;
            margin-bottom: 15px;
        }
        
        .safe-message h3 {
            color: #10b981;
            margin-bottom: 10px;
        }
        
        .additional-stats {
            margin-top: 30px;
            padding: 20px;
            background: #0f172a;
            border-radius: 12px;
            color: #94a3b8;
        }
        
        .stat-row {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .log-entry.start {
            color: #6366f1;
            font-weight: 600;
        }
        
        .log-entry.success {
            color: #10b981;
        }
        
        .log-entry.warning {
            color: #f59e0b;
        }
        
        .log-entry.error {
            color: #ef4444;
        }
    `;
    
    document.head.appendChild(style);
});

// ========== تصدير للاستخدام العام ==========
window.App = App;
