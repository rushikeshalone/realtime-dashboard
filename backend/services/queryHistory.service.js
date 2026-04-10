/**
 * Query History Service - Stub Version
 * In the chatbot backend, this stores to SQL database
 * For now, we'll use in-memory storage with optional SQL integration
 */

class QueryHistoryService {
    constructor() {
        this.history = [];
    }

    /**
     * Save a query execution to history
     */
    async saveQuery(queryData) {
        const {
            userQuery,
            generatedSQL,
            executionStatus = 'pending',
            executionTime = null,
            resultRowCount = null,
            errorMessage = null,
            contextSource = null,
            similarityScore = null
        } = queryData;

        try {
            const entry = {
                id: Date.now(),
                userQuery,
                generatedSQL,
                executionStatus,
                executionTime,
                resultRowCount,
                errorMessage,
                contextSource,
                similarityScore,
                createdAt: new Date()
            };

            this.history.push(entry);
            console.log(`✅ Query saved to history (ID: ${entry.id})`);
            return { success: true, id: entry.id };
        } catch (error) {
            console.error('Error saving query history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update query execution status after SQL execution
     */
    async updateQueryStatus(id, statusData) {
        const {
            executionStatus,
            executionTime = null,
            resultRowCount = null,
            errorMessage = null
        } = statusData;

        try {
            const entry = this.history.find(e => e.id === id);
            if (entry) {
                entry.executionStatus = executionStatus;
                entry.executionTime = executionTime || entry.executionTime;
                entry.resultRowCount = resultRowCount;
                entry.errorMessage = errorMessage;
                entry.updatedAt = new Date();
                console.log(`✅ Query status updated (ID: ${id})`);
                return { success: true };
            }
            return { success: false, error: 'Query not found' };
        } catch (error) {
            console.error('Error updating query status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get query history with filters
     */
    async getHistory(options = {}) {
        const {
            limit = 50,
            offset = 0,
            feedback = null,
            status = null,
            startDate = null,
            endDate = null
        } = options;

        try {
            let filtered = this.history;

            // Apply filters
            if (status) {
                filtered = filtered.filter(e => e.executionStatus === status);
            }

            // Return paginated results
            const results = filtered.slice(offset, offset + limit);
            return {
                success: true,
                data: results,
                total: filtered.length,
                limit,
                offset
            };
        } catch (error) {
            console.error('Error getting query history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get statistics
     */
    async getMetrics() {
        try {
            const total = this.history.length;
            const successful = this.history.filter(e => e.executionStatus === 'success').length;
            const failed = this.history.filter(e => e.executionStatus === 'error').length;
            const avgExecutionTime = this.history
                .filter(e => e.executionTime > 0)
                .reduce((sum, e) => sum + e.executionTime, 0) / this.history.length || 0;

            return {
                success: true,
                metrics: {
                    totalQueries: total,
                    successfulQueries: successful,
                    failedQueries: failed,
                    avgExecutionTime: avgExecutionTime.toFixed(2),
                    successRate: total > 0 ? ((successful / total) * 100).toFixed(2) : 0
                }
            };
        } catch (error) {
            console.error('Error getting metrics:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Submit feedback for a query
     */
    async submitFeedback(queryId, feedback) {
        try {
            const entry = this.history.find(e => e.id === queryId);
            if (entry) {
                entry.feedback = feedback;
                entry.feedbackAt = new Date();
                console.log(`✅ Feedback recorded for query ${queryId}`);
                return { success: true };
            }
            return { success: false, error: 'Query not found' };
        } catch (error) {
            console.error('Error submitting feedback:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const queryHistoryService = new QueryHistoryService();

module.exports = queryHistoryService;
