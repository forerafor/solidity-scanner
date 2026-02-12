// ============================================
// 🧠 Shrek Smart Scanner v3.0
// محرك فحص ذكي بدون False Positives
// ============================================

class ShrekSmartScanner {
    constructor() {
        this.version = '3.0.0';
        this.db = window.ShrekVulnerabilityDB;
        this.scanHistory = [];
        this.trustedLibraries = new Set();
        this.knownFalsePositives = new Map();
        
        // تهيئة قاعدة التعلم
        this.initLearningDB();
    }
    
    // تهيئة قاعدة التعلم
    initLearningDB() {
        // False positives معروفة
        this.knownFalsePositives.set('reentrancy', [
            'ReentrancyGuard',
            'nonReentrant',
            'checks-effects-interactions'
        ]);
        
        this.knownFalsePositives.set('overflow', [
            'SafeMath',
            'pragma solidity ^0.8',
            'unchecked'
        ]);
        
        this.knownFalsePositives.set('txorigin', [
            'msg.sender'
        ]);
        
        // مكتبات موثوقة
        const trusted = [
            '@openzeppelin/contracts',
            '@chainlink/contracts',
            '@uniswap/v3-core',
            '@aave/protocol-v2'
        ];
        
        trusted.forEach(lib => this.trustedLibraries.add(lib));
    }
    
    // ========== الفحص الذكي ==========
    async scan(code, fileName = '', options = {}) {
        console.log(`🧠 Scanning: ${fileName}`);
        
        const startTime = Date.now();
        
        // 1. تحليل أولي
        const basicAnalysis = this.analyzeBasics(code);
        
        // 2. فحص الثغرات
        const vulnerabilityScan = this.db.scan(code, fileName);
        
        // 3. تحليل السياق
        const contextAnalysis = this.analyzeContext(code);
        
        // 4. التحقق من False Positives
        const validatedFindings = this.validateFindings(
            vulnerabilityScan.findings,
            code,
            fileName
        );
        
        // 5. تحليل التبعيات
        const dependencies = this.analyzeDependencies(code);
        
        // 6. توليد التقرير
        const report = {
            metadata: {
                fileName: fileName,
                scanTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                scannerVersion: this.version
            },
            
            basic: basicAnalysis,
            
            vulnerabilities: validatedFindings,
            
            dependencies: dependencies,
            
            context: contextAnalysis,
            
            stats: {
                totalIssues: validatedFindings.length,
                critical: validatedFindings.filter(v => v.severity === 'critical').length,
                high: validatedFindings.filter(v => v.severity === 'high').length,
                medium: validatedFindings.filter(v => v.severity === 'medium').length,
                low: validatedFindings.filter(v => v.severity === 'low').length,
                mitigated: validatedFindings.filter(v => v.isMitigated).length
            },
            
            recommendations: this.generateRecommendations(validatedFindings),
            
            confidence: this.calculateConfidence(validatedFindings)
        };
        
        // حفظ في التاريخ
        this.scanHistory.push(report);
        
        return report;
    }
    
    // تحليل أساسي
    analyzeBasics(code) {
        return {
            pragma: this.extractPragma(code),
            imports: this.extractImports(code),
            contracts: this.extractContracts(code),
            functions: this.extractFunctions(code),
            modifiers: this.extractModifiers(code),
            events: this.extractEvents(code),
            linesOfCode: code.split('\n').length,
            complexity: this.calculateComplexity(code)
        };
    }
    
    // استخراج pragma
    extractPragma(code) {
        const match = code.match(/pragma\s+solidity\s+([^;]+);/);
        return match ? match[1].trim() : 'unknown';
    }
    
    // استخراج imports
    extractImports(code) {
        const imports = [];
        const regex = /import\s+(?:[^"']*["']([^"']+)["']|{([^}]+)}\s+from\s+["']([^"']+)["'])/g;
        
        let match;
        while ((match = regex.exec(code)) !== null) {
            imports.push({
                path: match[1] || match[3],
                symbols: match[2] ? match[2].split(',').map(s => s.trim()) : [],
                isTrusted: this.trustedLibraries.has(match[1] || match[3])
            });
        }
        
        return imports;
    }
    
