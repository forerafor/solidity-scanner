// فاحص عقود Solidity - يعمل كلياً في المتصفح
class SolidityScanner {
    constructor() {
        this.vulnerabilities = {
            // قواعد الكشف عن الثغرات
            reentrancy: [
                { pattern: /\.call\{value:.*\}/g, desc: 'استخدام call مع value قد يؤدي إلى هجوم إعادة الدخول' },
                { pattern: /\.send\(|\.transfer\(/g, desc: 'استخدام send/transfer غير آمن، استخدم call بدلاً منه' }
            ],
            overflow: [
                { pattern: /unchecked\s*\{.*\}/g, desc: 'عمليات حسابية بدون فحص (unchecked) قد تؤدي لـ overflow' },
                { pattern: /\+\+|--/g, desc: 'زيادة/نقصان مباشر بدون فحص' }
            ],
            access: [
                { pattern: /public\s+(mapping|address)/g, desc: 'بيانات حساسة ظاهرة للعموم (public)' },
                { pattern: /onlyOwner/g, desc: 'تحقق من صلاحية onlyOwner' }
            ]
        };
    }
    
    // الفحص الأساسي في المتصفح
    async quickScan(code) {
        const results = {
            critical: [],
            warnings: [],
            info: [],
            score: 100
        };
        
        // كشف الثغرات باستخدام الأنماط
        for (const [type, patterns] of Object.entries(this.vulnerabilities)) {
            patterns.forEach(({ pattern, desc }) => {
                const matches = code.match(pattern);
                if (matches) {
                    const issue = {
                        type: type,
                        description: desc,
                        count: matches.length,
                        severity: this.getSeverity(type)
                    };
                    
                    if (issue.severity === 'critical') {
                        results.critical.push(issue);
                        results.score -= 15;
                    } else if (issue.severity === 'warning') {
                        results.warnings.push(issue);
                        results.score -= 5;
                    } else {
                        results.info.push(issue);
                        results.score -= 1;
                    }
                }
            });
        }
        
        // فحوصات إضافية
        this.checkBasicIssues(code, results);
        
        return results;
    }
    
    // استخدام واجهات برمجية خارجية (APIs)
    async scanWithAI(code) {
        showLoading(true);
        
        try {
            // استخدام عدة مصادر مجانية معاً
            const allResults = await Promise.allSettled([
                this.useSolidityPatterns(code),
                this.checkWithWeb3Tools(code),
                this.analyzeWithAI(code)
            ]);
            
            return this.mergeResults(allResults);
        } catch (error) {
            console.error('خطأ في الفحص:', error);
            return await this.quickScan(code); // الرجوع للفحص المحلي
        } finally {
            showLoading(false);
        }
    }
    
    // استخدام أدوات ويب مجانية
    async useSolidityPatterns(code) {
        // هنا يمكنك إضافة اتصال بأدوات خارجية
        // مثلاً: SolidityScan API أو أدوات مفتوحة المصدر
        return { source: 'patterns', issues: [] };
    }
    
    // دمج النتائج
    mergeResults(results) {
        const final = {
            critical: [],
            warnings: [],
            info: [],
            sources: []
        };
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                final.sources.push(result.value.source || `المصدر ${index + 1}`);
                // دمج القوائم...
            }
        });
        
        return final;
    }
    
    getSeverity(type) {
        const severityMap = {
            reentrancy: 'critical',
            overflow: 'critical',
            access: 'warning'
        };
        return severityMap[type] || 'info';
    }
    
    checkBasicIssues(code, results) {
        // فحوصات أساسية
        if (!code.includes('pragma solidity')) {
            results.warnings.push({
                type: 'syntax',
                description: 'البيان pragma solidity مفقود',
                severity: 'warning'
            });
        }
        
        if (code.includes('block.timestamp')) {
            results.info.push({
                type: 'timestamp',
                description: 'استخدام block.timestamp قد يكون غير آمن',
                severity: 'info'
            });
        }
    }
}

// إنشاء نسخة من الماسح
const scanner = new SolidityScanner();

// وظائف واجهة المستخدم
function scanWithAI() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) {
        alert('⚠️ الرجاء إدخال كود العقد أولاً');
        return;
    }
    
    scanner.scanWithAI(code).then(displayResults);
}

function quickScan() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) {
        alert('⚠️ الرجاء إدخال كود العقد أولاً');
        return;
    }
    
    scanner.quickScan(code).then(displayResults);
}

function displayResults(data) {
    const resultDiv = document.getElementById('resultsContent');
    const container = document.getElementById('result');
    
    let html = `<h4>🎯 درجة الأمان: ${data.score}/100</h4>`;
    
    if (data.critical && data.critical.length > 0) {
        html += `<h4 class="critical">🔴 مشاكل حرجة (${data.critical.length})</h4>`;
        data.critical.forEach(issue => {
            html += `<p>• ${issue.description} (${issue.count} مرة)</p>`;
        });
    }
    
    if (data.warnings && data.warnings.length > 0) {
        html += `<h4 class="warning">🟡 تحذيرات (${data.warnings.length})</h4>`;
        data.warnings.forEach(issue => {
            html += `<p>• ${issue.description}</p>`;
        });
    }
    
    if (data.info && data.info.length > 0) {
        html += `<h4 class="info">🟢 ملاحظات (${data.info.length})</h4>`;
        data.info.forEach(issue => {
            html += `<p>• ${issue.description}</p>`;
        });
    }
    
    if (data.sources && data.sources.length > 0) {
        html += `<p><small>🔧 مصادر الفحص: ${data.sources.join(', ')}</small></p>`;
    }
    
    if (data.critical.length === 0 && data.warnings.length === 0) {
        html += `<h4 style="color:#34d399">✅ العقد آمن بشكل أساسي</h4>`;
        html += `<p>ننصح بمراجعة يدوية إضافية للتأكد من الأمان الكامل.</p>`;
    }
    
    resultDiv.innerHTML = html;
    container.style.display = 'block';
    
    // التمرير للنتائج
    container.scrollIntoView({ behavior: 'smooth' });
}

function clearCode() {
    document.getElementById('codeInput').value = '';
    document.getElementById('result').style.display = 'none';
}

function loadExample(type) {
    const examples = {
        token: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleToken {
    mapping(address => uint256) public balanceOf;
    string public name = "Simple Token";
    
    function transfer(address to, uint256 amount) public {
        require(balanceOf[msg.sender] >= amount, "رصيد غير كافي");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }
}`,
        
        bank: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleBank {
    mapping(address => uint256) public balances;
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "رصيد غير كافي");
        payable(msg.sender).transfer(amount);
        balances[msg.sender] -= amount;
    }
}`,
        
        staking: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStaking {
    mapping(address => uint256) public stakes;
    uint256 public totalStaked;
    
    function stake() public payable {
        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;
    }
    
    function unstake(uint256 amount) public {
        require(stakes[msg.sender] >= amount, "لا يوجد رصيد كافي");
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
        payable(msg.sender).transfer(amount);
    }
}`
    };
    
    document.getElementById('codeInput').value = examples[type] || examples.token;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// إظهار رسالة ترحيب
window.onload = function() {
    console.log('🔍 فاحص Solidity جاهز للاستخدام!');
    console.log('👨‍💻 المطور: أنت');
    console.log('🌐 يعمل بالكامل في المتصفح');
};
