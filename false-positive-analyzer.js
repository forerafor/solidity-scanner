// ============================================
// 🛡️ False Positive Analyzer v1.0
// يحلل النتائج ويكتشف الأخطاء قبل عرضها
// ============================================

class FalsePositiveAnalyzer {
    constructor() {
        this.knownSafePatterns = {
            // أنماط آمنة معروفة
            openzeppelin: [
                'Address.sol',
                'AddressUpgradeable.sol',
                'Proxy.sol',
                'ERC1967Upgrade.sol'
            ],
            
            // دوال آمنة معروفة
            safeFunctions: [
                'functionDelegateCall',
                '_delegate',
                '_execute'
            ],
            
            // مكتبات موثوقة
            trustedLibraries: [
                '@openzeppelin/',
                '@uniswap/',
                '@chainlink/',
                '@aave/',
                '@compound-finance/'
            ]
        };
        
        this.stats = {
            analyzed: 0,
            rejected: 0,
            accepted: 0
        };
    }

    // ========== تحليل النتيجة ==========
    analyze(finding, context) {
        this.stats.analyzed++;
        
        // 1. التحقق من المصدر (Source Check)
        if (this.isFromTrustedLibrary(finding)) {
            this.stats.rejected++;
            return {
                isFalsePositive: true,
                reason: 'من مكتبة موثوقة ومعروفة',
                confidence: 95
            };
        }
        
        // 2. التحقق من الوظيفة (Function Check)
        if (this.isSafeFunction(finding)) {
            this.stats.rejected++;
            return {
                isFalsePositive: true,
                reason: 'دالة مساعدة آمنة معروفة',
                confidence: 90
            };
        }
        
        // 3. تحليل السياق العميق
        const contextAnalysis = this.analyzeContext(finding, context);
        if (contextAnalysis.isSafe) {
            this.stats.rejected++;
            return {
                isFalsePositive: true,
                reason: contextAnalysis.reason,
                confidence: contextAnalysis.confidence
            };
        }
        
        // 4. التحقق من وجود إصلاحات
        if (this.hasMitigation(finding, context)) {
            this.stats.rejected++;
            return {
                isFalsePositive: true,
                reason: 'يوجد إصلاح أو حماية في الكود',
                confidence: 85
            };
        }
        
        this.stats.accepted++;
        return {
            isFalsePositive: false,
            confidence: finding.confidence
        };
    }

    // ========== تحقق من مكتبة موثوقة ==========
    isFromTrustedLibrary(finding) {
        if (!finding.file) return false;
        
        return this.knownSafePatterns.trustedLibraries.some(lib => 
            finding.file.includes(lib)
        );
    }

    // ========== تحقق من دالة آمنة ==========
    isSafeFunction(finding) {
        if (!finding.functionName) return false;
        
        return this.knownSafePatterns.safeFunctions.some(func =>
            finding.functionName.includes(func)
        );
    }

    // ========== تحليل السياق العميق ==========
    analyzeContext(finding, context) {
        // تحليل خاص للـ Proxy contracts
        if (finding.rule === 'unsafeDelegatecall') {
            if (context.includes('contract Proxy') || context.includes('is Proxy')) {
                if (context.includes('onlyOwner') || context.includes('require(msg.sender == owner)')) {
                    return {
                        isSafe: true,
                        reason: 'Proxy مع صلاحيات owner - آمن',
                        confidence: 95
                    };
                }
            }
        }
        
        // تحليل خاص للـ Reentrancy
        if (finding.rule === 'reentrancy') {
            if (context.includes('nonReentrant') || context.includes('ReentrancyGuard')) {
                return {
                    isSafe: true,
                    reason: 'يوجد ReentrancyGuard - آمن',
                    confidence: 98
                };
            }
        }
        
        return { isSafe: false };
    }

    // ========== تحقق من وجود إصلاحات ==========
    hasMitigation(finding, context) {
        const mitigations = {
            delegatecall: ['onlyOwner', 'require(', 'isContract'],
            reentrancy: ['nonReentrant', 'balances[msg.sender] -=', 'checks-effects-interactions'],
            txorigin: ['msg.sender']
        };
        
        const ruleMitigations = mitigations[finding.rule] || [];
        return ruleMitigations.some(m => context.includes(m));
    }

    // ========== إحصائيات ==========
    getStats() {
        return {
            ...this.stats,
            falsePositiveRate: ((this.stats.rejected / this.stats.analyzed) * 100).toFixed(1) + '%',
            accuracy: ((this.stats.accepted / this.stats.analyzed) * 100).toFixed(1) + '%'
        };
    }
}
