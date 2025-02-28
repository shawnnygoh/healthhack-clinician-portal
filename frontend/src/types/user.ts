// Define Auth0 user structure
export interface Auth0User {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    [key: string]: unknown;
  }
  
  // Define user metadata structure
  export interface UserMetadata {
    userId: string;
    specialty?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    appointmentReminders?: boolean;
    patientUpdates?: boolean;
    reminderTime?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
  }
  
  // Define user update payload
  export interface UserUpdatePayload {
    name?: string;
    email?: string;
    password?: string;
    specialty?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    appointmentReminders?: boolean;
    patientUpdates?: boolean;
    reminderTime?: string;
    [key: string]: unknown;
  }
  
  // Define user context update data
  export interface UserContextUpdate {
    user?: Partial<Auth0User>;
    metadata?: Partial<UserMetadata>;
  }