// ============================================
// 🔬 GitHub Deep Analyzer v3.0
// تحليل متقدم لملفات ومكتبات Solidity
// فحص كل ملف على حدة مع تقارير مستقلة
// ============================================

class GitHubDeepAnalyzer {
    constructor() {
        this.api = {
            base: 'https://api.github.com',
            token: null, // يمكن إضافة توكن لزيادة الحدود
            retries: 3,
            timeout: 30000
        };
        
        this.analysisQueue = [];
        this.results = {
            project: null,
            files: [],
            libraries: [],
            dependencies: [],
            vulnerabilities: [],
            summary: {}
        };
        
        this.supportedLibraries = this.initSupportedLibraries();
        this.init();
    }

    init() {
        // محاولة استرجاع توكن GitHub من localStorage
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) {
            this.api.token = savedToken;
        }
        
        console.log('🔬 GitHub Deep Analyzer initialized');
    }

    // المكتبات المدعومة للتحليل العميق
    initSupportedLibraries() {
        return {
            '@openzeppelin/contracts': {
                name: 'OpenZeppelin Contracts',
                version: 'latest',
                files: {},
                vulnerabilities: this.loadOpenZeppelinVulns()
            },
            '@openzeppelin/contracts-upgradeable': {
                name: 'OpenZeppelin Upgradeable',
                version: 'latest',
                files: {}
            },
            '@chainlink/contracts': {
                name: 'Chainlink Contracts',
                version: 'latest',
                files: {}
            },
            '@uniswap/v3-core': {
                name: 'Uniswap V3 Core',
                version: 'latest',
                files: {}
            },
            '@uniswap/v2-core': {
                name: 'Uniswap V2 Core',
                version: 'latest',
                files: {}
            },
            '@aave/protocol-v2': {
                name: 'Aave V2',
                version: 'latest',
                files: {}
            },
            '@compound-finance/compound-protocol': {
                name: 'Compound Protocol',
                version: 'latest',
                files: {}
            }
        };
    }

    // تحميل ثغرات OpenZeppelin المعروفة
    loadOpenZeppelinVulns() {
        return [
            {
                version: '<=3.4.1',
                files: ['ERC20.sol', 'ERC721.sol'],
                vulnerability: 'Initializable - Reentrancy',
                severity: 'critical',
                cve: 'CVE-2021-41264'
            },
            {
                version: '<=4.7.1',
                files: ['ERC1155.sol'],
                vulnerability: 'Approval race condition',
                severity: 'high',
                cve: 'CVE-2022-31172'
            }
            // المزيد من الثغرات...
        ];
    }

    // ================ الوظائف الرئيسية ================

    /**
     * فتح مستودع GitHub وتحليل كامل
     */
    async analyzeRepository(repoUrl, options = {}) {
        const startTime = Date.now();
        
        // تحديث واجهة المستخدم
        UI.showProgress();
        UI.updateProgress(5, 'جاري تحليل رابط GitHub...');

        try {
            // 1. استخراج معلومات المستودع
            const repoInfo = this.parseGitHubUrl(repoUrl);
            if (!repoInfo) {
                throw new Error('رابط GitHub غير صالح');
            }

            UI.updateProgress(10, `تم التعرف على: ${repoInfo.owner}/${repoInfo.repo}`);
            
            // 2. جلب جميع ملفات Solidity
            const solidityFiles = await this.fetchAllSolidityFiles(repoInfo, options);
            
            UI.updateProgress(30, `تم العثور على ${solidityFiles.length} ملف Solidity`);
            
            // 3. تصنيف الملفات إلى رئيسية ومكتبات
            const classifiedFiles = this.classifyFiles(solidityFiles, repoInfo);
            
            UI.updateProgress(40, `تم تصنيف الملفات: ${classifiedFiles.source.length} رئيسي، ${classifiedFiles.libraries.length} مكتبة`);
            
            // 4. تحليل كل ملف على حدة (المكتبات أولاً)
            const analysisResults = await this.analyzeAllFiles(classifiedFiles, options);
            
            UI.updateProgress(80, 'جاري تجميع النتائج...');
            
            // 5. تجميع النتائج حسب المكتبة
            const groupedResults = this.groupResultsByLibrary(analysisResults);
            
            // 6. تحليل شجرة التبعيات
            const dependencyTree = await this.buildDependencyTree(classifiedFiles);
            
            // 7. كشف الإصدارات القديمة
            if (options.detectOutdated) {
                await this.checkOutdatedVersions(classifiedFiles.libraries);
            }
            
            // 8. توليد التقرير النهائي
            const finalReport = this.generateFinalReport({
                repoInfo,
                files: classifiedFiles,
                results: groupedResults,
                dependencies: dependencyTree,
                scanTime: Date.now() - startTime,
                options
            });
            
            UI.updateProgress(100, 'اكتمل التحليل بنجاح!');
            
            return finalReport;
            
        } catch (error) {
            console.error('GitHub analysis failed:', error);
            UI.showError(`فشل التحليل: ${error.message}`);
            throw error;
        } finally {
            UI.hideProgress();
        }
    }

    /**
     * استخراج معلومات من رابط GitHub
     */
    parseGitHubUrl(url) {
        try {
            const patterns = [
                /github\.com\/([^\/]+)\/([^\/]+)/,
                /github\.com\/([^\/]+)\/([^\/]+)\.git/,
                /github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)/,
                /github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return {
                        owner: match[1],
                        repo: match[2].replace('.git', ''),
                        branch: match[3] || 'main',
                        path: match[4] || ''
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('URL parsing error:', error);
            return null;
        }
    }

    /**
     * جلب جميع ملفات Solidity من المستودع
     */
    async fetchAllSolidityFiles(repoInfo, options) {
        const files = [];
        const queue = [repoInfo.path || ''];
        const processed = new Set();
        
        while (queue.length > 0) {
            const path = queue.shift();
            
            if (processed.has(path)) continue;
            processed.add(path);
            
            try {
                const url = `${this.api.base}/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${path}?ref=${repoInfo.branch}`;
                
                const response = await this.fetchWithRetry(url);
                const contents = await response.json();
                
                if (Array.isArray(contents)) {
                    for (const item of contents) {
                        if (item.type === 'dir') {
                            queue.push(item.path);
                        } else if (item.type === 'file' && item.name.endsWith('.sol')) {
                            files.push({
                                name: item.name,
                                path: item.path,
                                url: item.download_url,
                                size: item.size,
                                sha: item.sha,
                                type: 'solidity'
                            });
                        }
                    }
                } else if (contents.type === 'file' && contents.name.endsWith('.sol')) {
                    files.push({
                        name: contents.name,
                        path: contents.path,
                        url: contents.download_url,
                        size: contents.size,
                        sha: contents.sha,
                        type: 'solidity'
                    });
                }
                
                // تحديث التقدم
                UI.updateProgress(20 + (processed.size / 10), `جاري فحص المجلدات... (${processed.size})`);
                
            } catch (error) {
                console.error(`Failed to fetch ${path}:`, error);
            }
            
            // منع التحميل الزائد على API
            await this.sleep(100);
        }
        
        return files;
    }

    /**
     * تصنيف الملفات إلى رئيسية ومكتبات
     */
    classifyFiles(files, repoInfo) {
        const classified = {
            source: [],     // ملفات الكود الرئيسية
            libraries: [],  // ملفات المكتبات
            interfaces: [], // واجهات
            test: [],      // ملفات الاختبار
            unknown: []    // غير مصنف
        };
        
        const libraryPaths = [
            'node_modules',
            'lib',
            'dependencies',
            'vendor',
            '@openzeppelin',
            '@chainlink',
            '@uniswap',
            '@aave',
            '@compound-finance'
        ];
        
        files.forEach(file => {
            const isLibrary = libraryPaths.some(path => 
                file.path.includes(path) || 
                file.path.includes('node_modules') ||
                file.path.includes('lib/') ||
                this.isKnownLibrary(file)
            );
            
            const isTest = file.path.includes('test') || 
                          file.path.includes('tests') || 
                          file.path.includes('mocks');
            
            const isInterface = file.name.includes('IERC') || 
                              file.name.startsWith('I') && 
                              file.name[1] === file.name[1].toUpperCase();
            
            if (isLibrary) {
                classified.libraries.push({
                    ...file,
                    library: this.identifyLibrary(file)
                });
            } else if (isTest) {
                classified.test.push(file);
            } else if (isInterface) {
                classified.interfaces.push(file);
            } else if (file.path.includes('contracts') || file.path.includes('src')) {
                classified.source.push(file);
            } else {
                classified.unknown.push(file);
            }
        });
        
        return classified;
    }

    /**
     * التعرف على المكتبة من اسم الملف والمسار
     */
    identifyLibrary(file) {
        const path = file.path.toLowerCase();
        const name = file.name.toLowerCase();
        
        for (const [key, lib] of Object.entries(this.supportedLibraries)) {
            if (path.includes(key.toLowerCase()) || 
                path.includes(lib.name.toLowerCase()) ||
                name.includes(key.split('/').pop())) {
                return {
                    ...lib,
                    id: key,
                    file: file.name,
                    version: this.extractVersion(path) || 'unknown'
                };
            }
        }
        
        return {
            id: 'unknown',
            name: 'مكتبة غير معروفة',
            version: this.extractVersion(path) || 'unknown',
            file: file.name
        };
    }

    /**
     * تحليل جميع الملفات (واحد تلو الآخر)
     */
    async analyzeAllFiles(classifiedFiles, options) {
        const results = [];
        const totalFiles = classifiedFiles.source.length + 
                          classifiedFiles.libraries.length + 
                          classifiedFiles.interfaces.length;
        
        UI.updateTotalFiles(totalFiles);
        
        let processed = 0;
        
        // 1. تحليل المكتبات أولاً (إذا طلب المستخدم)
        if (options.includeDeps) {
            for (const file of classifiedFiles.libraries) {
                const result = await this.analyzeSingleFile(file, 'library');
                results.push(result);
                processed++;
                UI.updateProgress(40 + (processed / totalFiles) * 40, 
                                `تحليل مكتبة: ${file.name}`);
            }
        }
        
        // 2. تحليل العقود الرئيسية
        for (const file of classifiedFiles.source) {
            const result = await this.analyzeSingleFile(file, 'source');
            results.push(result);
            processed++;
            UI.updateProgress(40 + (processed / totalFiles) * 40, 
                            `تحليل عقد: ${file.name}`);
        }
        
        // 3. تحليل الواجهات
        for (const file of classifiedFiles.interfaces) {
            const result = await this.analyzeSingleFile(file, 'interface');
            results.push(result);
            processed++;
        }
        
        return results;
    }

    /**
     * تحليل ملف واحد بشكل منفصل
     */
    async analyzeSingleFile(file, type) {
        try {
            // جلب محتوى الملف
            const content = await this.fetchFileContent(file.url);
            
            // تحليل أولي
            const basicAnalysis = this.performBasicAnalysis(content, file);
            
            // تحليل متقدم للثغرات
            const vulnerabilityScan = await this.scanVulnerabilities(content, file);
            
            // تحليل خاص بالمكتبات
            let librarySpecificAnalysis = null;
            if (type === 'library' && file.library) {
                librarySpecificAnalysis = this.analyzeLibraryFile(content, file);
            }
            
            // تحليل نمط الكود
            const codeQuality = this.analyzeCodeQuality(content);
            
            return {
                file,
                type,
                content: content.substring(0, 5000), // حفظ أول 5000 حرف فقط
                lineCount: content.split('\n').length,
                characterCount: content.length,
                basicAnalysis,
                vulnerabilityScan,
                librarySpecificAnalysis,
                codeQuality,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.error(`Failed to analyze ${file.path}:`, error);
            return {
                file,
                type,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * جلب محتوى الملف
     */
    async fetchFileContent(url) {
        try {
            const response = await this.fetchWithRetry(url);
            return await response.text();
        } catch (error) {
            console.error('Failed to fetch file:', error);
            return '';
        }
    }

    /**
     * طلب HTTP مع إعادة المحاولة
     */
    async fetchWithRetry(url, retries = this.api.retries) {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.api.timeout);
                
                const headers = {
                    'Accept': 'application/vnd.github.v3+json'
                };
                
                if (this.api.token) {
                    headers['Authorization'] = `token ${this.api.token}`;
                }
                
                const response = await fetch(url, { 
                    headers,
                    signal: controller.signal 
                });
                
                clearTimeout(timeoutId);
                
                if (response.status === 403) {
                    // تجاوز حد API - تأخير
                    await this.sleep(2000);
                    continue;
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                return response;
                
            } catch (error) {
                if (i === retries - 1) throw error;
                await this.sleep(1000 * (i + 1));
            }
        }
    }

    /**
     * تحليل أساسي للملف
     */
    performBasicAnalysis(content, file) {
        return {
            pragma: this.extractPragma(content),
            imports: this.extractImports(content),
            contracts: this.extractContracts(content),
            functions: this.extractFunctions(content),
            modifiers: this.extractModifiers(content),
            events: this.extractEvents(content)
        };
    }

    /**
     * استخراج تصريح pragma
     */
    extractPragma(content) {
        const pragmaMatch = content.match(/pragma\s+solidity\s+([^;]+);/);
        return pragmaMatch ? pragmaMatch[1].trim() : 'unknown';
    }

    /**
     * استخراج جميع الاستيرادات
     */
    extractImports(content) {
        const imports = [];
        const importRegex = /import\s+(?:[^"']*["']([^"']+)["']|{([^}]+)}\s+from\s+["']([^"']+)["'])/g;
        
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                path: match[1] || match[3],
                symbols: match[2] ? match[2].split(',').map(s => s.trim()) : null,
                line: this.getLineNumber(content, match.index)
            });
        }
        
        return imports;
    }

    /**
     * استخراج العقود
     */
    extractContracts(content) {
        const contracts = [];
        const contractRegex = /(?:contract|library|interface)\s+(\w+)\s*(?:is\s+([^{]+))?\{/g;
        
        let match;
        while ((match = contractRegex.exec(content)) !== null) {
            contracts.push({
                name: match[1],
                inherits: match[2] ? match[2].split(',').map(s => s.trim()) : [],
                line: this.getLineNumber(content, match.index)
            });
        }
        
        return contracts;
    }

    /**
     * استخراج الدوال
     */
    extractFunctions(content) {
        const functions = [];
        const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*(public|private|internal|external)?\s*(?:view|pure|payable)?\s*(?:returns\s*\(([^)]*)\))?/g;
        
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            functions.push({
                name: match[1],
                params: match[2] || '',
                visibility: match[3] || 'public',
                returns: match[4] || '',
                line: this.getLineNumber(content, match.index)
            });
        }
        
        return functions;
    }

    /**
     * تحليل خاص للمكتبات
     */
    analyzeLibraryFile(content, file) {
        const library = file.library;
        
        return {
            library: library.name,
            version: library.version,
            isOutdated: this.checkIfOutdated(library),
            knownVulnerabilities: this.checkKnownVulnerabilities(content, library),
            importedBy: [], // سيتم ملؤه لاحقاً
            usage: this.analyzeLibraryUsage(content)
        };
    }

    /**
     * فحص المكتبات القديمة
     */
    async checkOutdatedVersions(libraryFiles) {
        for (const file of libraryFiles) {
            if (file.library && file.library.id !== 'unknown') {
                const latestVersion = await this.fetchLatestVersion(file.library.id);
                if (latestVersion && this.compareVersions(file.library.version, latestVersion) < 0) {
                    file.library.outdated = true;
                    file.library.latestVersion = latestVersion;
                }
            }
        }
    }

    /**
     * فحص الثغرات في الملف
     */
    async scanVulnerabilities(content, file) {
        const vulnerabilities = [];
        
        // 1. فحص الأنماط المعروفة
        const patterns = VulnerabilityDB.getPatterns();
        
        for (const [category, categoryPatterns] of Object.entries(patterns)) {
            for (const pattern of categoryPatterns) {
                const matches = content.match(pattern.pattern);
                if (matches) {
                    vulnerabilities.push({
                        category,
                        name: pattern.name,
                        description: pattern.description,
                        severity: pattern.severity,
                        matches: matches.length,
                        examples: matches.slice(0, 3),
                        lines: this.findLines(content, pattern.pattern),
                        fix: pattern.fix,
                        cwe: pattern.cwe,
                        file: file.path
                    });
                }
            }
        }
        
        // 2. فحص ثغرات خاصة بالمكتبات
        if (file.library && file.library.id === '@openzeppelin/contracts') {
            const ozVulns = this.checkOpenZeppelinVulnerabilities(content, file.library.version);
            vulnerabilities.push(...ozVulns);
        }
        
        return vulnerabilities;
    }

    /**
     * تجميع النتائج حسب المكتبة
     */
    groupResultsByLibrary(results) {
        const grouped = {
            libraries: {},
            sources: {},
            interfaces: {}
        };
        
        results.forEach(result => {
            if (result.error) return;
            
            if (result.type === 'library') {
                const libName = result.file.library?.name || 'unknown';
                if (!grouped.libraries[libName]) {
                    grouped.libraries[libName] = {
                        name: libName,
                        id: result.file.library?.id || 'unknown',
                        version: result.file.library?.version || 'unknown',
                        files: [],
                        vulnerabilities: [],
                        totalIssues: 0,
                        score: 100
                    };
                }
                
                grouped.libraries[libName].files.push({
                    name: result.file.name,
                    path: result.file.path,
                    analysis: result
                });
                
                if (result.vulnerabilityScan) {
                    grouped.libraries[libName].vulnerabilities.push(
                        ...result.vulnerabilityScan
                    );
                    grouped.libraries[libName].totalIssues += 
                        result.vulnerabilityScan.length;
                }
                
            } else if (result.type === 'source') {
                // تجميع العقود الرئيسية
                const contractName = result.basicAnalysis?.contracts[0]?.name || 'Unknown';
                if (!grouped.sources[contractName]) {
                    grouped.sources[contractName] = {
                        name: contractName,
                        file: result.file,
                        analysis: result
                    };
                }
            }
        });
        
        // حساب الدرجات
        Object.keys(grouped.libraries).forEach(lib => {
            const library = grouped.libraries[lib];
            library.score = this.calculateLibraryScore(library);
        });
        
        return grouped;
    }

    /**
     * بناء شجرة التبعيات
     */
    async buildDependencyTree(classifiedFiles) {
        const tree = {
            root: {
                name: 'Project Root',
                children: []
            }
        };
        
        // خريطة للملفات
        const fileMap = new Map();
        classifiedFiles.source.forEach(f => fileMap.set(f.path, f));
        classifiedFiles.libraries.forEach(f => fileMap.set(f.path, f));
        
        // بناء العلاقات
        for (const file of classifiedFiles.source) {
            if (!file.content) {
                file.content = await this.fetchFileContent(file.url);
            }
            
            const imports = this.extractImports(file.content);
            
            const node = {
                name: file.name,
                path: file.path,
                type: 'source',
                children: []
            };
            
            imports.forEach(imp => {
                // محاولة إيجاد الملف المستورد
                const importedFile = this.findImportedFile(imp.path, fileMap);
                if (importedFile) {
                    node.children.push({
                        name: importedFile.name,
                        path: importedFile.path,
                        type: importedFile.library ? 'library' : 'source',
                        importPath: imp.path
                    });
                }
            });
            
            tree.root.children.push(node);
        }
        
        return tree;
    }

    /**
     * توليد التقرير النهائي
     */
    generateFinalReport(data) {
        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                scanId: `scan_${Date.now()}`,
                version: '3.0.0'
            },
            
            project: {
                name: `${data.repoInfo.owner}/${data.repoInfo.repo}`,
                branch: data.repoInfo.branch,
                url: `https://github.com/${data.repoInfo.owner}/${data.repoInfo.repo}`,
                scanTime: data.scanTime,
                options: data.options
            },
            
            statistics: {
                totalFiles: data.files.source.length + data.files.libraries.length,
                sourceFiles: data.files.source.length,
                libraryFiles: data.files.libraries.length,
                interfaceFiles: data.files.interfaces.length,
                totalLibraries: Object.keys(data.results.libraries).length,
                totalVulnerabilities: this.countTotalVulnerabilities(data.results),
                criticalIssues: this.countSeverityIssues(data.results, 'critical'),
                warnings: this.countSeverityIssues(data.results, 'warning'),
                info: this.countSeverityIssues(data.results, 'info')
            },
            
            libraries: data.results.libraries,
            sources: data.results.sources,
            dependencies: data.dependencies,
            
            summary: {
                overallScore: this.calculateOverallScore(data.results),
                riskLevel: this.determineRiskLevel(data.results),
                recommendations: this.generateRecommendations(data.results)
            },
            
            raw: data
        };
        
        return report;
    }

    /**
     * حساب الدرجة الإجمالية
     */
    calculateOverallScore(results) {
        let totalScore = 0;
        let weight = 0;
        
        // 70% وزن للعقود الرئيسية
        Object.values(results.sources).forEach(source => {
            totalScore += source.analysis?.score || 50;
            weight++;
        });
        
        // 30% وزن للمكتبات
        Object.values(results.libraries).forEach(library => {
            totalScore += library.score * 0.3;
            weight += 0.3;
        });
        
        return weight > 0 ? Math.round(totalScore / weight) : 50;
    }

    /**
     * تحديد مستوى الخطورة
     */
    determineRiskLevel(results) {
        const critical = this.countSeverityIssues(results, 'critical');
        const warnings = this.countSeverityIssues(results, 'warning');
        const score = this.calculateOverallScore(results);
        
        if (critical > 0 || score < 40) return 'high';
        if (warnings > 5 || score < 70) return 'medium';
        if (warnings > 0) return 'low';
        return 'minimal';
    }

    /**
     * توليد التوصيات
     */
    generateRecommendations(results) {
        const recommendations = [];
        
        // توصيات للمكتبات القديمة
        Object.values(results.libraries).forEach(lib => {
            if (lib.version !== 'unknown' && lib.version !== 'latest') {
                recommendations.push({
                    type: 'update',
                    priority: 'medium',
                    library: lib.name,
                    currentVersion: lib.version,
                    action: `تحديث مكتبة ${lib.name} إلى أحدث إصدار`
                });
            }
        });
        
        // توصيات للثغرات الحرجة
        Object.values(results.libraries).forEach(lib => {
            lib.vulnerabilities?.forEach(vuln => {
                if (vuln.severity === 'critical') {
                    recommendations.push({
                        type: 'fix',
                        priority: 'high',
                        library: lib.name,
                        vulnerability: vuln.name,
                        action: vuln.fix
                    });
                }
            });
        });
        
        return recommendations;
    }

    // ================ وظائف مساعدة ================

    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }

    findLines(content, pattern) {
        const lines = [];
        const contentLines = content.split('\n');
        
        contentLines.forEach((line, i) => {
            if (pattern.test(line)) {
                lines.push(i + 1);
            }
        });
        
        return lines;
    }

    isKnownLibrary(file) {
        const knownPaths = [
            'openzeppelin',
            'chainlink',
            'uniswap',
            'aave',
            'compound',
            'sushiswap',
            'balancer'
        ];
        
        return knownPaths.some(path => 
            file.path.toLowerCase().includes(path)
        );
    }

    extractVersion(path) {
        const versionPatterns = [
            /@\d+\.\d+\.\d+/,
            /v\d+\.\d+\.\d+/,
            /version[-_]?(\d+\.\d+\.\d+)/
        ];
        
        for (const pattern of versionPatterns) {
            const match = path.match(pattern);
            if (match) {
                return match[0].replace('@', '').replace('v', '');
            }
        }
        
        return 'unknown';
    }

    findImportedFile(importPath, fileMap) {
        // محاولات مختلفة للعثور على الملف
        const candidates = [
            importPath,
            importPath.replace('./', ''),
            importPath.replace('../', ''),
            `contracts/${importPath.split('/').pop()}`,
            `src/${importPath.split('/').pop()}`,
            `node_modules/${importPath}`
        ];
        
        for (const candidate of candidates) {
            for (const [path, file] of fileMap.entries()) {
                if (path.endsWith(candidate) || path.includes(candidate)) {
                    return file;
                }
            }
        }
        
        return null;
    }

    async fetchLatestVersion(libraryId) {
        // محاكاة - في الإنتاج تستخدم npm registry
        const versions = {
            '@openzeppelin/contracts': '4.9.3',
            '@openzeppelin/contracts-upgradeable': '4.9.3',
            '@chainlink/contracts': '0.6.1',
            '@uniswap/v3-core': '1.0.1'
        };
        
        return versions[libraryId] || null;
    }

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        
        return 0;
    }

    checkIfOutdated(library) {
        return library.version !== 'unknown' && 
               library.version !== 'latest' &&
               this.compareVersions(library.version, library.latestVersion || '0.0.0') < 0;
    }

    checkKnownVulnerabilities(content, library) {
        const vulns = [];
        
        if (library.id === '@openzeppelin/contracts') {
            const ozVulns = this.loadOpenZeppelinVulns();
            
            ozVulns.forEach(vuln => {
                if (this.compareVersions(library.version, vuln.version.replace('<=', '')) <= 0) {
                    vuln.files.forEach(file => {
                        if (content.includes(file)) {
                            vulns.push({
                                ...vuln,
                                detected: true,
                                file: file
                            });
                        }
                    });
                }
            });
        }
        
        return vulns;
    }

    analyzeLibraryUsage(content) {
        return {
            functionsCalled: this.extractFunctionCalls(content),
            eventsEmitted: this.extractEvents(content),
            modifiersUsed: this.extractModifiers(content)
        };
    }

    extractFunctionCalls(content) {
        const calls = [];
        const callRegex = /(\w+)\s*\([^)]*\)/g;
        
        let match;
        while ((match = callRegex.exec(content)) !== null) {
            if (!['if', 'for', 'while', 'require', 'assert'].includes(match[1])) {
                calls.push(match[1]);
            }
        }
        
        return [...new Set(calls)];
    }

    extractModifiers(content) {
        const modifiers = [];
        const modifierRegex = /modifier\s+(\w+)/g;
        
        let match;
        while ((match = modifierRegex.exec(content)) !== null) {
            modifiers.push(match[1]);
        }
        
        return modifiers;
    }

    extractEvents(content) {
        const events = [];
        const eventRegex = /event\s+(\w+)/g;
        
        let match;
        while ((match = eventRegex.exec(content)) !== null) {
            events.push(match[1]);
        }
        
        return events;
    }

    countTotalVulnerabilities(results) {
        let count = 0;
        
        Object.values(results.libraries).forEach(lib => {
            count += lib.vulnerabilities?.length || 0;
        });
        
        Object.values(results.sources).forEach(src => {
            count += src.analysis?.vulnerabilityScan?.length || 0;
        });
        
        return count;
    }

    countSeverityIssues(results, severity) {
        let count = 0;
        
        Object.values(results.libraries).forEach(lib => {
            lib.vulnerabilities?.forEach(vuln => {
                if (vuln.severity === severity) count++;
            });
        });
        
        Object.values(results.sources).forEach(src => {
            src.analysis?.vulnerabilityScan?.forEach(vuln => {
                if (vuln.severity === severity) count++;
            });
        });
        
        return count;
    }

    calculateLibraryScore(library) {
        let score = 100;
        
        // خصم للإصدارات القديمة
        if (library.version === 'unknown') score -= 10;
        if (library.outdated) score -= 15;
        
        // خصم للثغرات
        library.vulnerabilities?.forEach(vuln => {
            if (vuln.severity === 'critical') score -= 30;
            if (vuln.severity === 'high') score -= 20;
            if (vuln.severity === 'medium') score -= 10;
            if (vuln.severity === 'low') score -= 5;
        });
        
        return Math.max(0, Math.min(100, score));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// تصدير للاستخدام
window.GitHubDeepAnalyzer = GitHubDeepAnalyzer;
