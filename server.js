// ============================================
// 🚀 Solidity Scanner Backend - يعالج طلبات GitHub API
// ============================================

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ========== GitHub API Integration ==========
class GitHubService {
    constructor(token) {
        this.token = token;
        this.baseURL = 'https://api.github.com';
    }

    async getRepoContents(owner, repo, path = '') {
        const url = `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`;
        const response = await axios.get(url, {
            headers: this.token ? { 'Authorization': `token ${this.token}` } : {}
        });
        return response.data;
    }

    async getFileContent(downloadUrl) {
        const response = await axios.get(downloadUrl);
        return response.data;
    }

    async findSolidityFiles(owner, repo) {
        const solidityFiles = [];
        const queue = [''];

        while (queue.length > 0) {
            const currentPath = queue.shift();
            try {
                const contents = await this.getRepoContents(owner, repo, currentPath);
                
                for (const item of contents) {
                    if (item.type === 'dir') {
                        queue.push(item.path);
                    } else if (item.type === 'file' && item.name.endsWith('.sol')) {
                        solidityFiles.push({
                            name: item.name,
                            path: item.path,
                            url: item.download_url,
                            size: item.size
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${currentPath}:`, error.message);
            }
        }

        return solidityFiles;
    }
}

// ========== محرك التحليل الأساسي ==========
class AnalysisHarness {
    constructor() {
        this.tempDir = path.join(__dirname, 'temp');
    }

    async analyzeFile(content, fileName) {
        const findings = [];

        // 1. تحليل Reentrancy
        if (this.checkReentrancy(content)) {
            findings.push({
                type: 'reentrancy',
                name: 'Reentrancy Attack',
                severity: 'critical',
                confidence: 92,
                file: fileName,
                line: this.findLineNumber(content, '.call'),
                code: this.extractCode(content, '.call'),
                description: 'استدعاء خارجي قبل تحديث الحالة'
            });
        }

        // 2. تحليل Tx.Origin
        if (content.includes('tx.origin')) {
            findings.push({
                type: 'txorigin',
                name: 'Tx.Origin Authentication',
                severity: 'high',
                confidence: 85,
                file: fileName,
                line: this.findLineNumber(content, 'tx.origin'),
                code: this.extractCode(content, 'tx.origin'),
                description: 'استخدام tx.origin للتحقق من الهوية'
            });
        }

        // 3. تحليل Overflow
        const pragma = content.match(/pragma\s+solidity\s+([^;]+);/);
        if (pragma && (pragma[1].includes('0.7') || pragma[1].includes('0.6'))) {
            if (!content.includes('SafeMath')) {
                findings.push({
                    type: 'overflow',
                    name: 'Arithmetic Overflow',
                    severity: 'medium',
                    confidence: 78,
                    file: fileName,
                    line: 1,
                    code: pragma[0],
                    description: 'عمليات حسابية غير آمنة'
                });
            }
        }

        return findings;
    }

    checkReentrancy(code) {
        const hasCall = code.includes('.call');
        const hasStateUpdate = code.includes('-=') || code.includes('=');
        const callIndex = code.indexOf('.call');
        const stateIndex = code.indexOf('-=');
        
        return hasCall && hasStateUpdate && callIndex < stateIndex;
    }

    findLineNumber(code, search) {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(search)) return i + 1;
        }
        return 0;
    }

    extractCode(code, pattern, lines = 3) {
        const codeLines = code.split('\n');
        const lineIndex = this.findLineNumber(code, pattern) - 1;
        if (lineIndex < 0) return '';
        
        const start = Math.max(0, lineIndex - 1);
        const end = Math.min(codeLines.length, lineIndex + lines);
        return codeLines.slice(start, end).join('\n');
    }
}

// ========== Routes ==========

// فحص مستودع GitHub
app.post('/api/scan', async (req, res) => {
    const { repoUrl, token } = req.body;
    
    try {
        // استخراج معلومات المستودع
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            return res.status(400).json({ error: 'رابط غير صالح' });
        }

        const [_, owner, repo] = match;
        
        // إعدادات SSE (Server-Sent Events)
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const send = (type, data) => {
            res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
        };

        // بدء التحليل
        send('log', { message: `🔍 بدء فحص ${owner}/${repo}`, level: 'info' });

        // جلب الملفات من GitHub
        const github = new GitHubService(token);
        send('log', { message: '📡 جاري الاتصال بـ GitHub...', level: 'info' });
        
        const files = await github.findSolidityFiles(owner, repo);
        send('log', { message: `✅ تم العثور على ${files.length} ملف Solidity`, level: 'success' });
        send('progress', { percent: 20, file: 'جاري التحليل...' });

        // تحليل كل ملف
        const harness = new AnalysisHarness();
        const results = {
            metadata: {
                repository: `${owner}/${repo}`,
                filesScanned: files.length,
                timestamp: new Date().toISOString()
            },
            vulnerabilities: [],
            stats: {
                totalFiles: files.length,
                criticalCount: 0,
                highCount: 0,
                mediumCount: 0
            }
        };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            send('log', { message: `📄 تحليل: ${file.path}`, level: 'info' });
            send('file', { name: file.path, progress: Math.round((i + 1) / files.length * 100) });
            
            try {
                const content = await github.getFileContent(file.url);
                const findings = await harness.analyzeFile(content, file.path);
                
                findings.forEach(finding => {
                    results.vulnerabilities.push(finding);
                    if (finding.severity === 'critical') results.stats.criticalCount++;
                    if (finding.severity === 'high') results.stats.highCount++;
                    if (finding.severity === 'medium') results.stats.mediumCount++;
                    
                    send('vulnerability', { vuln: finding });
                });
                
            } catch (error) {
                send('log', { message: `❌ فشل تحليل ${file.path}`, level: 'error' });
            }
            
            send('progress', { 
                percent: 20 + Math.round((i + 1) / files.length * 70),
                file: file.path 
            });
        }

        send('log', { message: '✅ اكتمل التحليل', level: 'success' });
        send('progress', { percent: 100, file: 'اكتمل' });
        send('result', { results });

        res.end();

    } catch (error) {
        console.error('Scan error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
});

// التحقق من حالة الخادم
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
});
