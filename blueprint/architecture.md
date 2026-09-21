# CRM System Architecture

## Overview
The CRM is built on the **MERN** stack (MongoDB, Express, React/Next.js, Node.js) designed for high-performance personnel management, lead tracking, and real-time communication.

## Core Components

### 1. Frontend (Next.js 13+ App Router)
- **Brutalist Design System**: High-contrast, black/white aesthetic with bold typography and shadow-play.
- **State Management**: React Hooks (useState, useEffect, useCallback) and Context API for Authentication.
- **Real-time Engine**: Socket.io-client for instant messaging and notifications.
- **Data Fetching**: Axios with centralized configuration and interceptors for token management.

### 2. Backend (Node.js & Express)
- **Modular Routing**: Separated by domain (Auth, Leads, Tasks, Messages, etc.).
- **Middleware Security**: 
  - JWT Authentication via `authMiddleware`.
  - Rate limiting for security-sensitive endpoints (Login/OTP).
  - Centralized Error Handling for production stability.
- **Real-time Server**: Integrated Socket.io for bidirectional communication.

### 3. Database (MongoDB & Mongoose)
- **Soft Deletion System**: Uses `isDeleted` flags to preserve data integrity while allowing decommissioning.
- **Indexing**: Optimized for identity discovery and performance tracking.

## Communication Flow
1. **Request**: Frontend initiates API call via Axios.
2. **Auth**: `authMiddleware` validates JWT in headers.
3. **Controller**: Business logic processes the request and interacts with MongoDB.
4. **Socket**: For real-time updates (e.g., chat), the controller emits events via Socket.io.
5. **Response**: Structured JSON returned to frontend for UI updates.
