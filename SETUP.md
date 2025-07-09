# Email Warmer Setup Guide

## Prerequisites

- Node.js 18+ 
- MongoDB database
- Gmail account(s) with App Password(s)
- OpenAI API key (optional, for email generation)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/email-warmer

# JWT Configuration  
TOKEN_SECRET=your-super-secret-jwt-token-key-here

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key-here

# Environment
NODE_ENV=development
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables in `.env.local`

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- **User Authentication**: Sign up and login with email/password
- **Multiple Email Management**: Add and manage multiple email accounts under one user
- **Individual Email Warming**: Each email has its own warming schedule and settings
- **Email Reputation Check**: Check your email's reputation score using built-in validation
- **Scheduled Emails**: Automated email sending during customizable business hours
- **Auto Replies**: AI-powered automatic email replies
- **Dashboard Overview**: Monitor all your email warmups in one place

## API Endpoints

- `POST /api/users/signup` - User registration
- `POST /api/users/login` - User authentication  
- `POST /api/users/logout` - User logout
- `GET /api/emailWarmups` - Get all email warmups for user
- `POST /api/emailWarmups` - Add new email warmup
- `PUT /api/emailWarmups` - Update email warmup
- `DELETE /api/emailWarmups` - Delete email warmup
- `POST /api/startWarmup` - Start warming for specific email
- `POST /api/sendScheduledEmails` - Send scheduled emails for specific warmup
- `POST /api/checkEmailPassComb` - Validate Gmail credentials
- `POST /api/emailReputationCheck` - Check email reputation (built-in validation)
- `POST /api/openai` - Generate email content

## Usage

1. **Sign up** with your email and password
2. **Login** to access the dashboard
3. **Add Email Accounts**:
   - Go to "Manage Email Warmups"
   - Click "Add Email"
   - Enter Gmail address and app password
   - Configure warming settings (daily count, schedule, etc.)
4. **Start Warming**:
   - Activate each email warmup
   - Click "Start Warmup" to begin the process
5. **Monitor Progress**:
   - View dashboard for overview of all emails
   - Check individual email stats and status
   - Monitor email reputation

## Email Warmup Configuration

Each email warmup can be configured with:

- **Daily Mail Count**: Number of emails to send per day (starts at 3)
- **Daily Increase**: How much to increase daily count each day (default: 2)
- **Max Daily Count**: Maximum emails per day (default: 5)
- **Schedule Time**: Custom start and end times (default: 10:00 AM - 5:00 PM)
- **Days of Week**: Which days to send emails (default: Monday-Friday)

## Email Reputation Check

The application includes a built-in email reputation checker that:
- Validates email format
- Checks for disposable email domains
- Scores based on domain reputation
- Identifies suspicious patterns
- Provides a 0-100 reputation score

## Dashboard Features

- **Overview Stats**: Total emails, active warmups, emails sent/received
- **Email Management**: Add, edit, pause, and delete email warmups
- **Individual Monitoring**: Track progress for each email separately
- **Quick Actions**: Easy access to reputation checks and management

## Security Notes

- Use strong JWT secrets in production
- Enable HTTPS in production
- Use environment variables for all sensitive data
- Regularly rotate API keys
- Store app passwords securely (encrypted in database) 