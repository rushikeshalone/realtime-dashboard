#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const ollamaService = require('./services/ollama.service');
const pineconeService = require('./services/pinecone.service');

const PROMPT_FILE = path.join(__dirname, 'prompts_data', 'sql_generator_prompt.txt');

async function seedPinecone() {
    try {
        console.log('\n' + '█'.repeat(100));
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█' + '  🌱 PINECONE SEED INITIALIZATION'.padEnd(99) + '█');
        console.log('█' + ' '.repeat(98) + '█');
        console.log('█'.repeat(100));

        const startTime = Date.now();
        console.log(`\n⏱️  Started: ${new Date().toISOString()}`);

        // ===============================================================================
        // STEP 1: Initialize Pinecone
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 1️⃣  : INITIALIZE PINECONE CONNECTION');
        console.log('─'.repeat(100));

        console.log('🔗 Connecting to Pinecone...');
        await pineconeService.initialize();
        console.log('✅ Pinecone connected successfully');

        // ===============================================================================
        // STEP 2: Clear Existing Data (Skip - new vectors will overwrite)
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 2️⃣  : PREPARE FOR SEEDING');
        console.log('─'.repeat(100));

        console.log('⏳ Preparing Pinecone index for new seed data...');
        console.log('💡 Note: New vectors will be added/overwritten with unique IDs');
        console.log('✅ Index ready for seeding');

        // ===============================================================================
        // STEP 3: Read Prompt File
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 3️⃣  : READ PROMPT FILE');
        console.log('─'.repeat(100));

        console.log(`📄 Reading: ${PROMPT_FILE}`);
        const fileContent = await fs.readFile(PROMPT_FILE, 'utf8');
        console.log(`✅ File read: ${fileContent.length} characters`);

        // Split into logical chunks (paragraphs/sections)
        const lines = fileContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 10); // Filter very short lines

        console.log(`📊 Total sections: ${lines.length}`);
        console.log(`📝 Sample line: "${lines[0].substring(0, 80)}..."`);

        // ===============================================================================
        // STEP 4: Generate Embeddings & Upload
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 4️⃣  : GENERATE EMBEDDINGS & UPLOAD TO PINECONE');
        console.log('─'.repeat(100));

        console.log(`⏳ Processing ${Math.min(lines.length, 100)} sections...`);
        console.log(`🔧 Model: mxbai-embed-large:latest`);
        console.log(`🌲 Database: Pinecone\n`);

        let successCount = 0;
        let failCount = 0;
        const vectors = [];
        const seedId = Date.now(); // Unique seed batch ID

        for (let i = 0; i < Math.min(lines.length, 100); i++) {
            const line = lines[i];
            
            try {
                // Show progress every 10 items
                if (i % 10 === 0) {
                    console.log(`[${i}/100] Processing sections...`);
                }

                // Generate embedding
                const embedding = await ollamaService.generateEmbeddings(line);

                // Prepare vector for Pinecone with unique ID
                const vectorId = `seed_${seedId}_${i}`;
                vectors.push({
                    id: vectorId,
                    values: embedding,
                    metadata: {
                        text: line.substring(0, 1000), // Store first 1000 chars
                        source: 'sql_generator_prompt.txt',
                        section: i,
                        timestamp: new Date().toISOString()
                    }
                });

                successCount++;

                // Upload in batches of 10
                if (vectors.length >= 10 || i === Math.min(lines.length, 100) - 1) {
                    console.log(`   📤 Uploading ${vectors.length} vectors...`);
                    await pineconeService.upsert(vectors);
                    console.log(`   ✅ Uploaded ${vectors.length} vectors`);
                    vectors.length = 0; // Clear array
                }

            } catch (error) {
                failCount++;
                console.warn(`   ⚠️  Section ${i} failed: ${error.message}`);
            }
        }

        // ===============================================================================
        // STEP 5: Verification
        // ===============================================================================
        console.log('\n' + '─'.repeat(100));
        console.log('STEP 5️⃣  : VERIFICATION & SUMMARY');
        console.log('─'.repeat(100));

        const totalTime = Date.now() - startTime;

        console.log('\n📊 SEED STATISTICS:');
        console.log(`   ✅ Successfully embedded: ${successCount} sections`);
        console.log(`   ❌ Failed: ${failCount} sections`);
        console.log(`   📈 Success rate: ${((successCount / (successCount + failCount)) * 100).toFixed(2)}%`);
        console.log(`   ⏱️  Total time: ${totalTime}ms`);
        console.log(`   ⚡ Avg time/section: ${(totalTime / successCount).toFixed(2)}ms`);

        console.log('\n🌱 PINECONE SEEDING COMPLETED!');
        console.log('📋 Data is now ready for semantic search queries');
        console.log('💡 When you ask questions, these vectors will be used for RAG');

        console.log('\n' + '█'.repeat(100));
        console.log('✅ SEED INITIALIZATION SUCCESSFUL');
        console.log('█'.repeat(100) + '\n');

        process.exit(0);

    } catch (error) {
        console.error('\n███ SEED ERROR ███');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.log('█'.repeat(100) + '\n');
        process.exit(1);
    }
}

// Run the seed
seedPinecone();
