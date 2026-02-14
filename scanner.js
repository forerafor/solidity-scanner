// ========== في ملف scanner.js، أضف هذا ==========

class DeepAIScanner {
    constructor() {
        this.db = DeepVulnerabilityDB;
        this.fpAnalyzer = new FalsePositiveAnalyzer();
        this.results = [];
    }

    // ========== فحص مع تحليل False Positives ==========
    async scan(code, fileInfo = {}) {
        console.log('🧠 بدء الفحص العميق...');
        
        const rawFindings = await this.collectFindings(code, fileInfo);
        const verifiedFindings = [];
        
        for (const finding of rawFindings) {
            // تحليل False Positive
            const analysis = this.fpAnalyzer.analyze(finding, code);
            
            if (!analysis.isFalsePositive) {
                verifiedFindings.push({
                    ...finding,
                    confidence: analysis.confidence,
                    verified: true
                });
            } else {
                console.log(`🛡️ تم رفض False Positive: ${finding.name} - ${analysis.reason}`);
            }
        }
        
        return {
            findings: verifiedFindings,
            stats: this.fpAnalyzer.getStats(),
            summary: this.generateSummary(verifiedFindings)
        };
    }
}
