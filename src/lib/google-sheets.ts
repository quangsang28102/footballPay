'use client';

import { AppData } from '@/types';

// Extend window object to include google types
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export interface GoogleConfig {
  clientId?: string; // Optional (legacy OAuth)
  apiKey?: string;   // Optional (legacy OAuth)
  serviceAccountJson?: string; // New Service Account JSON content
  spreadsheetId: string;
}

export const loadGoogleScripts = () => {
  return new Promise<void>((resolve) => {
    if (window.gapi && window.google) {
      // Already loaded
      gapiInited = true;
      gisInited = true;
      resolve();
      return;
    }
    // ... rest of loading logic kept same but optional if using JSON key
    resolve(); 
  });
};

// Helper to trigger sync via API
export const syncDataToGoogle = async (data: AppData) => {
  const savedConfig = localStorage.getItem('google-sheets-config');
  if (!savedConfig) return { error: 'Chưa cấu hình Google Sheets' };

  try {
    const config: GoogleConfig = JSON.parse(savedConfig);
    if (!config.spreadsheetId || !config.serviceAccountJson) {
      return { error: 'Thiếu thông tin cấu hình Google Sheets' };
    }

    const response = await fetch('/api/sync-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId: config.spreadsheetId,
        data,
        credentials: JSON.parse(config.serviceAccountJson),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Lỗi không xác định' };
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Lỗi kết nối' };
  }
};
