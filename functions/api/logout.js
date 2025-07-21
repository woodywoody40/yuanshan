// functions/api/logout.js
const cookie = require('cookie');

export async function onRequestGet(context) {
  try {
    // Clear the authentication cookie
    const clearCookie = cookie.serialize('auth_session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      expires: new Date(0), // Set expiry to past date to clear cookie
    });

    // Redirect to admin login page
    return new Response(null, {
      status: 302,
      headers: {
        'Set-Cookie': clearCookie,
        'Location': '/admin.html'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/admin.html'
      }
    });
  }
}

export async function onRequestPost(context) {
  // Support both GET and POST requests for logout
  return onRequestGet(context);
}