'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { getUserMetadata } from '@/lib/services/user'
import { useUserContext } from '@/context/UserContext'

export default function SettingsPage() {
  const { userData: user, isLoading: userLoading, refreshUserData, updateLocalUserData } = useUserContext();
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialty: '',
    password: '',
    emailNotifications: false,
    smsNotifications: false,
    appointmentReminders: false,
    patientUpdates: false,
    reminderTime: '',
  })

  // Determine if user has a social login
  const isSocialLogin = user?.sub?.includes('google-oauth2|') || 
                        user?.sub?.includes('github|') ||
                        user?.sub?.includes('facebook|') ||
                        user?.sub?.includes('apple|') ||
                        user?.sub?.includes('twitter|');


  // Load user data from Auth0 and Firestore
  const loadUserData = useCallback(async () => {
    if (user?.sub) {
      try {
        setIsLoadingMetadata(true);
        
        // Try to get user metadata with Auth0 sub
        const metadata = await getUserMetadata(user.sub);

        setFormData(prev => ({
          ...prev,
          name: user.name || '',
          email: user.email || '',
          specialty: metadata?.specialty || '',
          emailNotifications: metadata?.emailNotifications || false,
          smsNotifications: metadata?.smsNotifications || false,
          appointmentReminders: metadata?.appointmentReminders || false,
          patientUpdates: metadata?.patientUpdates || false,
          reminderTime: metadata?.reminderTime || '',
        }));
        
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load user settings');
      } finally {
        setIsLoadingMetadata(false);
      }
    }
  }, [user]);

  // Load user data on initial render and when refreshCounter changes
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSwitchChange = (id: string) => {
    setFormData(prev => ({
      ...prev,
      [id]: !prev[id as keyof typeof prev]
    }))
  }

  const handleSpecialtyChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      specialty: value
    }))
  }

  const handleReminderTimeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      reminderTime: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
  
    try {
      // Prepare data to submit (filter out irrelevant fields)
      const dataToSubmit: Partial<typeof formData> = { ...formData };
      
      // Don't send email update for social login users as it's not supported
      if (isSocialLogin) {
        delete dataToSubmit.email;
      }
      
      // Only send password if it's not empty
      if (!dataToSubmit.password) {
        delete dataToSubmit.password;
      }
      
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      })
  
      const data = await response.json() as {
        success: boolean;
        message?: string;
        error?: string;
        user?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
      };
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings')
      }
  
      // Password changes still require a re-login for security reasons
      if (dataToSubmit.password) {
        toast.success('Settings updated. You need to log in again with your new password.', {
          duration: 3000
        });
        
        setTimeout(() => {
          window.location.href = '/api/auth/logout?returnTo=/api/auth/login?returnTo=/settings';
        }, 3000);
        return;
      }
      
      // For all other changes, update the frontend data
      toast.success('Settings updated successfully');
      
      // Update local user data with the changes
      updateLocalUserData({
        user: {
          // Include specific fields that we want to override in the Auth0 session
          name: dataToSubmit.name,
          email: dataToSubmit.email,
        },
        metadata: data.metadata || {}
      });
      
      // Still attempt to refresh Firebase metadata
      await refreshUserData();
      
      // Clear the password field
      setFormData(prev => ({
        ...prev,
        password: ''
      }));
      
    } catch (error) {
      console.error('Submit error:', error);
      toast.error((error as Error).message || 'Failed to update settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (userLoading || isLoadingMetadata) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading your settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">Settings</h1>
      </div>
      
      {isSocialLogin && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-500 h-5 w-5 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">Social Login Account</h3>
            <p className="text-amber-700 text-sm">
              You&apos;re signed in using {
                user?.sub?.includes('google-oauth2') ? 'Google' : 
                user?.sub?.includes('github') ? 'GitHub' : 
                'a social provider'
              }. 
              Your email address is managed by your social provider and cannot be changed here.
              {!user?.sub?.includes('auth0') && " Password changes are also not supported for social login accounts."}
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl">Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Dr. Jane Smith"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="doctor@example.com"
                  disabled={isSubmitting || isSocialLogin}
                  className={isSocialLogin ? "bg-gray-100" : ""}
                />
                {isSocialLogin && (
                  <p className="text-sm text-gray-500">Email is managed by your social provider</p>
                )}
              </div>
              
              {!isSocialLogin && (
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Select 
                  value={formData.specialty} 
                  onValueChange={handleSpecialtyChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="specialty">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neurology">Neurology</SelectItem>
                    <SelectItem value="orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="physiatry">Physiatry</SelectItem>
                    <SelectItem value="occupational-therapy">Occupational Therapy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailNotifications" className="text-base">
                  Email Notifications
                </Label>
                <Switch 
                  id="emailNotifications"
                  checked={formData.emailNotifications}
                  onCheckedChange={() => handleSwitchChange('emailNotifications')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="smsNotifications" className="text-base">
                  SMS Notifications
                </Label>
                <Switch 
                  id="smsNotifications"
                  checked={formData.smsNotifications}
                  onCheckedChange={() => handleSwitchChange('smsNotifications')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="appointmentReminders" className="text-base">
                  Appointment Reminders
                </Label>
                <Switch 
                  id="appointmentReminders"
                  checked={formData.appointmentReminders}
                  onCheckedChange={() => handleSwitchChange('appointmentReminders')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="patientUpdates" className="text-base">
                  Patient Updates
                </Label>
                <Switch 
                  id="patientUpdates"
                  checked={formData.patientUpdates}
                  onCheckedChange={() => handleSwitchChange('patientUpdates')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminderTime" className="text-base">
                  Reminder Time
                </Label>
                <Select 
                  value={formData.reminderTime} 
                  onValueChange={handleReminderTimeChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="reminderTime">
                    <SelectValue placeholder="Select reminder time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                    <SelectItem value="120">2 hours before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-2xl">System Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-base">
                  Language
                </Label>
                <Select>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-base">
                  Theme
                </Label>
                <Select>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-format" className="text-base">
                  Date Format
                </Label>
                <Select>
                  <SelectTrigger id="date-format">
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-format" className="text-base">
                  Time Format
                </Label>
                <Select>
                  <SelectTrigger id="time-format">
                    <SelectValue placeholder="Select time format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12-hour</SelectItem>
                    <SelectItem value="24">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}