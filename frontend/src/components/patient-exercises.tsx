"use client"

import { useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"

interface Exercise {
  id: number
  exercise_name: string
  description: string
  benefits: string
  contraindications: string
  severity: string
  condition: string
}

interface PatientExercise {
  id: number
  exercise_id: number
  assigned_date: string
  status: string
  notes: string
  exercise_name: string
  description: string
  benefits: string
  contraindications: string
  severity: string
}

interface PatientExercisesProps {
  patientId: number
  patientName: string
  condition: string
}

const assignExerciseSchema = z.object({
  exercise_id: z.string().min(1, { message: "Please select an exercise" }),
  notes: z.string().optional()
})

export function PatientExercises({ patientId, patientName, condition }: PatientExercisesProps) {
  const [isAssignSheetOpen, setIsAssignSheetOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch assigned exercises
  const { data: patientExercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ["patientExercises", patientId],
    queryFn: async () => {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}/exercises`)
      return response.data.exercises as PatientExercise[]
    }
  })

  // Fetch available exercises
  const { data: availableExercises, isLoading: availableLoading } = useQuery({
    queryKey: ["exercises", condition],
    queryFn: async () => {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/exercises?condition=${condition}`)
      return response.data.exercises as Exercise[]
    }
  })

  // Mutation for assigning exercises
  const assignExerciseMutation = useMutation({
    mutationFn: async (values: z.infer<typeof assignExerciseSchema>) => {
      return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}/exercises`, {
        exercise_id: parseInt(values.exercise_id),
        notes: values.notes || ""
      })
    },
    onSuccess: () => {
      toast.success("Exercise assigned successfully")
      setIsAssignSheetOpen(false)
      queryClient.invalidateQueries({ queryKey: ["patientExercises", patientId] })
    },
    onError: (error) => {
      toast.error("Failed to assign exercise")
      console.error("Error assigning exercise:", error)
    }
  })

  // Mutation for updating exercise status
  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return axios.put(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}/exercises/${id}`, {
        status
      })
    },
    onSuccess: () => {
      toast.success("Exercise status updated")
      queryClient.invalidateQueries({ queryKey: ["patientExercises", patientId] })
    },
    onError: (error) => {
      toast.error("Failed to update exercise status")
      console.error("Error updating exercise status:", error)
    }
  })

  const removeExerciseMutation = useMutation({
    mutationFn: async (exerciseId: number) => {
      return axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}/exercises/${exerciseId}`)
    },
    onSuccess: () => {
      toast.success("Exercise removed successfully")
      queryClient.invalidateQueries({ queryKey: ["patientExercises", patientId] })
    },
    onError: (error) => {
      toast.error("Failed to remove exercise")
      console.error("Error removing exercise:", error)
    }
  })
  
  const removeExercise = (exerciseId: number) => {
    if (confirm("Are you sure you want to remove this exercise?")) {
      removeExerciseMutation.mutate(exerciseId)
    }
  }

  // Form for assigning exercises
  const form = useForm<z.infer<typeof assignExerciseSchema>>({
    resolver: zodResolver(assignExerciseSchema),
    defaultValues: {
      exercise_id: "",
      notes: ""
    }
  })

  const onSubmit = (values: z.infer<typeof assignExerciseSchema>) => {
    assignExerciseMutation.mutate(values)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "In Progress":
        return <Badge className="bg-blue-500">In Progress</Badge>
      default:
        return <Badge className="bg-yellow-500">Assigned</Badge>
    }
  }

  const updateStatus = (id: number, status: string) => {
    updateExerciseMutation.mutate({ id, status })
  }

  if (exercisesLoading || availableLoading) {
    return <Card><CardContent>Loading exercises...</CardContent></Card>
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl">Assigned Exercises</CardTitle>
        <Sheet open={isAssignSheetOpen} onOpenChange={setIsAssignSheetOpen}>
          <SheetTrigger asChild>
            <Button>Assign Exercise</Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Assign Exercise to {patientName}</SheetTitle>
              <SheetDescription>
                Select an exercise to assign to this patient.
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="exercise_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exercise</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an exercise" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableExercises?.map((exercise) => (
                              <SelectItem
                                key={exercise.id}
                                value={exercise.id.toString()}
                              >
                                {exercise.exercise_name} ({exercise.severity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add instructions or notes for the patient"
                          className="resize-none min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <SheetFooter className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={assignExerciseMutation.isPending}
                  >
                    {assignExerciseMutation.isPending ? "Assigning..." : "Assign Exercise"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent>
        {!patientExercises || patientExercises.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No exercises assigned yet. Click &quot;Assign Exercise&quot; to add one.
          </div>
        ) : (
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {patientExercises?.map((exercise) => (
                <TableRow key={exercise.id}>
                    <TableCell>
                    <div className="font-medium">{exercise.exercise_name}</div>
                    <div className="text-sm text-gray-500 line-clamp-2">{exercise.description}</div>
                    </TableCell>
                    <TableCell>
                    <Badge className={
                        exercise.severity === "Severe" ? "bg-red-500" :
                        exercise.severity === "Moderate" ? "bg-yellow-500" :
                        exercise.severity === "Mild" ? "bg-green-500" :
                        "bg-blue-500"
                    }>
                        {exercise.severity}
                    </Badge>
                    </TableCell>
                    <TableCell>{exercise.assigned_date}</TableCell>
                    <TableCell>{getStatusBadge(exercise.status)}</TableCell>
                    <TableCell>
                    <div className="flex gap-2">
                        <Select
                        defaultValue={exercise.status}
                        onValueChange={(value) => updateStatus(exercise.id, value)}
                        >
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Assigned">Assigned</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                        </Select>
                        
                        <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeExercise(exercise.id)}
                        >
                        <X className="h-4 w-4" />
                        </Button>
                    </div>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  )
}