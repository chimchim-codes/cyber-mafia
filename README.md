# 🚀 SupportHub — Real-Time Customer Support Chatbot & Agent Workspace

A production-ready, full-stack **Real-Time Customer Support Chatbot** application that allows customers to interact with an AI assistant instantly, resolve common issues using a configurable FAQ knowledge base, and escalate seamlessly to live human agents when necessary.

Built with **React (Vite)**, **Tailwind CSS**, **Node.js (Express)**, **Socket.IO**, **MongoDB (Mongoose)**, and **OpenAI API** with an intelligent offline fallback engine.

---

## 🌟 Key Features

### 1. Modern Customer Chat Interface
- **Floating Chat Widget**: Expandable floating launcher with unread indicator badge and pulse animations.
- **Instant AI Assistance**: Greets users with personalized welcome message and 4 suggested starter questions:
  - *Where is my order?*
  - *How do I reset my password?*
  - *I need help with a payment.*
  - *I want to speak to a human agent.*
- **Distinct Chat Bubbles**: Clear visual distinction between Customer (Blue), AI Assistant (Indigo), Support Agent (Emerald), and System status events (Pills).
- **Live Typing Indicators**: Animated bouncing dots indicating when `"SupportHub AI is typing..."` or `"Sarah Connor is typing..."`.
- **Connection Status Dot**: Real-time indicator showing 🟢 Connected, 🟡 Reconnecting, or 🔴 Offline.
- **Session Continuity**: Retains conversation history in `localStorage` across page reloads.
- **Chat Management**: Option to start a new session or clear chat at any time.
- **Offline Ticketing**: If agents are unavailable, customer can submit an offline message which automatically logs a Support Ticket.

### 2. AI Chatbot Functionality & Guardrails
- **Configurable FAQ Knowledge Base**: Answers questions covering **Orders**, **Shipping**, **Returns**, **Refunds**, **Payments**, and **Account Access**.
- **Context Retention**: Maintains recent message history for multi-turn conversations.
- **Strict Anti-Hallucination Guardrails**: Prohibits the AI from inventing fake tracking statuses, account balances, or refund approvals.
- **Frustration & Sentiment Detection**: Automatically identifies angry or frustrated customer phrasing and responds with genuine empathy and immediate human escalation.
- **Escalation Triggers**: Seamlessly detects requests for human assistance (*"speak to human"*, *"real person"*, *"agent"*, *"representative"*).
- **Graceful Fallback Engine**: If the OpenAI API key is missing or quota is exceeded, the chatbot automatically falls back to an intelligent semantic FAQ matcher so the application remains 100% functional.

### 3. Human Support Escalation Workflow
Supports full conversation lifecycle states:
1. `AI Active`: Chatbot handles questions automatically.
2. `Waiting for Agent`: Customer requests agent or AI detects complex inquiry -> Support ticket is generated -> Agent desk alerted in real time.
3. `Agent Connected`: Live support agent accepts the conversation -> Chat handed over for real-time messaging.
4. `Resolved`: Issue solved by either AI or Agent.
5. `Closed`: Conversation archived.

### 4. Support Agent Dashboard
- **Real-Time Queue**: Live-updating conversation list with customer names, last message previews, timestamps, and unread counts.
- **Status & Priority Filtering**: Filter by status (*Waiting for Agent*, *Agent Connected*, *AI Active*, *Resolved*) and priority (*Urgent*, *High*, *Medium*, *Low*).
- **Live Chat Desk**: Respond directly to customers with real-time socket delivery.
- **1-Click Canned Responses**: Quick template responses for frequent inquiries.
- **Support Ticket Drawer**: Inspect ticket details, customer emails, escalation reasons, and change status.
- **Conversation Controls**: Assign, Accept, Resolve, and Close conversations.

### 5. Admin Analytics & Knowledge Base Portal
- **Live MongoDB Aggregations** (calculated dynamically, not hardcoded):
  - Total Conversations, Active Conversations, Resolved Conversations, Escalated Inquiries.
  - Average First Response Time (ms/seconds) and Average Resolution Time.
  - AI-Resolved vs Human-Resolved ratio and comparison bar chart.
  - Status and Priority distribution graphs.
  - Recent Support Activity Feed.
- **FAQ Knowledge Base Manager**: Full CRUD interface to add, edit, search, and delete verified FAQs, along with live AI invocation counts.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express 5, Socket.IO 4 |
| **Database** | MongoDB & Mongoose (with embedded `mongodb-memory-server` auto-fallback) |
| **AI Engine** | OpenAI API (`gpt-4o-mini`) + Fallback FAQ & Empathy Engine |
| **Authentication** | JSON Web Tokens (JWT) + Bcrypt password hashing |

---

## 📦 Database Models

