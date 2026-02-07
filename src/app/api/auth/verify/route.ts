import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    const spreadsheetId = process.env.NEXT_PUBLIC_DEFAULT_SPREADSHEET_ID;
    
    // Default fallback
    let correctPassword = process.env.ADMIN_PASSWORD || '1234';

    if (spreadsheetId) {
        // Fetch from Google Sheet
        const protocol = req.nextUrl.protocol;
        const host = req.headers.get('host');
        try {
            const apiUrl = `${protocol}//${host}/api/sync-sheet?id=${spreadsheetId}`;
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && data.adminPassword) {
                    correctPassword = data.adminPassword;
                }
            }
        } catch (e) {
            console.error('Verify Auth Fetch Error', e);
            // Fallback to env default if fetch fails (e.g. offline or error)
            // But if sheet has password, we might be verifying against wrong one.
            // Safety: if we can't verify, we fail unless token matches env pass (initial setup)
        }
    }

    const currentToken = Buffer.from(correctPassword).toString('base64');

    if (token === currentToken) {
      return NextResponse.json({ valid: true });
    } else {
        // Double check against ENV password just in case sheet fetch failed but token is valid for ENV
        // This prevents lockout if sheet is down but password hasn't changed from default
        const envToken = Buffer.from(process.env.ADMIN_PASSWORD || '1234').toString('base64');
        if (token === envToken) {
             return NextResponse.json({ valid: true });
        }

      return NextResponse.json({ valid: false }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
