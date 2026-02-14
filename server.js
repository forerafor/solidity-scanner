// server.js
const express = require('express');
const cors = require('cors');
const scanRoutes = require('./api/scan');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // دعم الكود الكبير

// المسارات
app.use('/api', scanRoutes);
app.use('/', healthRoutes);

// معالجة الأخطاء
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

app.listen(PORT, () => {
    console.log(`🚀 خادم الماسح يعمل على المنفذ ${PORT}`);
    console.log(`📝 المسارات المتاحة:`);
    console.log(`   - GET  /         : معلومات الخادم`);
    console.log(`   - GET  /health   : فحص الحالة`);
    console.log(`   - POST /api/scan : فحص عقد ذكي`);
});
