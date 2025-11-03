const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { logger } = require('../helpers/logger.helper');

class AuthService {
  static async register(email, username, password) {
    try {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        throw new Error('Email already registered');
      }

      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        throw new Error('Username already taken');
      }

      const user = new User({
        email: email.toLowerCase(),
        username,
        passwordHash: password,
      });

      await user.save();
      return {
        id: user._id,
        email: user.email,
        username: user.username,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  static async login(email, password) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      const token = this.generateToken(user._id);
      return {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
        },
        token,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  static generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.error('Token verification error:', error);
      throw new Error('Invalid token');
    }
  }

  static async getUserById(userId) {
    try {
      const user = await User.findById(userId).select('-passwordHash');
      return user;
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }
}

module.exports = AuthService;
