const express = require('express');
const database = require('../config/database');

const router = express.Router();

// Get global leaderboard
router.get('/global', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Get top players by balance
        const topPlayers = await database.all(
            `SELECT 
                id, username, balance, total_bets, total_wins, total_losses,
                CASE 
                    WHEN total_bets > 0 THEN ROUND((total_wins * 100.0 / total_bets), 2)
                    ELSE 0 
                END as win_rate
             FROM users 
             ORDER BY balance DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        // Get total count
        const totalPlayers = await database.get('SELECT COUNT(*) as count FROM users');

        res.json({
            success: true,
            data: {
                players: topPlayers,
                pagination: {
                    page,
                    limit,
                    total: totalPlayers.count,
                    pages: Math.ceil(totalPlayers.count / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get global leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get leaderboard by win rate
router.get('/win-rate', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const minBets = parseInt(req.query.min_bets) || 10; // Minimum bets to qualify

        const topWinRate = await database.all(
            `SELECT 
                id, username, balance, total_bets, total_wins, total_losses,
                CASE 
                    WHEN total_bets >= ? THEN ROUND((total_wins * 100.0 / total_bets), 2)
                    ELSE 0 
                END as win_rate
             FROM users 
             WHERE total_bets >= ?
             ORDER BY win_rate DESC, total_bets DESC 
             LIMIT ? OFFSET ?`,
            [minBets, minBets, limit, offset]
        );

        const totalQualified = await database.get(
            'SELECT COUNT(*) as count FROM users WHERE total_bets >= ?',
            [minBets]
        );

        res.json({
            success: true,
            data: {
                players: topWinRate,
                pagination: {
                    page,
                    limit,
                    total: totalQualified.count,
                    pages: Math.ceil(totalQualified.count / limit)
                },
                min_bets_required: minBets
            }
        });

    } catch (error) {
        console.error('Get win rate leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get leaderboard by total winnings
router.get('/winnings', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const topWinners = await database.all(
            `SELECT 
                u.id, u.username, u.balance,
                COUNT(b.id) as total_bets,
                SUM(CASE WHEN b.result > 0 THEN b.result ELSE 0 END) as total_winnings,
                SUM(CASE WHEN b.result < 0 THEN ABS(b.result) ELSE 0 END) as total_losses,
                SUM(CASE WHEN b.result > 0 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN b.result < 0 THEN 1 ELSE 0 END) as losses
             FROM users u
             LEFT JOIN bets b ON u.id = b.user_id
             GROUP BY u.id, u.username, u.balance
             HAVING total_bets > 0
             ORDER BY total_winnings DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const totalPlayers = await database.get(
            'SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN bets b ON u.id = b.user_id'
        );

        res.json({
            success: true,
            data: {
                players: topWinners,
                pagination: {
                    page,
                    limit,
                    total: totalPlayers.count,
                    pages: Math.ceil(totalPlayers.count / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get winnings leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get leaderboard by most active (total bets)
router.get('/most-active', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const mostActive = await database.all(
            `SELECT 
                u.id, u.username, u.balance,
                COUNT(b.id) as total_bets,
                SUM(CASE WHEN b.result > 0 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN b.result < 0 THEN 1 ELSE 0 END) as losses,
                CASE 
                    WHEN COUNT(b.id) > 0 THEN ROUND((SUM(CASE WHEN b.result > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(b.id)), 2)
                    ELSE 0 
                END as win_rate
             FROM users u
             LEFT JOIN bets b ON u.id = b.user_id
             GROUP BY u.id, u.username, u.balance
             HAVING total_bets > 0
             ORDER BY total_bets DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const totalActive = await database.get(
            'SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN bets b ON u.id = b.user_id'
        );

        res.json({
            success: true,
            data: {
                players: mostActive,
                pagination: {
                    page,
                    limit,
                    total: totalActive.count,
                    pages: Math.ceil(totalActive.count / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get most active leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user's ranking
router.get('/user-ranking/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        // Get user's balance ranking
        const balanceRank = await database.get(
            `SELECT COUNT(*) + 1 as rank 
             FROM users 
             WHERE balance > (SELECT balance FROM users WHERE id = ?)`,
            [userId]
        );

        // Get user's win rate ranking (among users with at least 10 bets)
        const winRateRank = await database.get(
            `SELECT COUNT(*) + 1 as rank 
             FROM (
                 SELECT 
                     id,
                     CASE 
                         WHEN total_bets >= 10 THEN (total_wins * 100.0 / total_bets)
                         ELSE 0 
                     END as win_rate
                 FROM users 
                 WHERE total_bets >= 10
             ) ranked_users
             WHERE win_rate > (
                 SELECT 
                     CASE 
                         WHEN total_bets >= 10 THEN (total_wins * 100.0 / total_bets)
                         ELSE 0 
                     END
                 FROM users 
                 WHERE id = ?
             )`,
            [userId]
        );

        // Get user's total winnings ranking
        const winningsRank = await database.get(
            `SELECT COUNT(*) + 1 as rank 
             FROM (
                 SELECT 
                     u.id,
                     SUM(CASE WHEN b.result > 0 THEN b.result ELSE 0 END) as total_winnings
                 FROM users u
                 LEFT JOIN bets b ON u.id = b.user_id
                 GROUP BY u.id
                 HAVING COUNT(b.id) > 0
             ) ranked_users
             WHERE total_winnings > (
                 SELECT 
                     COALESCE(SUM(CASE WHEN b.result > 0 THEN b.result ELSE 0 END), 0)
                 FROM users u
                 LEFT JOIN bets b ON u.id = b.user_id
                 WHERE u.id = ?
                 GROUP BY u.id
             )`,
            [userId]
        );

        // Get user info
        const user = await database.get(
            'SELECT id, username, balance, total_bets, total_wins, total_losses FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user,
                rankings: {
                    balance: balanceRank.rank,
                    win_rate: winRateRank.rank,
                    winnings: winningsRank.rank
                }
            }
        });

    } catch (error) {
        console.error('Get user ranking error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get leaderboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Get overall platform stats
        const platformStats = await database.get(
            `SELECT 
                COUNT(*) as total_users,
                AVG(balance) as avg_balance,
                SUM(balance) as total_balance,
                COUNT(CASE WHEN balance > 1000 THEN 1 END) as users_over_1k,
                COUNT(CASE WHEN balance > 5000 THEN 1 END) as users_over_5k
             FROM users`
        );

        // Get betting stats
        const bettingStats = await database.get(
            `SELECT 
                COUNT(*) as total_bets,
                SUM(amount) as total_wagered,
                SUM(CASE WHEN result > 0 THEN result ELSE 0 END) as total_winnings,
                AVG(amount) as avg_bet_amount
             FROM bets`
        );

        // Get top 3 players
        const top3 = await database.all(
            `SELECT username, balance, total_bets, total_wins, total_losses
             FROM users 
             ORDER BY balance DESC 
             LIMIT 3`
        );

        res.json({
            success: true,
            data: {
                platform: platformStats,
                betting: bettingStats,
                top_3_players: top3
            }
        });

    } catch (error) {
        console.error('Get leaderboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
