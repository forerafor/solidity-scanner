// ===== github-analyzer.js =====
// محلل مشاريع GitHub

class GitHubAnalyzer {
    constructor() {
        this.apiBase = 'https://api.github.com';
        this.results = null;
    }
    
    async scanRepository(url) {
        // استخراج معلومات المستودع
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error('رابط GitHub غير صالح');
        
        const [, owner, repo] = match;
        
        // محاكاة الفحص (في التطبيق الحقيقي نستخدم GitHub API)
        return new Promise((resolve) => {
            setTimeout(() => {
                const results = {
                    repo: `${owner}/${repo}`,
                    files: Math.floor(Math.random() * 30) + 20,
                    libraries: ['OpenZeppelin', 'Chainlink', 'Uniswap'],
                    vulnerabilities: this.generateVulnerabilities(),
                    timestamp: new Date().toISOString()
                };
                
                this.results = results;
                resolve(results);
            }, 3000);
        });
    }
    
    generateVulnerabilities() {
        const types = ['reentrancy', 'overflow', 'txorigin', 'frontrun', 'dos'];
        const count = Math.floor(Math.random() * 3);
        const vulns = [];
        
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            vulns.push({
                ...VulnerabilityDB[type],
                type: type
            });
        }
        
        return vulns;
    }
}

// دالة بدء الفحص
async function startScan() {
    const url = document.getElementById('githubUrl').value;
    if (!url) {
        alert('❌ الرجاء إدخال رابط GitHub');
        return;
    }
    
    // إظهار شريط التقدم
    document.getElementById('progress').classList.remove('hidden');
    document.getElementById('progressFill').style.width = '0%';
    
    const analyzer = new GitHubAnalyzer();
    
    try {
        const results = await analyzer.scanRepository(url);
        displayResults(results);
    } catch (error) {
        alert('❌ خطأ في الفحص: ' + error.message);
    } finally {
        document.getElementById('progress').classList.add('hidden');
    }
}

// عرض النتائج
function displayResults(results) {
    const container = document.getElementById('resultsContainer');
    const resultsSection = document.getElementById('results');
    
    let html = `
        <div class="results-header">
            <h3><i class="fab fa-github"></i> ${results.repo}</h3>
            <span>${new Date(results.timestamp).toLocaleString('ar-EG')}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3,1fr); gap:1rem; margin-bottom:2rem;">
            <div class="stat-card">
                <i class="fas fa-file-code"></i>
                <h4>${results.files}</h4>
                <p>ملف Solidity</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-book"></i>
                <h4>${results.libraries.length}</h4>
                <p>مكتبة</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-bug"></i>
                <h4>${results.vulnerabilities.length}</h4>
                <p>ثغرة</p>
            </div>
        </div>
    `;
    
    if (results.vulnerabilities.length > 0) {
        html += '<h3 style="margin-bottom:1rem;"><i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> الثغرات المكتشفة</h3>';
        
        results.vulnerabilities.forEach(v => {
            html += `
                <div class="vulnerability-card ${v.severity}">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <h4 style="color:${v.severity === 'critical' ? '#ef4444' : '#f59e0b'}">
                                ⚠️ ${v.name}
                            </h4>
                            <p style="margin:0.5rem 0; color:#94a3b8;">${v.description}</p>
                            <button onclick='generatePOCForVuln(${JSON.stringify(v)})' 
                                    class="btn-primary" style="margin-top:1rem;">
                                <i class="fas fa-code"></i> توليد PoC
                            </button>
                        </div>
                        <span style="background:${v.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}; 
                                     color:${v.severity === 'critical' ? '#ef4444' : '#f59e0b'}; 
                                     padding:0.3rem 1rem; border-radius:20px;">
                            ${v.severity === 'critical' ? 'حرجة' : 'تحذير'}
                        </span>
                    </div>
                </div>
            `;
        });
    } else {
        html += `
            <div style="background:rgba(16,185,129,0.1); border-right:4px solid #10b981; padding:2rem; border-radius:12px;">
                <i class="fas fa-check-circle" style="color:#10b981; font-size:2rem; margin-bottom:1rem;"></i>
                <h4 style="color:#10b981;">لا توجد ثغرات مكتشفة</h4>
                <p style="color:#94a3b8;">المشروع يبدو آمناً. يوصى بمراجعة دورية.</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
    resultsSection.classList.remove('hidden');
}

// توليد PoC لثغرة محددة
function generatePOCForVuln(vuln) {
    document.getElementById('vulnType').value = vuln.type;
    generatePOC();
    
    // التمرير إلى قسم PoC
    document.getElementById('poc').scrollIntoView({ behavior: 'smooth' });
}

// مسح النتائج
function clearResults() {
    document.getElementById('resultsContainer').innerHTML = '';
    document.getElementById('results').classList.add('hidden');
}
