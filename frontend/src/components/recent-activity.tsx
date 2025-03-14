import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const activities = [
  { id: 1, description: "Nur Aisyah Binte Rahman completed hand exercise routine", time: "10 minutes ago" },
  { id: 2, description: "Lim Jia Hui achieved a new high score in grip strength game", time: "1 hour ago" },
  { id: 3, description: "Tan Wei Jie missed scheduled exercise", time: "2 hours ago" },
  { id: 4, description: "Rajesh Kumar s/o Maniam completed weekly assessment", time: "3 hours ago" },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
