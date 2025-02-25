import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

// Configure which routes require authentication
export const config = {
  matcher: [
    // Protect all routes except login, API routes, and static assets
    '/((?!api|_next|login|favicon.ico).*)',
  ],
};