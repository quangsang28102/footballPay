import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;
    const spreadsheetId = process.env.NEXT_PUBLIC_DEFAULT_SPREADSHEET_ID;

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    if (!spreadsheetId) {
       // Fallback to env password if no spreadsheet configured yet (initial setup)
       const ENV_PIN = process.env.ADMIN_PASSWORD || '1234';
       if (pin === ENV_PIN) {
         const token = Buffer.from(ENV_PIN).toString('base64');
         return NextResponse.json({ success: true, token });
       }
       return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    // Fetch data from Google Sheet to get the password
    // We can reuse the GET logic from sync-sheet or call it internally
    // Ideally refactor common logic, but for speed let's just fetch here
    const protocol = req.nextUrl.protocol;
    const host = req.headers.get('host');
    const apiUrl = `${protocol}//${host}/api/sync-sheet?id=${spreadsheetId}`;
    
    const response = await fetch(apiUrl);
    let sheetPassword = process.env.ADMIN_PASSWORD || '1234'; // Default fallback

    if (response.ok) {
        const data = await response.json();
        if (data && data.adminPassword) {
            sheetPassword = data.adminPassword;
        }
    }

    if (pin === sheetPassword) {
      // Return a simple token derived from the password
      // This ensures that if the password changes, the token is invalid
      const token = Buffer.from(sheetPassword).toString('base64');
      return NextResponse.json({ success: true, token });
    } else {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