    // استخراج العقود
    extractContracts(code) {
        const contracts = [];
        const regex = /(?:contract|library|interface)\s+(\w+)\s*(?:is\s+([^{]+))?\{/g;
        
        let match;
        while ((match = regex.exec(code)) !== null) {
            contracts.push({
                name: match[1],
                type: match[0].includes('contract') ? 'contract' : 
                      match[0].includes('library') ? 'library' : 'interface',
                inherits: match[2] ? match[2].split(',').map(s => s.trim()) : []
            });
        }
        
        return contracts;
    }
    
    // استخراج الدوال
    extractFunctions(code) {
        const functions = [];
        const regex = /function\s+(\w+)\s*\(([^)]*)\)\s*(public|private|internal|external)?\s*(?:view|pure|payable)?\s*(?:returns\s*\(([^)]*)\))?/g;
        
        let match;
        while ((match = regex.exec(code)) !== null) {
            functions.push({
                name: match[1],
                params: match[2] || '',
                visibility: match[3] || 'public',
                returns: match[4] || '',
                lineNumber: this.getLineNumber(code, match.index),
                modifiers: this.extractFunctionModifiers(code, match.index)
            });
        }
        
        return functions;
    }
    
    // استخراج modifiers
    extractModifiers(code) {
        const modifiers = [];
        const regex = /modifier\s+(\w+)\s*\([^)]*\)\s*\{/g;
        
        let match;
        while ((match = regex.exec(code)) !== null) {
            modifiers.push(match[1]);
        }
        
        return modifiers;
    }
    
    // استخراج أحداث
    extractEvents(code) {
        const events = [];
        const regex = /event\s+(\w+)\s*\(([^)]*)\)/g;
        
        let match;
        while ((match = regex.exec(code)) !== null) {
            events.push({
                name: match[1],
                params: match[2]
            });
        }
        
