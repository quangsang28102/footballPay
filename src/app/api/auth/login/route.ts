import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    const CORRECT_PIN = process.env.ADMIN_PASSWORD || '1234';

    if (pin === CORRECT_PIN) {
      // Return a simple token derived from the password
      // This ensures that if the password changes, the token is invalid
      const token = Buffer.from(CORRECT_PIN).toString('base64');
      return NextResponse.json({ success: true, token });
    } else {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
