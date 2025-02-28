import { db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'

export interface UserMetadata {
  specialty?: string
  emailNotifications?: boolean
  smsNotifications?: boolean
  appointmentReminders?: boolean
  patientUpdates?: boolean
  reminderTime?: string
  userId: string
}

// Helper function to sanitize Auth0 IDs for Firestore
const sanitizeUserId = (userId: string): string => {
  
  // Replace special characters with underscore
  const sanitized = userId.replace(/[|.#$[\]]/g, '_');
  
  return sanitized;
}

export const getUserMetadata = async (userId: string): Promise<UserMetadata | null> => {
  try {
    if (!userId) {
      console.error('getUserMetadata called with empty userId');
      return null;
    }
    
    const sanitizedUserId = sanitizeUserId(userId);
    
    // First attempt: Try to find the document with sanitized ID
    const userDoc = await getDoc(doc(db, 'users', sanitizedUserId));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      
      return {
        userId: sanitizedUserId,
        specialty: data.specialty || '',
        emailNotifications: data.emailNotifications || false,
        smsNotifications: data.smsNotifications || false,
        appointmentReminders: data.appointmentReminders || false,
        patientUpdates: data.patientUpdates || false,
        reminderTime: data.reminderTime || '',
        ...data
      };
    }
        
    // Second attempt: Query for documents that have matching userId field
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userId', '==', sanitizedUserId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      
      // Use the first matching document
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        userId: sanitizedUserId,
        specialty: data.specialty || '',
        emailNotifications: data.emailNotifications || false,
        smsNotifications: data.smsNotifications || false,
        appointmentReminders: data.appointmentReminders || false,
        patientUpdates: data.patientUpdates || false,
        reminderTime: data.reminderTime || '',
        ...data
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user metadata:', error);
    return null;
  }
}

export const createOrUpdateUserMetadata = async (
  userId: string,
  metadata: Partial<UserMetadata>
): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const sanitizedUserId = sanitizeUserId(userId);
    
    const userRef = doc(db, 'users', sanitizedUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create new user document
      const newData = {
        userId: sanitizedUserId, // Store sanitized ID for security rules
        ...metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(userRef, newData);
    } else {
      // Update existing user document
      const updateData = {
        ...metadata,
        updatedAt: new Date().toISOString(),
      };
      
      await updateDoc(userRef, updateData);
    }
  } catch (error) {
    console.error('Error updating user metadata:', error);
    throw error;
  }
}