// ============================================
// 🔬 GitHub Real Scanner v1.0
// يتصل بـ GitHub API ويحلل الملفات الفعلية
// ============================================

class GitHubRealScanner {
    constructor() {
        this.apiBase = 'https://api.github.com';
        this.cache = new Map(); // تخزين مؤقت للنتائج
        this.requestCount = 0;
        this.lastRequestTime = 0;
        
        // يمكنك إضافة توكن GitHub لزيادة الحد المسموح
        this.token = localStorage.getItem('github_token') || null;
    }

    // ========== تحليل رابط GitHub ==========
    parseGitHubUrl(url) {
        try {
            // أنماط مختلفة للروابط
            const patterns = [
                /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?(?:\/(.+))?/,
                /github\.com\/([^\/]+)\/([^\/]+)\.git/,
                /github\.com\/([^\/]+)\/([^\/]+)/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return {
                        owner: match[1],
                        repo: match[2].replace('.git', ''),
                        branch: match[3] || 'main',
                        path: match[4] || ''
                    };
                }
            }
            return null;
        } catch (e) {
            console.error('URL parsing error:', e);
            return null;
        }
    }

    // ========== جلب محتويات المستودع ==========
    async fetchRepoContents(owner, repo, path = '', branch = 'main') {
        const url = `${this.apiBase}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }

        // تجاوز حد الطلبات (Rate Limiting)
        await this.rateLimit();

        const response = await fetch(url, { headers });
        
        if (response.status === 403) {
            throw new Error('GitHub API rate limit exceeded. Add a token or try again later.');
        }
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        this.requestCount++;
        return await response.json();
    }

    // ========== تجاوز حد الطلبات ==========
    async rateLimit() {
        const now = Date.now();
        if (now - this.lastRequestTime < 100) { // 10 طلبات في الثانية
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.lastRequestTime = Date.now();
    }

    // ========== جلب محتوى ملف ==========
    async fetchFileContent(downloadUrl) {
        const response = await fetch(downloadUrl);
        return await response.text();
    }

    // ========== البحث عن ملفات Solidity ==========
    async findSolidityFiles(owner, repo, branch = 'main') {
        const solidityFiles = [];
        const queue = [''];

        while (queue.length > 0) {
            const currentPath = queue.shift();
            
            try {
                const contents = await this.fetchRepoContents(owner, repo, currentPath, branch);
                
                for (const item of contents) {
                    if (item.type === 'dir') {
                        queue.push(item.path);
                    } else if (item.type === 'file' && item.name.endsWith('.sol')) {
                        solidityFiles.push({
                            name: item.name,
                            path: item.path,
                            url: item.download_url,
                            size: item.size,
                            sha: item.sha
                        });
                    }
                }
            } catch (e) {
                console.error(`Error fetching ${currentPath}:`, e);
            }

            // تحديث واجهة المستخدم
            if (window.ScanUI) {
                window.ScanUI.updateProgress({
                    filesFound: solidityFiles.length,
                    currentPath: currentPath || 'root'
                });
            }
        }

        return solidityFiles;
    }

    // ========== تحليل ملف Solidity ==========
    analyzeSolidityCode(code, fileName) {
        const findings = [];

        // 1. البحث عن ثغرة Reentrancy
        const reentrancyPattern = /\.call\{value:.*?\}\(.*?\)[\s\S]*?-\s*=/g;
        const reentrancyMatches = code.match(reentrancyPattern);
        
        if (reentrancyMatches) {
            // التحقق من عدم وجود ReentrancyGuard
            if (!code.includes('nonReentrant') && !code.includes('ReentrancyGuard')) {
                findings.push({
                    type: 'reentrancy',
                    name: 'Reentrancy Attack',
                    severity: 'critical',
                    confidence: 92,
                    file: fileName,
                    line: this.findLineNumber(code, reentrancyMatches[0]),
                    code: reentrancyMatches[0].substring(0, 200),
                    description: 'External call before state update'
                });
            }
        }

        // 2. البحث عن ثغرة Tx.Origin
        if (code.includes('tx.origin')) {
            const txOriginLines = code.split('\n')
                .filter(line => line.includes('tx.origin'))
                .map(line => line.trim());
            
            if (txOriginLines.length > 0) {
                findings.push({
                    type: 'txorigin',
                    name: 'Tx.Origin Authentication',
                    severity: 'high',
                    confidence: 85,
                    file: fileName,
                    line: this.findLineNumber(code, 'tx.origin'),
                    code: txOriginLines[0],
                    description: 'Using tx.origin for authentication'
                });
            }
        }

        // 3. البحث عن عمليات حسابية غير آمنة
        const pragmaMatch = code.match(/pragma\s+solidity\s+([^;]+);/);
        if (pragmaMatch) {
            const version = pragmaMatch[1];
            if (version.includes('0.7') || version.includes('0.6') || version.includes('0.5')) {
                if (!code.includes('SafeMath')) {
                    findings.push({
                        type: 'overflow',
                        name: 'Arithmetic Overflow',
                        severity: 'medium',
                        confidence: 78,
                        file: fileName,
                        line: 1,
                        code: pragmaMatch[0],
                        description: `Unsafe arithmetic in Solidity ${version}`
                    });
                }
            }
        }

        // 4. البحث عن delegatecall غير آمن
        if (code.includes('delegatecall')) {
            const delegateLines = code.split('\n')
                .filter(line => line.includes('delegatecall'))
                .map(line => line.trim());
            
            if (delegateLines.length > 0 && !code.includes('onlyOwner')) {
                findings.push({
                    type: 'delegatecall',
                    name: 'Unsafe Delegatecall',
                    severity: 'critical',
                    confidence: 88,
                    file: fileName,
                    line: this.findLineNumber(code, 'delegatecall'),
                    code: delegateLines[0],
                    description: 'Delegatecall without proper access control'
                });
            }
        }

        return findings;
    }

    // ========== إيجاد رقم السطر ==========
    findLineNumber(code, searchString) {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchString)) {
                return i + 1;
            }
        }
        return 0;
    }

    // ========== الفحص الرئيسي ==========
    async scanRepository(url) {
        const startTime = Date.now();
        
        // 1. تحليل الرابط
        const repoInfo = this.parseGitHubUrl(url);
        if (!repoInfo) {
            throw new Error('❌ رابط GitHub غير صالح');
        }

        // 2. البحث عن ملفات Solidity
        const solidityFiles = await this.findSolidityFiles(
            repoInfo.owner,
            repoInfo.repo,
            repoInfo.branch
        );

        // 3. تحليل كل ملف
        const results = {
            metadata: {
                repository: `${repoInfo.owner}/${repoInfo.repo}`,
                branch: repoInfo.branch,
                url: url,
                scanTime: 0,
                timestamp: new Date().toISOString(),
                filesScanned: solidityFiles.length
            },
            files: [],
            vulnerabilities: [],
            libraries: [],
            summary: {
                totalFiles: solidityFiles.length,
                vulnerableFiles: 0,
                criticalCount: 0,
                highCount: 0,
                mediumCount: 0,
                lowCount: 0
            }
        };

        // 4. تحليل كل ملف
        for (const file of solidityFiles) {
            try {
                const content = await this.fetchFileContent(file.url);
                
                // تحليل المحتوى
                const findings = this.analyzeSolidityCode(content, file.path);
                
                results.files.push({
                    ...file,
                    analyzed: true,
                    findings: findings.length
                });

                // إضافة الثغرات
                findings.forEach(finding => {
                    results.vulnerabilities.push(finding);
                    
                    if (finding.severity === 'critical') results.summary.criticalCount++;
                    if (finding.severity === 'high') results.summary.highCount++;
                    if (finding.severity === 'medium') results.summary.mediumCount++;
                    if (finding.severity === 'low') results.summary.lowCount++;
                });

                if (findings.length > 0) {
                    results.summary.vulnerableFiles++;
                }

            } catch (e) {
                console.error(`Error analyzing ${file.path}:`, e);
            }

            // تحديث واجهة المستخدم
            if (window.ScanUI) {
                window.ScanUI.updateFileProgress(file.name);
            }
        }

        results.metadata.scanTime = Date.now() - startTime;
        
        return results;
    }

    // ========== تعيين GitHub Token ==========
    setToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }

    // ========== مسح التوكن ==========
    clearToken() {
        this.token = null;
        localStorage.removeItem('github_token');
    }
}

// تصدير للاستخدام
window.GitHubRealScanner = GitHubRealScanner;
