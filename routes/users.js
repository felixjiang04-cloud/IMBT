const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const database = require('../config/database');

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await database.get(
            `SELECT id, username, email, balance, total_bets, total_wins, total_losses, created_at 
             FROM users WHERE id = ?`,
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate additional stats
        const winRate = user.total_bets > 0 ? (user.total_wins / user.total_bets * 100).toFixed(2) : 0;

        res.json({
            success: true,
            data: {
                ...user,
                win_rate: winRate
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update user profile
router.put('/profile', [
    body('username')
        .optional()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const { username, email } = req.body;

        // Check if username or email already exists
        if (username || email) {
            const existingUser = await database.get(
                'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
                [username || '', email || '', userId]
            );

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: existingUser.email === email ? 
                        'Email already registered' : 'Username already taken'
                });
            }
        }

        // Build update query
        const updates = [];
        const params = [];
        
        if (username) {
            updates.push('username = ?');
            params.push(username);
        }
        
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);

        await database.run(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        // Get updated user
        const updatedUser = await database.get(
            'SELECT id, username, email, balance, total_bets, total_wins, total_losses, created_at FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Change password
router.put('/change-password', [
    body('current_password')
        .notEmpty()
        .withMessage('Current password is required'),
    body('new_password')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        // Get current user with password
        const user = await database.get(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        // Update password
        await database.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPasswordHash, userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user transactions
router.get('/transactions', async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const transactions = await database.all(
            `SELECT id, type, amount, description, created_at 
             FROM transactions 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        const totalTransactions = await database.get(
            'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page,
                    limit,
                    total: totalTransactions.count,
                    pages: Math.ceil(totalTransactions.count / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user statistics
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get betting stats
        const bettingStats = await database.get(
            `SELECT 
                COUNT(*) as total_bets,
                SUM(CASE WHEN result > 0 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN result < 0 THEN 1 ELSE 0 END) as losses,
                SUM(amount) as total_wagered,
                SUM(CASE WHEN result > 0 THEN result ELSE 0 END) as total_won,
                SUM(CASE WHEN result < 0 THEN ABS(result) ELSE 0 END) as total_lost
             FROM bets 
             WHERE user_id = ?`,
            [userId]
        );

        // Get transaction stats
        const transactionStats = await database.get(
            `SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END) as total_wins_amount,
                SUM(CASE WHEN type = 'loss' THEN amount ELSE 0 END) as total_losses_amount
             FROM transactions 
             WHERE user_id = ?`,
            [userId]
        );

        // Get game stats
        const gameStats = await database.get(
            `SELECT 
                COUNT(*) as total_games,
                AVG(score) as avg_score,
                MAX(score) as best_score,
                SUM(duration) as total_playtime
             FROM game_sessions 
             WHERE user_id = ?`,
            [userId]
        );

        const winRate = bettingStats.total_bets > 0 ? (bettingStats.wins / bettingStats.total_bets * 100).toFixed(2) : 0;
        const profitLoss = (bettingStats.total_won - bettingStats.total_lost).toFixed(2);

        res.json({
            success: true,
            data: {
                betting: {
                    ...bettingStats,
                    win_rate: winRate,
                    profit_loss: profitLoss
                },
                transactions: transactionStats,
                games: gameStats
            }
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete user account
router.delete('/account', [
    body('password')
        .notEmpty()
        .withMessage('Password is required for account deletion')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const { password } = req.body;

        // Get user with password
        const user = await database.get(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password is incorrect'
            });
        }

        // Delete user data (cascade will handle related records)
        await database.run('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
