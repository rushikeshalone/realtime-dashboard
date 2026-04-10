const path = require('path');
const fs = require('fs').promises;
const ollamaService = require('../services/ollama.service');
const pineconeService = require('../services/pinecone.service');
const queryHistoryService = require('../services/queryHistory.service');
const queryCacheService = require('../services/queryCache.service');

// For now, use prompts_data folder in backend
const PROMPT_DIR = path.join(__dirname, '../prompts_data');
const SYSTEM_PROMPT_PATH = path.join(PROMPT_DIR, 'sql_generator_prompt.txt');

exports.generateSQL = async (req, res) => {
    let queryHistoryId = null;

    try {
        const { query, history = [] } = req.body;

        if (!query) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }

        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  🤖 AI-POWERED SQL GENERATION WORKFLOW'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        const startTime = Date.now();
        console.log(`\n⏱️  Started: ${new Date().toISOString()}`);
        console.log(`👤 User Query: "${query}"`);
        console.log(`📚 Chat History: ${history.length} messages`);

        // ===============================================================================
        // STEP 1: Generate Embedding
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 1️⃣  : GENERATE TEXT EMBEDDING');
        console.log('─'.repeat(100));
        console.log('🔧 Model: mxbai-embed-large:latest (669 MB)');
        console.log('📝 Input: User question/prompt');
        console.log('🎯 Purpose: Convert text to vector for semantic search');

        let queryEmbedding;
        try {
            console.log('⏳ Generating embedding...');
            queryEmbedding = await ollamaService.generateEmbeddings(query);
            console.log(`✅ Embedding created: ${queryEmbedding.length} dimensions`);
            console.log(`📊 Vector preview: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(3)).join(', ')}...]`);
        } catch (error) {
            console.warn('⚠️  Ollama embeddings not available:', error.message);
            console.log('💡 Fallback: Will use full context from text file');
            queryEmbedding = null;
        }

        // ===============================================================================
        // STEP 2: Check Query Cache
        // ===============================================================================
        if (queryEmbedding) {
            console.log('\n' + '─'.repeat(100));
            console.log('STEP 2️⃣ : CHECK IN-MEMORY CACHE');
            console.log('─'.repeat(100));
            console.log('🏃 Purpose: Fast retrieval of previously answered queries');
            console.log('⚡ Similarity threshold: 0.95');

            const cached = queryCacheService.get(queryEmbedding, 0.95);
            if (cached) {
                const processingTime = Date.now() - startTime;
                console.log(`\n🎯 CACHE HIT! ✅`);
                console.log(`💾 Cached SQL: ${cached.sql.substring(0, 80)}...`);
                console.log(`⏱️  Processing time: ${processingTime}ms`);
                console.log(`📊 Similarity score: ${(cached.similarity * 100).toFixed(2)}%`);
                console.log('\n' + '█'.repeat(100));
                console.log('✅ COMPLETED - Using cached result\n');

                return res.json({
                    success: true,
                    data: cached.sql,
                    meta: {
                        processingTime: processingTime,
                        ragEnabled: false,
                        contextSource: 'cache',
                        similarity: cached.similarity,
                        cached: true
                    }
                });
            }
            console.log('❌ No cache hit - proceeding to Pinecone search');
        }

        // ===============================================================================
        // STEP 3: Search Pinecone Vector Database
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 3️⃣ : VECTOR DATABASE SEARCH (PINECONE)');
        console.log('─'.repeat(100));
        console.log('🌲 Database: Pinecone (Vector DB)');
        console.log('🔍 Purpose: Find semantically similar context/knowledge');
        console.log('📊 Search type: Semantic similarity search');

        let relevantContext = '';
        let usedTextFile = true;
        let bestScore = 0;

        if (queryEmbedding) {
            try {
                console.log('⏳ Searching Pinecone for relevant context...');
                const matches = await pineconeService.query(queryEmbedding, 3);
                
                if (matches && matches.length > 0) {
                    bestScore = matches[0].score;
                    console.log(`✅ Found ${matches.length} matches`);
                    console.log(`📊 Best match score: ${(bestScore * 100).toFixed(2)}%`);
                    
                    matches.forEach((m, i) => {
                        console.log(`   [${i+1}] Score: ${(m.score * 100).toFixed(2)}% | "${m.metadata.text.substring(0, 60)}..."`);
                    });
                    
                    if (bestScore >= 0.3) {
                        const distinctLines = [...new Set(matches.map(m => m.metadata.text))];
                        relevantContext = distinctLines.join('\n');
                        usedTextFile = false;
                        console.log(`\n✅ Using Pinecone results as context`);
                    } else {
                        console.log(`\n⚠️  Score too low (${(bestScore*100).toFixed(2)}% < 30%) - falling back to text`);
                    }
                } else {
                    console.log('❌ No matches found in Pinecone');
                }
            } catch (error) {
                console.warn('⚠️  Pinecone search failed:', error.message);
            }
        }

        // ===============================================================================
        // STEP 4: Fallback - Load Context from Text File
        // ===============================================================================
        if (usedTextFile) {
            console.log('\n' + '─'.repeat(100));
            console.log('STEP 4️⃣ : LOAD CONTEXT FROM PROMPT FILE (FALLBACK)');
            console.log('─'.repeat(100));
            console.log('📄 File: prompts_data/sql_generator_prompt.txt');
            console.log('🔄 Purpose: Use full schema context if Pinecone unavailable');

            try {
                relevantContext = await fs.readFile(SYSTEM_PROMPT_PATH, 'utf8');
                console.log(`✅ Loaded prompt file: ${relevantContext.length} characters`);
            } catch (fileError) {
                console.warn('⚠️  Could not load prompt file:', fileError.message);
                relevantContext = 'Banking database schema with accounts, transactions, deposits, loans';
            }
        }

        // ===============================================================================
        // STEP 5: Generate SQL via Ollama
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 5️⃣ : GENERATE SQL QUERY (OLLAMA AI)');
        console.log('─'.repeat(100));
        console.log('🤖 Model: qwen2.5-coder:7b (4.7 GB - SQL Generation)');
        console.log('📝 Input: Schema context + User question + Chat history');
        console.log('🎯 Output: SQL query');

        let systemPrompt = relevantContext || 'Generate accurate SQL for banking database';

        let historyPrompt = '';
        if (history && history.length > 0) {
            console.log(`\n📚 Including chat history: ${history.length} messages`);
            const limitedHistory = history.slice(-3);
            historyPrompt = limitedHistory.map(h => {
                if (h.role === 'user') return `User: ${h.content}`;
                if (h.role === 'assistant') return `SQL: ${h.content}`;
                return '';
            }).filter(Boolean).join('\n') + '\n\n';
        }

        const fullPrompt = `${systemPrompt}\n\n${historyPrompt}User: ${query}\nSQL:`;

        console.log(`⏳ Sending to Ollama qwen2.5-coder:7b...`);
        const ollamaStart = Date.now();

        let result;
        try {
            result = await ollamaService.generate(fullPrompt);
        } catch (error) {
            console.error('❌ Ollama generation failed:', error.message);
            return res.status(503).json({
                success: false,
                error: 'Ollama service unavailable',
                message: 'Could not generate SQL'
            });
        }

        const ollamaDuration = Date.now() - ollamaStart;
        const generatedText = result.response.trim();
        let responseType = 'message';
        let responseData = generatedText;

        // Detect if it is SQL
        const upperText = generatedText.toUpperCase();
        if (
            (upperText.includes('SELECT') && upperText.includes('FROM')) ||
            upperText.startsWith('WITH') ||
            upperText.includes('```SQL')
        ) {
            responseType = 'sql';
            // Extract SQL if wrapped in code blocks
            const codeBlockMatch = generatedText.match(/```(?:sql)?\s*([\s\S]*?)```/i);
            if (codeBlockMatch && codeBlockMatch[1]) {
                responseData = codeBlockMatch[1].trim();
            } else {
                responseData = generatedText;
            }
        }

        console.log(`\n✅ SQL Generated in ${ollamaDuration}ms`);
        console.log(`📝 Type: ${responseType.toUpperCase()}`);
        console.log(`📊 Length: ${responseData.length} characters`);
        console.log(`\n🔍 Generated ${responseType}:\n${responseData.substring(0, 150)}${responseData.length > 150 ? '...' : ''}`);

        const processingTime = Date.now() - startTime;

        // Cache the result if it's SQL
        if (responseType === 'sql' && queryEmbedding) {
            queryCacheService.set(queryEmbedding, {
                sql: responseData,
                userQuery: query
            });
            console.log(`\n💾 Cached for future use`);
        }

        console.log('\n' + '█'.repeat(100));
        console.log(`✅ COMPLETED SUCCESSFULLY - Total time: ${processingTime}ms - Ollama: ${ollamaDuration}ms`);
        console.log('█'.repeat(100) + '\n');

        res.json({
            success: true,
            type: responseType,
            data: responseData,
            meta: {
                model: result.model || 'qwen2.5-coder:7b',
                duration: result.total_duration || ollamaDuration,
                processingTime: processingTime,
                ragEnabled: !usedTextFile,
                contextSource: usedTextFile ? 'text_file' : 'pinecone',
                similarityScore: bestScore,
                cached: false
            }
        });

    } catch (error) {
        console.error('\n███ CRITICAL ERROR ███');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.log('█'.repeat(100) + '\n');
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Handle Prompt File Upload
 */
exports.uploadPromptFile = async (req, res) => {
    try {
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  📤 PROMPT FILE UPLOAD WORKFLOW'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const startTime = Date.now();
        const fileName = req.file.originalname;
        const filePath = req.file.path;

        console.log(`\n⏱️  Upload Started: ${new Date().toISOString()}`);
        console.log(`📄 File Name: ${fileName}`);
        console.log(`📍 File Path: ${filePath}`);
        console.log(`📦 File Size: ${req.file.size} bytes`);

        // ===============================================================================
        // STEP 1: Read File Content
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 1️⃣  : READ AND PARSE FILE CONTENT');
        console.log('─'.repeat(100));

        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 10);

        console.log(`✅ File read successfully`);
        console.log(`📊 Total lines: ${content.split('\n').length}`);
        console.log(`📊 Valid lines (>10 chars): ${lines.length}`);
        console.log(`📝 Content preview: ${content.substring(0, 100)}...`);

        // ===============================================================================
        // STEP 2: Sync with Pinecone (Optional)
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 2️⃣  : SYNC WITH PINECONE VECTOR DATABASE');
        console.log('─'.repeat(100));

        let syncedCount = 0;
        try {
            console.log(`⏳ Embedding first ${Math.min(50, lines.length)} lines for Pinecone...`);
            const linesToSync = lines.slice(0, 50);

            for (let i = 0; i < linesToSync.length; i++) {
                const line = linesToSync[i];
                console.log(`   [${i+1}/${linesToSync.length}] Embedding: "${line.substring(0, 60)}..."`);
                
                try {
                    const embedding = await ollamaService.generateEmbeddings(line);
                    await pineconeService.upsert([{
                        id: Buffer.from(`${fileName}_${Date.now()}_${syncedCount}`).toString('base64'),
                        values: embedding,
                        metadata: { text: line, source: fileName }
                    }]);
                    syncedCount++;
                    if ((i + 1) % 10 === 0) {
                        console.log(`   ✅ Synced ${i + 1} lines`);
                    }
                } catch (lineError) {
                    console.warn(`   ⚠️  Failed to embed line ${i + 1}: ${lineError.message}`);
                }
            }
            console.log(`\n✅ Pinecone sync completed: ${syncedCount} vectors stored`);
        } catch (pineconeError) {
            console.warn(`⚠️  Pinecone sync failed: ${pineconeError.message}`);
            console.log('💡 File uploaded successfully but vector sync skipped');
        }

        const totalTime = Date.now() - startTime;

        console.log('\n' + '█'.repeat(100));
        console.log(`✅ FILE UPLOAD COMPLETED - Total time: ${totalTime}ms`);
        console.log('█'.repeat(100) + '\n');

        res.json({
            success: true,
            message: `File uploaded: ${fileName} (${lines.length} lines, ${syncedCount} vectors synced)`,
            meta: {
                fileName: fileName,
                totalLines: content.split('\n').length,
                validLines: lines.length,
                vectorsSynced: syncedCount,
                processingTime: totalTime
            }
        });
    } catch (error) {
        console.error('\n███ UPLOAD ERROR ███');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.log('█'.repeat(100) + '\n');
        
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Sync with Pinecone
 */
exports.syncPinecone = async (req, res) => {
    try {
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  🔄 PINECONE VECTOR DATABASE SYNC WORKFLOW'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        const startTime = Date.now();
        console.log(`\n⏱️  Sync Started: ${new Date().toISOString()}`);

        // ===============================================================================
        // STEP 1: Discover Files
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 1️⃣  : DISCOVER PROMPT FILES IN prompts_data/');
        console.log('─'.repeat(100));

        const files = await fs.readdir(PROMPT_DIR);
        const txtFiles = files.filter(f => f.endsWith('.txt'));

        console.log(`📁 Directory: ${PROMPT_DIR}`);
        console.log(`📊 Total files: ${files.length}`);
        console.log(`📄 Text files (.txt): ${txtFiles.length}`);
        
        if (txtFiles.length > 0) {
            console.log('\n📋 Files found:');
            txtFiles.forEach((f, i) => {
                console.log(`   [${i+1}] ${f}`);
            });
        }

        if (txtFiles.length === 0) {
            console.log('\n❌ No .txt files found!');
            return res.status(400).json({
                success: false,
                error: 'No .txt files found in prompts_data folder'
            });
        }

        // ===============================================================================
        // STEP 2: Process Each File
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 2️⃣  : PROCESS FILES AND GENERATE EMBEDDINGS');
        console.log('─'.repeat(100));

        let totalCount = 0;
        const fileStats = [];

        for (const file of txtFiles) {
            const fileStartTime = Date.now();
            let fileLineCount = 0;
            let fileSyncCount = 0;

            console.log(`\n📄 Processing: ${file}`);
            try {
                const content = await fs.readFile(path.join(PROMPT_DIR, file), 'utf8');
                const lines = content.split('\n').filter(l => l.trim().length > 10);
                fileLineCount = lines.length;

                console.log(`   📊 Lines: ${content.split('\n').length} total, ${lines.length} valid`);
                console.log(`   ⏳ Generating embeddings for ${Math.min(lines.length, 100)} lines...`);

                for (let i = 0; i < Math.min(lines.length, 100); i++) {
                    const line = lines[i];
                    
                    try {
                        const embedding = await ollamaService.generateEmbeddings(line);
                        await pineconeService.upsert([{
                            id: Buffer.from(`${file}_${totalCount}`).toString('base64'),
                            values: embedding,
                            metadata: { text: line, source: file }
                        }]);
                        fileSyncCount++;
                        totalCount++;

                        // Progress indicator every 20 lines
                        if ((i + 1) % 20 === 0) {
                            console.log(`      ✅ Synced ${i + 1}/${Math.min(lines.length, 100)} lines`);
                        }
                    } catch (lineError) {
                        console.warn(`      ⚠️  Line ${i + 1} failed: ${lineError.message.substring(0, 50)}`);
                    }
                }

                const fileDuration = Date.now() - fileStartTime;
                fileStats.push({
                    file: file,
                    lines: fileLineCount,
                    synced: fileSyncCount,
                    time: fileDuration
                });

                console.log(`   ✅ Completed: ${fileSyncCount}/${Math.min(lines.length, 100)} vectors synced in ${fileDuration}ms`);

            } catch (fileError) {
                console.warn(`   ❌ Error: ${fileError.message}`);
            }
        }

        // ===============================================================================
        // STEP 3: Summary and Statistics
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 3️⃣  : SYNC SUMMARY & STATISTICS');
        console.log('─'.repeat(100));

        const totalTime = Date.now() - startTime;

        console.log('\n📊 Summary by File:');
        fileStats.forEach((stat, i) => {
            console.log(`   [${i+1}] ${stat.file}: ${stat.synced}/${stat.lines} vectors in ${stat.time}ms`);
        });

        console.log(`\n📈 Overall Statistics:`);
        console.log(`   Total Files: ${txtFiles.length}`);
        console.log(`   Total Vectors: ${totalCount}`);
        console.log(`   Total Time: ${totalTime}ms`);
        console.log(`   Avg Time/File: ${(totalTime / txtFiles.length).toFixed(2)}ms`);
        console.log(`   Avg Time/Vector: ${(totalTime / totalCount).toFixed(2)}ms`);

        console.log('\n' + '█'.repeat(100));
        console.log(`✅ SYNC COMPLETED - ${totalCount} vectors from ${txtFiles.length} files - ${totalTime}ms`);
        console.log('█'.repeat(100) + '\n');

        res.json({
            success: true,
            message: `Successfully synchronized ${totalCount} vectors from ${txtFiles.length} files`,
            meta: {
                filesProcessed: txtFiles.length,
                totalVectors: totalCount,
                totalTime: totalTime,
                fileStats: fileStats
            }
        });
    } catch (error) {
        console.error('\n███ SYNC ERROR ███');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.log('█'.repeat(100) + '\n');
        
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Check Ollama Health
 */
exports.checkHealth = async (req, res) => {
    try {
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  🏥 OLLAMA HEALTH CHECK'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        const startTime = Date.now();
        console.log(`\n⏱️  Check Time: ${new Date().toISOString()}`);
        console.log(`🔗 Ollama Endpoint: http://localhost:11434`);

        console.log('\n' + '─'.repeat(100));
        console.log('📊 FETCHING AVAILABLE MODELS');
        console.log('─'.repeat(100));

        console.log('⏳ Connecting to Ollama...');
        const tags = await ollamaService.getTags();
        
        const checkTime = Date.now() - startTime;
        
        console.log(`✅ Connected successfully in ${checkTime}ms`);
        console.log(`\n📋 Available Models: ${tags.length}`);
        
        if (tags && tags.length > 0) {
            tags.forEach((model, i) => {
                console.log(`   [${i+1}] ${model}`);
            });
        }

        console.log('\n' + '█'.repeat(100));
        console.log(`✅ HEALTH CHECK PASSED - ${tags.length} models available`);
        console.log('█'.repeat(100) + '\n');

        res.json({
            success: true,
            status: 'connected',
            models: tags,
            timestamp: new Date().toISOString(),
            responseTime: checkTime
        });
    } catch (error) {
        console.error('\n███ HEALTH CHECK FAILED ███');
        console.error('Error:', error.message);
        console.log('⚠️  Ollama service may not be running on port 11434');
        console.log('💡 Start Ollama with: ollama serve');
        console.log('█'.repeat(100) + '\n');

        res.status(503).json({
            success: false,
            status: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
