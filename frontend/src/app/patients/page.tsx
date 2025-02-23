"use client"

import { PatientList } from "@/components/patient-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Pie, PieChart } from "recharts"

const adherenceData = [
  { name: "Week 1", adherence: 75 },
  { name: "Week 2", adherence: 82 },
  { name: "Week 3", adherence: 88 },
  { name: "Week 4", adherence: 85 },
  { name: "Week 5", adherence: 91 },
  { name: "Week 6", adherence: 89 },
]

export default function PatientsDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">Patients</h1>
        <Button>Add New Patient</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">127</p>
            <p className="text-sm text-gray-500">↑ 12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Active Treatment Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">98</p>
            <p className="text-sm text-gray-500">↑ 5% from last month</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl">Avg. Adherence Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">87%</p>
            <p className="text-sm text-gray-500">↑ 3% from last month</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="w-full min-h-[500px]">
          <CardHeader>
            <CardTitle className="text-2xl">Patient Adherence Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adherenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="adherence" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full min-h-[500px]">
          <CardHeader>
            <CardTitle className="text-2xl">Exercise Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: 75 },
                      { name: 'In Progress', value: 15 },
                      { name: 'Not Started', value: 10 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Completed', color: '#4CAF50' },
                      { name: 'In Progress', color: '#2196F3' },
                      { name: 'Not Started', color: '#9E9E9E' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Patient List</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline">Filter</Button>
            <Button variant="outline">Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          <PatientList onSelectPatient={() => {}} />
        </CardContent>
      </Card>
    </div>
  )
}