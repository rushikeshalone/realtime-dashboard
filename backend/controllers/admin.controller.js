const path = require('path');
const fs = require('fs').promises;
const ollamaService = require('../services/ollama.service');
const pineconeService = require('../services/pinecone.service');
const queryHistoryService = require('../services/queryHistory.service');

exports.updatePineconeFromPrompt = async (req, res) => {
    try {
        console.log('🌲 Updating Pinecone from system prompt...');

        pineconeService.initialize();

        const promptDir = path.join(__dirname, '../prompts_data');
        const promptPath = path.join(promptDir, 'sql_generator_prompt.txt');

        let promptContent;
        try {
            promptContent = await fs.readFile(promptPath, 'utf8');
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Prompt file not found',
                message: 'Please upload sql_generator_prompt.txt first'
            });
        }

        const lines = promptContent.split('\n');
        const itemsToEmbed = [];

        // Simple extraction: capture meaningful lines
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 10 && !trimmed.startsWith('#') && !trimmed.startsWith('--')) {
                itemsToEmbed.push({
                    id: Buffer.from(trimmed.substring(0, 50)).toString('base64'),
                    text: trimmed
                });
            }
        }

        const vectors = [];
        let successCount = 0;

        for (const item of itemsToEmbed.slice(0, 100)) { // Limit to 100 for speed
            try {
                const embedding = await ollamaService.generateEmbeddings(item.text);
                vectors.push({
                    id: item.id,
                    values: embedding,
                    metadata: { text: item.text }
                });
                successCount++;
            } catch (error) {
                console.warn('⚠️ Failed to embed:', item.text.substring(0, 50));
            }
        }

        if (vectors.length > 0) {
            await pineconeService.upsert(vectors);
        }

        res.json({
            success: true,
            message: `Pinecone updated with ${successCount} items`,
            processed: itemsToEmbed.length,
            synced: successCount
        });

    } catch (err) {
        console.error('❌ Pinecone update error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get query history with filters
exports.getQueryHistory = async (req, res) => {
    try {
        const { limit, offset, status } = req.query;

        const result = await queryHistoryService.getHistory({
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
            status
        });

        res.json(result);
    } catch (error) {
        console.error('Error getting query history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Submit user feedback for a query
exports.submitFeedback = async (req, res) => {
    try {
        const { queryId, feedback } = req.body;

        if (!queryId || !feedback) {
            return res.status(400).json({
                success: false,
                error: 'queryId and feedback are required'
            });
        }

        const result = await queryHistoryService.submitFeedback(queryId, feedback);

        if (result.success) {
            console.log(`✅ Feedback recorded: ${feedback} for query ${queryId}`);
        }

        res.json(result);
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get performance metrics
exports.getMetrics = async (req, res) => {
    try {
        const result = await queryHistoryService.getMetrics();
        res.json(result);
    } catch (error) {
        console.error('Error getting metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Train Pinecone from positive feedback queries
exports.trainFromHistory = async (req, res) => {
    try {
        console.log('🧠 Training Pinecone from positive feedback queries...');

        const result = await queryHistoryService.getHistory({
            limit: 1000,
            offset: 0
        });

        if (!result.success || result.data.length === 0) {
            return res.json({
                success: true,
                message: 'No queries found in history',
                trained: 0
            });
        }

        const vectors = [];
        let trained = 0;

        for (const entry of result.data) {
            if (entry.generatedSQL) {
                try {
                    const embedding = await ollamaService.generateEmbeddings(entry.userQuery);
                    vectors.push({
                        id: Buffer.from(`learned_${Date.now()}_${trained}`).toString('base64'),
                        values: embedding,
                        metadata: {
                            text: `${entry.userQuery}`,
                            type: 'learned_pattern',
                            executionTime: entry.executionTime
                        }
                    });
                    trained++;

                    // Limit to 50 for speed
                    if (trained >= 50) break;
                } catch (err) {
                    console.warn('⚠️ Failed to embed query');
                }
            }
        }

        if (vectors.length > 0) {
            await pineconeService.upsert(vectors);
            console.log(`✅ Added ${vectors.length} learned patterns`);
        }

        res.json({
            success: true,
            message: `Trained ${trained} query patterns`,
            trained: trained
        });

    } catch (error) {
        console.error('Error training:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
