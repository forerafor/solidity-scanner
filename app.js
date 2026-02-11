// ===== app.js =====
// التطبيق الرئيسي

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Solidity PoC Scanner جاهز');
    
    // إضافة مستمع لزر Enter
    document.getElementById('githubUrl').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            startScan();
        }
    });
    
    // تحميل أول عقد افتراضي
    loadContract('VulnerableBank.sol');
    loadAttack('AttackReentrancy.sol');
});

// تحميل عقد مصاب
function loadContract(filename) {
    let code = '';
    
    switch(filename) {
        case 'VulnerableBank.sol':
            code = VulnerabilityDB.reentrancy.vulnerableContract;
            break;
        case 'VulnerableToken.sol':
            code = VulnerabilityDB.overflow.vulnerableContract;
            break;
        case 'VulnerableWallet.sol':
            code = VulnerabilityDB.txorigin.vulnerableContract;
            break;
        case 'VulnerableLottery.sol':
            code = VulnerabilityDB.frontrun.vulnerableContract;
            break;
        case 'VulnerableAirdrop.sol':
            code = VulnerabilityDB.dos.vulnerableContract;
            break;
    }
    
    const codeBlock = document.getElementById('contractCode');
    codeBlock.innerHTML = `<pre><code class="solidity">${escapeHtml(code)}</code></pre>`;
    hljs.highlightAll();
}

// تحميل عقد هجوم
function loadAttack(filename) {
    let code = '';
    
    switch(filename) {
        case 'AttackReentrancy.sol':
            code = VulnerabilityDB.reentrancy.attackContract;
            break;
        case 'AttackOverflow.sol':
            code = VulnerabilityDB.overflow.attackContract;
            break;
        case 'AttackTxOrigin.sol':
            code = VulnerabilityDB.txorigin.attackContract;
            break;
        case 'AttackFrontRun.sol':
            code = VulnerabilityDB.frontrun.attackContract;
            break;
        case 'AttackDoS.sol':
            code = VulnerabilityDB.dos.attackContract;
            break;
    }
    
    const codeBlock = document.getElementById('attackCode');
    codeBlock.innerHTML = `<pre><code class="solidity">${escapeHtml(code)}</code></pre>`;
    hljs.highlightAll();
}
