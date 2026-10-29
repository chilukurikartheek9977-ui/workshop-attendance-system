export type Role = 'admin' | 'student';

export interface User {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  role: Role;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Student {
  id: string; // Firestore document ID
  userId: string; // Maps to User.id
  studentNumber: string;
  name: string;
  email: string;
  classId: string;
  department: string;
  year: number;
  section: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Admin {
  id: string; // Firestore document ID
  userId: string; // Maps to User.id
  name: string;
  createdAt: string | Date;
}

export type ClassStatus = 'ACTIVE' | 'ARCHIVED';

export interface Class {
  id: string;
  name: string;
  department: string;
  year: number;
  section: string;
  academicYear: string;
  status: ClassStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}


export type SessionStatus = 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

export interface AttendanceSession {
  id: string;
  classId: string;
  adminId: string;
  status: SessionStatus;
  scheduledDate: string; // ISO string YYYY-MM-DD
  startTime: string | Date | null;
  endTime: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentUid?: string;
  classId: string;
  markedAt: string | Date;
  status: AttendanceStatus;
}

export interface QRToken {
  id: string;
  sessionId: string;
  tokenHash: string; // Hashed token for security
  issuedAt: string | Date;
  expiresAt: string | Date;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string | Date;
  metadata?: Record<string, unknown>;
}
