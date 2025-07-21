// functions/api/login.js
const cookie = require('cookie');

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { password } = body;

    // Get the password from Cloudflare Pages environment variables
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'ADMIN_PASSWORD is not set on the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password === ADMIN_PASSWORD) {
      const sessionCookie = cookie.serialize('auth_session', 'user-is-logged-in', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Set-Cookie': sessionCookie,
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401, // Unauthorized
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}