const SQLHelper = require('../utils/sqlHelper');

const validationMiddleware = {
    // Validate query execution request
    validateQueryExecution: (req, res, next) => {
        const { query, params } = req.body;
        
        // Check if query exists
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'SQL query is required'
            });
        }
        
        // Validate query safety
        const validation = SQLHelper.validateQuery(query);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }
        
        // Validate parameters if provided
        if (params && !Array.isArray(params)) {
            return res.status(400).json({
                success: false,
                error: 'Parameters must be an array'
            });
        }
        
        next();
    },
    
    // Validate stored procedure execution request
    validateProcedureExecution: (req, res, next) => {
        const { procedureName, params } = req.body;
        
        // Check if procedure name exists
        if (!procedureName) {
            return res.status(400).json({
                success: false,
                error: 'Stored procedure name is required'
            });
        }
        
        // Validate procedure name format
        if (typeof procedureName !== 'string' || procedureName.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Invalid stored procedure name'
            });
        }
        
        // Validate parameters if provided
        if (params && !Array.isArray(params)) {
            return res.status(400).json({
                success: false,
                error: 'Parameters must be an array'
            });
        }
        
        next();
    },
    
    // API key authentication (optional)
    authenticateApiKey: (req, res, next) => {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        const expectedKey = process.env.API_KEY || process.env.API_SECRET_KEY;
        
        console.log(`🔐 AUTH CHECK: apiKey=${apiKey?.substring(0, 8)}..., expected=${expectedKey?.substring(0, 8)}...`);
        
        // If API_KEY is set in .env, require authentication
        if (expectedKey) {
            if (!apiKey) {
                console.warn('⚠️ API key missing in request');
                return res.status(401).json({
                    success: false,
                    error: 'API key is required'
                });
            }
            
            if (apiKey !== expectedKey) {
                console.warn(`❌ API key mismatch: got ${apiKey?.substring(0, 8)}... vs expected ${expectedKey?.substring(0, 8)}...`);
                return res.status(403).json({
                    success: false,
                    error: 'Invalid API key'
                });
            }
        }
        
        console.log('✅ API Key validated');
        next();
    }
};

module.exports = validationMiddleware;
