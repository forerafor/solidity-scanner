// api/scan.js
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// تخزين مؤقت للنتائج
const resultsCache = new Map();

// مسار فحص عقد
router.post('/scan', async (req, res) => {
    try {
        const { contractCode, contractAddress, options } = req.body;
        
        if (!contractCode && !contractAddress) {
            return res.status(400).json({ 
                error: 'يجب توفير كود العقد أو عنوان العقد' 
            });
        }
        
        let codeToScan = contractCode;
        
        // إذا كان هناك عنوان، جلب الكود من Etherscan
        if (contractAddress && !contractCode) {
            codeToScan = await fetchFromEtherscan(contractAddress);
        }
        
        // حفظ الكود في ملف مؤقت
        const tempFile = path.join('/tmp', `contract_${Date.now()}.sol`);
        fs.writeFileSync(tempFile, codeToScan);
        
        // تشغيل ماسح بايثون
        exec(`python3 scanner/deep_scanner.py ${tempFile}`, (error, stdout, stderr) => {
            // حذف الملف المؤقت
            fs.unlinkSync(tempFile);
            
            if (error) {
                console.error('خطأ في الماسح:', stderr);
                return res.status(500).json({ 
                    error: 'فشل في تحليل العقد',
                    details: stderr
                });
            }
            
            try {
                const results = JSON.parse(stdout);
                
                // تخزين في الكاش
                const scanId = Date.now().toString();
                resultsCache.set(scanId, results);
                
                res.json({
                    scanId,
                    ...results
                });
            } catch (parseError) {
                res.status(500).json({ 
                    error: 'نتيجة غير صالحة من الماسح' 
                });
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// جلب نتيجة فحص سابقة
router.get('/scan/:scanId', (req, res) => {
    const { scanId } = req.params;
    
    if (resultsCache.has(scanId)) {
        res.json(resultsCache.get(scanId));
    } else {
        res.status(404).json({ error: 'الفحص غير موجود' });
    }
});

// دالة مساعدة لجلب الكود من Etherscan
async function fetchFromEtherscan(address) {
    const axios = require('axios');
    const API_KEY = process.env.ETHERSCAN_API_KEY;
    
    const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${API_KEY}`;
    
    const response = await axios.get(url);
    return response.data.result[0].SourceCode;
}

module.exports = router;
