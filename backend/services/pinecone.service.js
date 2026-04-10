const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeService {
    constructor() {
        this.pc = null;
        this.index = null;
    }

    initialize() {
        if (!process.env.PINECONE_API_KEY) {
            console.warn('Pinecone API Key is missing. Vector search will be disabled.');
            return;
        }

        try {
            this.pc = new Pinecone({
                apiKey: process.env.PINECONE_API_KEY
            });

            const indexName = process.env.PINECONE_INDEX_NAME;
            if (indexName) {
                this.index = this.pc.index(indexName);
                console.log(`🌲 Pinecone initialized with index: ${indexName}`);
            } else {
                console.warn('Pinecone Index Name is missing in .env');
            }
        } catch (error) {
            console.error('Failed to initialize Pinecone:', error);
        }
    }

    async upsert(vectors) {
        if (!this.index) {
            throw new Error('Pinecone index not initialized');
        }
        try {
            await this.index.upsert(vectors);
            return true;
        } catch (error) {
            console.error('Pinecone Upsert Error:', error);
            throw error;
        }
    }

    async query(vector, topK = 20) {
        if (!this.index) {
            console.warn('Pinecone index not initialized, skipping vector search.');
            return [];
        }
        try {
            const queryResponse = await this.index.query({
                vector: vector,
                topK: topK,
                includeMetadata: true
            });
            return queryResponse.matches || [];
        } catch (error) {
            console.error('Pinecone Query Error:', error);
            return [];
        }
    }

    async deleteMany(filter) {
        if (!this.index) {
            console.warn('Pinecone index not initialized, skipping deletion.');
            return false;
        }
        try {
            console.log('🗑️ Deleting vectors with filter:', JSON.stringify(filter));
            await this.index.deleteMany(filter);
            return true;
        } catch (error) {
            // IGNORE 404 ERRORS on delete (It often means index is empty or ID not found)
            if (error.message && error.message.includes('404')) {
                console.warn('⚠️ Warning: Pinecone returned 404 during delete (resource not found). Ignoring as this likely means nothing to delete.');
                return true;
            }
            console.error('Pinecone Delete Error:', error);
            throw error;
        }
    }
}

const pineconeService = new PineconeService();
// Initialize immediately if environment variables are available, or call explicitely in server.js
// pineconeService.initialize();

module.exports = pineconeService;
