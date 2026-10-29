import * as admin from 'firebase-admin';

admin.initializeApp();

// Export modules
export * as adminClasses from './admin/classes';
export * as adminStudents from './admin/students';
export * as adminSessions from './admin/sessions';
export * as adminQR from './admin/qr';
export * as studentQR from './student/qr';
export * as studentAuth from './auth/studentSignup';

