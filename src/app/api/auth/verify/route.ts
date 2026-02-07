import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    const CORRECT_PIN = process.env.ADMIN_PASSWORD || '1234';
    const currentToken = Buffer.from(CORRECT_PIN).toString('base64');

    if (token === currentToken) {
      return NextResponse.json({ valid: true });
    } else {
        // If password changed, token is invalid -> logout
      return NextResponse.json({ valid: false }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
