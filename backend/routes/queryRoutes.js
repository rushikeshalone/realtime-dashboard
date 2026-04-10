const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const validationMiddleware = require('../middlewares/validationMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const adminController = require('../controllers/admin.controller');

// Apply rate limiting (100 requests per 15 minutes per IP)
router.use(authMiddleware.rateLimit(100));

// Test routes (no authentication required)
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

router.get('/test-connection', queryController.testConnection);
router.get('/db-info', queryController.getDatabaseInfo);

// Admin routes (no auth for now)
router.post(
    '/admin/update-pinecone',
    adminController.updatePineconeFromPrompt
);

// Query History & Learning Routes
router.get('/admin/query-history', adminController.getQueryHistory);
router.post('/admin/feedback', adminController.submitFeedback);
router.get('/admin/metrics', adminController.getMetrics);
router.post('/admin/train-from-history', adminController.trainFromHistory);

// Protected routes (require API key if configured)
router.use(validationMiddleware.authenticateApiKey);

// Execute SQL Query (with streaming option)
router.post('/execute-query',
    validationMiddleware.validateQueryExecution,
    queryController.executeQuery
);

// Execute large query (always streams)
router.post('/execute-large-query',
    validationMiddleware.validateQueryExecution,
    queryController.executeLargeQuery
);

// Execute Stored Procedure
router.post('/execute-procedure',
    validationMiddleware.validateProcedureExecution,
    queryController.executeProcedure
);

// Batch execute multiple queries
router.post('/batch-execute',
    async (req, res) => {
        const { queries } = req.body;

        if (!Array.isArray(queries) || queries.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Queries must be a non-empty array'
            });
        }

        const results = [];
        for (const queryObj of queries) {
            const { type, query, procedureName, params } = queryObj;

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Query timeout')), 30000);
            });

            try {
                if (type === 'query') {
                    const mockRes = {
                        json: (data) => data,
                        status: () => ({ json: (data) => data })
                    };

                    const result = await Promise.race([
                        queryController.executeQuery({ body: { query, params } }, mockRes),
                        timeoutPromise
                    ]);
                    results.push(result);
                } else if (type === 'procedure') {
                    const mockRes = {
                        json: (data) => data,
                        status: () => ({ json: (data) => data })
                    };

                    const result = await Promise.race([
                        queryController.executeProcedure({
                            body: { procedureName, params }
                        }, mockRes),
                        timeoutPromise
                    ]);
                    results.push(result);
                }
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Batch execution completed',
            results: results,
            timestamp: new Date().toISOString()
        });
    }
);

module.exports = router;
