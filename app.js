// ============================================
// 🚀 Solidity Deep Scanner v4.0 - النسخة النهائية
// مع تحليل ذكي و False Positive Analyzer
// ============================================

const App = {
    // ========== الإعدادات الأساسية ==========
    API_URL: 'https://solidity-scanner-backend.onrender.com',
    GITHUB_TOKEN: null,
    
    // ========== عناصر DOM ==========
    elements: {},
    
    // ========== حالة التطبيق ==========
    state: {
        isScanning: false,
        currentRepo: '',
        results: null,
        startTime: null,
        fpStats: {
            analyzed: 0,
            rejected: 0,
            accepted: 0
        }
    },

    // ========== التهيئة ==========
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.loadSettings();
        this.checkBackendHealth();
        this.addStyles();
        console.log('✅ Solidity Deep Scanner جاهز للعمل');
    },

    // ========== تخزين عناصر DOM ==========
    cacheElements() {
        const ids = [
            'repoUrl', 'scanBtn', 'clearBtn', 'progressArea', 'resultsArea',
            'logBox', 'progressFill', 'progressPercent', 'currentFileSpan',
            'resultsContent', 'githubToken', 'saveTokenBtn', 'rateLimitDisplay',
            'tokenSection', 'fpStatsArea'
        ];
        
        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        this.elements.exampleBtns = document.querySelectorAll('.example-btn');
    },

    // ========== إضافة الأنماط ==========
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* ===== FP Stats ===== */
            .fp-stats {
                background: linear-gradient(135deg, #1e293b, #0f172a);
                border-radius: 16px;
                padding: 25px;
                margin-bottom: 30px;
                border: 2px solid #6366f1;
            }
            
            .fp-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .fp-header i {
                font-size: 2rem;
                color: #6366f1;
            }
            
            .fp-header h3 {
                color: white;
                margin: 0;
            }
            
            .fp-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            
            .fp-card {
                background: #1e293b;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid #334155;
            }
            
            .fp-card.success {
                border-right: 4px solid #10b981;
            }
            
            .fp-card.warning {
                border-right: 4px solid #f59e0b;
            }
            
            .fp-card.info {
                border-right: 4px solid #3b82f6;
            }
            
            .fp-label {
                display: block;
                color: #94a3b8;
                font-size: 0.9rem;
                margin-bottom: 8px;
            }
            
            .fp-value {
                display: block;
                font-size: 2rem;
                font-weight: 800;
                color: white;
            }
            
            /* ===== Deep Results ===== */
            .deep-results {
                padding: 20px;
            }
            
            .summary-header {
                background: linear-gradient(135deg, #1e293b, #0f172a);
                padding: 25px;
                border-radius: 16px;
                margin-bottom: 30px;
            }
            
            .summary-stats {
                display: flex;
                gap: 15px;
                margin: 15px 0;
                flex-wrap: wrap;
            }
            
            .stat-badge {
                padding: 8px 16px;
                border-radius: 30px;
                font-weight: 600;
                font-size: 0.9rem;
            }
            
            .stat-badge.critical {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }
            
            .stat-badge.high {
                background: rgba(245, 158, 11, 0.2);
                color: #f59e0b;
            }
            
            .stat-badge.medium {
                background: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
            }
            
            .stat-badge.low {
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
            }
            
            .confidence-meter {
                margin-top: 20px;
            }
            
            .meter-label {
                display: flex;
                justify-content: space-between;
                color: #94a3b8;
                margin-bottom: 8px;
            }
            
            .meter-bar {
                height: 10px;
                background: #1e293b;
                border-radius: 5px;
                overflow: hidden;
            }
            
            .meter-fill {
                height: 100%;
                background: linear-gradient(90deg, #6366f1, #0ea5e9);
                transition: width 0.5s ease;
                border-radius: 5px;
            }
            
            /* ===== Finding Cards ===== */
            .finding-card {
                background: #1e293b;
                border-radius: 16px;
                padding: 25px;
                margin-bottom: 25px;
                border: 1px solid #334155;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .finding-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 30px rgba(0,0,0,0.3);
            }
            
            .finding-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, var(--severity-color), transparent);
            }
            
            .finding-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 20px;
            }
            
            .finding-title {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .finding-title i {
                font-size: 1.5rem;
            }
            
            .finding-title h3 {
                margin: 0;
                font-size: 1.2rem;
            }
            
            .severity-badge {
                padding: 6px 15px;
                border-radius: 30px;
                font-size: 0.85rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            
            .context-info {
                background: #0f172a;
                padding: 12px;
                border-radius: 10px;
                margin-bottom: 15px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .context-tag {
                background: #1e293b;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.85rem;
                color: #94a3b8;
                border: 1px solid #334155;
            }
            
            .finding-location {
                background: #0f172a;
                padding: 15px;
                border-radius: 10px;
                font-family: 'JetBrains Mono', monospace;
                margin: 15px 0;
                display: flex;
                align-items: center;
                gap: 12px;
                overflow-x: auto;
                border: 1px solid #334155;
            }
            
            .finding-location code {
                color: #f59e0b;
                font-size: 0.9rem;
                background: #020617;
                padding: 4px 8px;
                border-radius: 6px;
            }
            
            .recommendations {
                background: rgba(99, 102, 241, 0.1);
                padding: 20px;
                border-radius: 12px;
                margin: 20px 0;
                border: 1px solid #6366f1;
            }
            
            .recommendations h4 {
                color: #6366f1;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .recommendations ul {
                list-style: none;
                padding: 0;
            }
            
            .recommendations li {
                padding: 10px 0;
                border-bottom: 1px solid #334155;
                display: flex;
                align-items: center;
                gap: 12px;
                color: #e2e8f0;
            }
            
            .recommendations li:last-child {
                border-bottom: none;
            }
            
            .recommendations li:before {
                content: "✅";
                font-size: 1rem;
            }
            
            .btn-fix {
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                border: none;
                color: white;
                padding: 12px 25px;
                border-radius: 10px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                transition: all 0.3s;
                border: 1px solid #818cf8;
            }
            
            .btn-fix:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 25px rgba(99,102,241,0.3);
            }
            
            .btn-export {
                background: #334155;
                border: none;
                color: white;
                padding: 12px 25px;
                border-radius: 10px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                transition: all 0.3s;
            }
            
            .btn-export:hover {
                background: #475569;
                transform: translateY(-2px);
            }
            
            .report-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 40px;
                padding-top: 25px;
                border-top: 2px solid #334155;
                background: #0f172a;
                padding: 20px 25px;
                border-radius: 12px;
            }
            
            /* ===== Log entries ===== */
            .log-entry {
                padding: 8px 0;
                border-bottom: 1px solid #334155;
                display: flex;
                gap: 12px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.9rem;
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
            
            .log-entry.info {
                color: #3b82f6;
            }
            
            .log-time {
                color: #64748b;
                min-width: 60px;
            }
            
            /* ===== Responsive ===== */
            @media (max-width: 1024px) {
                .fp-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            @media (max-width: 768px) {
                .fp-grid {
                    grid-template-columns: 1fr;
                }
                
                .finding-header {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .summary-stats {
                    flex-direction: column;
                }
                
                .report-footer {
                    flex-direction: column;
                    gap: 15px;
                }
            }
        `;
        
        document.head.appendChild(style);
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

        const savedFPStats = localStorage.getItem('fp_stats');
        if (savedFPStats) {
            try {
                this.state.fpStats = JSON.parse(savedFPStats);
            } catch (e) {
                console.error('Failed to load FP stats:', e);
            }
        }
    },

    // ========== حفظ الإعدادات ==========
    saveSettings() {
        if (this.state.currentRepo) {
            localStorage.setItem('last_repo_url', this.state.currentRepo);
        }
        localStorage.setItem('fp_stats', JSON.stringify(this.state.fpStats));
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
                this.addLog('✅ Backend متصل وجاهز', 'success');
            } else {
                console.warn('⚠️ Backend غير متصل');
                this.addLog('⚠️ Backend غير متصل - بعض الميزات قد لا تعمل', 'warning');
            }
        } catch (error) {
            console.warn('⚠️ لا يمكن الاتصال بالـ Backend:', error.message);
            this.addLog('⚠️ لا يمكن الاتصال بالخادم الخلفي', 'warning');
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
                    ${data.remaining}/${data.limit} طلب متبقي
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
                this.showNotification('✅ تم حفظ التوكن بنجاح - 5000 طلب/ساعة', 'success');
                this.updateRateLimit();
                this.addLog('✅ تم حفظ GitHub Token - 5000 طلب/ساعة', 'success');
            } else {
                localStorage.removeItem('github_token');
                this.showNotification('🗑️ تم إزالة التوكن - 60 طلب/ساعة', 'info');
                this.addLog('ℹ️ تم إزالة التوكن - 60 طلب/ساعة', 'info');
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
        this.addLog('🚀 بدء الفحص العميق...', 'start');
        
        try {
            const repoInfo = this.parseGitHubUrl(url);
            this.addLog(`📡 جاري فحص: ${repoInfo.owner}/${repoInfo.repo}`, 'info');
            this.saveSettings();

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

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let results = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(5));
                            
                            switch(data.type) {
                                case 'progress':
                                    this.updateProgress(data.percent, data.file);
                                    break;
                                case 'log':
                                    this.addLog(data.message, data.level);
                                    break;
                                case 'vulnerability':
                                    results = results || { vulnerabilities: [] };
                                    results.vulnerabilities.push(data.vuln);
                                    this.state.fpStats.analyzed++;
                                    break;
                                case 'result':
                                    results = data.results;
                                    break;
                                case 'error':
                                    throw new Error(data.message);
                            }
                        } catch (e) {
                            console.warn('خطأ في معالجة البيانات:', e);
                        }
                    }
                }
            }

            if (results) {
                await this.displayDeepResults(results);
                this.saveSettings();
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

    // ========== عرض النتائج العميقة ==========
    async displayDeepResults(scanResults) {
        const container = this.elements.resultsContent;
        if (!container) return;

        this.elements.resultsArea.classList.remove('hidden');

        // عرض إحصائيات FP
        this.displayFPStats();

        // حساب الإحصائيات
        const stats = {
            total: scanResults.vulnerabilities?.length || 0,
            critical: scanResults.vulnerabilities?.filter(v => v.severity === 'critical').length || 0,
            high: scanResults.vulnerabilities?.filter(v => v.severity === 'high').length || 0,
            medium: scanResults.vulnerabilities?.filter(v => v.severity === 'medium').length || 0,
            low: scanResults.vulnerabilities?.filter(v => v.severity === 'low').length || 0
        };

        const avgConfidence = scanResults.vulnerabilities?.reduce((acc, v) => acc + (v.confidence || 0), 0) / (stats.total || 1);

        let html = `
            <div class="deep-results">
                <div class="summary-header">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-microscope" style="color: #6366f1;"></i>
                            نتائج الفحص العميق
                        </h2>
                        <span style="color: #94a3b8;">
                            <i class="fas fa-clock"></i> ${new Date().toLocaleString('ar-EG')}
                        </span>
                    </div>
                    
                    <div class="summary-stats">
                        <span class="stat-badge critical">🔴 حرجة: ${stats.critical}</span>
                        <span class="stat-badge high">🟠 عالية: ${stats.high}</span>
                        <span class="stat-badge medium">🟡 متوسطة: ${stats.medium}</span>
                        <span class="stat-badge low">🟢 منخفضة: ${stats.low}</span>
                    </div>
                    
                    <div class="confidence-meter">
                        <div class="meter-label">
                            <span>ثقة التحليل</span>
                            <span>${avgConfidence.toFixed(1)}%</span>
                        </div>
                        <div class="meter-bar">
                            <div class="meter-fill" style="width: ${avgConfidence}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="findings-container">
        `;

        if (stats.total === 0) {
            html += `
                <div style="background: rgba(16,185,129,0.1); border-right: 6px solid #10b981; padding: 40px; border-radius: 16px; text-align: center;">
                    <i class="fas fa-shield-check" style="font-size: 4rem; color: #10b981; margin-bottom: 20px;"></i>
                    <h3 style="color: #10b981; font-size: 1.8rem; margin-bottom: 10px;">🎉 لا توجد ثغرات!</h3>
                    <p style="color: #94a3b8; font-size: 1.1rem;">المشروع يبدو آمناً. استمر في المراجعة الدورية.</p>
                </div>
            `;
        } else {
            scanResults.vulnerabilities.forEach(v => {
                const severityColor = v.severity === 'critical' ? '#ef4444' :
                                     v.severity === 'high' ? '#f59e0b' :
                                     v.severity === 'medium' ? '#3b82f6' : '#10b981';

                html += `
                    <div class="finding-card" style="--severity-color: ${severityColor}">
                        <div class="finding-header">
                            <div class="finding-title">
                                <i class="fas fa-bug" style="color: ${severityColor}"></i>
                                <h3 style="color: ${severityColor}">${v.name}</h3>
                            </div>
                            <span class="severity-badge" style="background: ${severityColor}20; color: ${severityColor}">
                                <i class="fas fa-exclamation-triangle"></i>
                                ${v.severity.toUpperCase()} · ثقة ${v.confidence || 85}%
                            </span>
                        </div>
                        
                        <p style="color: #e2e8f0; line-height: 1.7; margin-bottom: 20px;">
                            ${v.description}
                        </p>
                        
                        ${v.context ? `
                            <div class="context-info">
                                ${v.context.details?.isProxy ? '<span class="context-tag">📦 Proxy Contract</span>' : ''}
                                ${v.context.details?.hasAccessControl ? '<span class="context-tag">🔐 Access Control موجود</span>' : ''}
                                ${v.context.details?.hasGuard ? '<span class="context-tag">🛡️ ReentrancyGuard</span>' : ''}
                                ${v.context.details?.targetSource ? `<span class="context-tag">🎯 Target: ${v.context.details.targetSource}</span>` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="finding-location">
                            <i class="fas fa-file-code" style="color: #6366f1;"></i>
                            <span style="color: #94a3b8;">${v.file || 'Unknown'}:${v.line || 0}</span>
                            ${v.code ? `<code>${this.escapeHtml(v.code.substring(0, 100))}${v.code.length > 100 ? '...' : ''}</code>` : ''}
                        </div>
                        
                        ${v.recommendations && v.recommendations.length > 0 ? `
                            <div class="recommendations">
                                <h4><i class="fas fa-wrench"></i> التوصيات:</h4>
                                <ul>
                                    ${v.recommendations.map(r => `<li>${r}</li>`).join('')}
                                </ul>
                            </div>
                        ` : `
                            <div class="recommendations">
                                <h4><i class="fas fa-wrench"></i> الإصلاح المقترح:</h4>
                                <ul>
                                    <li>تحديث الحالة قبل إرسال الأموال</li>
                                    <li>إضافة ReentrancyGuard للدوال الحساسة</li>
                                    <li>استخدام onlyOwner للتحكم في الصلاحيات</li>
                                </ul>
                            </div>
                        `}
                        
                        <button onclick="App.showFix('${v.type || v.rule || 'delegatecall'}')" class="btn-fix">
                            <i class="fas fa-code"></i> عرض كود الإصلاح
                        </button>
                    </div>
                `;
            });
        }

        html += `
                </div>
                
                <div class="report-footer">
                    <div style="display: flex; gap: 20px; color: #94a3b8;">
                        <span><i class="fas fa-file-code"></i> إجمالي الملفات: ${scanResults.metadata?.filesScanned || 'N/A'}</span>
                        <span><i class="fas fa-bug"></i> إجمالي الثغرات: ${stats.total}</span>
                        <span><i class="fas fa-clock"></i> وقت الفحص: ${scanResults.metadata?.scanTime || 0}ms</span>
                    </div>
                    <button onclick="App.exportReport()" class="btn-export">
                        <i class="fas fa-download"></i> تصدير التقرير
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // تحديث syntax highlighting
        if (window.hljs) {
            document.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }

        this.addLog(`✅ اكتمل الفحص - ${stats.total} ثغرة`, 'success');
        this.showNotification(`✅ اكتمل الفحص - ${stats.total} ثغرة`, 'success');
    },

    // ========== عرض إحصائيات False Positives ==========
    displayFPStats() {
        const stats = this.state.fpStats;
        const accuracy = stats.analyzed > 0 ? 
            ((stats.accepted / stats.analyzed) * 100).toFixed(1) : '0';
        const fpRate = stats.analyzed > 0 ? 
            ((stats.rejected / stats.analyzed) * 100).toFixed(1) : '0';

        const html = `
            <div class="fp-stats">
                <div class="fp-header">
                    <i class="fas fa-shield-check"></i>
                    <h3>📊 دقة التحليل - False Positive Analysis</h3>
                </div>
                <div class="fp-grid">
                    <div class="fp-card">
                        <span class="fp-label">نتائج تم تحليلها</span>
                        <span class="fp-value">${stats.analyzed}</span>
                    </div>
                    <div class="fp-card success">
                        <span class="fp-label">✅ نتائج صحيحة</span>
                        <span class="fp-value">${stats.accepted}</span>
                    </div>
                    <div class="fp-card warning">
                        <span class="fp-label">🛡️ False Positives مرفوضة</span>
                        <span class="fp-value">${stats.rejected}</span>
                    </div>
                    <div class="fp-card info">
                        <span class="fp-label">📈 دقة التحليل</span>
                        <span class="fp-value">${accuracy}%</span>
                    </div>
                </div>
                <div style="margin-top: 15px; font-size: 0.9rem; color: #94a3b8; text-align: center;">
                    <i class="fas fa-info-circle"></i> نسبة False Positives: ${fpRate}% - تم رفض ${stats.rejected} نتيجة خاطئة
                </div>
            </div>
        `;

        if (this.elements.resultsContent) {
            const existingFP = this.elements.resultsContent.querySelector('.fp-stats');
            if (existingFP) {
                existingFP.remove();
            }
            this.elements.resultsContent.insertAdjacentHTML('afterbegin', html);
        }
    },

    // ========== دوال مساعدة ==========
    parseGitHubUrl(url) {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error('رابط GitHub غير صالح');
        return { owner: match[1], repo: match[2].replace('.git', '') };
    },

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
        
        this.startTimeUpdate();
    },

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

    hideProgress() {
        setTimeout(() => {
            if (this.elements.progressArea) {
                this.elements.progressArea.classList.add('hidden');
            }
        }, 500);
    },

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

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            border-radius: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        notification.innerHTML = `${icon} ${message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    exportReport() {
        if (!this.state.results) {
            this.showNotification('❌ لا توجد نتائج لتصديرها', 'error');
            return;
        }

        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                repository: this.state.currentRepo,
                scanner: 'Solidity Deep Scanner v4.0'
            },
            results: this.state.results,
            fpStats: this.state.fpStats
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solidity-scan-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('✅ تم تصدير التقرير بنجاح', 'success');
    },

    showFix(type) {
        const fixes = {
            delegatecall: `// ✅ الإصلاح الصحيح لثغرة Delegatecall

// 1. إضافة صلاحيات صارمة
contract SafeProxy {
    address public implementation;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // 2. التحقق من صحة العنوان
    function setImplementation(address _implementation) public onlyOwner {
        require(_implementation != address(0), "Invalid implementation");
        require(isContract(_implementation), "Target must be a contract");
        implementation = _implementation;
    }
    
    // 3. إضافة تحقق قبل delegatecall
    function _delegate(address _target, bytes memory _data) internal {
        require(_target == implementation, "Target not approved");
        require(_target != address(0), "Invalid target");
        
        (bool success, bytes memory returndata) = _target.delegatecall(_data);
        require(success, "Delegatecall failed");
    }
    
    // 4. دالة التحقق من العقد
    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }
}`,

            reentrancy: `// ✅ الإصلاح الصحيح لثغرة Reentrancy

// الطريقة 1: نمط Checks-Effects-Interactions
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // 1. التأثير (Effects) - تحديث الحالة أولاً
    balances[msg.sender] -= amount;
    
    // 2. التفاعل (Interactions) - ثم إرسال الأموال
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}

// الطريقة 2: استخدام ReentrancyGuard من OpenZeppelin
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeBank is ReentrancyGuard {
    mapping(address => uint256) public balances;
    
    function withdraw(uint256 amount) public nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}`,

            txorigin: `// ✅ استخدام msg.sender بدلاً من tx.origin

contract SafeWallet {
    address public owner;
    
    constructor() {
        owner = msg.sender;  // ✅ صحيح: يستخدم المرسل المباشر
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");  // ✅ صحيح
        _;
    }
    
    function withdrawAll() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}`,

            overflow: `// ✅ الترقية إلى Solidity 0.8.0+ أو استخدام SafeMath

// الخيار 1: Solidity 0.8.0+ (محمي تلقائياً)
pragma solidity ^0.8.0;

contract SafeToken {
    mapping(address => uint256) public balances;
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // ✅ في Solidity 0.8.x، هذه العمليات محمية تلقائياً
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}

// الخيار 2: استخدام SafeMath (للإصدارات الأقدم)
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SafeTokenWithSafeMath {
    using SafeMath for uint256;
    
    mapping(address => uint256) public balances;
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // ✅ استخدام SafeMath للعمليات الحسابية
        balances[msg.sender] = balances[msg.sender].sub(amount);
        balances[to] = balances[to].add(amount);
    }
}`,

            default: `// ✅ أفضل ممارسات الأمان العامة

1. استخدم نمط Checks-Effects-Interactions
2. أضف ReentrancyGuard للدوال الحساسة
3. استخدم onlyOwner للتحكم في الصلاحيات
4. تحقق من صحة جميع المدخلات
5. تجنب استخدام tx.origin
6. استخدم SafeMath أو Solidity 0.8.0+
7. اختبر جميع الدوال باستخدام Echidna أو Slither
8. قم بمراجعة أمنية شاملة قبل النشر`
        };

        const fix = fixes[type] || fixes.default;
        
        // إنشاء نافذة منبثقة
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 20px;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #0f172a;
            border-radius: 20px;
            padding: 30px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            border: 1px solid #334155;
            position: relative;
            width: 100%;
        `;

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="display: flex; align-items: center; gap: 10px; color: #10b981; margin: 0;">
                    <i class="fas fa-wrench"></i>
                    الإصلاح المقترح - ${type}
                </h3>
                <button onclick="this.closest('.modal').remove()" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1.5rem;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <pre style="background: #020617; padding: 20px; border-radius: 12px; overflow-x: auto; margin: 0;"><code style="color: #e2e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; line-height: 1.6;">${this.escapeHtml(fix)}</code></pre>
            <div style="display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px;">
                <button onclick="navigator.clipboard.writeText(this.closest('.modal').querySelector('code').innerText); alert('✅ تم نسخ الإصلاح')" class="btn-fix" style="padding: 12px 25px;">
                    <i class="fas fa-copy"></i> نسخ الكود
                </button>
                <button onclick="this.closest('.modal').remove()" class="btn-export" style="padding: 12px 25px;">
                    <i class="fas fa-check"></i> تم
                </button>
            </div>
        `;

        modal.className = 'modal';
        modal.appendChild(content);
        document.body.appendChild(modal);
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ========== بدء التطبيق ==========
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// ========== تصدير للاستخدام العام ==========
window.App = App;
