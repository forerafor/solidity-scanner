// ============================================
// 🖥️ Scan UI - واجهة الفحص الحقيقي
// ============================================

const ScanUI = {
    scanner: null,
    isScanning: false,
    
    init() {
        this.scanner = new GitHubRealScanner();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        document.getElementById('scanBtn').onclick = () => this.startScan();
        document.getElementById('clearBtn').onclick = () => this.clearResults();
        
        const urlInput = document.getElementById('githubUrl');
        urlInput.onkeypress = (e) => {
            if (e.key === 'Enter') this.startScan();
        };
    },
    
    async startScan() {
        const url = document.getElementById('githubUrl').value.trim();
        
        if (!url) {
            this.showNotification('❌ الرجاء إدخال رابط GitHub', 'error');
            return;
        }
        
        if (!url.includes('github.com')) {
            this.showNotification('❌ الرجاء إدخال رابط GitHub صحيح', 'error');
            return;
        }
        
        if (this.isScanning) {
            this.showNotification('⚠️ فحص قيد التنفيذ...', 'warning');
            return;
        }
        
        this.isScanning = true;
        this.showProgress();
        
        try {
            const results = await this.scanner.scanRepository(url);
            this.displayResults(results);
            this.showNotification(`✅ تم فحص ${results.metadata.filesScanned} ملف`, 'success');
        } catch (error) {
            console.error('Scan error:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        } finally {
            this.isScanning = false;
            this.hideProgress();
        }
    },
    
    showProgress() {
        const progress = document.getElementById('progressScreen');
        progress.classList.add('visible');
        
        // إعادة ضبط المؤشرات
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressPercent').innerText = '0';
        document.getElementById('statFiles').innerText = '0';
        document.getElementById('currentFileName').innerText = 'جاري الاتصال بـ GitHub...';
        
        this.clearLog();
        this.addLog('🔍 بدء فحص GitHub...', 'info');
    },
    
    updateProgress(data) {
        const percent = Math.min((data.filesFound / 50) * 100, 90);
        document.getElementById('progressBar').style.width = `${percent}%`;
        document.getElementById('progressPercent').innerText = Math.round(percent);
        document.getElementById('statFiles').innerText = data.filesFound || 0;
        
        if (data.currentPath) {
            document.getElementById('currentFileName').innerText = 
                data.currentPath === 'root' ? 'جاري فحص المجلدات...' : data.currentPath;
        }
    },
    
    updateFileProgress(fileName) {
        this.addLog(`📄 تحليل: ${fileName}`, 'info');
    },
    
    addLog(message, type = 'info') {
        const logBox = document.getElementById('logBox');
        const now = new Date();
        const time = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        let icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : '•';
        
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `<span class="log-time">${time}</span> <span>${icon} ${message}</span>`;
        
        logBox.appendChild(entry);
        logBox.scrollTop = logBox.scrollHeight;
    },
    
    clearLog() {
        document.getElementById('logBox').innerHTML = '';
    },
    
    hideProgress() {
        setTimeout(() => {
            document.getElementById('progressScreen').classList.remove('visible');
        }, 500);
    },
    
    displayResults(results) {
        const resultsBox = document.getElementById('resultsBox');
        const resultsContent = document.getElementById('resultsContent');
        
        resultsBox.classList.add('visible');
        
        // بناء HTML النتائج
        let html = `
            <div class="repo-header">
                <div class="repo-title">
                    <i class="fab fa-github"></i>
                    <h2>${results.metadata.repository}</h2>
                </div>
                <div class="scan-badge">
                    <i class="fas fa-check-circle"></i>
                    ${results.metadata.filesScanned} ملف - ${results.metadata.scanTime}ms
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <i class="fas fa-file-code"></i>
                    <div class="stat-number">${results.summary.totalFiles}</div>
                    <div class="stat-label">ملف Solidity</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-bug"></i>
                    <div class="stat-number">${results.vulnerabilities.length}</div>
                    <div class="stat-label">ثغرة</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="stat-number">${results.summary.criticalCount}</div>
                    <div class="stat-label">حرجة</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-shield"></i>
                    <div class="stat-number">${results.summary.vulnerableFiles}</div>
                    <div class="stat-label">ملفات مصابة</div>
                </div>
            </div>
        `;

        // عرض الثغرات
        if (results.vulnerabilities.length === 0) {
            html += `
                <div style="background: rgba(16,185,129,0.1); border-right: 6px solid #10b981; padding: 30px; border-radius: 12px; text-align: center;">
                    <i class="fas fa-shield-check" style="font-size: 3rem; color: #10b981; margin-bottom: 15px;"></i>
                    <h3 style="color: #10b981;">🎉 لا توجد ثغرات!</h3>
                    <p style="color: #94a3b8;">المشروع يبدو آمناً. استمر في المراجعة.</p>
                </div>
            `;
        } else {
            results.vulnerabilities.forEach((v, i) => {
                const severityColor = v.severity === 'critical' ? '#ef4444' : 
                                     v.severity === 'high' ? '#f59e0b' : '#3b82f6';
                
                html += `
                    <div class="vuln-card" style="border-right-color: ${severityColor}; margin-top: ${i === 0 ? '20px' : '0'};">
                        <div class="vuln-header">
                            <div class="vuln-title">
                                <i class="fas fa-bug" style="color: ${severityColor};"></i>
                                <h3 style="color: ${severityColor};">${v.name}</h3>
                            </div>
                            <span class="severity-badge" style="background: ${severityColor}20; color: ${severityColor};">
                                ${v.severity.toUpperCase()}
                            </span>
                        </div>
                        
                        <p style="color: #e2e8f0; margin-bottom: 15px;">
                            ${v.description}
                        </p>
                        
                        <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                            <span style="background: #1e293b; padding: 5px 15px; border-radius: 20px; font-size: 0.85rem;">
                                <i class="fas fa-file-code"></i> ${v.file}
                            </span>
                            <span style="background: rgba(99,102,241,0.2); color: #6366f1; padding: 5px 15px; border-radius: 20px; font-size: 0.85rem;">
                                <i class="fas fa-check-circle"></i> سطر ${v.line}
                            </span>
                            <span style="background: ${severityColor}20; color: ${severityColor}; padding: 5px 15px; border-radius: 20px; font-size: 0.85rem;">
                                <i class="fas fa-chart-line"></i> ثقة ${v.confidence}%
                            </span>
                        </div>
                        
                        <div class="code-block">
                            <pre><code class="solidity">${this.escapeHtml(v.code)}</code></pre>
                        </div>
                    </div>
                `;
            });
        }

        // قائمة الملفات
        html += `
            <div style="margin-top: 30px; background: #0f172a; padding: 20px; border-radius: 12px;">
                <h4 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <i class="fas fa-list"></i>
                    الملفات التي تم فحصها (${results.files.length})
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto;">
                    ${results.files.map(f => `
                        <div style="background: #1e293b; padding: 10px 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-file-code" style="color: ${f.findings > 0 ? '#ef4444' : '#10b981'};"></i>
                            <span style="flex: 1; font-size: 0.85rem; font-family: monospace;">${f.path}</span>
                            ${f.findings > 0 ? `<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">${f.findings}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        resultsContent.innerHTML = html;
        
        // تحديث syntax highlighting
        if (window.hljs) {
            document.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    showNotification(message, type) {
        // يمكن إضافة إشعارات هنا
        alert(message);
    },
    
    clearResults() {
        document.getElementById('resultsBox').classList.remove('visible');
        document.getElementById('progressScreen').classList.remove('visible');
        this.scanner = new GitHubRealScanner();
    }
};

// تصدير للاستخدام
window.ScanUI = ScanUI;
