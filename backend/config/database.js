/**
 * Database Configuration Module
 * Provides wrapper methods for SQL query execution
 */

const { getPool, query, sql } = require('../db');

const database = {
  dbConfig: {
    server: process.env.DB_SERVER || 'localhost\\RUSHI',
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    port: process.env.DB_PORT || 1433,
    requestTimeout: 30000
  },

  /**
   * Test database connection
   */
  testConnection: async () => {
    try {
      const pool = await getPool();
      const result = await pool.request().query('SELECT 1 AS test');
      return result.rowsAffected && result.rowsAffected[0] >= 0;
    } catch (error) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  },

  /**
   * Execute a SQL query
   */
  executeQuery: async (queryStr, params = [], options = {}) => {
    try {
      const pool = await getPool();
      const request = pool.request();

      // Bind parameters
      if (Array.isArray(params)) {
        params.forEach(param => {
          const value = param.value;
          const type = param.type || 'NVarChar';
          request.input(param.name, value);
        });
      }

      const result = await request.query(queryStr);

      return {
        success: true,
        data: result.recordset || [],
        rowCount: result.recordset ? result.recordset.length : 0,
        rowsAffected: result.rowsAffected
      };
    } catch (error) {
      console.error('Query execution error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  /**
   * Execute query with pagination
   */
  executeQueryWithPagination: async (queryStr, params = [], page = 1, pageSize = 1000) => {
    try {
      const offset = (page - 1) * pageSize;
      const paginatedQuery = `
        WITH paged AS (
          SELECT ROW_NUMBER() OVER (ORDER BY (SELECT 1)) as rn, * FROM (${queryStr}) AS base
        )
        SELECT * FROM paged WHERE rn > ${offset} AND rn <= ${offset + pageSize}
      `;

      return await database.executeQuery(paginatedQuery, params);
    } catch (error) {
      console.error('Pagination error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  /**
   * Stream query results to response (for large datasets)
   */
  streamQueryToResponse: async (queryStr, params = [], res) => {
    try {
      const pool = await getPool();
      const request = pool.request();

      // Bind parameters
      if (Array.isArray(params)) {
        params.forEach(param => {
          request.input(param.name, param.value);
        });
      }

      // Stream the results
      request.stream = true;

      let totalRows = 0;
      res.setHeader('Content-Type', 'application/json');
      res.write('[');

      let isFirst = true;

      request.on('row', row => {
        if (!isFirst) res.write(',');
        res.write(JSON.stringify(row));
        isFirst = false;
        totalRows++;
      });

      request.on('error', error => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: error.message });
        }
      });

      request.on('done', result => {
        res.write(']');
        res.end();
        console.log(`✅ Streamed ${totalRows} rows`);
      });

      await request.query(queryStr);
    } catch (error) {
      console.error('Stream query error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  },

  /**
   * Execute stored procedure
   */
  executeStoredProcedure: async (procedureName, params = []) => {
    try {
      const pool = await getPool();
      const request = pool.request();

      // Bind parameters
      if (Array.isArray(params)) {
        params.forEach(param => {
          request.input(param.name, param.value);
        });
      }

      const result = await request.execute(procedureName);

      return {
        success: true,
        data: result.recordset || [],
        rowCount: result.recordset ? result.recordset.length : 0,
        output: result.output
      };
    } catch (error) {
      console.error('Stored procedure error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  /**
   * Close connection
   */
  closeConnection: async () => {
    try {
      const pool = await getPool();
      if (pool) {
        await pool.close();
        console.log('✅ Database connection closed');
      }
    } catch (error) {
      console.error('Error closing connection:', error.message);
    }
  }
};

module.exports = database;
