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

// ... keep syncToSheet for fallback/legacy if needed, but not critical now.
export const syncToSheet = async (config: GoogleConfig, data: AppData) => {
    // Legacy client-side sync
    if (!config.clientId || !config.apiKey) return;
    // ... existing client implementation
};
