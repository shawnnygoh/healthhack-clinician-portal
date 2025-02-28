import { getSession, updateSession } from '@auth0/nextjs-auth0';
import { ManagementClient } from 'auth0';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Auth0 Management API client
const management = new ManagementClient({
  domain: process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', ''),
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
});

// Standard Next.js route handler without withApiAuthRequired wrapper
export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const res = new NextResponse();
    const session = await getSession(req, res);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    
    // Fetch fresh user data from Auth0 Management API
    const userId = session.user.sub;
    const freshUserData = await management.users.get({ id: userId });
    
    if (!freshUserData || !freshUserData.data) {
      return NextResponse.json({ success: false, error: "Failed to fetch updated user data" }, { status: 500 });
    }
    
    // Prepare updated user data
    const updatedUser = {
      ...session.user,
      name: freshUserData.data.name || session.user.name,
      email: freshUserData.data.email || session.user.email,
      // Add any other fields that might have been updated
    };

    // Update the session with fresh data
    await updateSession(req, res, {
      ...session,
      user: updatedUser
    });
    
    // Create a response with the updated session 
    const response = NextResponse.json({ 
      success: true, 
      user: updatedUser 
    });
    
    // Copy cookies from the response object created by updateSession
    // to our new response
    const cookies = res.headers.getSetCookie();
    for (const cookie of cookies) {
      response.headers.append('Set-Cookie', cookie);
    }
    
    return response;
  } catch (error: unknown) {
    console.error('Failed to update session:', error);
    return NextResponse.json({ 
      error: "Session update failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}