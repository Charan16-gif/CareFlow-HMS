/**
 * Application Constants
 */
export const APP_NAME = process.env.REACT_APP_NAME || 'CareFlow-HMS';
export const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  SETTINGS: '/settings',
};

export const SYSTEM_STATUS = {
  ONLINE: 'Online',
  CONNECTING: 'Checking Connection...',
  OFFLINE: 'Offline',
};
