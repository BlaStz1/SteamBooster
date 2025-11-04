const AuthService = require('../services/auth.service');
const { logger } = require('../helpers/logger.helper');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('No authorization header provided');
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn('No token in authorization header');
      return res.status(401).json({ error: 'No token in authorization header' });
    }

    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = AuthService.verifyToken(token);
    const user = await AuthService.getUserById(decoded.userId);

    if (!user) {
      logger.warn(`User not found for ID: ${decoded.userId}`);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message, error);
    res.status(401).json({ error: error.message || 'Invalid token' });
  }
};

module.exports = authMiddleware;
