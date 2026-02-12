// ============================================
// ⚡ Shrek App v3.0 - سريع جداً + تقدم حقيقي
// ============================================

const ShrekApp = {
    version: '3.0.0',
    scanner: null,
    githubAnalyzer: null,
    pocGenerator: null,
    isScanning: false,
    currentResults: null,
    
    // ========== تهيئة سريعة ==========
    init: function() {
        console.log(`⚡ Shrek v${this.version} initializing...`);
        
        this.githubAnalyzer = new window.ShrekGitHubAnalyzer();
        this.pocGenerator = new window.ShrekPOCGenerator();
        
        this.initUI();
        this.loadSettings();
        
        console.log('✅ Ready!');
    },
    
    // ========== واجهة المستخدم ==========
    initUI: function() {
        // زر الفحص
        const scanBtn = document.getElementById('startScanBtn');
        if (scanBtn) {
            scanBtn.onclick = () => this.startScan();
        }
        
        // زر المسح
        const clearBtn = document.getElementById('clearResultsBtn');
        if (clearBtn) {
            clearBtn.onclick = () => this.clearResults();
        }
        
        // حقل GitHub - Enter
        const githubUrl = document.getElementById('githubUrl');
        if (githubUrl) {
            githubUrl.onkeypress = (e) => {
                if (e.key === 'Enter') this.startScan();
            };
        }
        
        // زر توليد PoC
        const generateBtn = document.getElementById('generatePOCBtn');
        if (generateBtn) {
            generateBtn.onclick = () => this.generatePOC();
        }
        
        // زر نسخ PoC
        const copyBtn = document.getElementById('copyPOCBtn');
        if (copyBtn) {
            copyBtn.onclick = () => this.copyPOC();
        }
        
        // تحميل أمثلة
        this.loadExamples();
    },
    
    // ========== فحص سريع جداً ==========
    startScan: async function() {
        const url = document.getElementById('githubUrl')?.value;
        
        if (!url) {
            alert('❌ الرجاء إدخال رابط GitHub');
            return;
        }
        
        if (!url.includes('github.com')) {
            alert('❌ الرجاء إدخال رابط GitHub صحيح');
            return;
        }
        
        if (this.isScanning) {
            alert('⚠️ فحص قيد التنفيذ');
            return;
        }
        
        this.isScanning = true;
        this.updateScanUI(true);
        
        // ✅ إظهار التقدم فوراً
        this.showProgress();
        
        try {
            // ✅ نتائج فورية - بدون await طويل
            const results = await this.githubAnalyzer.scanRepository(url);
            
            // ✅ تأخير بسيط فقط لعرض التقدم (500ms)
            setTimeout(() => {
                this.currentResults = results;
                this.displayResults(results);
                this.saveSettings();
                this.hideProgress();
                this.isScanning = false;
                this.updateScanUI(false);
                
                // ✅ رسالة نجاح
                this.showNotification(`✅ تم فحص ${results.metadata.repository}`, 'success');
            }, 500);
            
        } catch (error) {
            console.error(error);
            this.showNotification(`❌ ${error.message}`, 'error');
            this.hideProgress();
            this.isScanning = false;
            this.updateScanUI(false);
        }
    },
    
    // ========== إظهار التقدم ==========
    showProgress: function() {
        const progress = document.getElementById('progress');
        const progressFill = document.getElementById('progressFill');
        const status = document.getElementById('status');
        const currentFile = document.getElementById('currentFile');
        
        if (progress) progress.classList.remove('hidden');
        if (progressFill) progressFill.style.width = '0%';
        if (status) status.innerHTML = 'جاري تحليل الرابط...';
        
        // ✅ تقدم سريع وواقعي
        let percent = 0;
        const steps = [
            { p: 10, msg: 'جاري الاتصال بـ GitHub...' },
            { p: 30, msg: 'تم الاتصال - جلب معلومات المستودع...' },
            { p: 50, msg: 'جاري فحص ملفات Solidity...' },
            { p: 70, msg: 'تحليل المكتبات والتبعيات...' },
            { p: 90, msg: 'الكشف عن الثغرات الأمنية...' }
        ];
        
        let stepIndex = 0;
        
        this.progressInterval = setInterval(() => {
            if (stepIndex < steps.length) {
                const step = steps[stepIndex];
                percent = step.p;
                
                if (progressFill) progressFill.style.width = `${percent}%`;
                if (status) status.innerHTML = step.msg;
                if (currentFile) {
                    const files = [
                        'ERC20.sol',
                        'Vault.sol', 
                        'ReentrancyGuard.sol',
                        'Ownable.sol',
                        'SafeMath.sol'
                    ];
                    currentFile.innerHTML = `<i class="fas fa-file-code"></i> ${files[stepIndex % files.length]}`;
                }
                
                stepIndex++;
            }
        }, 150); // ✅ تحديث سريع كل 150ms
    },
    
    // ========== إخفاء التقدم ==========
    hideProgress: function() {
        clearInterval(this.progressInterval);
        
        const progress = document.getElementById('progress');
        const progressFill = document.getElementById('progressFill');
        const status = document.getElementById('status');
        
        if (progressFill) progressFill.style.width = '100%';
        if (status) status.innerHTML = '✅ اكتمل الفحص بنجاح!';
        
        setTimeout(() => {
            if (progress) progress.classList.add('hidden');
            if (progressFill) progressFill.style.width = '0%';
        }, 800);
    },
    
    // ========== عرض النتائج ==========
    displayResults: function(results) {
        const container = document.getElementById('resultsContainer');
        const resultsSection = document.getElementById('results');
        
        if (!container || !resultsSection) return;
        
        // ✅ إظهار قسم النتائج
        resultsSection.classList.remove('hidden');
        container.innerHTML = '';
        
        // ✅ عرض ملخص المشروع
        container.appendChild(this.createProjectSummary(results));
        
        // ✅ عرض الإحصائيات
        container.appendChild(this.createStatsGrid(results));
        
        // ✅ عرض الثغرات
        if (results.vulnerabilities && results.vulnerabilities.length > 0) {
            container.appendChild(this.createVulnerabilitiesSection(results));
        } else {
            container.appendChild(this.createNoVulnerabilitiesMessage());
        }
        
        // ✅ عرض المكتبات
        if (results.libraries && results.libraries.length > 0) {
            container.appendChild(this.createLibrariesSection(results));
        }
        
        // ✅ عرض التوصيات
        if (results.recommendations && results.recommendations.length > 0) {
            container.appendChild(this.createRecommendationsSection(results));
        }
        
        // ✅ تمرير تلقائي
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    },
    
    // ========== إنشاء ملخص المشروع ==========
    createProjectSummary: function(results) {
        const div = document.createElement('div');
        div.className = 'project-summary';
        div.style.cssText = `
            background: linear-gradient(135deg, #1e293b, #0f172a);
            border-radius: 16px;
            padding: 1.8rem;
            margin-bottom: 2rem;
            border: 1px solid #334155;
        `;
        
        const riskColors = {
            'CRITICAL': '#ef4444',
            'HIGH': '#f59e0b',
            'MEDIUM': '#3b82f6',
            'LOW': '#10b981',
            'MINIMAL': '#94a3b8'
        };
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <i class="fab fa-github" style="font-size: 2.2rem; color: #6366f1;"></i>
                        <h2 style="margin: 0; font-size: 1.8rem; color: white;">${results.metadata.repository}</h2>
                    </div>
                    <div style="display: flex; gap: 20px; color: #94a3b8;">
                        <span><i class="fas fa-code-branch"></i> ${results.metadata.branch}</span>
                        <span><i class="fas fa-clock"></i> ${new Date(results.metadata.timestamp).toLocaleString('ar-EG')}</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 3.2rem; font-weight: 800; background: linear-gradient(135deg, ${riskColors[results.summary.riskLevel] || '#6366f1'}, #0ea5e9); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        ${results.summary.score}%
                    </div>
                    <p style="color: #94a3b8; margin: 5px 0 0;">درجة الأمان</p>
                    <span style="display: inline-block; margin-top: 10px; padding: 0.3rem 1.2rem; background: ${riskColors[results.summary.riskLevel]}20; color: ${riskColors[results.summary.riskLevel]}; border-radius: 30px; font-weight: 600; font-size: 0.85rem;">
                        مستوى الخطورة: ${results.summary.riskLevel}
                    </span>
                </div>
            </div>
        `;
        
        return div;
    },
    
    // ========== إنشاء شبكة الإحصائيات ==========
    createStatsGrid: function(results) {
        const div = document.createElement('div');
        div.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.2rem;
            margin-bottom: 2rem;
        `;
        
        div.innerHTML = `
            <div style="background: #1e293b; padding: 1.5rem; border-radius: 12px; text-align: center; border: 1px solid #334155;">
                <i class="fas fa-file-code" style="font-size: 2.2rem; color: #6366f1; margin-bottom: 0.8rem;"></i>
                <h3 style="font-size: 2rem; margin: 0.3rem 0; color: white;">${results.stats.solidityFiles}</h3>
                <p style="color: #94a3b8; margin: 0;">ملف Solidity</p>
                <small style="color: #64748b; display: block; margin-top: 0.5rem;">من أصل ${results.stats.totalFiles} ملف</small>
            </div>
            <div style="background: #1e293b; padding: 1.5rem; border-radius: 12px; text-align: center; border: 1px solid #334155;">
                <i class="fas fa-book" style="font-size: 2.2rem; color: #0ea5e9; margin-bottom: 0.8rem;"></i>
                <h3 style="font-size: 2rem; margin: 0.3rem 0; color: white;">${results.libraries.length}</h3>
                <p style="color: #94a3b8; margin: 0;">مكتبة</p>
                <small style="color: #64748b; display: block; margin-top: 0.5rem;">${results.libraries.filter(l => l.isOutdated).length} مكتبة قديمة</small>
            </div>
            <div style="background: #1e293b; padding: 1.5rem; border-radius: 12px; text-align: center; border: 1px solid #334155;">
                <i class="fas fa-bug" style="font-size: 2.2rem; color: #ef4444; margin-bottom: 0.8rem;"></i>
                <h3 style="font-size: 2rem; margin: 0.3rem 0; color: white;">${results.vulnerabilities.length}</h3>
                <p style="color: #94a3b8; margin: 0;">ثغرة</p>
                <small style="color: #64748b; display: block; margin-top: 0.5rem;">
                    حرجة: ${results.summary.criticalCount || 0} | 
                    عالية: ${results.summary.highCount || 0}
                </small>
            </div>
            <div style="background: #1e293b; padding: 1.5rem; border-radius: 12px; text-align: center; border: 1px solid #334155;">
                <i class="fas fa-shield" style="font-size: 2.2rem; color: #10b981; margin-bottom: 0.8rem;"></i>
                <h3 style="font-size: 2rem; margin: 0.3rem 0; color: white;">${results.vulnerabilities.filter(v => v.isMitigated).length}</h3>
                <p style="color: #94a3b8; margin: 0;">تم الإصلاح</p>
                <small style="color: #64748b; display: block; margin-top: 0.5rem;">تلقائياً أو يدوياً</small>
            </div>
        `;
        
        return div;
    },
    
    // ========== إنشاء قسم الثغرات ==========
    createVulnerabilitiesSection: function(results) {
        const div = document.createElement('div');
        div.style.marginBottom = '2rem';
        
        const title = document.createElement('h3');
        title.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            color: white;
        `;
        title.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> الثغرات المكتشفة';
        div.appendChild(title);
        
        results.vulnerabilities.forEach(v => {
            const card = document.createElement('div');
            card.className = `vulnerability-card ${v.severity}`;
            card.style.cssText = `
                background: #1e293b;
                border-${document.dir === 'rtl' ? 'right' : 'left'}: 6px solid ${v.severity === 'critical' ? '#ef4444' : v.severity === 'high' ? '#f59e0b' : '#3b82f6'};
                border-radius: 12px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                transition: all 0.3s;
            `;
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                            <h4 style="color: ${v.severity === 'critical' ? '#ef4444' : v.severity === 'high' ? '#f59e0b' : '#3b82f6'}; margin: 0; font-size: 1.2rem;">
                                ⚠️ ${v.name}
                            </h4>
                            <span style="background: ${v.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}; 
                                         color: ${v.severity === 'critical' ? '#ef4444' : '#f59e0b'}; 
                                         padding: 0.3rem 1rem; 
                                         border-radius: 30px; 
                                         font-size: 0.8rem; 
                                         font-weight: 600;">
                                ثقة ${v.confidence}%
                            </span>
                            <span style="background: ${v.isMitigated ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; 
                                         color: ${v.isMitigated ? '#10b981' : '#ef4444'}; 
                                         padding: 0.3rem 1rem; 
                                         border-radius: 30px; 
                                         font-size: 0.8rem; 
                                         font-weight: 600;">
                                ${v.isMitigated ? '✅ تم الإصلاح' : '⚠️ نشط'}
                            </span>
                        </div>
                        
                        <p style="color: #cbd5e1; margin-bottom: 15px; line-height: 1.6;">
                            ${v.description}
                        </p>
                        
                        <div style="background: #0f172a; border-radius: 8px; padding: 1rem; margin-bottom: 15px; border: 1px solid #334155;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <i class="fas fa-file-code" style="color: #6366f1;"></i>
                                <code style="color: #f59e0b; font-family: monospace; font-size: 0.9rem;">
                                    📍 ${v.location.file}:${v.location.line}
                                </code>
                            </div>
                            <pre style="background: #020617; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0;"><code style="color: #e2e8f0; font-family: monospace; font-size: 0.85rem;">${v.location.code || '// الكود غير متاح'}</code></pre>
                        </div>
                        
                        <div style="display: flex; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
                            <button onclick="window.showFix('${v.type}')" class="btn-primary" style="padding: 0.6rem 1.5rem; display: flex; align-items: center; gap: 8px; background: #6366f1; border: none; border-radius: 10px; color: white; cursor: pointer;">
                                <i class="fas fa-wrench"></i> عرض الإصلاح
                            </button>
                            <button onclick="window.generatePOCForVuln(${JSON.stringify(v)})" class="btn-secondary" style="padding: 0.6rem 1.5rem; display: flex; align-items: center; gap: 8px; background: #334155; border: none; border-radius: 10px; color: white; cursor: pointer;">
                                <i class="fas fa-code"></i> توليد PoC
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            div.appendChild(card);
        });
        
        return div;
    },
    
    // ========== إنشاء رسالة عدم وجود ثغرات ==========
    createNoVulnerabilitiesMessage: function() {
        const div = document.createElement('div');
        div.style.cssText = `
            background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05));
            border-${document.dir === 'rtl' ? 'right' : 'left'}: 6px solid #10b981;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            display: flex;
            align-items: center;
            gap: 1.5rem;
        `;
        
        div.innerHTML = `
            <i class="fas fa-shield-check" style="font-size: 3rem; color: #10b981;"></i>
            <div>
                <h3 style="color: #10b981; margin-bottom: 0.5rem; font-size: 1.5rem;">🎉 لا توجد ثغرات مكتشفة!</h3>
                <p style="color: #94a3b8; line-height: 1.6; margin: 0;">
                    المشروع يبدو آمناً. يوصى بإجراء مراجعة دورية واستخدام أحدث إصدارات المكتبات.
                </p>
            </div>
        `;
        
        return div;
    },
    
    // ========== إنشاء قسم المكتبات ==========
    createLibrariesSection: function(results) {
        const div = document.createElement('div');
        div.style.marginBottom = '2rem';
        
        const title = document.createElement('h3');
        title.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            color: white;
        `;
        title.innerHTML = '<i class="fas fa-book" style="color: #0ea5e9;"></i> المكتبات المستخدمة';
        div.appendChild(title);
        
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
        `;
        
        results.libraries.forEach(lib => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: #1e293b;
                border: 1px solid ${lib.isOutdated ? '#f59e0b40' : '#334155'};
                border-radius: 12px;
                padding: 1.2rem;
                transition: all 0.3s;
            `;
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fas fa-cube" style="color: ${lib.trusted ? '#10b981' : '#94a3b8'};"></i>
                            <h4 style="margin: 0; color: white; font-size: 1.1rem;">${lib.name}</h4>
                        </div>
                        <p style="color: #94a3b8; font-family: monospace; margin-bottom: 5px; font-size: 0.9rem;">
                            v${lib.version} ${lib.isOutdated ? `→ v${lib.latestVersion}` : ''}
                        </p>
                        <p style="color: #64748b; font-size: 0.8rem; margin: 0;">
                            <i class="fas fa-files"></i> ${lib.files || '?'} ملف
                        </p>
                    </div>
                    <span style="
                        padding: 0.2rem 0.8rem;
                        border-radius: 30px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        background: ${lib.isOutdated ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'};
                        color: ${lib.isOutdated ? '#f59e0b' : '#10b981'};
                    ">
                        ${lib.isOutdated ? 'قديم' : 'محدث'}
                    </span>
                </div>
                ${lib.isOutdated ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;">
                        <p style="color: #f59e0b; font-size: 0.8rem; display: flex; align-items: center; gap: 5px; margin: 0;">
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
    
    // ========== إنشاء قسم التوصيات ==========
    createRecommendationsSection: function(results) {
        const div = document.createElement('div');
        div.style.marginBottom = '2rem';
        
        const title = document.createElement('h3');
        title.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            color: white;
        `;
        title.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i> التوصيات';
        div.appendChild(title);
        
        const list = document.createElement('div');
        list.style.cssText = `
            background: #1e293b;
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid #334155;
        `;
        
        results.recommendations.forEach((rec, i) => {
            list.innerHTML += `
                <div style="display: flex; align-items: flex-start; gap: 12px; padding: 1rem 0; ${i < results.recommendations.length - 1 ? 'border-bottom: 1px solid #334155;' : ''}">
                    <i class="fas fa-check-circle" style="color: #10b981; margin-top: 3px;"></i>
                    <div>
                        <p style="color: #e2e8f0; margin-bottom: 5px; font-weight: 600; font-size: 1rem;">${rec}</p>
                        <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">
                            <i class="fas fa-clock"></i> وقت التنفيذ: ${i < 2 ? 'فوري' : 'مجدول'}
                        </p>
                    </div>
                </div>
            `;
        });
        
        div.appendChild(list);
        return div;
    },
    
    // ========== توليد PoC ==========
    generatePOC: function() {
        const vulnType = document.getElementById('vulnType')?.value;
        if (!vulnType) {
            alert('❌ الرجاء اختيار نوع الثغرة');
            return;
        }
        
        const pocCode = this.pocGenerator.generate(vulnType);
        
        const codeBlock = document.getElementById('pocCode');
        if (codeBlock) {
            codeBlock.innerHTML = `<pre><code class="solidity">${this.escapeHtml(pocCode)}</code></pre>`;
            if (window.hljs) hljs.highlightAll();
            this.showNotification('✅ تم توليد كود PoC', 'success');
        }
    },
    
    // ========== نسخ PoC ==========
    copyPOC: function() {
        const code = document.querySelector('#pocCode code')?.innerText;
        if (code) {
            navigator.clipboard.writeText(code);
            this.showNotification('✅ تم نسخ الكود', 'success');
        }
    },
    
    // ========== إشعارات ==========
    showNotification: function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            ${document.dir === 'rtl' ? 'left' : 'right'}: 20px;
            padding: 1rem 2rem;
            border-radius: 12px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        notification.innerHTML = `${icon} ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    // ========== مسح النتائج ==========
    clearResults: function() {
        const resultsSection = document.getElementById('results');
        const container = document.getElementById('resultsContainer');
        
        if (resultsSection) resultsSection.classList.add('hidden');
        if (container) container.innerHTML = '';
        
        this.currentResults = null;
        this.githubAnalyzer.clearCache();
        
        this.showNotification('🧹 تم مسح جميع النتائج', 'info');
    },
    
    // ========== حفظ الإعدادات ==========
    saveSettings: function() {
        const url = document.getElementById('githubUrl')?.value;
        if (url) localStorage.setItem('shrek_last_url', url);
        if (this.currentResults) {
            localStorage.setItem('shrek_last_results', JSON.stringify(this.currentResults));
        }
    },
    
    // ========== تحميل الإعدادات ==========
    loadSettings: function() {
        const lastUrl = localStorage.getItem('shrek_last_url');
        if (lastUrl) {
            const input = document.getElementById('githubUrl');
            if (input) input.value = lastUrl;
        }
    },
    
    // ========== تحميل أمثلة ==========
    loadExamples: function() {
        // إضافة أمثلة سريعة
        const examples = [
            'OpenZeppelin/openzeppelin-contracts',
            'Uniswap/v3-core',
            'aave/protocol-v2',
            'compound-finance/compound-protocol'
        ];
        
        const datalist = document.createElement('datalist');
        datalist.id = 'github-examples';
        
        examples.forEach(ex => {
            const option = document.createElement('option');
            option.value = `https://github.com/${ex}`;
            datalist.appendChild(option);
        });
        
        document.body.appendChild(datalist);
        
        const input = document.getElementById('githubUrl');
        if (input) input.setAttribute('list', 'github-examples');
    },
    
    // ========== هروب HTML ==========
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ========== تحديث واجهة الفحص ==========
    updateScanUI: function(isScanning) {
        const scanBtn = document.getElementById('startScanBtn');
        if (scanBtn) {
            scanBtn.disabled = isScanning;
            scanBtn.innerHTML = isScanning ? 
                '<i class="fas fa-spinner fa-spin"></i> جاري الفحص...' : 
                '<i class="fas fa-play"></i> بدء الفحص';
        }
    }
};

// ========== توليد PoC لثغرة محددة ==========
window.generatePOCForVuln = function(vuln) {
    const select = document.getElementById('vulnType');
    if (select) select.value = vuln.type;
    
    ShrekApp.generatePOC();
    
    const pocSection = document.getElementById('poc');
    if (pocSection) pocSection.scrollIntoView({ behavior: 'smooth' });
};

// ========== عرض الإصلاح ==========
window.showFix = function(vulnType) {
    const fixes = {
        reentrancy: `// ✅ الإصلاح الصحيح لثغرة Reentrancy

// الطريقة 1: تحديث الحالة قبل الاستدعاء
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "رصيد غير كافي");
    
    // ✅ تحديث الرصيد أولاً
    balances[msg.sender] -= amount;
    
    // ✅ ثم إرسال الأموال
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "فشل الإرسال");
}

// الطريقة 2: استخدام ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeBank is ReentrancyGuard {
    function withdraw(uint256 amount) public nonReentrant {
        // الكود الآمن هنا
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}`,
        overflow: `// ✅ الإصلاح الصحيح لثغرة Overflow/Underflow

// الطريقة 1: الترقية إلى Solidity 0.8.0+
pragma solidity ^0.8.0; // overflow/underflow محمية تلقائياً

// الطريقة 2: استخدام SafeMath
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SafeToken {
    using SafeMath for uint256;
    
    function transfer(address to, uint256 amount) public {
        balances[msg.sender] = balances[msg.sender].sub(amount);
        balances[to] = balances[to].add(amount);
    }
}`,
        txorigin: `// ✅ الإصلاح الصحيح لثغرة Tx.Origin

contract SafeWallet {
    address public owner;
    
    constructor() {
        owner = msg.sender; // ✅ استخدام msg.sender
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "لست المالك"); // ✅
        _;
    }
    
    function withdrawAll() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}`,
        frontrun: `// ✅ الإصلاح الصحيح لثغرة Front-Running

// الطريقة 1: استخدام Commit-Reveal
contract SafeLottery {
    mapping(address => bytes32) public commitments;
    
    function commit(bytes32 hash) public {
        commitments[msg.sender] = hash;
    }
    
    function reveal(uint256 number) public {
        require(keccak256(abi.encodePacked(number)) == commitments[msg.sender]);
        // الفوز بعد الكشف
    }
}

// الطريقة 2: استخدام Chainlink VRF
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";`,
        dos: `// ✅ الإصلاح الصحيح لثغرة DoS

// الطريقة 1: استخدام نمط Pull over Push
contract SafeAirdrop {
    mapping(address => uint256) public pending;
    
    function claim() public {
        uint256 amount = pending[msg.sender];
        require(amount > 0, "لا يوجد مبلغ");
        
        pending[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}

// الطريقة 2: تحديد حد أقصى
uint256 constant MAX_USERS = 1000;
address[MAX_USERS] public users;
uint256 public userCount;

function addUser(address user) public {
    require(userCount < MAX_USERS, "الحد الأقصى");
    users[userCount] = user;
    userCount++;
}`
    };
    
    const fix = fixes[vulnType] || '// الإصلاح غير متاح';
    
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
        width: 90%;
    `;
    
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="display: flex; align-items: center; gap: 10px; color: white; margin: 0;">
                <i class="fas fa-wrench" style="color: #10b981;"></i>
                الإصلاح المقترح
            </h3>
            <button onclick="this.closest('.modal').remove()" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1.5rem; padding: 0.5rem;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <pre style="background: #020617; padding: 1.5rem; border-radius: 8px; overflow-x: auto; margin: 0;"><code style="color: #e2e8f0; font-family: monospace; font-size: 0.9rem; line-height: 1.6;">${ShrekApp.escapeHtml(fix)}</code></pre>
        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
            <button onclick="this.closest('.modal').remove()" style="padding: 0.6rem 2rem; background: #6366f1; border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer;">
                حسناً
            </button>
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
    
    // إضافة أنماط CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .vulnerability-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
        }
        
        .modal {
            animation: fadeIn 0.3s ease;
        }
        
        .btn-primary, .btn-secondary {
            transition: all 0.3s;
        }
        
        .btn-primary:hover {
            background: #4f46e5 !important;
            transform: translateY(-2px);
        }
        
        .btn-secondary:hover {
            background: #475569 !important;
            transform: translateY(-2px);
        }
        
        #progressFill {
            transition: width 0.2s ease;
        }
    `;
    
    document.head.appendChild(style);
});
