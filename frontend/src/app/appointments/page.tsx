"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"

const appointments = [
  { id: 1, patient: "Tan Wei Jie", date: "2023-05-15", time: "10:00 AM", type: "Follow-up", status: "Confirmed" },
  {
    id: 2,
    patient: "Lim Jia Hui",
    date: "2023-05-15",
    time: "11:30 AM",
    type: "Initial Consultation",
    status: "Pending",
  },
  { id: 3, patient: "Muhammad Irfan Bin Salleh", date: "2023-05-16", time: "2:00 PM", type: "Follow-up", status: "Confirmed" },
  { id: 4, patient: "Rajesh Kumar s/o Maniam", date: "2023-05-16", time: "3:30 PM", type: "Assessment", status: "Confirmed" },
  { id: 5, patient: "Tan Wei Jie", date: "2023-05-17", time: "9:00 AM", type: "Follow-up", status: "Cancelled" },
  {
    id: 6,
    patient: "Chong Li Ting",
    date: "2023-05-17",
    time: "10:30 AM",
    type: "Initial Consultation",
    status: "Confirmed",
  },
  { id: 7, patient: "Lim Jia Hui", date: "2023-05-18", time: "1:00 PM", type: "Follow-up", status: "Pending" },
  { id: 8, patient: "Nur Aisyah Binte Rahman", date: "2023-05-18", time: "2:30 PM", type: "Assessment", status: "Confirmed" },
]

const appointmentTypes = [
  { name: "Follow-up", value: 4 },
  { name: "Initial Consultation", value: 2 },
  { name: "Assessment", value: 2 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"]

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">Appointments</h1>
        <Button>Schedule New Appointment</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Today&apos;s Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">5</p>
            <p className="text-sm text-gray-500">2 more than yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Upcoming This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">23</p>
            <p className="text-sm text-gray-500">↑ 15% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Cancellations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">2</p>
            <p className="text-sm text-gray-500">↓ 50% from last week</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[500px]">
          <CardHeader>
            <CardTitle className="text-2xl">Appointment Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appointmentTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {appointmentTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="min-h-[500px]">
          <CardHeader>
            <CardTitle className="text-2xl">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>{appointment.patient}</TableCell>
                      <TableCell>{appointment.date}</TableCell>
                      <TableCell>{appointment.time}</TableCell>
                      <TableCell>{appointment.type}</TableCell>
                      <TableCell>{appointment.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Monthly Calendar Overview</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[400px]">
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 31 }, (_, i) => (
              <div key={i + 1} className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer min-h-[100px]">
                <div className="font-semibold mb-2">{i + 1}</div>
                {i % 3 === 0 && (
                  <div className="text-sm bg-blue-100 rounded p-1 mb-1">
                    2 appointments
                  </div>
                )}
                {i % 7 === 0 && (
                  <div className="text-sm bg-green-100 rounded p-1">
                    Available slots
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
