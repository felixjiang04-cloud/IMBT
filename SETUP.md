# ImBT Backend Setup Guide

## Prerequisites

Before running the ImBT backend, you need to install Node.js and npm.

### Installing Node.js

1. **Download Node.js**
   - Go to [https://nodejs.org/](https://nodejs.org/)
   - Download the LTS (Long Term Support) version
   - Choose the Windows installer (.msi) for your system (32-bit or 64-bit)

2. **Install Node.js**
   - Run the downloaded installer
   - Follow the installation wizard
   - Make sure to check "Add to PATH" during installation
   - Complete the installation

3. **Verify Installation**
   Open a new Command Prompt or PowerShell window and run:
   ```bash
   node --version
   npm --version
   ```

## Backend Setup

Once Node.js is installed, follow these steps:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```

3. **Start the Server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

## Alternative Installation Methods

### Using Chocolatey (Windows Package Manager)
If you have Chocolatey installed:
```bash
choco install nodejs
```

### Using Winget (Windows Package Manager)
```bash
winget install OpenJS.NodeJS
```

### Using NVM for Windows
1. Download NVM for Windows from: https://github.com/coreybutler/nvm-windows/releases
2. Install NVM
3. Install Node.js through NVM:
   ```bash
   nvm install lts
   nvm use lts
   ```

## Troubleshooting

### "npm is not recognized"
- Make sure Node.js is properly installed
- Restart your terminal/command prompt
- Check if Node.js is in your system PATH

### Port 3000 already in use
- Change the port in `server.js`:
  ```javascript
  const PORT = process.env.PORT || 3001; // Change to 3001 or another port
  ```
- Or kill the process using port 3000:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

### Database errors
- Make sure the `database` folder exists
- Check file permissions
- Try running the database initialization again

## Development Tools

### Recommended VS Code Extensions
- Node.js Extension Pack
- REST Client
- Thunder Client (for API testing)

### API Testing
You can test the API endpoints using:
- Postman
- Insomnia
- Thunder Client (VS Code extension)
- curl commands

## Environment Variables

Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Security Notes

- Change the JWT_SECRET in production
- Use HTTPS in production
- Set up proper CORS configuration for your domain
- Consider using environment variables for sensitive data

## Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify Node.js and npm are properly installed
3. Make sure all dependencies are installed
4. Check the README.md for detailed API documentation