```
┌─────────────────┐       ┌────────────────────┐       ┌──────────────────┐
│      User       │       │    Conversation    │       │  SupportTicket   │
├─────────────────┤       ├────────────────────┤       ├──────────────────┤
│ _id             │       │ _id                │◄──────┤ conversationId   │
│ name            │       │ customerId         │       │ ticketNumber     │
│ email           │◄──────┤ assignedAgentId    │◄──────┤ assignedAgentId  │
│ passwordHash    │       │ status             │       │ subject          │
│ role (agent/adm)│       │ priority           │       │ status, priority │
└─────────────────┘       │ resolvedBy         │       └──────────────────┘
                          │ ticketId           │
                          └─────────┬──────────┘
                                    │ 1
                                    │
                                    │ *
                          ┌─────────▼──────────┐       ┌──────────────────┐
                          │      Message       │       │       FAQ        │
                          ├────────────────────┤       ├──────────────────┤
                          │ _id                │       │ _id              │
                          │ conversationId     │       │ question, answer │
                          │ senderType (ai/.. )│       │ category         │
                          │ content            │       │ keywords []      │
                          │ deliveryStatus     │       │ usageCount       │
                          └────────────────────┘       └──────────────────┘
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/chimchim-codes/cyber-mafia.git
cd "Internal-Tech fest"

# Install root dependencies (Express, Socket.IO, Mongoose, OpenAI, JWT, etc.)
npm install

# Install client dependencies (React, Vite, Tailwind, etc.)
npm --prefix client install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

> **Note on Zero-Config Database**: If `MONGODB_URI` is left blank, SupportHub will **automatically initialize an embedded in-memory MongoDB server** with complete pre-seeded admin users, agents, and FAQs!

### 4. Build and Run
```bash
# Build the React frontend
npm run build

# Start the unified backend server
npm start
```

The application is now accessible at:
- **Unified App (Storefront + Agent Desk + Admin Portal):** `http://localhost:5001`
- **Health Check & Diagnostics:** `http://localhost:5001/api/health`

For separate frontend development with Hot-Module-Replacement (Vite):
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend Vite Dev Server
npm run client
# (Runs on http://localhost:5173)
```

---

## 🔑 Pre-Seeded Test Accounts

For fast reviewer evaluation, the login modal includes **1-Click Demo Sign-In Buttons**:

| Role | Name | Email | Password |
|---|---|---|---|
| **Administrator** | Jordan Hayes | `admin@supporthub.com` | `AdminPass123!` |
| **Support Agent** | Sarah Connor | `sarah.agent@supporthub.com` | `AgentPass123!` |
| **Tier 2 Support** | Alex Rivera | `alex.support@supporthub.com` | `AgentPass123!` |

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` — Register a support agent or customer.
- `POST /api/auth/login` — Sign in and receive JWT token.
- `POST /api/auth/quick-login` — 1-click test login for evaluator demo.
- `GET /api/auth/me` — Retrieve current authenticated profile.

### Conversations
- `POST /api/conversations` — Start or resume a conversation session.
- `GET /api/conversations` — List conversations with status/priority filtering.
- `GET /api/conversations/:id` — Retrieve full conversation and message history.
- `PATCH /api/conversations/:id/status` — Update conversation status.
- `PATCH /api/conversations/:id/assign` — Assign conversation to an agent.
- `PATCH /api/conversations/:id/priority` — Update conversation priority.
- `DELETE /api/conversations/:id` — Close and clear conversation session.

### Messages
- `GET /api/messages/:conversationId` — Retrieve messages for conversation.
- `POST /api/messages/:conversationId` — Send message (triggers AI reply if AI Active).

### FAQs (Knowledge Base)
- `GET /api/faqs` — List FAQs with category and keyword search.
- `POST /api/faqs` — Create a new verified FAQ entry.
- `PUT /api/faqs/:id` — Update an existing FAQ entry.
- `DELETE /api/faqs/:id` — Remove an FAQ article.

### Support Tickets
- `GET /api/tickets` — List support tickets with status/priority filtering.
- `POST /api/tickets` — Create a support ticket.
- `PATCH /api/tickets/:id` — Update ticket status, priority, or assignee.

### Admin Analytics
- `GET /api/admin/metrics` — Returns real-time database aggregations for KPIs, resolution comparison, and status breakdowns.

---

## 🔌 Socket.IO Real-Time Architecture

| Socket Event | Direction | Description |
|---|---|---|
| `join_conversation` | Client → Server | Connects to `conversation:${id}` room and loads history |
| `customer_message` | Client → Server | Customer sends message (triggers AI if AI Active) |
| `agent_message` | Client → Server | Agent sends message to customer |
| `message_received` | Server → Room | Dispatches message to room participants |
| `partner_typing` | Server → Room | Dispatches live typing indicator |
| `request_escalation`| Client → Server | Escalates conversation to `"Waiting for Agent"` |
| `new_escalation` | Server → Agents | Real-time notification to all connected support agents |
| `accept_conversation`| Agent → Server | Agent claims conversation (`"Agent Connected"`) |
| `resolve_conversation`| Agent/Cust → Server| Marks conversation as `"Resolved"` |
| `leave_offline_message`| Cust → Server | Logs ticket when no agents are online |

---

## 🧪 Testing

Run the automated test suite verifying AI escalation detection, empathy responses, password encryption, and JWT validation:

```bash
npm test
```

Tests include:
- `tests/aiService.test.js` — Escalation trigger detection, customer frustration recognition, and fallback generator.
- `tests/auth.test.js` — Bcrypt password hashing and JWT token signing/verification.
- `tests/api.test.js` — HTTP API endpoint integration tests.

---

## 📄 License
This project is licensed under the ISC License.
