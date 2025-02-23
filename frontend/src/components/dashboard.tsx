"use client"

import { PatientList } from "@/components/patient-list"
import { Metrics } from "@/components/metrics"
import { RecentActivity } from "@/components/recent-activity"
import { RehabProgress } from "@/components/rehab-progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const monthlyData = [
  { month: "Jan", totalExercises: 245, completionRate: 85 },
  { month: "Feb", totalExercises: 285, completionRate: 88 },
  { month: "Mar", totalExercises: 320, completionRate: 92 },
  { month: "Apr", totalExercises: 300, completionRate: 87 },
  { month: "May", totalExercises: 340, completionRate: 91 },
  { month: "Jun", totalExercises: 360, completionRate: 94 },
]

export function Dashboard() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Metrics />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <PatientList onSelectPatient={() => {}} />
        </div>
        <RecentActivity />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RehabProgress />
        <Card>
          <CardHeader>
            <CardTitle>Monthly Exercise Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalExercises"
                    stroke="#8884d8"
                    name="Total Exercises"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#82ca9d"
                    name="Completion Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
