import { getSession } from '@auth0/nextjs-auth0';
import { ManagementClient } from 'auth0';
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin';

const management = new ManagementClient({
  domain: process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', ''),
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
});

// Helper function to sanitize Auth0 IDs for Firestore
const sanitizeUserId = (userId: string): string => {
  return userId.replace(/[|.#$[\]]/g, '_');
};

// For ManagementClient updates
interface Auth0Updates {
  name?: string;
  email?: string;
  [key: string]: unknown;
}

// For Firestore metadata updates
interface MetadataUpdates {
  specialty?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  appointmentReminders?: boolean;
  patientUpdates?: boolean;
  reminderTime?: string;
  [key: string]: unknown;
}

// Standard Next.js route handler without withApiAuthRequired wrapper
export async function PATCH(req: NextRequest) {
  try {
    // Create a response object and pass it to getSession to fix the cookies API issue
    const res = new NextResponse();
    const session = await getSession(req, res);
    
    // Check if user is authenticated
    if (!session?.user.sub) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    const data = await req.json();

    // Determine if this is a social connection user
    const isSocialConnection = session.user.sub.includes('google-oauth2|') || 
                              session.user.sub.includes('github|') ||
                              session.user.sub.includes('facebook|') ||
                              session.user.sub.includes('apple|') ||
                              session.user.sub.includes('twitter|');

    
    let updatedUser = null;
    let authUpdateSuccess = false;
    
    // Only attempt specific Auth0 updates for non-social users
    if (!isSocialConnection) {
      
      // For database users, we can update name, email, and password
      const auth0Updates: Auth0Updates = {};
      if (data.name) auth0Updates.name = data.name;
      if (data.email) auth0Updates.email = data.email;
      
      if (Object.keys(auth0Updates).length > 0) {
        try {
          updatedUser = await management.users.update(
            { id: session.user.sub },
            auth0Updates
          );
          authUpdateSuccess = true;
        } catch (updateError) {
          console.error('Error updating Auth0 profile:', updateError);
        }
      }

      // Try to update password separately
      if (data.password) {
        try {
          await management.users.update(
            { id: session.user.sub },
            { password: data.password }
          );
        } catch (passwordError) {
          console.error('Error updating password:', passwordError);
        }
      }
    } else {
      
      // For social users, only try to update name
      if (data.name) {
        try {
          updatedUser = await management.users.update(
            { id: session.user.sub },
            { name: data.name }
          );
          authUpdateSuccess = true;
        } catch (nameError) {
          console.error('Error updating name for social user:', nameError);
        }
      }
    }

    // Prepare metadata update (all users can update these)
    const metadataToUpdate: MetadataUpdates = {
      specialty: data.specialty,
      emailNotifications: data.emailNotifications,
      smsNotifications: data.smsNotifications,
      appointmentReminders: data.appointmentReminders,
      patientUpdates: data.patientUpdates,
      reminderTime: data.reminderTime,
    };
    

    // USING ADMIN SDK: Update user metadata in Firestore
    let metadataUpdateSuccess = false;
    let updatedMetadata = null;
    
    try {
      // Sanitize the userId for use as document ID
      const sanitizedUserId = sanitizeUserId(session.user.sub);
      
      // Get the current timestamp
      const now = new Date().toISOString();
      
      // Check if the document exists
      const docRef = admin.firestore().collection('users').doc(sanitizedUserId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        // Create new document
        await docRef.set({
          userId: sanitizedUserId,
          ...metadataToUpdate,
          createdAt: now,
          updatedAt: now
        });
      } else {
        // Update existing document
        await docRef.update({
          ...metadataToUpdate,
          updatedAt: now
        });
      }
      
      // Get the updated document
      const updatedDoc = await docRef.get();
      updatedMetadata = updatedDoc.data();
      
      metadataUpdateSuccess = true;
    } catch (error) {
      console.error('Error updating Firestore (admin SDK):', error);
      return NextResponse.json(
        { error: 'Failed to update user data in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Auth0 update: ${authUpdateSuccess ? 'Success' : 'Failed/Skipped'}, Firestore update: ${metadataUpdateSuccess ? 'Success' : 'Failed'}`,
      user: updatedUser || session.user,
      metadata: updatedMetadata,
      isSocialConnection
    });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update user' 
      },
      { status: 500 }
    );
  }
}