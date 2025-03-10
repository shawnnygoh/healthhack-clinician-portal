import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, TrendingUp } from "lucide-react"
import { PatientCountCard } from "./patient-count-card"

const metrics = [
  { title: "Avg. Daily Exercises", value: "3.5", icon: Activity },
  { title: "Overall Adherence Rate", value: "87%", icon: TrendingUp },
]

export function Metrics() {
  return (
    <>
      <PatientCountCard />
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
