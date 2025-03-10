import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';


function usePatientsCount() {
    return useQuery({
        queryKey: ['patientsCount'],
        queryFn: async () => {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patients/count`);
            return response.data;
        }
    });
}


export function PatientCountCard() {
  const { status, data, error } = usePatientsCount();

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl">Total Patients</CardTitle>
        </CardHeader>
            <CardContent>
                {status === 'pending' ? (
                    <p>Loading...</p>
                ) : status === 'error' ? (
                    <p>Error: {error.message}</p>
                ) : (
                    <div>
                        <p className="text-3xl font-bold">{data.patient_count}</p>
                        <p className="text-sm text-gray-500">↑ 12% from last month</p>
                    </div>
                )}
            </CardContent>
    </Card>
  );
}