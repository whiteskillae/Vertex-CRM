# CRM Enterprise System - Documentation

## 🚀 Overview
A secure, professional-grade CRM for managing personnel, tasks, and intelligence reporting. Built with a "Terminal" industrial aesthetic for high-end enterprise utility.

## 👥 User Roles & Access Control
The system implements strict Role-Based Access Control (RBAC):

1. **Guest**
   - **Access**: Demo mode via dedicated login.
   - **Capability**: Explore UI elements and dashboard layout.
   - **Restriction**: No data persistence; read-only preview.

2. **Employee**
   - **Access**: Email + OTP (Secure Uplink).
   - **Dashboard**: Personal Workflow (Calendar, To-do), Manager Broadcasts.
   - **Actions**: View assigned tasks, submit intelligence reports (with file support), secure messaging with managers.

3. **Manager / Admin**
   - **Access**: Admin credentials + OTP.
   - **Dashboard**: Fleet Overview, Performance Analytics, Personnel List.
   - **Actions**: Recruit employees (Pre-registration), assign strategic tasks, review submitted intelligence, broadcast secure messages.

## 📦 Architecture & Stack
- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion, Recharts, Lucide Icons.
- **Backend**: Node.js, Express, MongoDB (Mongoose).
- **Authentication**: JWT (JSON Web Tokens) + Role Middleware + OTP (Nodemailer).
- **Storage**: Cloudinary (Artifacts & Intelligence Evidence).

## 🛠 Features
- **OTP Verification**: Multi-factor authentication for all registered personnel.
- **Strategic Queue**: Task management system with priority levels and assignee tracking.
- **Intelligence Hub**: Reporting system allowing employees to submit findings with PDF/Image evidence.
- **Secure Messenger**: Internal encrypted communication between personnel nodes.
- **Operational Vitals**: Real-time analytics dashboard for monitoring company productivity.

## 🧭 Getting Started
1. **Manager Setup**: Seed the database to create the first Admin/Manager.
2. **Recruitment**: Manager logs in and recruits employees via the 'Personnel' panel.
3. **Uplink**: Employees log in using their registered email and received OTP.

---
*System Status: Fully Operational | Security Protocol: Active*
