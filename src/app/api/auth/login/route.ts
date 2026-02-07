import { NextRequest, NextResponse } from 'next/server';

// Import crypto for hashing
// Note: crypto.subtle is available in Node 15+ and Edge Runtime

async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;
    const spreadsheetId = process.env.NEXT_PUBLIC_DEFAULT_SPREADSHEET_ID;

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    const inputHash = await hashPassword(pin);

    // Fallback environment password (hashed for comparison)
    const envPassword = process.env.ADMIN_PASSWORD || '1234';
    const envHash = await hashPassword(envPassword);

    if (!spreadsheetId) {
       if (inputHash === envHash) {
         return NextResponse.json({ success: true, token: inputHash });
       }
       return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    // Fetch data from Google Sheet
    const protocol = req.nextUrl.protocol;
    const host = req.headers.get('host');
    const apiUrl = `${protocol}//${host}/api/sync-sheet?id=${spreadsheetId}`;
    
    // We expect the sheet to return JSON data which might contain adminPasswordHash OR adminPassword (legacy)
    const response = await fetch(apiUrl);
    
    let targetHash = envHash;
    let hasSheetPassword = false;

    if (response.ok) {
        const data = await response.json();
        
        // Priority 1: Stored Hash
        if (data && data.adminPasswordHash) {
            targetHash = data.adminPasswordHash;
            hasSheetPassword = true;
        } 
        // Priority 2: Legacy Plain Password (if exists)
        else if (data && data.adminPassword) {
            targetHash = await hashPassword(data.adminPassword);
            hasSheetPassword = true;
        }
    }

    if (inputHash === targetHash) {
      return NextResponse.json({ success: true, token: inputHash });
    } else {
        // Fallback: ONLY use ENV password if Sheet does NOT have a password configured
        if (!hasSheetPassword && inputHash === envHash) {
             return NextResponse.json({ success: true, token: inputHash });
        }
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
