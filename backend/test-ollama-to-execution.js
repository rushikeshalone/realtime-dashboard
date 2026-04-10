#!/usr/bin/env node

const http = require('http');

// ===================================================================
// STEP 1: Ask Ollama to generate SQL
// ===================================================================
function askOllama() {
    return new Promise((resolve, reject) => {
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  🤖 STEP 1: ASK OLLAMA FOR SQL QUERY'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        const request = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/chat/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'Trust@2026'
            }
        };

        const payload = JSON.stringify({
            query: 'Show me complete fixed deposit details with deposit amount, maturity amount, interest rate and status'
        });

        console.log(`\n📝 Question: "Show me complete fixed deposit details..."`);
        console.log(`⏳ Waiting for Ollama response...\n`);

        const req = http.request(request, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);

                    if (!json.success) {
                        console.error('❌ Ollama Error:', json.error);
                        reject(new Error(json.error));
                        return;
                    }

                    console.log('\n' + '─'.repeat(100));
                    console.log('✅ OLLAMA RESPONSE');
                    console.log('─'.repeat(100));
                    console.log(`\n📊 Response Type: ${json.type}`);
                    console.log(`🤖 Model Used: ${json.meta.model}`);
                    console.log(`⏱️  Processing Time: ${json.meta.processingTime}ms`);
                    console.log(`🌲 Context Source: ${json.meta.contextSource}`);
                    console.log(`📈 Similarity Score: ${(json.meta.similarityScore * 100).toFixed(2)}%`);
                    
                    console.log(`\n🎯 GENERATED SQL QUERY:`);
                    console.log(`\n${json.data}\n`);
                    console.log('─'.repeat(100));

                    resolve(json.data);
                } catch (error) {
                    console.error('Parse Error:', error.message);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request Error:', error.message);
            reject(error);
        });

        req.write(payload);
        req.end();
    });
}

// ===================================================================
// STEP 2: Execute the SQL on Database
// ===================================================================
function executeLargeQuery(sqlQuery) {
    return new Promise((resolve, reject) => {
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  📊 STEP 2: EXECUTE SQL ON DATABASE'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        const request = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/query/execute-large-query',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'Trust@2026'
            }
        };

        const payload = JSON.stringify({
            query: sqlQuery,
            stream: true
        });

        console.log(`\n🔥 Executing SQL on Database...`);
        console.log(`📋 Endpoint: /api/query/execute-large-query`);
        console.log(`⚡ Mode: Streaming (for large datasets)`);
        console.log(`⏳ Waiting for results...\n`);

        const req = http.request(request, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);

                    console.log('\n' + '─'.repeat(100));
                    console.log('✅ DATABASE EXECUTION COMPLETE');
                    console.log('─'.repeat(100));

                    if (json.success) {
                        console.log(`\n✅ Status: SUCCESS`);
                        console.log(`📦 Records Found: ${json.data.length}`);
                        console.log(`⏱️  Execution Time: ${json.meta.executionTime}ms`);
                        console.log(`📊 Query Type: ${json.meta.queryType}`);
                        
                        if (json.data.length > 0) {
                            console.log(`\n📋 COLUMN HEADERS:`);
                            const firstRecord = json.data[0];
                            Object.keys(firstRecord).forEach((key, idx) => {
                                console.log(`   [${idx + 1}] ${key}`);
                            });

                            console.log(`\n📊 DATA SAMPLES (First 5 records):`);
                            console.log('─'.repeat(100));
                            
                            json.data.slice(0, 5).forEach((record, idx) => {
                                console.log(`\n Record #${idx + 1}:`);
                                Object.entries(record).forEach(([key, value]) => {
                                    const displayValue = value === null ? 'NULL' : value;
                                    console.log(`   ${key}: ${displayValue}`);
                                });
                            });

                            if (json.data.length > 5) {
                                console.log(`\n... and ${json.data.length - 5} more records`);
                            }
                        } else {
                            console.log(`\nℹ️  No records found matching the query`);
                        }

                        console.log('\n' + '─'.repeat(100));
                    } else {
                        console.error(`\n❌ Error: ${json.error}`);
                    }

                    resolve(json);
                } catch (error) {
                    console.error('Parse Error:', error.message);
                    console.log('Raw Response:', data.substring(0, 500));
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request Error:', error.message);
            reject(error);
        });

        req.write(payload);
        req.end();
    });
}

// ===================================================================
// MAIN: Execute Flow
// ===================================================================
async function main() {
    try {
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  🚀 OLLAMA SQL GENERATION + DATABASE EXECUTION'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        // Step 1: Ask Ollama
        const generatedSQL = await askOllama();

        // Step 2: Execute on Database
        const result = await executeLargeQuery(generatedSQL);

        // Final Summary
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  ✅ COMPLETE WORKFLOW EXECUTED SUCCESSFULLY'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));
        console.log('\n📈 FINAL SUMMARY:');
        console.log(`   ✅ Ollama generated SQL successfully`);
        console.log(`   ✅ SQL executed on database`);
        console.log(`   ✅ Results retrieved: ${result.data?.length || 0} records`);
        console.log(`   ✅ Complete workflow flow completed\n`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.log('\n💡 Make sure server is running on http://localhost:3000');
        process.exit(1);
    }
}

// Run
main();
