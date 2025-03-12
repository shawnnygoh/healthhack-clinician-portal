"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface Exercise {
  id: number
  exercise_name: string
  description: string
  benefits: string
  contraindications: string
  severity: string
  condition: string
  relevance: number
}

const searchFormSchema = z.object({
  query: z.string().min(3, { message: "Search query must be at least 3 characters" }),
  condition: z.string().optional(),
})

export function ExerciseSemanticSearch() {
  const [searchResults, setSearchResults] = useState<Exercise[] | null>(null)
  
  const form = useForm<z.infer<typeof searchFormSchema>>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      query: "",
      condition: "",
    }
  })

  const searchMutation = useMutation({
    mutationFn: async (values: z.infer<typeof searchFormSchema>) => {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/exercises/search`, {
        query: values.query,
        condition: values.condition && values.condition.trim() !== "" ? values.condition : undefined,
        limit: 10,
      })
      return response.data
    },
    onSuccess: (data) => {
      setSearchResults(data.exercises)
      if (data.exercises.length === 0) {
        toast.info("No exercises found matching your search.")
      }
    },
    onError: (error) => {
      toast.error("Error searching exercises")
      console.error("Search error:", error)
      setSearchResults(null)
    }
  })

  const onSubmit = (values: z.infer<typeof searchFormSchema>) => {
    searchMutation.mutate(values)
  }

  // Function to format relevance score as percentage
  const formatRelevance = (score: number) => {
    return `${Math.round(score * 100)}%`
  }

  // Function to determine color based on relevance
  const getRelevanceColor = (score: number) => {
    if (score > 0.8) return "bg-green-500"
    if (score > 0.6) return "bg-blue-500"
    return "bg-gray-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Semantic Exercise Search</span>
          <span className="text-sm font-normal text-gray-500">
            Using Vector Search to find relevant exercises
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Query</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you're looking for, e.g., 'exercises to improve hand tremors in elderly patients with limited mobility'"
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use natural language to describe the exercise you&apos;re looking for.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Parkinson's Disease" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormDescription>
                    Limit results to a specific condition.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={searchMutation.isPending}
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search Exercises"
              )}
            </Button>
          </form>
        </Form>

        {searchResults && searchResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Search Results</h3>
            <div className="space-y-4">
              {searchResults.map((exercise) => (
                <Card key={exercise.id} className="bg-gray-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-wrap gap-2 items-center mb-2">
                        <span className="font-medium">{exercise.exercise_name}</span>
                        <Badge className="bg-blue-500">{exercise.condition}</Badge>
                        <Badge className={
                          exercise.severity === "Severe" ? "bg-red-500" :
                          exercise.severity === "Moderate" ? "bg-yellow-500" :
                          exercise.severity === "Mild" ? "bg-green-500" :
                          "bg-blue-500"
                        }>
                          {exercise.severity}
                        </Badge>
                      </div>
                      <Badge className={getRelevanceColor(exercise.relevance)}>
                        Relevance: {formatRelevance(exercise.relevance)}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Description:</h4>
                      <p className="text-sm text-gray-600">{exercise.description}</p>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Benefits:</h4>
                      <p className="text-sm text-gray-600">{exercise.benefits}</p>
                    </div>
                    {exercise.contraindications && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium">Cautions:</h4>
                        <p className="text-sm text-gray-600">{exercise.contraindications}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}