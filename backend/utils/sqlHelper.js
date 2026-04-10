// Helper functions for SQL operations
class SQLHelper {
    // Validate SQL query (basic safety check)
    static validateQuery(query) {
        if (!query || typeof query !== 'string') {
            return { valid: false, error: 'Query must be a non-empty string' };
        }
        
        // Convert to uppercase for checking
        const upperQuery = query.toUpperCase().trim();
        
        // Check for dangerous operations (this is a basic check)
        const dangerousKeywords = ['DROP ', 'DELETE ', 'TRUNCATE ', 'ALTER ', 'SHUTDOWN'];
        for (const keyword of dangerousKeywords) {
            if (upperQuery.includes(keyword) && !upperQuery.includes('WHERE')) {
                return { 
                    valid: false, 
                    error: `Query contains potentially dangerous operation: ${keyword.trim()}. Use with caution and include proper WHERE clause.`
                };
            }
        }
        
        return { valid: true };
    }
    
    // Parse parameters from request
    static parseParameters(params) {
        if (!params || !Array.isArray(params)) {
            return [];
        }
        
        return params.map(param => ({
            name: param.name,
            type: this.getSqlType(param.type || 'string'),
            value: param.value
        }));
    }
    
    // Map JavaScript types to SQL types
    static getSqlType(type) {
        const typeMap = {
            'string': 'VarChar',
            'number': 'Int',
            'float': 'Float',
            'decimal': 'Decimal',
            'boolean': 'Bit',
            'date': 'DateTime',
            'datetime': 'DateTime',
            'varchar': 'VarChar',
            'nvarchar': 'NVarChar',
            'int': 'Int',
            'bigint': 'BigInt',
            'tinyint': 'TinyInt',
            'bit': 'Bit',
            'datetime2': 'DateTime2',
            'uniqueidentifier': 'UniqueIdentifier'
        };
        
        return typeMap[type.toLowerCase()] || 'VarChar';
    }
    
    // Format response data
    static formatResponse(result, metadata = {}) {
        return {
            success: result.success,
            timestamp: new Date().toISOString(),
            metadata: {
                queryType: metadata.queryType || 'unknown',
                executionTime: metadata.executionTime || 0
            },
            ...result
        };
    }
}

module.exports = SQLHelper;
