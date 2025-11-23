# Supabase Setup Guide for Friend Chat

## 📋 Prerequisites
- Supabase account and project created
- Project URL: `https://akrlekxrtfoflzaurypc.supabase.co`
- Anon Key: Already configured in `.env` file

## 🗄️ Database Setup

### Step 1: Create Tables

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase-schema.sql`
6. Click **Run** to execute the SQL

This will create:
- ✅ `users` table
- ✅ `messages` table
- ✅ `stories` table
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies

### Step 2: Verify Tables

1. Go to **Table Editor** in the left sidebar
2. You should see three tables:
   - `users`
   - `messages`
   - `stories`

### Step 3: Configure Row Level Security (Optional)

The schema already includes RLS policies, but you can customize them:

1. Go to **Authentication** → **Policies**
2. Review the policies for each table
3. Modify as needed for your security requirements

## 🔧 Environment Configuration

Your `.env` file is already configured with:

```env
SUPABASE_URL=https://akrlekxrtfoflzaurypc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Running the Application

### 1. Install Dependencies (if not already done)
```bash
npm install
```

### 2. Run the SQL Schema
Execute the `supabase-schema.sql` file in Supabase SQL Editor

### 3. Start the Server
```bash
npm start
```

### 4. Test the Application
1. Open http://localhost:3000
2. Create a new account (this will insert into Supabase)
3. Login with your credentials
4. Start chatting!

## 📊 Database Schema

### Users Table
```sql
- id (UUID, Primary Key)
- username (VARCHAR)
- email (VARCHAR, Unique)
- password (VARCHAR, Hashed)
- avatar (TEXT)
- status (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Messages Table
```sql
- id (UUID, Primary Key)
- sender_id (UUID, Foreign Key → users.id)
- receiver_id (UUID, Foreign Key → users.id)
- content (TEXT)
- type (VARCHAR) - 'text', 'image', 'video'
- media_url (TEXT)
- timestamp (TIMESTAMP)
- status (VARCHAR) - 'sent', 'delivered', 'read'
- pinned (BOOLEAN)
- deleted (BOOLEAN)
- deleted_for (UUID[])
- created_at (TIMESTAMP)
```

### Stories Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users.id)
- media_url (TEXT)
- type (VARCHAR) - 'image', 'video'
- views (UUID[])
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP) - Auto-set to 24 hours from creation
```

## 🔍 Viewing Data

### Via Supabase Dashboard
1. Go to **Table Editor**
2. Select a table (users, messages, or stories)
3. View, edit, or delete records

### Via SQL Editor
```sql
-- View all users
SELECT * FROM users;

-- View all messages
SELECT * FROM messages ORDER BY timestamp DESC;

-- View active stories (not expired)
SELECT * FROM stories WHERE expires_at > NOW();

-- View messages between two users
SELECT * FROM messages 
WHERE (sender_id = 'user1_id' AND receiver_id = 'user2_id')
   OR (sender_id = 'user2_id' AND receiver_id = 'user1_id')
ORDER BY timestamp;
```

## 🔐 Security Features

### Row Level Security (RLS)
- ✅ Users can view all users (for friends list)
- ✅ Users can only insert their own data
- ✅ Users can view their own messages
- ✅ Users can update/delete their own messages
- ✅ Users can view all stories
- ✅ Users can manage their own stories

### Password Security
- ✅ Passwords are hashed using bcrypt (10 rounds)
- ✅ Passwords are never returned in API responses
- ✅ Passwords are never stored in plain text

## 🧹 Automatic Cleanup

### Story Expiration
Stories automatically expire after 24 hours. The `expires_at` field is set automatically.

To manually clean up expired stories:
```sql
DELETE FROM stories WHERE expires_at < NOW();
```

### Optional: Set up Cron Job
In Supabase Dashboard:
1. Go to **Database** → **Cron Jobs** (if available)
2. Create a new cron job:
   - Name: `delete-expired-stories`
   - Schedule: `0 * * * *` (every hour)
   - SQL: `SELECT delete_expired_stories();`

## 📈 Performance Optimization

### Indexes
The schema includes indexes on:
- `messages.sender_id`
- `messages.receiver_id`
- `messages.timestamp`
- `stories.user_id`
- `stories.created_at`

These improve query performance for:
- Loading chat conversations
- Fetching user messages
- Displaying stories

## 🐛 Troubleshooting

### Issue: "relation does not exist"
**Solution**: Run the `supabase-schema.sql` file in SQL Editor

### Issue: "permission denied"
**Solution**: Check RLS policies in Authentication → Policies

### Issue: "duplicate key value"
**Solution**: Email already exists. Use a different email for registration

### Issue: Connection errors
**Solution**: 
1. Check `.env` file has correct SUPABASE_URL and SUPABASE_ANON_KEY
2. Verify Supabase project is active
3. Check internet connection

## 🔄 Migration from JSON Files

The application now uses Supabase instead of JSON files:

### Before (JSON Files)
```
data/
├── users.json
├── messages.json
└── stories.json
```

### After (Supabase)
```
Supabase Database
├── users table
├── messages table
└── stories table
```

### Benefits
- ✅ Real database with ACID properties
- ✅ Better performance and scalability
- ✅ Built-in authentication support
- ✅ Row Level Security
- ✅ Real-time subscriptions (can be added)
- ✅ Automatic backups
- ✅ No file system dependencies

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor Guide](https://supabase.com/docs/guides/database/overview)

## ✅ Checklist

- [ ] Supabase project created
- [ ] SQL schema executed in SQL Editor
- [ ] Tables visible in Table Editor
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Server started (`npm start`)
- [ ] Test user created successfully
- [ ] Messages sending/receiving works
- [ ] Stories uploading works

---

## 🎉 You're All Set!

Your Friend Chat application is now powered by Supabase! 

Enjoy real-time messaging with a production-ready database backend.