        return events;
    }
    
    // استخراج modifiers الخاصة بدالة
    extractFunctionModifiers(code, functionIndex) {
        const functionLine = code.substring(0, functionIndex).split('\n').length;
        const functionDeclaration = code.split('\n')[functionLine - 1];
        
        const modifierMatch = functionDeclaration.match(/\s+(\w+)(?:\s|\)|$)/g);
        if (modifierMatch) {
            return modifierMatch
                .map(m => m.trim())
                .filter(m => m && !m.includes('(') && !['public', 'private', 'external', 'internal', 'view', 'pure', 'payable'].includes(m));
        }
        
        return [];
    }
    
    // حساب التعقيد
    calculateComplexity(code) {
        let complexity = 0;
        
        // if statements
        complexity += (code.match(/if\s*\(/g) || []).length;
        
        // loops
        complexity += (code.match(/for\s*\(/g) || []).length;
        complexity += (code.match(/while\s*\(/g) || []).length;
        
        // require/assert
        complexity += (code.match(/require\s*\(/g) || []).length;
        complexity += (code.match(/assert\s*\(/g) || []).length;
        
        // external calls
        complexity += (code.match(/\.call\s*\(/g) || []).length * 2;
        complexity += (code.match(/\.delegatecall\s*\(/g) || []).length * 3;
        
        return {
            score: complexity,
            level: complexity < 10 ? 'LOW' : complexity < 20 ? 'MEDIUM' : 'HIGH'
        };
    }
    
    // تحليل السياق
    analyzeContext(code) {
        return {
            usesOpenZeppelin: code.includes('@openzeppelin') || code.includes('import "@openzeppelin'),
            usesChainlink: code.includes('@chainlink') || code.includes('VRFConsumerBase'),
            hasTests: code.includes('test') || code.includes('Test'),
            isUpgradeable: code.includes('Initializable') || code.includes('UUPS'),
            hasEvents: this.extractEvents(code).length > 0,
            hasModifiers: this.extractModifiers(code).length > 0,
            isComplex: this.calculateComplexity(code).level === 'HIGH'
        };
    }
    
    // تحليل التبعيات
    analyzeDependencies(code) {
        const imports = this.extractImports(code);
        const dependencies = [];
        
        imports.forEach(imp => {
            const lib = this.identifyLibrary(imp.path);
            dependencies.push({
                name: lib.name,
                version: lib.version || 'unknown',
                path: imp.path,
                isTrusted: imp.isTrusted,
                hasKnownVulns: lib.knownVulns || false
            });
        });
        
        return dependencies;
    }
    
    // التعرف على المكتبة
    identifyLibrary(path) {
        const libraries = {
            '@openzeppelin/contracts': { name: 'OpenZeppelin Contracts', version: '4.9.3' },
            '@openzeppelin/contracts-upgradeable': { name: 'OpenZeppelin Upgradeable', version: '4.9.3' },
            '@chainlink/contracts': { name: 'Chainlink Contracts', version: '0.6.1' },
            '@uniswap/v3-core': { name: 'Uniswap V3 Core', version: '1.0.0' },
            '@aave/protocol-v2': { name: 'Aave V2', version: '2.0.0' },
            '@compound-finance/compound-protocol': { name: 'Compound Protocol', version: '2.8.1' }
        };
        
        for (const [key, lib] of Object.entries(libraries)) {
            if (path.includes(key)) {
                return lib;
            }
        }
        
        return { name: 'Unknown Library', version: 'unknown' };
    }
    
    // التحقق من صحة النتائج
    validateFindings(findings, code, fileName) {
        const validated = [];
        
        findings.forEach(finding => {
            let isValid = true;
            let confidence = finding.confidence;
            
            // 1. التحقق من False Positives المعروفة
            if (this.knownFalsePositives.has(finding.type)) {
                const mitigations = this.knownFalsePositives.get(finding.type);
                mitigations.forEach(m => {
                    if (code.includes(m)) {
                        isValid = false;
                        confidence *= 0.1;
                    }
                });
            }
            
            // 2. التحقق من المكتبات الموثوقة
            if (this.trustedLibraries.has(fileName) || fileName.includes('@openzeppelin')) {
                isValid = false;
                confidence *= 0.01;
            }
            
            // 3. التحقق من وجود إصلاحات
            finding.isMitigated = this.checkMitigation(finding, code);
            if (finding.isMitigated) {
                isValid = false;
                confidence *= 0.2;
            }
            
            // 4. التحقق من مستوى الثقة
            if (confidence >= 50 && isValid) {
                validated.push({
                    ...finding,
                    confidence: Math.min(confidence, 100),
                    verified: true
                });
            }
        });
        
        return validated;
    }
    
    // التحقق من وجود إصلاح
    checkMitigation(finding, code) {
        const mitigations = {
            reentrancy: ['nonReentrant', 'ReentrancyGuard', 'checks-effects-interactions'],
            overflow: ['SafeMath', 'pragma solidity ^0.8'],
            txorigin: ['msg.sender'],
            frontrun: ['commit', 'reveal', 'VRF'],
            dos: ['pull over push', 'withdraw pattern'],
            accessControl: ['onlyOwner', 'onlyRole', 'hasRole'],
            oracleManipulation: ['chainlink', 'twap']
        };
        
        const typeMitigations = mitigations[finding.type] || [];
        return typeMitigations.some(m => code.includes(m));
    }
    
    // توليد توصيات
    generateRecommendations(findings) {
        const recommendations = [];
        
        findings
            .filter(f => !f.isMitigated && f.confidence > 70)
            .forEach(f => {
                recommendations.push({
                    type: f.type,
                    severity: f.severity,
                    description: f.description,
                    location: `Line ${f.lineNumber}`,
                    confidence: f.confidence,
                    action: f.suggestedFix,
                    priority: f.severity === 'critical' ? 'IMMEDIATE' : 
                             f.severity === 'high' ? 'HIGH' : 'MEDIUM',
                    effort: f.severity === 'critical' ? 'LOW' : 'MEDIUM'
                });
            });
        
        return recommendations;
    }
    
    // حساب الثقة الإجمالية
    calculateConfidence(findings) {
        if (findings.length === 0) return 100;
        
        let totalConfidence = 0;
        findings.forEach(f => {
            totalConfidence += f.confidence;
        });
        
        const avgConfidence = totalConfidence / findings.length;
        const mitigatedRatio = findings.filter(f => f.isMitigated).length / findings.length;
        
        return Math.round(avgConfidence * (1 - mitigatedRatio * 0.3));
    }
    
    // الحصول على رقم السطر
    getLineNumber(code, index) {
        return code.substring(0, index).split('\n').length;
    }
    
    // مسح التاريخ
    clearHistory() {
        this.scanHistory = [];
    }
    
    // الحصول على إحصائيات
    getStats() {
        return {
            totalScans: this.scanHistory.length,
            averageConfidence: this.scanHistory.reduce((acc, scan) => acc + scan.confidence, 0) / this.scanHistory.length || 0,
            totalIssuesFound: this.scanHistory.reduce((acc, scan) => acc + scan.stats.totalIssues, 0),
            criticalIssues: this.scanHistory.reduce((acc, scan) => acc + scan.stats.critical, 0),
            highIssues: this.scanHistory.reduce((acc, scan) => acc + scan.stats.high, 0),
            mediumIssues: this.scanHistory.reduce((acc, scan) => acc + scan.stats.medium, 0)
        };
    }
}

// تصدير للاستخدام
window.ShrekSmartScanner = ShrekSmartScanner;
