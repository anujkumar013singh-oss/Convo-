# CONVO — Real-Time 1-on-1 Messaging Web Application

> A sleek, high-performance one-to-one real-time chat platform inspired by Telegram Web's dark glassmorphic design system.

---

## ✨ Features Overview

### 💬 Real-Time Messaging & Presence
- **Socket.IO Real-Time Engine**: Instant bi-directional messaging with sub-100ms latency.
- **Typing Indicators**: Live typing status feedback per conversation.
- **Read Receipts & Delivery Status**: Real-time status ticks (`sent` ➔ `delivered` ➔ `read`).
- **Online Presence & 10s Grace Period**: Smart disconnect detection to prevent flickering status during network drops or tab switches.

### 🔐 Authentication & Onboarding
- **Multi-Step Onboarding Wizard**: 5-step registration flow:
  1. Email & Mobile Contact Info
  2. 6-Digit Segmented OTP Verification (Sent via Brevo SMTP Relay)
  3. Profile Info (Your Name & Live Username Availability Check)
  4. Security Password setup (minimum 6 characters)
  5. Profile DP Picture Upload (Skippable section)
- **Brevo Email OTP Delivery**: Real-time email delivery from `anujkumar013singh@gmail.com` via Brevo SMTP Relay.
- **Forgot Password Recovery**: Interactive inline email confirmation ➔ OTP verification ➔ New Password reset flow directly from the sign-in screen.
- **JWT Auth & Session Persistence**: Secure Access (15m) & Refresh (30d) token management via httpOnly cookies.

### 🔍 User Search & 1:1 Conversation Starter
- **Username-Only Search**: Case-insensitive handle search (prefix match with substring fallback) that protects user privacy by hiding email/phone numbers.
- **Instant Conversation Initialization**: Tap any search result to open or resume a normalized 1:1 chat room.

### 👤 Profile Management & Sharing
- **In-Place Inline Profile Editing**: Edit Full Name, Username, Phone, and Email directly inside the profile card without extra dropdowns.
- **Cloudinary Avatar Upload**: FontAwesome Camera badge for instant avatar uploads to Cloudinary storage.
- **WhatsApp-Style Profile Sharing**: Share contact profiles directly inside chat threads with interactive "Message Contact" cards.
- **Logout Feature**: Prominent Logout button with session clearance.

### 🎨 Premium Aesthetics & UI Design System
- **Dark Doodle Background**: Signature Telegram-inspired tiled pattern empty state.
- **Glassmorphism & Micro-Animations**: Powered by Framer Motion & GSAP entrance transitions.
- **Voice Message Player**: Dark glassmorphic player for audio voice notes.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v3 + Custom HSL Design Tokens
- **Animations**: Framer Motion 12 + GSAP 3
- **State Management**: Zustand 5
- **Form & Validation**: React Hook Form + Zod
- **Icons**: Lucide React + FontAwesome Regular Camera
- **Toasts**: Sonner

### Backend & Database
- **Runtime**: Node.js (ES Modules)
- **Server Framework**: Express.js 5
- **Real-Time WebSockets**: Socket.IO 4
- **Database**: MongoDB Atlas (`convo` database) via Mongoose 9
- **Authentication**: JWT (Access + Refresh token pair) + bcryptjs (cost factor 10)
- **Media Storage**: Cloudinary SDK + Multer
- **Email Delivery**: Nodemailer + Brevo SMTP Relay (`smtp-relay.brevo.com:587`)
- **Security**: Helmet, CORS, Express Rate Limiting

---

## 📁 Repository Structure

