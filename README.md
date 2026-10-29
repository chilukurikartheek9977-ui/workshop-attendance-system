# QR-Based Real-Time Attendance Management System

This repository contains the production-grade, real-time attendance management system with a dynamic QR code implementation.

## Project Overview

The system allows Admins (Instructors) to project a dynamic, short-lived (10-second) QR code in the classroom. Students scan the QR code via their smartphones, and the attendance is registered securely and accurately, avoiding screenshot sharing and other fraudulent means.

### **Current Implementation Status**
- **Implemented:** Project Foundation, Firebase Configuration, Firebase Emulators setup, Next.js & Tailwind setup, Shared Types, Firestore Security Rules (Role-Based).
- **Planned:** Admin Dashboard, Student Dashboard, Attendance Session UI, Dynamic QR rotation logic, QR Scanner, Real-time Dashboard, Export Functionality.

## Technology Stack

### Frontend
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS

### Backend & Database (Firebase)
- **Authentication:** Firebase Auth
- **Database:** Cloud Firestore
- **Backend Logic:** Firebase Cloud Functions
- **Hosting:** Firebase Hosting

## Local Development & Setup

### Requirements
- Node.js (v20+)
- Firebase CLI (`npm install -g firebase-tools`)

### Initial Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Install functions dependencies: `cd functions && npm install`
4. Create `.env` file by copying `.env.example`: `cp .env.example .env`
5. Fill in the required environment variables.

### Running Local Development
To run the local Firebase Emulator Suite along with Next.js dev server:
1. Start Emulators: `firebase emulators:start`
2. Run Next.js (in a new terminal): `npm run dev`

*Ensure `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` is set to `"true"` in your `.env`.*

## Architecture Notes

### Security & Roles
- Roles are assigned via **Firebase Custom Claims** (`admin` or `student`).
- `firestore.rules` blocks direct modifications to protected tables like `attendanceRecords` from client SDKs.
- `firebase-admin` is only used server-side (Cloud Functions, Next.js API routes) to securely manage sensitive operations.

### Cloud Functions Structure
```
functions/
├── src/
│   ├── auth/
│   ├── attendance/
│   ├── qr/
│   ├── admin/
│   ├── students/
│   ├── realtime/
│   └── utils/
```

### Authentication Architecture
Client authenticates with Firebase Auth. Token claims are checked inside the Firestore Rules and on backend Cloud Functions.
