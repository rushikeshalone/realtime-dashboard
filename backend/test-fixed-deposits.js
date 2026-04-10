#!/usr/bin/env node

const http = require('http');

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
    query: 'Tell me complete Fixed Deposit details including amount, maturity date, interest rate, and status'
});

console.log('\n' + '█'.repeat(100));
console.log('█' + ' '.repeat(98) + '█');
console.log('█' + '  🏦 FIXED DEPOSIT DETAILS QUERY'.padEnd(99) + '█');
console.log('█' + ' '.repeat(98) + '█');
console.log('█'.repeat(100));

console.log(`\n🚀 Sending request to Ollama...`);
console.log(`📝 Question: "Tell me complete Fixed Deposit details..."`);
console.log(`🔑 API Key: Present`);
console.log(`⏳ Waiting for response...\n`);

const req = http.request(request, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  📊 RESPONSE RECEIVED'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        try {
            const json = JSON.parse(data);

            console.log('\n✅ Status: SUCCESS');
            console.log(`📝 Response Type: ${json.type}`);
            
            console.log('\n' + '─'.repeat(100));
            console.log('GENERATED SQL QUERY');
            console.log('─'.repeat(100));
            console.log(`\n${json.data}\n`);

            console.log('─'.repeat(100));
            console.log('METADATA INFORMATION');
            console.log('─'.repeat(100));
            console.log(`\n📊 Meta Details:`);
            console.log(`   Model: ${json.meta.model}`);
            console.log(`   Processing Time: ${json.meta.processingTime}ms`);
            console.log(`   Duration: ${json.meta.duration}ms`);
            console.log(`   RAG Enabled: ${json.meta.ragEnabled}`);
            console.log(`   Context Source: ${json.meta.contextSource}`);
            console.log(`   Similarity Score: ${(json.meta.similarityScore * 100).toFixed(2)}%`);
            console.log(`   Cached: ${json.meta.cached}`);

            console.log('\n' + '█'.repeat(100));
            console.log('✅ QUERY GENERATION COMPLETE');
            console.log('█'.repeat(100) + '\n');

            process.exit(0);
        } catch (error) {
            console.error('\n❌ Parse Error:', error.message);
            console.log('\nRaw Response:', data);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('\n❌ Request Error:', error.message);
    console.log('💡 Make sure server is running on http://localhost:3000');
    process.exit(1);
});

req.write(payload);
req.end();
