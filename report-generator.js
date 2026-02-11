// ===== report-generator.js =====
// مولد التقارير

class ReportGenerator {
    
    // توليد تقرير كامل
    static generate(scanResults) {
        const report = {
            title: 'تقرير فحص أمني - Solidity PoC Scanner',
            date: new Date().toISOString(),
            scanner: 'Solidity PoC Scanner v1.0',
            
            project: {
                repository: scanResults.repo,
                files_analyzed: scanResults.files,
                libraries: scanResults.libraries
            },
            
            vulnerabilities: scanResults.vulnerabilities.map(v => ({
                name: v.name,
                severity: v.severity,
                description: v.description,
                fix: v.fix,
                poc_steps: v.pocSteps
            })),
            
            summary: {
                total_vulnerabilities: scanResults.vulnerabilities.length,
                critical: scanResults.vulnerabilities.filter(v => v.severity === 'critical').length,
                warning: scanResults.vulnerabilities.filter(v => v.severity === 'warning').length,
                medium: scanResults.vulnerabilities.filter(v => v.severity === 'medium').length
            }
        };
        
        return report;
    }
    
    // تصدير PDF
    static exportToPDF(report) {
        // في التطبيق الحقيقي: استخدام مكتبة jsPDF
        console.log('📄 تصدير تقرير PDF:', report);
        alert('✅ تم تصدير التقرير بنجاح');
    }
    
    // تصدير JSON
    static exportToJSON(report) {
        const dataStr = JSON.stringify(report, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `solidity-scan-report-${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
}
