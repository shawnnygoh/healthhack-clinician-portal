'use client'

import { Dashboard } from "@/components/dashboard"
import { useUserContext } from '@/context/UserContext'

export default function Home() {
  const { userData: user, isLoading } = useUserContext()

  const getFirstName = (fullName: string | undefined) => {
    if (!fullName) return 'User';
    
    // Define common titles to filter out
    const titles = ['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.'];
    
    // Split the name and convert to lowercase for comparison
    const nameParts = fullName.split(' ');
    
    // If the first part is a title, return the second part
    if (nameParts.length > 1 && titles.includes(nameParts[0].toLowerCase())) {
      return nameParts[1];
    }
    
    // Otherwise return the first part as before
    return nameParts[0];
  }

  return (
    <>
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        {isLoading ? (
          'Loading...'
        ) : user ? (
          `Welcome, ${getFirstName(user.name ?? undefined)}`
        ) : (
          'Welcome'
        )}
      </h1>
      <Dashboard />
    </>
  )
}
