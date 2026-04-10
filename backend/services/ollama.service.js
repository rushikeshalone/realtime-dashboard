const axios = require('axios');

class OllamaService {
    constructor(baseUrl = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    async generate(prompt, model = 'qwen2.5-coder:7b', options = {}) {
        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: options.temperature || 0.1,
                    top_p: options.top_p || 0.9,
                    num_predict: options.num_predict || 300,  // Increased for complex queries
                    num_ctx: options.num_ctx || 4096  // Increased to 4096 to fit full schema fallback
                },
                timeout: 300000 // 5 minutes timeout
            });
            return response.data;
        } catch (error) {
            console.error('Ollama API Error:', error.message);
            throw new Error('Failed to communicate with Ollama service');
        }
    }

    async generateEmbeddings(prompt, model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text') {
        try {
            const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
                model: model,
                prompt: prompt
            });
            return response.data.embedding;
        } catch (error) {
            console.error('Ollama Embeddings API Error:', error.message);
            throw new Error('Failed to generate embeddings');
        }
    }

    async getTags() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`);
            return response.data;
        } catch (error) {
            throw new Error('Failed to fetch Ollama tags');
        }
    }
}

module.exports = new OllamaService();
