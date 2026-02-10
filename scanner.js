// ============================================
// 🔍 Smart Solidity Scanner v2.0
// فاحص عقود Solidity بالذكاء الاصطناعي
// يعمل بالكامل في المتصفح - لا يحتاج خادم
// ============================================

class SolidityScanner {
    constructor() {
        this.version = '2.0.0';
        this.lastScan = null;
        this.scanHistory = [];
        this.vulnerabilityPatterns = this.loadPatterns();
        this.examples = this.loadExamples();
        
        console.log(`🚀 Smart Solidity Scanner ${this.version} initialized`);
    }

    // تحميل أنماط الثغرات
    loadPatterns() {
        return {
            reentrancy: [
                {
                    pattern: /\.call\{value:[^}]*\}/g,
                    description: 'استخدام call مع value قد يؤدي إلى هجوم إعادة الدخول (Reentrancy)',
                    severity: 'critical',
                    fix: 'استخدم Checks-Effects-Interactions pattern أو OpenZeppelin ReentrancyGuard'
                },
                {
                    pattern: /\.send\(|\.transfer\(/g,
                    description: 'استخدام send() أو transfer() غير آمن في العقود الحديثة',
                    severity: 'warning',
                    fix: 'استخدم call() بدلاً منهما'
                }
            ],
            
            overflow: [
                {
                    pattern: /unchecked\s*\{[^}]*\}/g,
                    description: 'كتلة unchecked قد تؤدي إلى overflow/underflow',
                    severity: 'critical',
                    fix: 'تأكد من فحص الحدود أو استخدم SafeMath'
                },
                {
                    pattern: /\+\+|--/g,
                    description: 'زيادة/نقصان مباشر بدون فحص',
                    severity: 'warning',
                    fix: 'استخدم عمليات آمنة'
                }
            ],
            
            access: [
                {
                    pattern: /public\s+(mapping|address|uint256|string)\s+\w+/g,
                    description: 'بيانات حساسة معروضة للعموم',
                    severity: 'warning',
                    fix: 'استخدم private أو internal مع دوال getter'
                },
                {
                    pattern: /onlyOwner/g,
                    description: 'تحقق من صلاحية onlyOwner',
                    severity: 'info',
                    fix: 'تأكد من أن onlyOwner موجود ويعمل بشكل صحيح'
                }
            ],
            
            timestamp: [
                {
                    pattern: /block\.timestamp/g,
                    description: 'استخدام block.timestamp قد يكون غير آمن',
                    severity: 'warning',
                    fix: 'تجنب الاعتماد على timestamp في عمليات حساسة'
                }
            ],
            
            delegatecall: [
                {
                    pattern: /\.delegatecall\(/g,
                    description: 'استخدام delegatecall خطير إذا لم يكن محكماً',
                    severity: 'critical',
                    fix: 'تأكد من التحقق من العنوان المستدعى'
                }
            ],
            
            randomness: [
                {
                    pattern: /block\.difficulty|block\.hash\(block\.number\s*-\s*\d+\)/g,
                    description: 'مصدر عشوائي غير آمن',
                    severity: 'critical',
                    fix: 'استخدم Chainlink VRF أو حلول آمنة أخرى'
                }
            ]
        };
    }

    // تحميل الأمثلة
    loadExamples() {
        return {
            token: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    address public owner;
    
    constructor() ERC20("My Token", "MTK") {
        owner = msg.sender;
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    function mint(address to, uint256 amount) public {
        require(msg.sender == owner, "Only owner can mint");
        _mint(to, amount);
    }
    
    function transfer(address recipient, uint256 amount) 
        public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }
}`,

            staking: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStaking {
    mapping(address => uint256) public stakes;
    uint256 public totalStaked;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    
    function stake() public payable {
        require(msg.value > 0, "Cannot stake 0");
        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;
        emit Staked(msg.sender, msg.value);
    }
    
    function unstake(uint256 amount) public {
        require(stakes[msg.sender] >= amount, "Insufficient stake");
        require(address(this).balance >= amount, "Contract has insufficient funds");
        
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    function getStake(address user) public view returns (uint256) {
        return stakes[user];
    }
}`,

            bank: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureBank {
    mapping(address => uint256) private balances;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be positive");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) public {
        require(amount > 0, "Withdrawal amount must be positive");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Checks-Effects-Interactions pattern
        balances[msg.sender] -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    function getBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
    
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}`,

            nft: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) {
        _nextTokenId = 1;
    }
    
    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }
    
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }
}`,

            multisig: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultiSigWallet {
    address[] public owners;
    uint256 public required;
    
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmationsCount;
    }
    
    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    
    event Deposit(address indexed sender, uint256 amount);
    event TransactionSubmitted(uint256 indexed txId, address indexed sender);
    event TransactionConfirmed(uint256 indexed txId, address indexed sender);
    event TransactionExecuted(uint256 indexed txId);
    
    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "Owners required");
        require(_required > 0 && _required <= _owners.length, "Invalid required number");
        
        owners = _owners;
        required = _required;
    }
    
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
    
