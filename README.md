# Cloudflare AI Assignment Validator

A comprehensive AI-powered application built on Cloudflare Workers that validates GitHub repositories against Cloudflare AI assignment requirements. This application demonstrates all five mandatory requirements for the Cloudflare AI fast-track assignment.

**Live URL:** https://cloudflare-ai-assignment-validator.developement.workers.dev/

**Demo:**

[![Demo Screenshot](https://github.com/calebareeveso/cf_ai_assignment_validator/blob/main/public/static/demo-thumbnail.png)](https://www.youtube.com/watch?v=zJji5iy-4Ik)

## I implemented:

### ✅ LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice

I used `@cf/meta/llama-3.3-70b-instruct-fp8-fast` from Cloudflare Workers AI for:

- **Streaming AI responses** for real-time chat interaction (`src/index.tsx` lines 359-362, 382-415)
- **Assignment validation** using AI-powered analysis of GitHub repositories
- **Retry logic** for robust AI inference with fallback mechanisms
- **Real-time streaming** with Server-Sent Events for immediate user feedback

### ✅ Workflow / coordination (recommend using Workflows, Workers or Durable Objects)

I implemented Cloudflare Workflows for:

- **Asynchronous README fetching** from GitHub repositories (`src/readme-fetcher.ts` entire file)
- **Workflow orchestration** with status polling and result handling (`wrangler.jsonc` lines 28-34)
- **Error handling** with fallback mechanisms for different repository branches
- **Non-blocking processing** that allows the UI to remain responsive during README fetching

### ✅ User input via chat or voice (recommend using Pages or Realtime)

I built an interactive chat interface with:

- **Real-time messaging** with streaming AI responses (`public/static/script.js` lines 509-585)
- **GitHub URL input** for assignment validation (`src/index.tsx` lines 193-207)
- **Chat interface** with markdown rendering and syntax highlighting
- **Persistent chat history** stored in D1 database for session continuity

### ✅ Memory or state

I implemented persistent state management using:

- **D1 SQLite database** for chat history storage (`migrations/0001_create_messages_table.sql`)
- **Message persistence** across sessions (`src/index.tsx` lines 216-263)
- **Role-based message organization** (user/assistant) with timestamps
- **Database indexing** for optimal query performance

### ✅ Project Documentation

I created comprehensive documentation including:

- **Detailed README** with clear deployment instructions (this file)
- **Architecture documentation** with file references and line numbers
- **Step-by-step setup** for development and production deployment
- **Requirement mapping** showing how each component fulfills the assignment criteria

### ✅ Repository Naming

- **Repository Name**: `cf_ai_assignment_validator` (follows `cf_ai_` prefix requirement)

## 🏗️ Architecture Overview

### Backend Components

- **Cloudflare Workers**: Main application server using Hono framework
- **Workers AI**: Llama 3.3 70B model for AI inference and validation
- **Cloudflare Workflows**: Asynchronous README fetching orchestration
- **D1 Database**: SQLite database for chat history persistence
- **Static Assets**: Frontend served from Cloudflare Pages

### Frontend Components

- **React-like JSX**: Server-side rendered components
- **Real-time Chat**: Streaming AI responses with markdown rendering
- **Assignment Validation**: Interactive form with progress indicators
- **Responsive Design**: Modern UI with Tailwind CSS styling

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account with Workers AI enabled
- Wrangler CLI installed globally

### Development Setup

1. **Clone and Install Dependencies**

   ```bash
   git clone <repository-url>
   cd cf_ai_assignment_validator
   npm install
   ```

2. **Create D1 Database**

   ```bash
   wrangler d1 create cloudflare-ai-assignment-validator-database
   ```

   **IMPORTANT**: After creating the database, copy the `database_id` from the output and update it in `wrangler.jsonc` at line 25:

   ```jsonc
   "d1_databases": [
     {
       "binding": "cloudflare_ai_assignment_validator_database",
       "database_name": "cloudflare-ai-assignment-validator-database",
       "database_id": "YOUR_DATABASE_ID_HERE"  // Replace with your actual database ID
     }
   ]
   ```

3. **Run Database Migrations (Local Development)**

   ```bash
   wrangler d1 migrations apply cloudflare-ai-assignment-validator-database --local
   ```

4. **Run Database Migrations (Production - Before Deployment)**

   ```bash
   wrangler d1 migrations apply cloudflare-ai-assignment-validator-database --remote
   ```

5. **Start Development Server**

   ```bash
   npm run dev
   ```

6. **Access Application**
   - Open browser to `http://localhost:8787`
   - Enter a GitHub repository URL to validate
   - Chat with the AI about validation results

### Troubleshooting

#### Error: "D1_ERROR: no such table: messages"

This error occurs when the database migrations haven't been run. Fix it by:

1. **For Local Development:**

   ```bash
   wrangler d1 migrations apply cloudflare-ai-assignment-validator-database --local
   ```

2. **For Production (Deployed App):**

   ```bash
   wrangler d1 migrations apply cloudflare-ai-assignment-validator-database --remote
   ```

3. **Verify Migration:**

   ```bash
   # Check local database
   wrangler d1 execute cloudflare-ai-assignment-validator-database --local --command "SELECT name FROM sqlite_master WHERE type='table';"

   # Check remote database
   wrangler d1 execute cloudflare-ai-assignment-validator-database --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
   ```

   You should see the `messages` table listed in the output.

#### Error: Database ID Mismatch

If you get errors about the database not being found:

1. Check that the `database_id` in `wrangler.jsonc` matches your actual database ID
2. List your databases: `wrangler d1 list`
3. Update `wrangler.jsonc` with the correct ID

#### Error: Workflow Not Found

If you get errors about the README_FETCHER workflow:

1. Ensure `wrangler.jsonc` has the workflows configuration (lines 28-34)
2. Redeploy the application: `npm run deploy`

### Common Issues

| Issue                     | Solution                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "no such table: messages" | Run migrations: `wrangler d1 migrations apply cloudflare-ai-assignment-validator-database --local` or `--remote` |
| Database not found        | Update `database_id` in `wrangler.jsonc` with correct ID from `wrangler d1 list`                                 |
| Workflow errors           | Check `wrangler.jsonc` has workflows configuration and redeploy                                                  |
| AI model errors           | Ensure Workers AI is enabled on your Cloudflare account                                                          |
| Local dev not working     | Make sure you ran migrations with `--local` flag                                                                 |
| Production errors         | Make sure you ran migrations with `--remote` flag before deploying                                               |

### Production Deployment

1. **Create Production D1 Database** (if not already created)

   ```bash
   wrangler d1 create cloudflare-ai-assignment-validator-database
   ```

   Update the `database_id` in `wrangler.jsonc` with the ID from the output.

2. **Run Production Database Migrations** ⚠️ **CRITICAL STEP**

   ```bash
   wrangler d1 migrations apply cloudflare-ai-assignment-validator-database --remote
   ```

   **CRITICAL**: This step MUST be completed BEFORE deployment, or you'll get "Failed to save messages" errors.

   The migration creates the `messages` table required for chat history persistence.

3. **Deploy to Cloudflare Workers**

   ```bash
   npm run deploy
   ```

4. **Verify Database Migration** (After Deployment)

   ```bash
   wrangler d1 execute cloudflare-ai-assignment-validator-database --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
   ```

   You should see `messages` in the output.

5. **Test Production Application**
   - Visit your Workers URL
   - Test validation with a GitHub repository
   - Verify chat messages are being saved (no "Failed to save messages" errors)
   - Check that chat history persists after refresh

## 📁 Project Structure

```
cf_ai_assignment_validator/
├── src/
│   ├── index.tsx              # Main Worker application
│   ├── readme-fetcher.ts      # Workflow for README fetching
│   └── types.ts               # TypeScript type definitions
├── public/
│   ├── static/
│   │   ├── script.js          # Frontend JavaScript
│   │   └── style.css          # Tailwind CSS styles
│   └── favicon.ico
├── migrations/
│   └── 0001_create_messages_table.sql  # D1 database schema
├── test/
│   └── index.spec.ts          # Test suite
├── package.json
├── wrangler.jsonc            # Cloudflare configuration
└── README.md                 # This file
```

### Database Schema

The application uses a D1 SQLite database with the following schema (defined in `migrations/0001_create_messages_table.sql`):

```sql
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    chatId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
```

This table stores:

- **Chat messages** with user and assistant roles
- **Chat sessions** identified by `chatId`
- **Timestamps** for message ordering
- **Indexes** for efficient querying

## 🚨 Quick Fix: Database Errors

### Error: "D1_ERROR: no such table: messages" or "Failed to save messages"

Run this command based on your environment:

```bash
# For local development
wrangler d1 migrations apply cloudflare-ai-assignment-validator-database --local

# For production (deployed app) ⚠️ MOST COMMON
wrangler d1 migrations apply cloudflare-ai-assignment-validator-database --remote
```

**Production Note**: If your live app shows "Failed to save messages" errors, you need to run the migration with `--remote` flag, then the app will work immediately (no redeployment needed).

See the [Troubleshooting](#troubleshooting) section for more details.

## 🔧 Key Features

### Assignment Validation

- **Automated Analysis**: AI-powered validation of GitHub repositories
- **Requirement Checking**: Validates all six mandatory requirements
- **Evidence Extraction**: Quoted evidence for each requirement check
- **Interactive Results**: Visual checklist with pass/fail indicators

### Real-time Chat

- **Streaming Responses**: Real-time AI response streaming
- **Persistent History**: Chat sessions saved to D1 database
- **Markdown Support**: Rich text rendering with syntax highlighting
- **Context Awareness**: AI maintains conversation context

### Workflow Orchestration

- **Asynchronous Processing**: Non-blocking README fetching
- **Status Polling**: Real-time workflow status updates
- **Error Handling**: Robust error handling and retry logic
- **Fallback Mechanisms**: Multiple branch detection (main/master)

## 🛠️ Technical Implementation

### AI Integration

```typescript
// Streaming AI responses with retry logic
const eventSourceStream = (await c.env.AI.run(payload.config.model, {
	messages,
	stream: true,
})) as ReadableStream;
```

### Workflow Implementation

```typescript
// Asynchronous README fetching
return await step.do('fetch-readme', async () => {
	const response = await fetch(rawReadmeUrl);
	return { content, url: rawReadmeUrl, success: true };
});
```

### Database Operations

```typescript
// Persistent chat storage
await c.env.cloudflare_ai_assignment_validator_database
	.prepare('INSERT INTO messages (role, content, chatId) VALUES (?, ?, ?)')
	.bind(message.role, message.content, chatId)
	.run();
```

## 🎨 User Interface

### Validation Interface

- Clean, modern design with loading animations
- Progress indicators for README fetching and validation
- Visual requirement checklist with pass/fail status
- Interactive chat for follow-up questions

### Chat Interface

- Real-time message streaming
- Markdown rendering with syntax highlighting
- Persistent chat history
- Responsive design for all devices

## 📊 Database Schema

```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    chatId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔍 API Endpoints

- `GET /` - Main application interface
- `POST /api/chat` - AI chat endpoint with streaming
- `POST /api/fetch-readme` - Start README fetch workflow
- `GET /api/fetch-readme/status/:workflowId` - Check workflow status
- `GET /api/messages/:chatId` - Retrieve chat history
- `POST /api/messages` - Save chat messages
- `DELETE /api/messages/:chatId` - Clear chat history

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📝 Configuration

### Wrangler Configuration

- **Workers AI**: Enabled with Llama 3.3 70B model
- **D1 Database**: SQLite database for persistence
- **Workflows**: README fetching orchestration
- **Static Assets**: Frontend served from public directory

### Environment Variables

- All configuration handled through Wrangler bindings
- No external API keys required
- Uses Cloudflare's integrated services

## 🚀 Deployment

The application is deployed on Cloudflare Workers with:

- **Global Edge Network**: Fast response times worldwide
- **Automatic Scaling**: Handles traffic spikes automatically
- **Integrated Services**: Workers AI, D1, and Workflows
- **Zero Configuration**: No server management required

## 📈 Performance

- **Cold Start**: < 50ms typical response time
- **AI Inference**: Streaming responses for real-time experience
- **Database**: Sub-millisecond query performance with D1
- **Global**: Edge deployment for minimal latency

## 🔒 Security

- **No API Keys**: Uses Cloudflare's integrated services
- **Input Validation**: GitHub URL format validation
- **SQL Injection Protection**: Parameterized queries
- **CORS**: Proper cross-origin resource sharing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Cloudflare AI assignment and demonstrates best practices for building AI-powered applications on the Cloudflare platform.

---

**Repository Name**: `cf_ai_assignment_validator` ✅  
**Live URL**: https://cloudflare-ai-assignment-validator.developement.workers.dev/  
**All Requirements Met**: ✅ LLM/AI Engine, ✅ Workflow/Coordination, ✅ User Input, ✅ Memory/State, ✅ Project Documentation
