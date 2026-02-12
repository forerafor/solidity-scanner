// ============================================
// 🧠 Shrek Smart Scanner App v3.0
// التطبيق الرئيسي - واجهة ذكية بدون False Positives
// ============================================

// استيراد المكونات
const ShrekApp = {
    // الإصدار
    version: '3.0.0',
    
    // المكونات
    scanner: null,
    githubAnalyzer: null,
    pocGenerator: null,
    
    // الحالة
    isScanning: false,
    currentResults: null,
    
    // ========== التهيئة ==========
    init: function() {
        console.log(`🧠 Shrek Smart Scanner v${this.version} initializing...`);
        
        // إنشاء المكونات
        this.scanner = new window.ShrekSmartScanner();
        this.githubAnalyzer = new window.ShrekGitHubAnalyzer();
        this.pocGenerator = new window.ShrekPOCGenerator();
        
        // تهيئة الواجهة
        this.initUI();
        
        // تحميل الإعدادات
        this.loadSettings();
        
        console.log('✅ Shrek Smart Scanner ready!');
    },
    
    // تهيئة واجهة المستخدم
    initUI: function() {
        // أزرار الفحص
        const scanBtn = document.getElementById('startScanBtn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.startScan());
        }
        
        // أزرار المسح
        const clearBtn = document.getElementById('clearResultsBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearResults());
        }
        
        // حقل GitHub - Enter key
        const githubUrl = document.getElementById('githubUrl');
        if (githubUrl) {
            githubUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.startScan();
            });
        }
        
        // مولد PoC
        const generateBtn = document.getElementById('generatePOCBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generatePOC());
        }
        
        const copyBtn = document.getElementById('copyPOCBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyPOC());
        }
        
        // تحميل العقود الافتراضية
        this.loadDefaultContracts();
        
        // تحديث الإحصائيات
        this.updateStats();
    },
    
    // تحميل الإعدادات
    loadSettings: function() {
        // استرجاع آخر GitHub URL
        const lastUrl = localStorage.getItem('shrek_last_url');
        if (lastUrl) {
            const input = document.getElementById('githubUrl');
            if (input) input.value = lastUrl;
        }
        
        // استرجاع آخر نتائج
        const lastResults = localStorage.getItem('shrek_last_results');
        if (lastResults) {
            try {
                this.currentResults = JSON.parse(lastResults);
                this.displayResults(this.currentResults);
            } catch (e) {
                console.error('Failed to load last results:', e);
            }
        }
    },
    
    // حفظ الإعدادات
    saveSettings: function() {
        const url = document.getElementById('githubUrl')?.value;
        if (url) {
            localStorage.setItem('shrek_last_url', url);
        }
        
        if (this.currentResults) {
            localStorage.setItem('shrek_last_results', JSON.stringify(this.currentResults));
        }
    },
    
    // ========== وظائف المسح ==========
    startScan: async function() {
        const url = document.getElementById('githubUrl')?.value;
        if (!url) {
            this.showNotification('❌ الرجاء إدخال رابط GitHub', 'error');
            return;
        }
        
        if (this.isScanning) {
            this.showNotification('⚠️ فحص قيد التنفيذ', 'warning');
            return;
        }
        
        this.isScanning = true;
        this.updateScanUI(true);
        
        try {
            // إظهار شريط التقدم
            this.showProgress();
            
            // تنفيذ الفحص
            const results = await this.githubAnalyzer.scanRepository(url, {
                deepScan: document.getElementById('deepAnalysis')?.checked || true,
                includeDeps: document.getElementById('includeDeps')?.checked || true,
                detectOutdated: document.getElementById('detectOutdated')?.checked || true
            });
            
            // حفظ النتائج
            this.currentResults = results;
            this.saveSettings();
            
            // عرض النتائج
            this.displayResults(results);
            
            this.showNotification(`✅ اكتمل فحص ${results.metadata.repository}`, 'success');
            
        } catch (error) {
            console.error('Scan error:', error);
            this.showNotification(`❌ خطأ: ${error.message}`, 'error');
        } finally {
            this.isScanning = false;
            this.updateScanUI(false);
            this.hideProgress();
        }
    },
    
    // مسح النتائج
    clearResults: function() {
        // إخفاء قسم النتائج
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
        
        // إفراغ المحتوى
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.innerHTML = '';
        }
        
        // مسح البيانات المحفوظة
        this.currentResults = null;
        localStorage.removeItem('shrek_last_results');
        
        this.showNotification('🧹 تم مسح جميع النتائج', 'info');
    },
    
    // ========== عرض النتائج ==========
    displayResults: function(results) {
        const container = document.getElementById('resultsContainer');
        const resultsSection = document.getElementById('results');
        
        if (!container || !resultsSection) return;
        
        // إظهار قسم النتائج
        resultsSection.classList.remove('hidden');
        container.innerHTML = '';
        
        // عرض ملخص المشروع
        container.appendChild(this.createProjectSummary(results));
        
        // عرض الإحصائيات
        container.appendChild(this.createStatsGrid(results));
        
        // عرض الثغرات
        if (results.vulnerabilities && results.vulnerabilities.length > 0) {
            container.appendChild(this.createVulnerabilitiesSection(results));
        } else {
            container.appendChild(this.createNoVulnerabilitiesMessage());
        }
        
        // عرض المكتبات
        if (results.libraries && results.libraries.length > 0) {
            container.appendChild(this.createLibrariesSection(results));
        }
        
        // عرض التوصيات
        if (results.recommendations && results.recommendations.length > 0) {
            container.appendChild(this.createRecommendationsSection(results));
        }
        
        // تحديث الإحصائيات
        this.updateStats();
        
        // تمرير تلقائي للنتائج
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    },
    
    // إنشاء ملخص المشروع
    createProjectSummary: function(results) {
        const div = document.createElement('div');
        div.className = 'project-card';
        div.style.cssText = 'background:linear-gradient(135deg,#1e293b,#0f172a); border-radius:16px; padding:2rem; margin-bottom:2rem; border:1px solid #334155;';
        
        const riskColors = {
            'CRITICAL': '#ef4444',
            'HIGH': '#f59e0b',
            'MEDIUM': '#3b82f6',
            'LOW': '#10b981',
            'MINIMAL': '#94a3b8'
        };
        
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <i class="fab fa-github" style="font-size:2rem; color:#6366f1;"></i>
                        <h2 style="margin:0;">${results.metadata.repository}</h2>
                    </div>
                    <div style="display:flex; gap:20px; color:#94a3b8;">
                        <span><i class="fas fa-code-branch"></i> ${results.metadata.branch}</span>
                        <span><i class="fas fa-clock"></i> ${new Date(results.metadata.timestamp).toLocaleString('ar-EG')}</span>
                        <span><i class="fas fa-hourglass-half"></i> ${results.metadata.scanTime}ms</span>
                    </div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:3rem; font-weight:800; background:linear-gradient(135deg,${riskColors[results.summary.riskLevel] || '#6366f1'},#0ea5e9); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
                        ${results.summary.score}%
                    </div>
                    <p style="color:#94a3b8; margin-top:5px;">درجة الأمان</p>
                    <span style="display:inline-block; margin-top:10px; padding:0.3rem 1rem; background:${riskColors[results.summary.riskLevel]}20; color:${riskColors[results.summary.riskLevel]}; border-radius:20px; font-weight:600;">
                        مستوى الخطورة: ${results.summary.riskLevel}
                    </span>
                </div>
            </div>
        `;
        
        return div;
    },
    
    // إنشاء شبكة الإحصائيات
    createStatsGrid: function(results) {
        const div = document.createElement('div');
        div.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.5rem; margin-bottom:2rem;';
        
        div.innerHTML = `
            <div style="background:#1e293b; padding:1.5rem; border-radius:12px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-file-code" style="font-size:2.5rem; color:#6366f1; margin-bottom:0.5rem;"></i>
                <h3 style="font-size:2rem; margin:0.5rem 0;">${results.stats.solidityFiles}</h3>
                <p style="color:#94a3b8;">ملف Solidity</p>
                <small style="color:#64748b;">من أصل ${results.stats.totalFiles} ملف</small>
            </div>
            <div style="background:#1e293b; padding:1.5rem; border-radius:12px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-book" style="font-size:2.5rem; color:#0ea5e9; margin-bottom:0.5rem;"></i>
                <h3 style="font-size:2rem; margin:0.5rem 0;">${results.libraries.length}</h3>
                <p style="color:#94a3b8;">مكتبة</p>
                <small style="color:#64748b;">${results.libraries.filter(l => l.isOutdated).length} مكتبة قديمة</small>
            </div>
            <div style="background:#1e293b; padding:1.5rem; border-radius:12px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-bug" style="font-size:2.5rem; color:#ef4444; margin-bottom:0.5rem;"></i>
                <h3 style="font-size:2rem; margin:0.5rem 0;">${results.vulnerabilities.length}</h3>
                <p style="color:#94a3b8;">ثغرة</p>
                <small style="color:#64748b;">
                    حرجة: ${results.summary.criticalCount} | 
                    عالية: ${results.summary.highCount} | 
                    متوسطة: ${results.summary.mediumCount}
                </small>
            </div>
            <div style="background:#1e293b; padding:1.5rem; border-radius:12px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-shield" style="font-size:2.5rem; color:#10b981; margin-bottom:0.5rem;"></i>
                <h3 style="font-size:2rem; margin:0.5rem 0;">${results.vulnerabilities.filter(v => v.isMitigated).length}</h3>
                <p style="color:#94a3b8;">تم الإصلاح</p>
                <small style="color:#64748b;">${results.vulnerabilities.filter(v => v.falsePositiveRisk > 0.5).length} FP محتمل</small>
            </div>
        `;
        
        return div;
    },
    
    // إنشاء قسم الثغرات
    createVulnerabilitiesSection: function(results) {
        const div = document.createElement('div');
        div.style.marginBottom = '2rem';
        
        const title = document.createElement('h3');
        title.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:1.5rem; font-size:1.5rem;';
        title.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> الثغرات المكتشفة';
        div.appendChild(title);
        
        results.vulnerabilities.forEach(v => {
            const card = document.createElement('div');
            card.className = `vulnerability-card ${v.severity}`;
            card.style.cssText = `
                background:#1e293b; 
                border-${document.dir === 'rtl' ? 'right' : 'left'}: 6px solid ${v.severity === 'critical' ? '#ef4444' : v.severity === 'high' ? '#f59e0b' : v.severity === 'medium' ? '#3b82f6' : '#94a3b8'};
                border-radius:12px; 
                padding:1.5rem; 
                margin-bottom:1rem;
                transition: all 0.3s;
            `;
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px; flex-wrap:wrap;">
                            <h4 style="color:${v.severity === 'critical' ? '#ef4444' : v.severity === 'high' ? '#f59e0b' : '#3b82f6'}; margin:0; font-size:1.2rem;">
                                ⚠️ ${v.name}
                            </h4>
                            <span style="background:${v.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}; 
                                         color:${v.severity === 'critical' ? '#ef4444' : '#f59e0b'}; 
                                         padding:0.3rem 1rem; border-radius:20px; font-size:0.85rem; font-weight:600;">
                                ثقة ${v.confidence}%
                            </span>
                            <span style="background:${v.isMitigated ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; 
                                         color:${v.isMitigated ? '#10b981' : '#ef4444'}; 
                                         padding:0.3rem 1rem; border-radius:20px; font-size:0.85rem; font-weight:600;">
                                ${v.isMitigated ? '✅ تم الإصلاح' : '⚠️ نشط'}
                            </span>
                            ${v.falsePositiveRisk > 0.5 ? `
                                <span style="background:rgba(100,116,139,0.2); color:#94a3b8; padding:0.3rem 1rem; border-radius:20px; font-size:0.85rem;">
                                    🤔 FP محتمل
                                </span>
                            ` : ''}
                        </div>
                        
                        <p style="color:#cbd5e1; margin-bottom:15px; line-height:1.6;">
                            ${v.description}
                        </p>
                        
                        <div style="background:#0f172a; border-radius:8px; padding:1rem; margin-bottom:15px; border:1px solid #334155;">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                                <i class="fas fa-file-code" style="color:#6366f1;"></i>
                                <code style="color:#f59e0b; font-family:monospace; font-size:0.95rem;">
                                    📍 ${v.location.file}:${v.location.line}
                                </code>
                            </div>
                            <pre style="background:#020617; padding:1rem; border-radius:6px; overflow-x:auto; margin:0;"><code style="color:#e2e8f0; font-family:monospace; font-size:0.85rem;">${v.location.code || '// الكود غير متاح'}</code></pre>
                        </div>
                        
                        <div style="display:flex; gap:15px; margin-top:20px; flex-wrap:wrap;">
                            <button onclick='window.showFix("${v.type}")' class="btn-primary" style="padding:0.6rem 1.5rem; display:flex; align-items:center; gap:8px;">
                                <i class="fas fa-wrench"></i> عرض الإصلاح
                            </button>
                            <button onclick='window.generatePOCForVuln(${JSON.stringify(v)})' class="btn-secondary" style="padding:0.6rem 1.5rem; display:flex; align-items:center; gap:8px;">
                                <i class="fas fa-code"></i> توليد PoC
                            </button>
                            ${v.poc ? `
                                <button onclick='window.showPOC("${v.type}")' class="btn-outline" style="padding:0.6rem 1.5rem; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-eye"></i> عرض PoC
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            div.appendChild(card);
        });
        
        return div;
    },
    
    // إنشاء رسالة عدم وجود ثغرات
    createNoVulnerabilitiesMessage: function() {
        const div = document.createElement('div');
        div.style.cssText = `
            background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05));
            border-${document.dir === 'rtl' ? 'right' : 'left'}: 6px solid #10b981;
            border-radius:12px;
            padding:2rem;
            margin-bottom:2rem;
            display:flex;
            align-items:center;
            gap:1.5rem;
        `;
        
        div.innerHTML = `
            <i class="fas fa-shield-check" style="font-size:3rem; color:#10b981;"></i>
            <div>
                <h3 style="color:#10b981; margin-bottom:0.5rem; font-size:1.5rem;">🎉 لا توجد ثغرات مكتشفة!</h3>
                <p style="color:#94a3b8; line-height:1.6;">
                    المشروع يبدو آمناً. يوصى بإجراء مراجعة دورية واستخدام أحدث إصدارات المكتبات.
                </p>
            </div>
        `;
        
        return div;
    },
    
    // إنشاء قسم المكتبات
    createLibrariesSection: function(results) {
        const div = document.createElement('div');
        div.style.marginBottom = '2rem';
        
        const title = document.createElement('h3');
        title.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:1.5rem; font-size:1.5rem;';
        title.innerHTML = '<i class="fas fa-book" style="color:#0ea5e9;"></i> المكتبات المستخدمة';
        div.appendChild(title);
        
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:1rem;';
        
        results.libraries.forEach(lib => {
            const card = document.createElement('div');
            card.style.cssText = `
                background:#1e293b;
                border:1px solid ${lib.isOutdated ? '#f59e0b40' : '#334155'};
                border-radius:12px;
                padding:1.2rem;
                transition: all 0.3s;
            `;
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <i class="fas fa-cube" style="color:${lib.trusted ? '#10b981' : '#94a3b8'};"></i>
                            <h4 style="margin:0; color:white;">${lib.name}</h4>
                        </div>
                        <p style="color:#94a3b8; font-family:monospace; margin-bottom:5px;">
                            v${lib.version} ${lib.isOutdated ? `→ v${lib.latestVersion}` : ''}
                        </p>
                        <p style="color:#64748b; font-size:0.85rem;">
                            <i class="fas fa-files"></i> ${lib.files || '?'} ملف
                        </p>
                    </div>
                    <span style="
                        padding:0.2rem 0.8rem; 
                        border-radius:20px; 
                        font-size:0.75rem;
                        font-weight:600;
                        background:${lib.isOutdated ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'};
                        color:${lib.isOutdated ? '#f59e0b' : '#10b981'};
                    ">
                        ${lib.isOutdated ? 'قديم' : 'محدث'}
                    </span>
                </div>
                ${lib.isOutdated ? `
                    <div style="margin-top:12px; padding-top:12px; border-top:1px solid #334155;">
                        <p style="color:#f59e0b; font-size:0.85rem; display:flex; align-items:center; gap:5px;">
                            <i class="fas fa-exclamation-triangle"></i>
                            يوصى بالتحديث إلى v${lib.latestVersion}
                        </p>
                    </div>
                ` : ''}
            `;
            
            grid.appendChild(card);
        });
        
        div.appendChild(grid);
        return div;
    },
    
    // إنشاء قسم التوصيات
    createRecommendationsSection: function(results) {
        const div = document.createElement('div');
        div.style.marginBottom = '2rem';
        
        const title = document.createElement('h3');
        title.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:1.5rem; font-size:1.5rem;';
        title.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> التوصيات والإجراءات المقترحة';
        div.appendChild(title);
        
        const list = document.createElement('div');
        list.style.cssText = 'background:#1e293b; border-radius:12px; padding:1.5rem; border:1px solid #334155;';
        
        results.recommendations.forEach((rec, i) => {
            list.innerHTML += `
                <div style="display:flex; align-items:flex-start; gap:12px; padding:1rem 0; ${i < results.recommendations.length - 1 ? 'border-bottom:1px solid #334155;' : ''}">
                    <i class="fas fa-check-circle" style="color:#10b981; margin-top:3px;"></i>
                    <div>
                        <p style="color:#e2e8f0; margin-bottom:5px; font-weight:600;">${rec}</p>
                        <p style="color:#94a3b8; font-size:0.9rem;">
                            <i class="fas fa-clock"></i> وقت التنفيذ: ${i < 2 ? 'فوري' : 'مجدول'}
                        </p>
                    </div>
                </div>
            `;
        });
        
        div.appendChild(list);
        return div;
    },
    
    // ========== وظائف PoC ==========
    generatePOC: function() {
        const vulnType = document.getElementById('vulnType')?.value;
        if (!vulnType) {
            this.showNotification('❌ الرجاء اختيار نوع الثغرة', 'error');
            return;
        }
        
        const targetInfo = {
            address: document.getElementById('targetAddress')?.value || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            name: document.getElementById('targetName')?.value || 'VictimContract'
        };
        
        const pocCode = this.pocGenerator.generate(vulnType, targetInfo);
        
        const codeBlock = document.getElementById('pocCode');
        if (codeBlock) {
            codeBlock.innerHTML = `<pre><code class="solidity">${this.escapeHtml(pocCode)}</code></pre>`;
            
            // تحديث syntax highlighting
            if (window.hljs) {
                hljs.highlightAll();
            }
            
            this.showNotification('✅ تم توليد كود PoC بنجاح', 'success');
        }
    },
    
    // نسخ PoC
    copyPOC: function() {
        const code = document.querySelector('#pocCode code')?.innerText;
        if (code) {
            navigator.clipboard.writeText(code);
            this.showNotification('✅ تم نسخ كود PoC بنجاح', 'success');
        }
    },
    
    // حفظ PoC
    savePOC: function() {
        const code = document.querySelector('#pocCode code')?.innerText;
        if (code) {
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ShrekPOC_${new Date().getTime()}.sol`;
            a.click();
            URL.revokeObjectURL(url);
            this.showNotification('✅ تم حفظ كود PoC بنجاح', 'success');
        }
    },
    
    // ========== وظائف مساعدة ==========
    showProgress: function() {
        const progress = document.getElementById('progress');
        const progressFill = document.getElementById('progressFill');
        const status = document.getElementById('status');
        
        if (progress) progress.classList.remove('hidden');
        if (progressFill) progressFill.style.width = '0%';
        if (status) status.innerHTML = 'جاري التحضير...';
        
        // محاكاة التقدم
        this.progressInterval = setInterval(() => {
            const fill = document.getElementById('progressFill');
            if (fill) {
                const current = parseInt(fill.style.width) || 0;
                if (current < 90) {
                    fill.style.width = `${current + 5}%`;
                }
            }
        }, 300);
    },
    
    hideProgress: function() {
        clearInterval(this.progressInterval);
        
        const progress = document.getElementById('progress');
        const progressFill = document.getElementById('progressFill');
        
        if (progressFill) progressFill.style.width = '100%';
        
        setTimeout(() => {
            if (progress) progress.classList.add('hidden');
            if (progressFill) progressFill.style.width = '0%';
        }, 500);
    },
    
    updateScanUI: function(isScanning) {
        const scanBtn = document.getElementById('startScanBtn');
        if (scanBtn) {
            scanBtn.disabled = isScanning;
            scanBtn.innerHTML = isScanning ? 
                '<i class="fas fa-spinner fa-spin"></i> جاري الفحص...' : 
                '<i class="fas fa-play"></i> بدء الفحص';
        }
    },
    
    showNotification: function(message, type = 'info') {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            ${document.dir === 'rtl' ? 'left' : 'right'}: 20px;
            padding: 1rem 2rem;
            border-radius: 12px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        let icon = '';
        switch(type) {
            case 'success': icon = '✅'; break;
            case 'error': icon = '❌'; break;
            case 'warning': icon = '⚠️'; break;
            default: icon = 'ℹ️';
        }
        
        notification.innerHTML = `${icon} ${message}`;
        document.body.appendChild(notification);
        
        // إزالة الإشعار بعد 3 ثوان
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    updateStats: function() {
        const stats = this.githubAnalyzer?.getStats() || {
            totalScans: 0,
            totalFiles: 0,
            totalVulnerabilities: 0,
            totalLibraries: 0
        };
        
        const elements = {
            totalScans: document.getElementById('totalScans'),
            totalFiles: document.getElementById('totalFiles'),
            totalVulns: document.getElementById('totalVulns'),
            totalLibs: document.getElementById('totalLibs')
        };
        
        if (elements.totalScans) elements.totalScans.textContent = stats.totalScans;
        if (elements.totalFiles) elements.totalFiles.textContent = stats.totalFiles;
        if (elements.totalVulns) elements.totalVulns.textContent = stats.totalVulnerabilities;
        if (elements.totalLibs) elements.totalLibs.textContent = this.currentResults?.libraries?.length || 0;
    },
    
    loadDefaultContracts: function() {
        // تحميل عقد افتراضي
        const contractCode = document.getElementById('contractCode');
        if (contractCode && !contractCode.innerHTML.includes('VulnerableBank')) {
            contractCode.innerHTML = `<pre><code class="solidity">${this.escapeHtml(ShrekVulnerabilityDB.patterns.reentrancy.vulnerableContract)}</code></pre>`;
        }
        
        // تحميل هجوم افتراضي
        const attackCode = document.getElementById('attackCode');
        if (attackCode && !attackCode.innerHTML.includes('AttackReentrancy')) {
            attackCode.innerHTML = `<pre><code class="solidity">${this.escapeHtml(ShrekVulnerabilityDB.patterns.reentrancy.attackContract)}</code></pre>`;
        }
    },
    
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ========== توليد PoC لثغرة محددة ==========
window.generatePOCForVuln = function(vuln) {
    // تعيين نوع الثغرة
    const select = document.getElementById('vulnType');
    if (select) select.value = vuln.type;
    
    // تعيين معلومات الهدف
    const targetAddress = document.getElementById('targetAddress');
    if (targetAddress) targetAddress.value = vuln.location?.address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    
    const targetName = document.getElementById('targetName');
    if (targetName) targetName.value = vuln.location?.file?.split('/').pop().replace('.sol', '') || 'VictimContract';
    
    // توليد PoC
    ShrekApp.generatePOC();
    
    // التمرير إلى قسم PoC
    const pocSection = document.getElementById('poc');
    if (pocSection) pocSection.scrollIntoView({ behavior: 'smooth' });
};

// ========== عرض الإصلاح ==========
window.showFix = function(vulnType) {
    const fix = ShrekVulnerabilityDB.patterns[vulnType]?.fix || '// الإصلاح غير متاح';
    
    // إنشاء نافذة منبثقة
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: #0f172a;
        border-radius: 16px;
        padding: 2rem;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid #334155;
        position: relative;
    `;
    
    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="display:flex; align-items:center; gap:10px;">
                <i class="fas fa-wrench" style="color:#10b981;"></i>
                الإصلاح المقترح
            </h3>
            <button onclick="this.closest('.modal').remove()" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:1.5rem;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <pre style="background:#020617; padding:1.5rem; border-radius:8px; overflow-x:auto;"><code style="color:#e2e8f0; font-family:monospace;">${ShrekApp.escapeHtml(fix)}</code></pre>
        <div style="display:flex; justify-content:flex-end; margin-top:1.5rem;">
            <button onclick="this.closest('.modal').remove()" class="btn-primary">حسناً</button>
        </div>
    `;
    
    modal.className = 'modal';
    modal.appendChild(content);
    document.body.appendChild(modal);
};

// ========== تهيئة التطبيق ==========
document.addEventListener('DOMContentLoaded', function() {
    window.ShrekApp = ShrekApp;
    ShrekApp.init();
    
    // إضافة أنماط الحركة
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .vulnerability-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        }
        
        .modal {
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    
    document.head.appendChild(style);
});
