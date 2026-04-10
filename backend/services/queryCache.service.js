/**
 * In-Memory Query Cache Service
 * Caches successful SQL queries for fast retrieval
 * Uses LRU (Least Recently Used) eviction policy
 */

class QueryCacheService {
    constructor(maxSize = 1000, ttl = 3600000) { // Default: 1000 entries, 1 hour TTL
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl; // Time to live in milliseconds
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    /**
     * Generate a simple hash from embedding array
     */
    _hashEmbedding(embedding) {
        // Simple hash: sum first 10 values and round to 4 decimals
        const hash = embedding.slice(0, 10).reduce((sum, val) => sum + val, 0);
        return hash.toFixed(4);
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    _cosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Get cached query by embedding
     * Returns null if not found or expired
     */
    get(embedding, similarityThreshold = 0.95) {
        const now = Date.now();

        // Check for exact or very similar match
        for (const [key, entry] of this.cache.entries()) {
            // Check if expired
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
                this.stats.evictions++;
                continue;
            }

            // Check similarity
            const similarity = this._cosineSimilarity(embedding, entry.embedding);
            if (similarity >= similarityThreshold) {
                // Move to end (LRU)
                this.cache.delete(key);
                this.cache.set(key, entry);

                this.stats.hits++;
                console.log(`✅ Cache HIT (similarity: ${similarity.toFixed(4)})`);
                return {
                    sql: entry.sql,
                    userQuery: entry.userQuery,
                    timestamp: entry.timestamp,
                    similarity: similarity
                };
            }
        }

        this.stats.misses++;
        console.log('❌ Cache MISS');
        return null;
    }

    /**
     * Set cache entry
     */
    set(embedding, data) {
        const key = this._hashEmbedding(embedding);

        // Evict oldest entry if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }

        this.cache.set(key, {
            embedding: embedding,
            sql: data.sql,
            userQuery: data.userQuery,
            timestamp: Date.now()
        });

        console.log(`💾 Cached query (total: ${this.cache.size}/${this.maxSize})`);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🗑️ Cache cleared (${size} entries removed)`);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0,
            ttl: this.ttl
        };
    }

    /**
     * Remove expired entries
     */
    cleanup() {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`🧹 Cleaned up ${removed} expired cache entries`);
        }
    }
}

// Create singleton instance
const queryCacheService = new QueryCacheService(
    parseInt(process.env.QUERY_CACHE_MAX_SIZE) || 1000,
    parseInt(process.env.QUERY_CACHE_TTL) || 3600000
);

// Run cleanup every 10 minutes
setInterval(() => {
    queryCacheService.cleanup();
}, 600000);

module.exports = queryCacheService;
