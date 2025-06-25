
# 🎨 SketchWiz – AI-Powered Collaborative Canvas

SketchWiz is a real-time, AI-enhanced collaborative canvas built using cutting-edge technologies. It allows users to **draw**, **write math/physics problems**, and get **instant AI assistance** — whether it's solving equations or enhancing their sketches. Think of it as an AI version of Excalidraw powered by Google Gemini AI, WebSockets, and a powerful room-based architecture.

---

## 🚀 Features

* 🔁 **Real-Time Collaboration**
  Join or create rooms using unique room names and collaborate with others. All drawings and interactions are **instantly synced** across all clients in the room using WebSockets.

* ✏️ **Infinite Canvas**
  A seamless, Excalidraw-style infinite canvas for freehand drawing, writing, and more.

* 🧠 **AI Assistance (Google Gemini)**

  * Solve **math** and **physics** problems drawn or written on the canvas.
  * Improve rough sketches with the help of AI-driven enhancements.

* 🏠 **Room-Based Architecture**

  * Create, join, or delete uniquely named rooms.
  * Each room stores its own canvas state and persists data, allowing users to pick up where they left off.

* 💾 **Persistent Drawing Storage**
  All drawings within a room are saved using PostgreSQL + Prisma, ensuring no data is lost when users leave or refresh.

---

## 🛠️ Tech Stack

### 🧩 Monorepo

* **Turborepo** – For organizing frontend, backend, and shared modules efficiently.

### 🎨 Frontend

* **Next.js** – React framework for SSR and performance
* **Tailwind CSS** – Utility-first styling
* **Framer Motion** – Smooth animations and transitions
* **WebSocket Client** – Real-time updates
* **Google Gemini API** – AI assistance and drawing understanding

### 🧠 Backend

* **Node.js** + **Express** – Scalable backend with REST & WebSocket handling
* **WebSockets (Socket.IO)** – Real-time room-based communication
* **Prisma ORM** – Type-safe database queries
* **PostgreSQL** – Persistent storage for canvas and room data

---

## 🔗 How It Works

1. **Create/Join Room:**
   Navigate to the app, enter a room name to create or join an existing one.

2. **Collaborate in Real-Time:**
   All participants see the canvas updates live.

3. **Draw or Write Equations:**
   Write problems directly on the canvas — Gemini AI will solve them or suggest improvements.

4. **Enhance Drawings:**
   Rough sketches? Let AI enhance them with a single click.

5. **Data Persistence:**
   Drawings remain saved in the room, accessible anytime.

---

## 📂 Folder Structure (Turborepo)

```
/apps
  /web        - Next.js frontend
  /server     - Node.js + Express backend

/packages
  /ui         - Shared UI components
  /config     - Shared config & types
```

---

## 🧪 Setup & Development

### Prerequisites

* Node.js (18+)
* PostgreSQL instance
* Gemini API Key

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/sketchwiz.git
cd sketchwiz
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create `.env` files in `apps/server` and `apps/web` with:

```env
# Common
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<db>

# Server
PORT=5000
GEMINI_API_KEY=your_api_key

# Web
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Start Development

```bash
# In root
npm run dev
```

---

## 📸 Screenshots (Optional)

*Add visuals of canvas, AI solutions, and real-time collab here*

---

## 📌 Roadmap

* ✅ Drawing & writing on infinite canvas
* ✅ Real-time WebSocket sync
* ✅ AI-powered equation solving
* ✅ AI-powered sketch enhancement
* ✅ Persistent room data storage
* ⏳ Authentication & private rooms
* ⏳ Export canvas to image/PDF
* ⏳ Voice-to-math input

---




