// ============================================
// 🚀 Solidity Scanner - النسخة المتكاملة مع Backend
// ============================================

const App = {
    // الإعدادات
    API_URL: 'https://your-backend-api.onrender.com', // استبدل هذا برابط الـ Backend
    GITHUB_TOKEN: null,
    
    // عناصر DOM
    elements: {},
    
    // حالة التطبيق
    state: {
        isScanning: false,
        currentRepo: '',
        results: null
    },

    // ========== التهيئة ==========
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.loadSettings();
        console.log('✅ Solidity Scanner جاهز');
    },

    cacheElements() {
        const ids = ['repoUrl', 'scanBtn', 'clearBtn', 'progressArea', 'resultsArea', 
                     'logBox', 'progressFill', 'progressPercent', 'currentFileSpan',
                     'resultsContent', 'githubToken', 'saveTokenBtn', 'rateLimitDisplay'];
        ids.forEach(id => this.elements[id] = document.getElementById(id));
    },

    setupEventListeners() {
        this.elements.scanBtn.addEventListener('click', () => this.startScan());
        this.elements.clearBtn.addEventListener('click', () => this.clearAll());
        if (this.elements.saveTokenBtn) {
            this.elements.saveTokenBtn.addEventListener('click', () => this.saveToken());
        }
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setExample(btn.dataset.url));
        });
    },

    // ========== الفحص الرئيسي ==========
    async startScan() {
        const url = this.elements.repoUrl.value.trim();
        
        if (!url || !url.includes('github.com')) {
            this.showNotification('❌ أدخل رابط GitHub صحيح', 'error');
            return;
        }

        if (this.state.isScanning) {
            this.showNotification('⚠️ فحص قيد التنفيذ', 'warning');
            return;
        }

        this.state.isScanning = true;
        this.state.currentRepo = url;
        this.showProgress();
        
        try {
            // 1. استخراج معلومات المستودع
            const repoInfo = this.parseGitHubUrl(url);
            this.addLog(`📡 جاري فحص: ${repoInfo.owner}/${repoInfo.repo}`, 'info');

            // 2. الاتصال بالـ Backend API
            const response = await fetch(`${this.API_URL}/api/scan`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': this.GITHUB_TOKEN ? `Bearer ${this.GITHUB_TOKEN}` : ''
                },
                body: JSON.stringify({
                    repoUrl: url,
                    token: this.GITHUB_TOKEN
                })
            });

            if (!response.ok) {
                throw new Error(`فشل الاتصال بالخادم: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // 3. معالجة التدفق (Streaming) للنتائج
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(5));
                        this.handleStreamData(data);
                    }
                }
            }

        } catch (error) {
            console.error('Scan error:', error);
            this.addLog(`❌ ${error.message}`, 'error');
            this.showNotification(`❌ فشل الفحص: ${error.message}`, 'error');
        } finally {
            this.state.isScanning = false;
            this.hideProgress();
        }
    },

    // ========== معالجة بيانات التدفق ==========
    handleStreamData(data) {
        switch(data.type) {
            case 'progress':
                this.updateProgress(data.percent, data.file);
                break;
            case 'log':
                this.addLog(data.message, data.level);
                break;
            case 'file':
                this.updateFileInfo(data);
                break;
            case 'vulnerability':
                this.addVulnerability(data.vuln);
                break;
            case 'result':
                this.displayResults(data.results);
                break;
        }
    },

    // ========== عرض النتائج ==========
    displayResults(results) {
        this.state.results = results;
        this.elements.resultsArea.classList.remove('hidden');
        
        let html = `
            <div class="repo-header">
                <h2><i class="fab fa-github"></i> ${results.metadata.repository}</h2>
                <span class="scan-badge">${results.metadata.filesScanned} ملف</span>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <i class="fas fa-file-code"></i>
                    <span class="stat-number">${results.stats.totalFiles}</span>
                    <span class="stat-label">ملف Solidity</span>
                </div>
                <div class="stat-card">
                    <i class="fas fa-bug"></i>
                    <span class="stat-number">${results.vulnerabilities.length}</span>
                    <span class="stat-label">ثغرة</span>
                </div>
                <div class="stat-card">
                    <i class="fas fa-exclamation-triangle" style="color:#ef4444"></i>
                    <span class="stat-number">${results.stats.criticalCount}</span>
                    <span class="stat-label">حرجة</span>
                </div>
            </div>
        `;

        if (results.vulnerabilities.length === 0) {
            html += `<div class="safe-message">🎉 لا توجد ثغرات! المشروع آمن.</div>`;
        } else {
            results.vulnerabilities.forEach(v => {
                html += this.createVulnerabilityCard(v);
            });
        }

        this.elements.resultsContent.innerHTML = html;
        this.showNotification(`✅ اكتمل الفحص - ${results.vulnerabilities.length} ثغرة`, 'success');
    },

    // ========== إنشاء بطاقة الثغرة ==========
    createVulnerabilityCard(v) {
        const severityColor = v.severity === 'critical' ? '#ef4444' : 
                             v.severity === 'high' ? '#f59e0b' : '#3b82f6';
        
        return `
            <div class="vuln-card" style="border-right-color: ${severityColor}">
                <div class="vuln-header">
                    <h3 style="color: ${severityColor}"><i class="fas fa-bug"></i> ${v.name}</h3>
                    <span class="severity-badge" style="background: ${severityColor}20; color: ${severityColor}">
                        ${v.severity.toUpperCase()}
                    </span>
                </div>
                <p>${v.description}</p>
                <div class="vuln-meta">
                    <span><i class="fas fa-file-code"></i> ${v.file}:${v.line}</span>
                    <span><i class="fas fa-chart-line"></i> ثقة ${v.confidence}%</span>
                </div>
                <div class="code-block">
                    <pre><code class="solidity">${this.escapeHtml(v.code)}</code></pre>
                </div>
                <button onclick="App.showFix('${v.type}')" class="btn-primary">
                    <i class="fas fa-wrench"></i> عرض الإصلاح
                </button>
            </div>
        `;
    },

    // ========== دوال مساعدة ==========
    parseGitHubUrl(url) {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        return { owner: match[1], repo: match[2] };
    },

    updateProgress(percent, file) {
        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressPercent.textContent = `${percent}%`;
        if (file) this.elements.currentFileSpan.textContent = file;
    },

    addLog(message, level = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${level}`;
        entry.innerHTML = `<span class="log-time">${new Date().toLocaleTimeString()}</span> ${message}`;
        this.elements.logBox.appendChild(entry);
        this.elements.logBox.scrollTop = this.elements.logBox.scrollHeight;
    },

    showProgress() {
        this.elements.progressArea.classList.remove('hidden');
        this.elements.resultsArea.classList.add('hidden');
        this.elements.logBox.innerHTML = '';
        this.updateProgress(0, 'جاري التحضير...');
    },

    hideProgress() {
        setTimeout(() => {
            this.elements.progressArea.classList.add('hidden');
        }, 500);
    },

    clearAll() {
        this.elements.repoUrl.value = '';
        this.elements.progressArea.classList.add('hidden');
        this.elements.resultsArea.classList.add('hidden');
        this.state.isScanning = false;
    },

    showNotification(message, type) {
        // يمكنك استخدام Toast أو alert بسيط
        alert(message);
    },

    setExample(url) {
        this.elements.repoUrl.value = url;
    },

    saveToken() {
        this.GITHUB_TOKEN = this.elements.githubToken.value.trim();
        localStorage.setItem('github_token', this.GITHUB_TOKEN);
        this.showNotification('✅ تم حفظ التوكن', 'success');
    },

    loadSettings() {
        this.GITHUB_TOKEN = localStorage.getItem('github_token') || null;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showFix(type) {
        const fixes = {
            reentrancy: `// تحديث الحالة قبل إرسال الأموال
function withdraw(uint256 amount) public {
    balances[msg.sender] -= amount;  // ✅ أولاً
    (bool success, ) = msg.sender.call{value: amount}("");  // ✅ ثانياً
    require(success);
}`,
            txorigin: `// استخدم msg.sender بدلاً من tx.origin
modifier onlyOwner() {
    require(msg.sender == owner);
    _;
}`,
            overflow: `// استخدم Solidity 0.8.0+
pragma solidity ^0.8.0;  // محمي تلقائياً`
        };
        alert(fixes[type] || 'الإصلاح غير متاح');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