```
.
├── server/
│   ├── config/
│   │   ├── db.js              # MongoDB Atlas connection (`convo` database)
│   │   └── cloudinary.js      # Cloudinary SDK & Multer memory storage
│   ├── models/
│   │   ├── User.js            # User schema (case-insensitive username index)
│   │   ├── Conversation.js    # 1:1 Conversation schema (participantsKey unique index)
│   │   ├── Message.js         # Message schema (attachments, replies, statuses)
│   │   └── OTP.js             # Verification OTP schema (10-min automatic TTL index)
│   ├── middleware/
│   │   └── auth.js            # JWT REST & Socket.IO handshake auth
│   ├── routes/
│   │   ├── authRoutes.js      # Auth endpoints (Register, Brevo OTP, Login, Refresh, Reset)
│   │   ├── userRoutes.js      # User endpoints (Check Username, Search, Profile Edit, Avatar Upload)
│   │   └── conversationRoutes.js # Conversation endpoints (Start 1:1 Chat, List, History)
│   ├── socket/
│   │   └── index.js           # Socket.IO event handlers & presence management
│   └── index.js               # Express + Socket.IO server entry point
├── src/
│   ├── components/
│   │   ├── chat/              # ChatList, ChatWindow, MessageBubble, Composer, EmptyState
│   │   ├── profile/           # ProfileCard, ProfileEditModal, ShareContactModal
│   │   └── layout/            # AppShell, Sidebar, TopBar
│   ├── hooks/                 # useSocket, useAuth, useDebounce
│   ├── store/                 # authStore, chatStore, uiStore
│   ├── services/              # api.js, socket.js, emailService.js
│   └── pages/                 # Login, Register, ChatApp
├── .env                       # Active environment credentials
├── .env.example               # Template for environment configuration
└── package.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18.x
- MongoDB Atlas cluster URL
- Cloudinary Account & API credentials
- Brevo SMTP Key

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.qwgai2u.mongodb.net/convo?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
CLOUDINARY_CLOUD_NAME=e7ag7tod
CLOUDINARY_API_KEY=784615781469251
CLOUDINARY_API_SECRET=your_cloudinary_secret
BREVO_API_KEY=your_brevo_api_key
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=a9d51b001@smtp-brevo.com
SENDER_EMAIL=anujkumar013singh@gmail.com
CLIENT_URL=http://localhost:5173,http://localhost:5176

VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### 3. Installation & Local Execution

```bash
# Install dependencies
npm install

# Start Backend Server (Port 3001)
npm run start:server

# Start Frontend Vite Dev Server (Port 5173 / 5176)
npm run dev
```

---

## 📡 REST API & Socket.IO Specification

### REST API Routes (`/api`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/send-otp` | Sends 6-digit OTP code via Brevo SMTP Relay |
| `POST` | `/api/auth/verify-otp` | Verifies email OTP code |
| `POST` | `/api/auth/register` | Registers user & issues JWT token pair |
| `POST` | `/api/auth/login` | Authenticates user credentials |
| `POST` | `/api/auth/refresh` | Refreshes access token via refresh token |
| `POST` | `/api/auth/reset-password` | Resets account password |
| `GET` | `/api/users/check-username` | Live username availability lookup |
| `GET` | `/api/users/search` | Username-only handle search |
| `GET` | `/api/users/me` | Authenticated user profile |
| `PATCH` | `/api/users/me` | In-place profile field updates |
| `POST` | `/api/users/me/avatar` | Multipart profile picture upload to Cloudinary |
| `POST` | `/api/conversations/start` | Finds or initializes a 1:1 conversation |
| `GET` | `/api/conversations` | Lists current user's active chats |
| `GET` | `/api/conversations/:id/messages` | Fetches paginated chat message history |

### Socket.IO Real-Time Events

- `conversation:join` — Join a specific 1:1 chat room (`conversation:{id}`)
- `message:send` ➔ `message:receive` — Send & receive real-time messages
- `typing` — Broadcast live typing indicators
- `message:read` ➔ `message:status` — Real-time read receipt updates
- `presence` — Broadcast user online/offline status changes

---

## 🌐 Production Deployment

- **Frontend**: Deploys to **Vercel** (`vercel.json` SPA rewrite configured).
- **Backend**: Deploys to **Render** or **Railway** (persistent Node.js process required for Socket.IO WebSocket connections).

---

## 📄 License

MIT License © CONVO App
