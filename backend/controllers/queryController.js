const database = require('../config/database');
const SQLHelper = require('../utils/sqlHelper');

const queryController = {
    // Execute SQL Query with streaming option
    executeQuery: async (req, res) => {
        try {
            const { query, params, stream = false, page, pageSize = 1000 } = req.body;
            const startTime = Date.now();

            console.log('\n' + '='.repeat(80));
            console.log('📊 SQL QUERY EXECUTION STARTED');
            console.log('='.repeat(80));
            console.log(`⏱️  Time: ${new Date().toISOString()}`);
            console.log(`📝 Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
            console.log(`📌 Params: ${JSON.stringify(params)}`);
            console.log(`⚙️  Options: stream=${stream}, page=${page}, pageSize=${pageSize}`);

            // Parse and validate parameters
            const sqlParams = SQLHelper.parseParameters(params);
            console.log(`✅ Parameters parsed: ${sqlParams.length} params`);

            // If stream=true, use streaming
            if (stream === true) {
                console.log('📡 Using STREAMING mode for large dataset');
                return await database.streamQueryToResponse(query, sqlParams, res);
            }

            // If pagination parameters provided, use pagination
            if (page !== undefined) {
                console.log(`📄 Using PAGINATION: page=${page}, pageSize=${pageSize}`);
                const result = await database.executeQueryWithPagination(query, sqlParams, page, pageSize);
                const executionTime = Date.now() - startTime;

                const response = SQLHelper.formatResponse(result, {
                    queryType: 'SQL Query',
                    executionTime: executionTime,
                    streaming: false,
                    paginated: true
                });

                console.log(`✅ Query executed in ${executionTime}ms`);
                console.log(`📦 Rows returned: ${result.rowCount}`);
                console.log('='.repeat(80) + '\n');

                return res.status(result.success ? 200 : 400).json(response);
            }

            // Regular execution for smaller datasets
            console.log('🔄 Executing query...');
            const result = await database.executeQuery(query, sqlParams, { stream: false });
            const executionTime = Date.now() - startTime;

            // Format response
            const response = SQLHelper.formatResponse(result, {
                queryType: 'SQL Query',
                executionTime: executionTime,
                streaming: false,
                paginated: false
            });

            // Add warning for large result sets
            if (result.success && result.rowCount > 10000) {
                response.warning = `Large result set (${result.rowCount} rows). Consider using streaming or pagination.`;
                console.warn(`⚠️  WARNING: Large result set detected (${result.rowCount} rows)`);
            }

            console.log(`✅ Query executed successfully in ${executionTime}ms`);
            console.log(`📊 Rows returned: ${result.data ? result.data.length : 0}`);
            console.log(`📞 Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            console.log('='.repeat(80) + '\n');

            if (result.success) {
                res.status(200).json(response);
            } else {
                res.status(400).json(response);
            }
        } catch (error) {
            console.error('\n❌ QUERY EXECUTION ERROR');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.log('='.repeat(80) + '\n');
            
            res.status(400).json({
                success: false,
                error: 'SQL Execution Error',
                message: error.message
            });
        }
    },

    // NEW: Endpoint specifically for large queries
    executeLargeQuery: async (req, res) => {
        try {
            const { query, params } = req.body;

            // Validate query
            const upperQuery = query.toUpperCase().trim();
            if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH') && !upperQuery.startsWith('EXEC')) {
                return res.status(400).json({
                    success: false,
                    error: 'Only SELECT queries or Stored Procedures are allowed for this endpoint'
                });
            }

            // Always use streaming for this endpoint
            await database.streamQueryToResponse(query, SQLHelper.parseParameters(params), res);
        } catch (error) {
            console.error('Large query error:', error);
            res.status(400).json({
                success: false,
                error: 'Large Query Error',
                message: 'Please ask specific and related to account wise'
            });
        }
    },

    // Execute Stored Procedure
    executeProcedure: async (req, res) => {
        try {
            const { procedureName, params } = req.body;
            const startTime = Date.now();

            // Parse and validate parameters
            const sqlParams = SQLHelper.parseParameters(params);

            // Execute stored procedure
            const result = await database.executeStoredProcedure(procedureName, sqlParams);
            const executionTime = Date.now() - startTime;

            // Format response
            const response = SQLHelper.formatResponse(result, {
                queryType: 'Stored Procedure',
                executionTime: executionTime,
                procedureName: procedureName
            });

            if (result.success) {
                res.status(200).json(response);
            } else {
                res.status(400).json(response);
            }
        } catch (error) {
            console.error('Controller error:', error);
            res.status(400).json({
                success: false,
                error: 'Stored Procedure Error',
                message: 'Please ask specific and related to account wise'
            });
        }
    },

    // Test database connection
    testConnection: async (req, res) => {
        try {
            const isConnected = await database.testConnection();

            if (isConnected) {
                res.status(200).json({
                    success: true,
                    message: 'Database connection successful',
                    timestamp: new Date().toISOString(),
                    database: process.env.DB_DATABASE,
                    server: process.env.DB_SERVER
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Database connection failed'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Connection test failed',
                message: error.message
            });
        }
    },

    // Get database information
    getDatabaseInfo: async (req, res) => {
        try {
            // Hide password in response
            const dbConfig = { ...database.dbConfig };
            if (dbConfig.password) {
                dbConfig.password = '***';
            }

            res.status(200).json({
                success: true,
                database: {
                    server: dbConfig.server,
                    database: dbConfig.database,
                    user: dbConfig.user,
                    port: dbConfig.port,
                    timeout: dbConfig.requestTimeout
                },
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
                memoryLimit: `${require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024} MB`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to get database info',
                message: error.message
            });
        }
    }
};

module.exports = queryController;
