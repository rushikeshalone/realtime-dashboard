// Simple authentication middleware (extend based on your needs)
const authMiddleware = {
    // Basic authentication check
    isAuthenticated: (req, res, next) => {
        // You can implement your authentication logic here
        // For now, we'll just check for a basic token in header
        const authToken = req.headers['authorization'];
        
        if (!authToken && process.env.NODE_ENV === 'production') {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        // In production, you would validate the token here
        // Example: JWT validation, session validation, etc.
        
        next();
    },
    
    // Rate limiting (simple implementation)
    rateLimit: (limit = 100) => {
        const requestCounts = new Map();
        
        return (req, res, next) => {
            const ip = req.ip;
            const now = Date.now();
            const windowMs = 15 * 60 * 1000; // 15 minutes
            
            if (!requestCounts.has(ip)) {
                requestCounts.set(ip, { count: 1, startTime: now });
            } else {
                const userRequests = requestCounts.get(ip);
                
                if (now - userRequests.startTime > windowMs) {
                    // Reset for new time window
                    userRequests.count = 1;
                    userRequests.startTime = now;
                } else {
                    userRequests.count++;
                    
                    if (userRequests.count > limit) {
                        return res.status(429).json({
                            success: false,
                            error: 'Too many requests. Please try again later.'
                        });
                    }
                }
            }
            
            next();
        };
    }
};

module.exports = authMiddleware;
