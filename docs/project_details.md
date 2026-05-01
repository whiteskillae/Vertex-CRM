# CRM Project Documentation

## Project Overview
This is a Customer Relationship Management (CRM) system designed for employee workflow and reporting.

## Technology Stack

### Frontend
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Key Features**: Role-based dashboards, real-time collaboration, dynamic UI.

### Backend
- **Framework**: Node.js with Express
- **Database**: MongoDB (using Mongoose)
- **Deployment**: Render
- **Responsibilities**: API endpoints, database management, business logic.

### Database
- **Type**: NoSQL (MongoDB)
- **Hosting**: MongoDB Atlas (recommended)

## Directory Structure
```text
CRM/
├── frontend/           # Next.js Application
├── backend/            # Express Server
├── docs/               # Project Documentation
└── README.md           # Root Entry Point
```

## Setup Instructions

### Frontend
1. `cd frontend`
2. `npm install`
3. If `components.json` is missing, initialize shadcn:
   `npx shadcn-ui@latest init`
   *   Style: New York
   *   Base Color: Zinc
   *   CSS Variables: Yes
4. `npm run dev`

### Backend
1. `cd backend`
2. `npm install`
3. `npm run dev`

## Business Logic & Workflows

### 1. Lead Management
- **Capture**: Leads are captured via forms or manual entry.
- **Assignment**: Leads are assigned to employees based on workload or specialization.
- **Tracking**: Status updates (New, In Progress, Closed, Lost) with history logs.

### 2. Employee Workflow
- **Dashboards**: Personalized views for employees to see their assigned tasks and leads.
- **Reporting**: Weekly/Daily reports submitted by employees.
- **Attendance**: Basic check-in/check-out logic if required.

### 3. Task Management
- **Creation**: Admins can create tasks for employees.
- **Status**: Tasks move through "Todo", "Doing", "Done".
- **Notifications**: Real-time alerts (via Socket.io or polling) for task updates.

## API Architecture
- **Authentication**: JWT-based auth stored in HttpOnly cookies.
- **Models**:
  - `User`: Roles (Admin, Employee), credentials, profile.
  - `Lead`: Contact info, status, assignedTo, history.
  - `Task`: Title, description, deadline, assignedTo, status.
  - `Report`: Content, date, submittedBy.

## Deployment Strategy
- **Frontend (Vercel)**:
  - Automatic deployments on git push.
  - Environment variables managed in Vercel Dashboard.
- **Backend (Render)**:
  - Dockerized or standard Node.js runtime.
  - MongoDB Atlas connection string stored in Render environment.

## AI Assistant Guidelines
- Always refer to `backend/models` for data structure.
- Ensure frontend `services/` layer uses the correct backend base URL.
- Implement error handling on both sides.
- Use semantic HTML and accessible UI components.
