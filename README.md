# ImBT - Betting Application Backend

A comprehensive Node.js backend for the ImBT betting application with user authentication, betting functionality, leaderboards, and social features.

## 🚀 Features

- **User Authentication**: Secure signup, login, and JWT-based authentication
- **Betting System**: Multiple betting types with real-time processing
- **User Management**: Profile management, statistics, and transaction history
- **Leaderboards**: Global rankings by balance, win rate, and activity
- **Social Features**: Friend system with requests and activity feeds
- **Database**: SQLite with comprehensive data modeling
- **Security**: Password hashing, rate limiting, and input validation

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IMBT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   npm run init-db
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000`

## 🗄️ Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `email`: Unique email address
- `password_hash`: Bcrypt hashed password
- `balance`: Current account balance
- `total_bets`: Total number of bets placed
- `total_wins`: Total number of winning bets
- `total_losses`: Total number of losing bets
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

### Bets Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `amount`: Bet amount
- `bet_type`: Type of bet (coin_flip, dice_roll, number_guess, color_pick)
- `outcome`: Bet outcome description
- `result`: Financial result (positive for wins, negative for losses)
- `status`: Bet status (pending, completed)
- `created_at`: Bet timestamp

### Friends Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `friend_id`: Foreign key to users table
- `status`: Friendship status (pending, accepted)
- `created_at`: Friendship creation timestamp

### Transactions Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `type`: Transaction type (win, loss)
- `amount`: Transaction amount
- `description`: Transaction description
- `created_at`: Transaction timestamp

### Game Sessions Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `game_type`: Type of game played
- `score`: Game score
- `duration`: Game duration in seconds
- `created_at`: Game session timestamp

## 🔌 API Endpoints

### Authentication (`/api/auth`)

#### POST `/api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "balance": 1000.00,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST `/api/auth/login`
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### GET `/api/auth/me`
Get current user information (requires authentication).

### Betting (`/api/betting`)

#### POST `/api/betting/place-bet`
Place a new bet (requires authentication).

**Request Body:**
```json
{
  "amount": 50.00,
  "bet_type": "coin_flip"
}
```

**Available bet types:**
- `coin_flip`: 50/50 chance, 1x payout
- `dice_roll`: Win on 4-6, 1.5x payout
- `number_guess`: Guess 1-10, 8x payout
- `color_pick`: Red/Black/Green, 2x/2x/14x payout

#### GET `/api/betting/history`
Get user's betting history (requires authentication).

#### GET `/api/betting/stats`
Get user's betting statistics (requires authentication).

### Users (`/api/users`)

#### GET `/api/users/profile`
Get user profile (requires authentication).

#### PUT `/api/users/profile`
Update user profile (requires authentication).

#### PUT `/api/users/change-password`
Change user password (requires authentication).

#### GET `/api/users/transactions`
Get user's transaction history (requires authentication).

#### GET `/api/users/stats`
Get comprehensive user statistics (requires authentication).

### Leaderboard (`/api/leaderboard`)

#### GET `/api/leaderboard/global`
Get global leaderboard by balance.

#### GET `/api/leaderboard/win-rate`
Get leaderboard by win rate (minimum bets required).

#### GET `/api/leaderboard/winnings`
Get leaderboard by total winnings.

#### GET `/api/leaderboard/most-active`
Get leaderboard by most active players.

#### GET `/api/leaderboard/user-ranking/:userId`
Get specific user's rankings.

#### GET `/api/leaderboard/stats`
Get platform statistics.

### Friends (`/api/friends`)

#### GET `/api/friends/list`
Get user's friends list (requires authentication).

#### GET `/api/friends/requests`
Get pending friend requests (requires authentication).

#### POST `/api/friends/send-request`
Send friend request (requires authentication).

#### PUT `/api/friends/accept-request/:requestId`
Accept friend request (requires authentication).

#### PUT `/api/friends/reject-request/:requestId`
Reject friend request (requires authentication).

#### DELETE `/api/friends/cancel-request/:requestId`
Cancel sent friend request (requires authentication).

#### DELETE `/api/friends/remove/:friendId`
Remove friend (requires authentication).

#### GET `/api/friends/search`
Search for users to add as friends (requires authentication).

#### GET `/api/friends/activity`
Get friends' betting activity (requires authentication).

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 🎲 Betting Types

### Coin Flip
- **Description**: Simple 50/50 chance
- **Win Condition**: Heads (50% chance)
- **Payout**: 1x bet amount
- **Example**: Bet $10, win $10

### Dice Roll
- **Description**: Roll a 6-sided die
- **Win Condition**: Roll 4, 5, or 6 (50% chance)
- **Payout**: 1.5x bet amount
- **Example**: Bet $10, win $15

### Number Guess
- **Description**: Guess a number between 1-10
- **Win Condition**: Correct guess (10% chance)
- **Payout**: 8x bet amount
- **Example**: Bet $10, win $80

### Color Pick
- **Description**: Pick red, black, or green
- **Win Conditions**:
  - Red/Black: 45% chance each, 2x payout
  - Green: 10% chance, 14x payout
- **Example**: Bet $10 on red, win $20

## 🛡️ Security Features

- **Password Hashing**: Bcrypt with 12 salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Protection**: Configured for local development

## 📊 Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
```

## 🚀 Deployment

### Production Setup

1. **Set environment variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-production-secret-key
   ```

2. **Install dependencies**
   ```bash
   npm install --production
   ```

3. **Initialize database**
   ```bash
   npm run init-db
   ```

4. **Start server**
   ```bash
   npm start
   ```

### Using PM2 (Recommended)

```bash
npm install -g pm2
pm2 start server.js --name "imbt-backend"
pm2 save
pm2 startup
```

## 🧪 Testing

The API can be tested using tools like:
- Postman
- Insomnia
- curl
- Thunder Client (VS Code extension)

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.
