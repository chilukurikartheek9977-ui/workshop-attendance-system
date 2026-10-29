# How to Run the Application Locally

This guide provides step-by-step instructions for running both the Next.js frontend and the Firebase Emulators (backend) locally.

## 1. Prerequisites

Before you start, make sure you have the following installed:
*   **Node.js**: v18 or higher recommended.
*   **Java Runtime Environment (JRE) / OpenJDK 17+**: **REQUIRED** if you want to run the local backend Firebase Emulators (Auth & Firestore require Java to run).

---

## 2. Running the Frontend (Next.js)

The frontend handles the user interface and interacts with the backend.

1.  Open a terminal in the root of your project (`d:\WorkShop_attendance`).
2.  Install the dependencies (only needed the first time):
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## 3. Running the Backend (Firebase Emulators & Cloud Functions)

The backend consists of Firebase Cloud Functions, Firestore, and Authentication. Running the Firebase Emulator Suite allows you to test the app entirely offline without modifying your live production database.

1.  Open a **second** terminal window.
2.  Navigate into the `functions` directory:
    ```bash
    cd functions
    ```
3.  Install the backend dependencies:
    ```bash
    npm install
    ```
4.  Go back to the root directory (where `firebase.json` is located):
    ```bash
    cd ..
    ```
5.  Start the Firebase Emulator Suite:
    ```bash
    npx firebase-tools emulators:start
    ```
    *(Alternatively, if you have the Firebase CLI installed globally, you can just run `firebase emulators:start`)*

---

## Important Note on Configuration (`.env`)

If you want the frontend to connect to your **local emulators** instead of your production Firebase project, make sure your `.env` file at the root of the project contains:

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"
```

If you **do not** want to run the emulators and prefer connecting directly to your live production Firebase, set it to `"false"`:

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATOR="false"
```
