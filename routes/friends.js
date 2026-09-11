const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');

const router = express.Router();

// Get user's friends list
router.get('/list', async (req, res) => {
    try {
        const userId = req.user.id;

        const friends = await database.all(
            `SELECT 
                u.id, u.username, u.balance, u.total_bets, u.total_wins, u.total_losses,
                f.status, f.created_at as friendship_date
             FROM friends f
             JOIN users u ON (f.user_id = ? AND f.friend_id = u.id) OR (f.friend_id = ? AND f.user_id = u.id)
             WHERE f.status = 'accepted'
             ORDER BY u.username`,
            [userId, userId]
        );

        res.json({
            success: true,
            data: { friends }
        });

    } catch (error) {
        console.error('Get friends list error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get pending friend requests
router.get('/requests', async (req, res) => {
    try {
        const userId = req.user.id;

        const pendingRequests = await database.all(
            `SELECT 
                f.id as request_id, u.id, u.username, u.balance, f.created_at
             FROM friends f
             JOIN users u ON f.user_id = u.id
             WHERE f.friend_id = ? AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [userId]
        );

        const sentRequests = await database.all(
            `SELECT 
                f.id as request_id, u.id, u.username, u.balance, f.created_at
             FROM friends f
             JOIN users u ON f.friend_id = u.id
             WHERE f.user_id = ? AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                received: pendingRequests,
                sent: sentRequests
            }
        });

    } catch (error) {
        console.error('Get friend requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Send friend request
router.post('/send-request', [
    body('friend_username')
        .notEmpty()
        .withMessage('Friend username is required')
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
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
        const { friend_username } = req.body;

        // Check if user is trying to add themselves
        if (friend_username === req.user.username) {
            return res.status(400).json({
                success: false,
                message: 'You cannot add yourself as a friend'
            });
        }

        // Find friend by username
        const friend = await database.get(
            'SELECT id, username FROM users WHERE username = ?',
            [friend_username]
        );

        if (!friend) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if friendship already exists
        const existingFriendship = await database.get(
            'SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
            [userId, friend.id, friend.id, userId]
        );

        if (existingFriendship) {
            if (existingFriendship.status === 'accepted') {
                return res.status(409).json({
                    success: false,
                    message: 'You are already friends with this user'
                });
            } else if (existingFriendship.status === 'pending') {
                if (existingFriendship.user_id === userId) {
                    return res.status(409).json({
                        success: false,
                        message: 'Friend request already sent'
                    });
                } else {
                    return res.status(409).json({
                        success: false,
                        message: 'You already have a pending request from this user'
                    });
                }
            }
        }

        // Send friend request
        await database.run(
            'INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
            [userId, friend.id, 'pending']
        );

        res.status(201).json({
            success: true,
            message: 'Friend request sent successfully',
            data: { friend: { id: friend.id, username: friend.username } }
        });

    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Accept friend request
router.put('/accept-request/:requestId', async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = parseInt(req.params.requestId);

        // Get the friend request
        const friendRequest = await database.get(
            'SELECT * FROM friends WHERE id = ? AND friend_id = ? AND status = ?',
            [requestId, userId, 'pending']
        );

        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found'
            });
        }

        // Accept the request
        await database.run(
            'UPDATE friends SET status = ? WHERE id = ?',
            ['accepted', requestId]
        );

        // Get friend info
        const friend = await database.get(
            'SELECT id, username FROM users WHERE id = ?',
            [friendRequest.user_id]
        );

        res.json({
            success: true,
            message: 'Friend request accepted',
            data: { friend }
        });

    } catch (error) {
        console.error('Accept friend request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Reject friend request
router.put('/reject-request/:requestId', async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = parseInt(req.params.requestId);

        // Get the friend request
        const friendRequest = await database.get(
            'SELECT * FROM friends WHERE id = ? AND friend_id = ? AND status = ?',
            [requestId, userId, 'pending']
        );

        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found'
            });
        }

        // Delete the request
        await database.run('DELETE FROM friends WHERE id = ?', [requestId]);

        res.json({
            success: true,
            message: 'Friend request rejected'
        });

    } catch (error) {
        console.error('Reject friend request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Cancel sent friend request
router.delete('/cancel-request/:requestId', async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = parseInt(req.params.requestId);

        // Get the friend request
        const friendRequest = await database.get(
            'SELECT * FROM friends WHERE id = ? AND user_id = ? AND status = ?',
            [requestId, userId, 'pending']
        );

        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found'
            });
        }

        // Delete the request
        await database.run('DELETE FROM friends WHERE id = ?', [requestId]);

        res.json({
            success: true,
            message: 'Friend request cancelled'
        });

    } catch (error) {
        console.error('Cancel friend request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Remove friend
router.delete('/remove/:friendId', async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);

        // Check if friendship exists
        const friendship = await database.get(
            'SELECT * FROM friends WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = ?',
            [userId, friendId, friendId, userId, 'accepted']
        );

        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: 'Friendship not found'
            });
        }

        // Remove friendship
        await database.run('DELETE FROM friends WHERE id = ?', [friendship.id]);

        res.json({
            success: true,
            message: 'Friend removed successfully'
        });

    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Search users (for adding friends)
router.get('/search', async (req, res) => {
    try {
        const userId = req.user.id;
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        if (query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }

        // Search users by username (excluding current user and existing friends)
        const users = await database.all(
            `SELECT 
                u.id, u.username, u.balance, u.total_bets, u.total_wins, u.total_losses
             FROM users u
             WHERE u.username LIKE ? 
             AND u.id != ?
             AND u.id NOT IN (
                 SELECT CASE 
                     WHEN f.user_id = ? THEN f.friend_id 
                     ELSE f.user_id 
                 END
                 FROM friends f
                 WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
             )
             ORDER BY u.username
             LIMIT ? OFFSET ?`,
            [`%${query}%`, userId, userId, userId, userId, limit, offset]
        );

        const totalUsers = await database.get(
            `SELECT COUNT(*) as count
             FROM users u
             WHERE u.username LIKE ? 
             AND u.id != ?
             AND u.id NOT IN (
                 SELECT CASE 
                     WHEN f.user_id = ? THEN f.friend_id 
                     ELSE f.user_id 
                 END
                 FROM friends f
                 WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
             )`,
            [`%${query}%`, userId, userId, userId, userId]
        );

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total: totalUsers.count,
                    pages: Math.ceil(totalUsers.count / limit)
                }
            }
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get friends' betting activity
router.get('/activity', async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const friendsActivity = await database.all(
            `SELECT 
                u.username, b.amount, b.bet_type, b.outcome, b.result, b.created_at
             FROM friends f
             JOIN users u ON (f.user_id = ? AND f.friend_id = u.id) OR (f.friend_id = ? AND f.user_id = u.id)
             JOIN bets b ON u.id = b.user_id
             WHERE f.status = 'accepted'
             ORDER BY b.created_at DESC
             LIMIT ?`,
            [userId, userId, limit]
        );

        res.json({
            success: true,
            data: { activity: friendsActivity }
        });

    } catch (error) {
        console.error('Get friends activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
