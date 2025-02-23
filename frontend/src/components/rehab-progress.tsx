import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const data = [
  { name: "Week 1", progress: 30 },
  { name: "Week 2", progress: 45 },
  { name: "Week 3", progress: 60 },
  { name: "Week 4", progress: 75 },
  { name: "Week 5", progress: 85 },
  { name: "Week 6", progress: 90 },
]

export function RehabProgress() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rehabilitation Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="progress" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
