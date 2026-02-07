import { NextRequest, NextResponse } from 'next/server';

// Hashing utility (duplicated to keep file self-contained or import if possible, but importing in API routes can be tricky with path aliases sometimes)
async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body; // Token is now the SHA-256 of the password

    const spreadsheetId = process.env.NEXT_PUBLIC_DEFAULT_SPREADSHEET_ID;
    
    const envPassword = process.env.ADMIN_PASSWORD || '1234';
    const envHash = await hashPassword(envPassword);
    
    let targetHash = envHash;

    if (spreadsheetId) {
        const protocol = req.nextUrl.protocol;
        const host = req.headers.get('host');
        try {
            const apiUrl = `${protocol}//${host}/api/sync-sheet?id=${spreadsheetId}`;
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && data.adminPasswordHash) {
                    targetHash = data.adminPasswordHash;
                } else if (data && data.adminPassword) {
                    targetHash = await hashPassword(data.adminPassword);
                }
            }
        } catch (e) {
            console.error('Verify Auth Fetch Error', e);
        }
    }

    // Logic: verify if the provided token matches the current correct hash
    // The client sends the token which IS the hash of the password they logged in with.
    // If we changed the password on the server, targetHash changes.
    // So stored token (old hash) != targetHash (new hash) -> Invalid -> Logout.
    
    if (token === targetHash) {
      return NextResponse.json({ valid: true });
    } else {
        // Allow fallback to ENV password if mismatched (e.g. sheet fetch failed but ENV is valid)
        if (token === envHash) {
             return NextResponse.json({ valid: true });
        }

      return NextResponse.json({ valid: false }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