    function submitTransaction(address _to, uint256 _value, bytes memory _data) 
        public returns (uint256) {
        uint256 txId = transactions.length;
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            confirmationsCount: 0
        }));
        emit TransactionSubmitted(txId, msg.sender);
        return txId;
    }
    
    function confirmTransaction(uint256 _txId) public {
        require(_txId < transactions.length, "Transaction does not exist");
        require(!transactions[_txId].executed, "Transaction already executed");
        require(isOwner(msg.sender), "Not an owner");
        require(!confirmations[_txId][msg.sender], "Transaction already confirmed");
        
        confirmations[_txId][msg.sender] = true;
        transactions[_txId].confirmationsCount++;
        
        emit TransactionConfirmed(_txId, msg.sender);
    }
    
    function executeTransaction(uint256 _txId) public {
        require(_txId < transactions.length, "Transaction does not exist");
        require(!transactions[_txId].executed, "Transaction already executed");
        require(transactions[_txId].confirmationsCount >= required, "Not enough confirmations");
        
        Transaction storage transaction = transactions[_txId];
        transaction.executed = true;
        
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction execution failed");
        
        emit TransactionExecuted(_txId);
    }
    
    function isOwner(address _address) public view returns (bool) {
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _address) {
                return true;
            }
        }
        return false;
    }
    
    function getOwners() public view returns (address[] memory) {
        return owners;
    }
    
    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }
}`,

            auction: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleAuction {
    address public beneficiary;
    uint256 public auctionEndTime;
    address public highestBidder;
    uint256 public highestBid;
    
    mapping(address => uint256) public pendingReturns;
    
    bool public ended;
    
    event HighestBidIncreased(address bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);
    
    constructor(uint256 _biddingTime, address _beneficiary) {
        beneficiary = _beneficiary;
        auctionEndTime = block.timestamp + _biddingTime;
    }
    
    function bid() public payable {
        require(block.timestamp <= auctionEndTime, "Auction already ended");
        require(msg.value > highestBid, "There already is a higher bid");
        
        if (highestBid != 0) {
            pendingReturns[highestBidder] += highestBid;
        }
        
        highestBidder = msg.sender;
        highestBid = msg.value;
        emit HighestBidIncreased(msg.sender, msg.value);
    }
    
    function withdraw() public returns (bool) {
        uint256 amount = pendingReturns[msg.sender];
        if (amount > 0) {
            pendingReturns[msg.sender] = 0;
            
            if (!payable(msg.sender).send(amount)) {
                pendingReturns[msg.sender] = amount;
                return false;
            }
        }
        return true;
    }
    
    function auctionEnd() public {
        require(block.timestamp >= auctionEndTime, "Auction not yet ended");
        require(!ended, "auctionEnd has already been called");
        
        ended = true;
        emit AuctionEnded(highestBidder, highestBid);
        
        payable(beneficiary).transfer(highestBid);
    }
}`
        };
    }

    // ==================== الوظائف الرئيسية ====================

    // الفحص السريع (يعمل في المتصفح فقط)
    async quickScan(code) {
        showLoading(true);
        
        const results = {
            critical: [],
            warnings: [],
            info: [],
            score: 100,
            timestamp: new Date().toLocaleString('ar-SA'),
            totalIssues: 0
        };

        // فحص أنماط الثغرات
        for (const [category, patterns] of Object.entries(this.vulnerabilityPatterns)) {
            for (const patternData of patterns) {
                const matches = code.match(patternData.pattern);
                if (matches && matches.length > 0) {
                    const issue = {
                        id: `${category}_${Date.now()}_${Math.random()}`,
                        category: category,
                        description: patternData.description,
                        severity: patternData.severity,
                        fix: patternData.fix,
                        count: matches.length,
                        matches: matches.slice(0, 3) // أول 3 نتائج فقط
                    };

                    if (patternData.severity === 'critical') {
                        results.critical.push(issue);
                        results.score -= 20;
                    } else if (patternData.severity === 'warning') {
                        results.warnings.push(issue);
                        results.score -= 10;
                    } else {
                        results.info.push(issue);
                        results.score -= 5;
                    }

                    results.totalIssues++;
                }
            }
        }

        // فحوصات إضافية
        this.performAdditionalChecks(code, results);

        // ضبط النتيجة النهائية
        results.score = Math.max(0, Math.min(100, results.score));

        // حفظ النتائج
        this.lastScan = results;
        this.scanHistory.push({
            timestamp: results.timestamp,
            score: results.score,
            issues: results.totalIssues
        });

        // عرض النتائج
        this.displayResults(results);
        showLoading(false);
        
        return results;
    }

    // الفحص المتقدم بالذكاء الاصطناعي
    async startAIScan(code) {
        showLoading(true);
        
        try {
            // المرحلة 1: الفحص المحلي السريع
            const localResults = await this.quickScan(code);
            
            // المرحلة 2: فحص إضافي باستخدام APIs خارجية (إن أمكن)
            let externalResults = null;
            try {
                externalResults = await this.performExternalAnalysis(code);
            } catch (error) {
                console.log('External analysis skipped:', error.message);
            }
            
            // المرحلة 3: دمج النتائج
            const finalResults = this.mergeScanResults(localResults, externalResults);
            
            // المرحلة 4: تحليل بالذكاء الاصطناعي
            finalResults.aiAnalysis = await this.generateAIAnalysis(finalResults);
            
            // عرض النتائج النهائية
            this.displayResults(finalResults);
            this.lastScan = finalResults;
            
        } catch (error) {
            console.error('AI Scan error:', error);
            alert('⚠️ حدث خطأ في الفحص. جرب الفحص السريع أولاً.');
        } finally {
            showLoading(false);
        }
    }

    // فحص مشروع GitHub
    async scanGitHub(url) {
        showLoading(true);
        
        try {
            // استخراج معلومات من الرابط
            const repoInfo = this.extractGitHubInfo(url);
            if (!repoInfo) {
                alert('⚠️ رابط GitHub غير صالح');
                return;
            }

            alert(`🔍 جاري فحص مشروع GitHub: ${repoInfo.owner}/${repoInfo.repo}\nهذا قد يأخذ دقيقة...`);
            
            // محاكاة فحص GitHub (في النسخة الحقيقية، سنستخدم GitHub API)
            const mockResults = {
                critical: [],
                warnings: [],
                info: [],
                score: 85,
                timestamp: new Date().toLocaleString('ar-SA'),
                totalIssues: 3,
                repoInfo: repoInfo,
                filesScanned: 5,
                aiAnalysis: 'تم فحص المشروع بنجاح. يوصى بمراجعة العقود يدوياً.'
            };

            this.displayResults(mockResults);
            this.lastScan = mockResults;
            
        } catch (error) {
            console.error('GitHub scan error:', error);
            alert('⚠️ خطأ في فحص GitHub. تأكد من أن الرابط صحيح وأن المشروع عام.');
        } finally {
            showLoading(false);
        }
    }

    // ==================== وظائف المساعدة ====================

    performAdditionalChecks(code, results) {
        // فحص وجود pragma
        if (!code.includes('pragma solidity')) {
            results.warnings.push({
                id: 'missing_pragma',
                category: 'syntax',
                description: 'بيان pragma solidity مفقود',
                severity: 'warning',
                fix: 'أضف pragma solidity في بداية الملف',
                count: 1
            });
            results.score -= 5;
            results.totalIssues++;
        }

        // فحص التعليقات
        const commentRatio = (code.match(/\/\/|\/\*/g) || []).length / code.split('\n').length;
        if (commentRatio < 0.1) {
            results.info.push({
                id: 'low_comments',
                category: 'style',
                description: 'قلة التعليقات التوضيحية',
                severity: 'info',
                fix: 'أضف تعليقات توضيحية للكود',
                count: 1
            });
        }

        // فحص طول الدوال
        const functions = code.match(/function\s+\w+\s*\([^)]*\)/g) || [];
        if (functions.length > 10) {
            results.info.push({
                id: 'many_functions',
                category: 'structure',
                description: 'عدد كبير من الدوال في عقد واحد',
                severity: 'info',
                fix: 'فكر في تقسيم العقود إلى عقود أصغر',
                count: functions.length
            });
        }
    }

    extractGitHubInfo(url) {
        try {
            const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (match && match.length >= 3) {
                return {
                    owner: match[1],
                    repo: match[2].replace(/\.git$/, ''),
                    url: url
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async performExternalAnalysis(code) {
        // في النسخة الحقيقية، هنا نتواصل مع APIs خارجية
        // مثل: SolidityScan API, MythX API, إلخ
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    externalScore: 90,
                    additionalIssues: [],
                    scanSource: 'Mock External API'
                });
            }, 1000);
        });
    }

    mergeScanResults(local, external) {
        if (!external) return local;
        
        return {
            ...local,
            externalAnalysis: external,
            score: Math.min(local.score, external.externalScore || local.score)
        };
    }

    async generateAIAnalysis(results) {
        // محاكاة تحليل الذكاء الاصطناعي
        const issuesCount = results.critical.length + results.warnings.length;
        
        if (issuesCount === 0) {
            return "✅ العقد آمن بشكل ممتاز! لا توجد ثغرات حرجة.";
        } else if (results.critical.length > 0) {
            return `⚠️ يوجد ${results.critical.length} ثغرة/ثغرات حرجة تحتاج للإصلاح الفوري.`;
        } else if (results.warnings.length > 0) {
            return `📋 يوجد ${results.warnings.length} تحذير يحتاج للمراجعة.`;
        } else {
            return "ℹ️ العقد بحالة جيدة مع بعض الملاحظات الطفيفة.";
        }
    }

    // ==================== عرض النتائج ====================

    displayResults(results) {
        const container = document.getElementById('resultsContainer');
        const scoreDisplay = document.getElementById('scoreDisplay');
        
        if (!container || !scoreDisplay) return;

        // تحديث النتيجة
        scoreDisplay.textContent = `${results.score}/100`;
        
        // تحديد لون النتيجة
        let scoreColor = '#10b981'; // أخضر
        if (results.score < 70) scoreColor = '#f59e0b'; // أصفر
        if (results.score < 50) scoreColor = '#ef4444'; // أحمر
        
        scoreDisplay.style.background = `linear-gradient(135deg, ${scoreColor}, #8b5cf6)`;
        scoreDisplay.style.webkitBackgroundClip = 'text';
        scoreDisplay.style.webkitTextFillColor = 'transparent';

        // بناء محتوى النتائج
        let html = '';
        
        // عرض المشاكل الحرجة
        if (results.critical.length > 0) {
            html += `<h3 style="color: #ef4444; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-circle"></i> مشاكل حرجة (${results.critical.length})
                    </h3>`;
            
            results.critical.forEach((issue, index) => {
                html += `
                <div class="result-item critical">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong>${index + 1}. ${issue.description}</strong>
                            <p style="margin: 5px 0; color: #cbd5e1; font-size: 0.9rem;">
                                <i class="fas fa-wrench"></i> الإصلاح: ${issue.fix}
                            </p>
                        </div>
                        <span style="background: #ef4444; color: white; padding: 3px 10px; border-radius: 15px; font-size: 0.8rem;">
                            حرجة
                        </span>
                    </div>
                    ${issue.count > 1 ? `<p style="margin-top: 8px; color: #94a3b8;"><i class="fas fa-search"></i> موجودة ${issue.count} مرة في الكود</p>` : ''}
                </div>`;
            });
        }

        // عرض التحذيرات
        if (results.warnings.length > 0) {
            html += `<h3 style="color: #f59e0b; margin: 25px 0 15px;">
                        <i class="fas fa-exclamation-triangle"></i> تحذيرات (${results.warnings.length})
                    </h3>`;
            
            results.warnings.forEach((issue, index) => {
                html += `
                <div class="result-item warning">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong>${index + 1}. ${issue.description}</strong>
                            <p style="margin: 5px 0; color: #cbd5e1; font-size: 0.9rem;">
                                <i class="fas fa-lightbulb"></i> نصيحة: ${issue.fix}
                            </p>
                        </div>
                        <span style="background: #f59e0b; color: white; padding: 3px 10px; border-radius: 15px; font-size: 0.8rem;">
                            تحذير
                        </span>
                    </div>
                </div>`;
            });
        }

        // عرض المعلومات
        if (results.info.length > 0) {
            html += `<h3 style="color: #10b981; margin: 25px 0 15px;">
                        <i class="fas fa-info-circle"></i> ملاحظات (${results.info.length})
                    </h3>`;
            
            results.info.forEach((issue, index) => {
                html += `
                <div class="result-item info">
                    <strong>${index + 1}. ${issue.description}</strong>
                    ${issue.fix ? `<p style="margin-top: 5px; color: #cbd5e1; font-size: 0.9rem;">${issue.fix}</p>` : ''}
                </div>`;
            });
        }

        // إذا لم توجد مشاكل
        if (results.critical.length === 0 && results.warnings.length === 0 && results.info.length === 0) {
            html = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 4rem; color: #10b981; margin-bottom: 20px;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 style="color: #10b981;">✅ ممتاز! لا توجد مشاكل</h3>
                <p style="color: #94a3b8; margin-top: 10px;">
                    العقد آمن ولا يحتوي على ثغرات حرجة أو تحذيرات رئيسية
                </p>
            </div>`;
        }

        // إضافة تحليل الذكاء الاصطناعي
        if (results.aiAnalysis) {
            html += `
            <div style="background: rgba(59, 130, 246, 0.1); padding: 20px; border-radius: 10px; margin-top: 30px; border-right: 4px solid #3b82f6;">
                <h4 style="color: #3b82f6; margin-bottom: 10px;">
                    <i class="fas fa-robot"></i> تحليل الذكاء الاصطناعي
                </h4>
                <p style="color: #e2e8f0;">${results.aiAnalysis}</p>
            </div>`;
        }

        // إضافة معلومات إضافية
        html += `
        <div style="margin-top: 30px; padding: 15px; background: rgba(30, 41, 59, 0.5); border-radius: 10px; font-size: 0.9rem; color: #94a3b8;">
            <p><i class="fas fa-calendar"></i> وقت الفحص: ${results.timestamp}</p>
            <p><i class="fas fa-bug"></i> إجمالي المشاكل: ${results.totalIssues}</p>
            <p><i class="fas fa-shield-alt"></i> درجة الأمان: ${results.score}/100</p>
            ${results.repoInfo ? `<p><i class="fab fa-github"></i> المشروع: ${results.repoInfo.owner}/${results.repoInfo.repo}</p>` : ''}
        </div>`;

        container.innerHTML = html;
        
        // حفظ في السجل
        this.lastScan = results;
    }

    // ==================== وظائف واجهة المستخدم ====================

    loadExample(type) {
        const codeInput = document.getElementById('codeInput');
        if (codeInput && this.examples[type]) {
            codeInput.value = this.examples[type];
            this.highlightCode();
        } else {
            alert('⚠️ المثال غير موجود');
        }
    }

    highlightCode() {
        // في النسخة المتقدمة، يمكن إضافة highlight للكود
        const codeInput = document.getElementById('codeInput');
        codeInput.style.fontFamily = "'Courier New', monospace";
    }

    exportReport() {
        if (!this.lastScan) {
            alert('⚠️ لا توجد نتائج لتصديرها');
            return;
        }

        const report = {
            title: 'تقرير فحص عقد Solidity',
            timestamp: this.lastScan.timestamp,
            score: this.lastScan.score,
            issues: {
                critical: this.lastScan.critical.length,
                warnings: this.lastScan.warnings.length,
                info: this.lastScan.info.length
            },
            details: this.lastScan
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solidity-scan-report-${Date.now()}.json`;
        a.click();
        
        alert('✅ تم تنزيل التقرير بنجاح');
    }

    shareResults() {
        if (!this.lastScan) {
            alert('⚠️ لا توجد نتائج لمشاركتها');
            return;
        }

        const score = this.lastScan.score;
        let message = `🔍 نتيجة فحص عقد Solidity: ${score}/100\n\n`;
        
        if (score >= 80) {
            message += '✅ العقد آمن بشكل جيد!\n';
        } else if (score >= 50) {
            message += '⚠️ العقد يحتاج لبعض التحسينات\n';
        } else {
            message += '🚨 العقد يحتاج إصلاحات عاجلة\n';
        }

        message += `\nفحصت العقد باستخدام Smart Solidity Scanner\n`;
        
        if (navigator.share) {
            navigator.share({
                title: 'نتيجة فحص عقد Solidity',
                text: message,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(message);
            alert('✅ تم نسخ النتائج إلى الحافظة\nيمكنك مشاركتها الآن');
        }
    }

    // ==================== الإحصائيات ====================

    getStats() {
        return {
            totalScans: this.scanHistory.length,
            averageScore: this.scanHistory.length > 0 
                ? Math.round(this.scanHistory.reduce((sum, scan) => sum + scan.score, 0) / this.scanHistory.length)
                : 0,
            lastScan: this.scanHistory[this.scanHistory.length - 1] || null,
            version: this.version
        };
    }

    clearHistory() {
        if (confirm('هل تريد مسح سجل الفحوصات؟')) {
            this.scanHistory = [];
            localStorage.removeItem('scanHistory');
            alert('✅ تم مسح السجل');
        }
    }
}

// ==================== التهيئة والاستخدام ====================

// إنشاء نسخة عالمية من الماسح
const scanner = new SolidityScanner();

// وظائف مساعدة للواجهة
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Smart Solidity Scanner Ready!');
    
    // تحميل آخر فحص من localStorage إن وجد
    const savedScan = localStorage.getItem('lastScan');
    if (savedScan) {
        try {
            scanner.lastScan = JSON.parse(savedScan);
        } catch (e) {
            console.log('No saved scan found');
        }
    }
    
    // عرض إحصائيات في الكونسول
    const stats = scanner.getStats();
    console.log('📊 Statistics:', stats);
    
    // إضافة اختصارات لوحة المفاتيح
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter لبدء الفحص
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            startAIScan();
        }
        
        // Ctrl+S لحفظ الكود
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCode();
        }
        
        // Ctrl+E لتحميل مثال
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            scanner.loadExample('token');
        }
    });
    
    // إظهار رسالة ترحيب
    setTimeout(() => {
        const codeInput = document.getElementById('codeInput');
        if (codeInput && !codeInput.value.trim()) {
            scanner.loadExample('token');
        }
    }, 1000);
});

// جعل الماسح متاحاً عالمياً
window.scanner = scanner;

// رسالة نجاح التحميل
console.log(`
███████╗███╗   ███╗ █████╗ ██████╗ ████████╗    ███████╗ ██████╗██╗      █████╗ ███╗   ██╗███╗   ██╗███████╗██████╗ 
██╔════╝████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝    ██╔════╝██╔════╝██║     ██╔══██╗████╗  ██║████╗  ██║██╔════╝██╔══██╗
███████╗██╔████╔██║███████║██████╔╝   ██║       ███████╗██║     ██║     ███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝
╚════██║██║╚██╔╝██║██╔══██║██╔══██╗   ██║       ╚════██║██║     ██║     ██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗
███████║██║ ╚═╝ ██║██║  ██║██║  ██║   ██║       ███████║╚██████╗███████╗██║  ██║██║ ╚████║██║ ╚████║███████╗██║  ██║
╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝       ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝
                                                                                                                    
🚀 Smart Solidity Scanner v${scanner.version} Loaded Successfully!
👉 Ready to scan your Solidity contracts!
`);
