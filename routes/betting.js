const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');

const router = express.Router();

// Validation middleware
const validateBet = [
    body('amount')
        .isFloat({ min: 1, max: 10000 })
        .withMessage('Bet amount must be between $1 and $10,000'),
    body('bet_type')
        .isIn(['coin_flip', 'dice_roll', 'number_guess', 'color_pick'])
        .withMessage('Invalid bet type')
];

// Place a bet
router.post('/place-bet', validateBet, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { amount, bet_type } = req.body;
        const userId = req.user.id;

        // Check user balance
        const user = await database.get(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Process bet and determine outcome
        const betResult = await processBet(bet_type, amount);
        
        // Update user balance and stats
        const newBalance = user.balance + betResult.result;
        const balanceChange = betResult.result;

        await database.transaction(async (db) => {
            // Update user balance and stats
            await db.run(
                'UPDATE users SET balance = ?, total_bets = total_bets + 1, total_wins = total_wins + ?, total_losses = total_losses + ? WHERE id = ?',
                [
                    newBalance,
                    betResult.result > 0 ? 1 : 0,
                    betResult.result < 0 ? 1 : 0,
                    userId
                ]
            );

            // Record the bet
            await db.run(
                'INSERT INTO bets (user_id, amount, bet_type, outcome, result, status) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, amount, bet_type, betResult.outcome, betResult.result, 'completed']
            );

            // Record transaction
            await db.run(
                'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                [
                    userId,
                    betResult.result > 0 ? 'win' : 'loss',
                    Math.abs(betResult.result),
                    `${bet_type} bet - ${betResult.outcome}`
                ]
            );
        });

        // Get updated user info
        const updatedUser = await database.get(
            'SELECT balance, total_bets, total_wins, total_losses FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Bet placed successfully',
            data: {
                bet: {
                    amount,
                    bet_type,
                    outcome: betResult.outcome,
                    result: betResult.result,
                    new_balance: newBalance
                },
                user_stats: updatedUser
            }
        });

    } catch (error) {
        console.error('Place bet error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get bet history
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const bets = await database.all(
            `SELECT id, amount, bet_type, outcome, result, status, created_at 
             FROM bets 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        const totalBets = await database.get(
            'SELECT COUNT(*) as count FROM bets WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            data: {
                bets,
                pagination: {
                    page,
                    limit,
                    total: totalBets.count,
                    pages: Math.ceil(totalBets.count / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get bet history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get betting statistics
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await database.get(
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

        const winRate = stats.total_bets > 0 ? (stats.wins / stats.total_bets * 100).toFixed(2) : 0;
        const profitLoss = (stats.total_won - stats.total_lost).toFixed(2);

        res.json({
            success: true,
            data: {
                ...stats,
                win_rate: winRate,
                profit_loss: profitLoss
            }
        });

    } catch (error) {
        console.error('Get betting stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Process different types of bets
async function processBet(betType, amount) {
    switch (betType) {
        case 'coin_flip':
            return processCoinFlip(amount);
        case 'dice_roll':
            return processDiceRoll(amount);
        case 'number_guess':
            return processNumberGuess(amount);
        case 'color_pick':
            return processColorPick(amount);
        default:
            throw new Error('Invalid bet type');
    }
}

function processCoinFlip(amount) {
    const isHeads = Math.random() < 0.5;
    const outcome = isHeads ? 'heads' : 'tails';
    const result = isHeads ? amount : -amount;
    
    return { outcome, result };
}

function processDiceRoll(amount) {
    const roll = Math.floor(Math.random() * 6) + 1;
    const isWin = roll >= 4; // Win on 4, 5, or 6
    const outcome = `rolled ${roll}`;
    const result = isWin ? amount * 1.5 : -amount;
    
    return { outcome, result };
}

function processNumberGuess(amount) {
    const targetNumber = Math.floor(Math.random() * 10) + 1;
    const userGuess = Math.floor(Math.random() * 10) + 1;
    const isWin = userGuess === targetNumber;
    const outcome = `guessed ${userGuess}, target was ${targetNumber}`;
    const result = isWin ? amount * 8 : -amount; // 8x payout for correct guess
    
    return { outcome, result };
}

function processColorPick(amount) {
    const colors = ['red', 'black', 'green'];
    const weights = [0.45, 0.45, 0.1]; // Red/Black 45% each, Green 10%
    
    const random = Math.random();
    let selectedColor;
    let cumulativeWeight = 0;
    
    for (let i = 0; i < colors.length; i++) {
        cumulativeWeight += weights[i];
        if (random <= cumulativeWeight) {
            selectedColor = colors[i];
            break;
        }
    }
    
    const userPick = colors[Math.floor(Math.random() * colors.length)];
    const isWin = userPick === selectedColor;
    const outcome = `picked ${userPick}, result was ${selectedColor}`;
    
    let result;
    if (isWin) {
        if (selectedColor === 'green') {
            result = amount * 14; // 14x payout for green
        } else {
            result = amount * 2; // 2x payout for red/black
        }
    } else {
        result = -amount;
    }
    
    return { outcome, result };
}

module.exports = router;
