"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetFooter, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ExerciseSemanticSearch } from "@/components/exercise-semantic-search"
import { ExerciseTable } from "@/components/exercise-table"
import { X } from "lucide-react"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover"

// Type definitions
interface Exercise {
  id: number
  condition: string
  severity: string
  exercise_name: string
  description: string
  benefits: string
  contraindications: string
}

interface Guideline {
  id: number
  condition: string
  guideline_text: string
  source: string
}

// Form schema for exercise validation
const exerciseSchema = z.object({
  condition: z.string().min(1, { message: "Condition is required" }),
  severity: z.string().min(1, { message: "Severity is required" }),
  exercise_name: z.string().min(1, { message: "Exercise name is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  benefits: z.string().min(1, { message: "Benefits are required" }),
  contraindications: z.string().optional(),
})

// Form schema for guideline validation
const guidelineSchema = z.object({
  condition: z.string().min(1, { message: "Condition is required" }),
  guideline_text: z.string().min(1, { message: "Guideline text is required" }),
  source: z.string().min(1, { message: "Source is required" }),
})

export default function ManageExercisesPage() {
  const [isExerciseSheetOpen, setIsExerciseSheetOpen] = useState(false)
  const [isGuidelineSheetOpen, setIsGuidelineSheetOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCondition, setFilterCondition] = useState<string>("all")
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Form for adding exercises
  const exerciseForm = useForm<z.infer<typeof exerciseSchema>>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      condition: "",
      severity: "Moderate", // Set default value
      exercise_name: "",
      description: "",
      benefits: "",
      contraindications: "",
    }
  })

  // Form for adding guidelines
  const guidelineForm = useForm<z.infer<typeof guidelineSchema>>({
    resolver: zodResolver(guidelineSchema),
    defaultValues: {
      condition: "",
      guideline_text: "",
      source: "",
    }
  })

  // Get available conditions
  const { data: conditions } = useQuery({
    queryKey: ["conditions"],
    queryFn: async () => {
      const exercisesRes = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/exercises`);
      const guidelinesRes = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/guidelines`);
      
      const exerciseConditions = exercisesRes.data.exercises?.map((e: Exercise) => e.condition) || [];
      const guidelineConditions = guidelinesRes.data.guidelines?.map((g: Guideline) => g.condition) || [];
      
      return [...new Set([...exerciseConditions, ...guidelineConditions])].sort();
    }
  });

  // Fetch guidelines
  const { data: guidelines, isLoading: guidelinesLoading } = useQuery({
    queryKey: ["guidelines", filterCondition],
    queryFn: async () => {
      const url = filterCondition && filterCondition !== "all"
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/guidelines?condition=${encodeURIComponent(filterCondition)}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/guidelines`;
      const response = await axios.get(url);
      return response.data.guidelines || [];
    }
  });

  // Delete guideline mutation
  const deleteGuidelineMutation = useMutation({
    mutationFn: async (guidelineId: number) => {
      return axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/guidelines/${guidelineId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guidelines"] });
      toast.success("Guideline deleted successfully");
      setOpenPopoverId(null);
    },
    onError: (error) => {
      console.error("Error deleting guideline:", error);
      toast.error("Failed to delete guideline");
    }
  });

  // Filter guidelines based on search term
  const filteredGuidelines = guidelines?.filter((guideline: Guideline) => {
    const guidelineText = guideline?.guideline_text || '';
    const condition = guideline?.condition || '';
    const source = guideline?.source || '';
    const searchTermLower = searchTerm.toLowerCase();
    
    return guidelineText.toLowerCase().includes(searchTermLower) ||
           condition.toLowerCase().includes(searchTermLower) ||
           source.toLowerCase().includes(searchTermLower);
  }) || [];

  const addExerciseMutation = useMutation({
    mutationFn: async (values: z.infer<typeof exerciseSchema>) => {
      return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/exercises`, values)
    },
    onSuccess: () => {
      toast.success("Exercise added successfully")
      setIsExerciseSheetOpen(false)
      exerciseForm.reset({
        condition: "",
        severity: "Moderate",
        exercise_name: "",
        description: "",
        benefits: "",
        contraindications: "",
      })
      queryClient.invalidateQueries({ queryKey: ["exercises"] })
    },
    onError: (error) => {
      toast.error("Failed to add exercise")
      console.error("Error adding exercise:", error)
    }
  })

  const addGuidelineMutation = useMutation({
    mutationFn: async (values: z.infer<typeof guidelineSchema>) => {
      return axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/guidelines`, values)
    },
    onSuccess: () => {
      toast.success("Guideline added successfully")
      setIsGuidelineSheetOpen(false)
      guidelineForm.reset()
      queryClient.invalidateQueries({ queryKey: ["guidelines"] })
    },
    onError: (error) => {
      toast.error("Failed to add guideline")
      console.error("Error adding guideline:", error)
    }
  })

  // Form submission handlers
  const onExerciseSubmit = (values: z.infer<typeof exerciseSchema>) => {
    addExerciseMutation.mutate(values)
  }

  const onGuidelineSubmit = (values: z.infer<typeof guidelineSchema>) => {
    addGuidelineMutation.mutate(values)
  }

  const handleDeleteGuideline = (guidelineId: number) => {
    deleteGuidelineMutation.mutate(guidelineId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">Knowledge Base</h1>
      </div>

      <div className="flex gap-2 flex-col sm:flex-row mb-6">
        <Input
          placeholder="Search exercises or guidelines..."
          className="max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select
          value={filterCondition}
          onValueChange={setFilterCondition}
        >
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Filter by condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {conditions?.map((condition: string) => (
              <SelectItem key={condition} value={condition}>
                {condition}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="exercises">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="guidelines">Clinical Guidelines</TabsTrigger>
          <TabsTrigger value="search">Semantic Search</TabsTrigger>
        </TabsList>

        <TabsContent value="exercises" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Rehabilitation Exercises</CardTitle>
              <Sheet open={isExerciseSheetOpen} onOpenChange={setIsExerciseSheetOpen}>
                <SheetTrigger asChild>
                  <Button>Add New Exercise</Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Add New Exercise</SheetTitle>
                    <SheetDescription>
                      Add a new exercise to the knowledge base. This will be available for assignment to patients.
                    </SheetDescription>
                  </SheetHeader>
                  <Form {...exerciseForm}>
                    <form onSubmit={exerciseForm.handleSubmit(onExerciseSubmit)} className="space-y-4 py-4">
                      <FormField
                        control={exerciseForm.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Parkinson's Disease" {...field} />
                            </FormControl>
                            <FormDescription>
                              The medical condition this exercise is designed for.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={exerciseForm.control}
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue="Moderate" // Default value
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select severity level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Mild">Mild</SelectItem>
                                <SelectItem value="Moderate">Moderate</SelectItem>
                                <SelectItem value="Severe">Severe</SelectItem>
                                <SelectItem value="All Levels">All Levels</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The severity level this exercise is appropriate for.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={exerciseForm.control}
                        name="exercise_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exercise Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Wrist Flexion Stretch" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={exerciseForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Detailed instructions on how to perform the exercise"
                                className="resize-none min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={exerciseForm.control}
                        name="benefits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Benefits</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="What benefits does this exercise provide?"
                                className="resize-none min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={exerciseForm.control}
                        name="contraindications"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraindications (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any warnings or situations where this exercise should be avoided"
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
                          disabled={addExerciseMutation.isPending}
                        >
                          {addExerciseMutation.isPending ? "Adding..." : "Add Exercise"}
                        </Button>
                      </SheetFooter>
                    </form>
                  </Form>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent>
              {/* Use our ExerciseTable component with delete functionality */}
              <ExerciseTable 
                condition={filterCondition} 
                searchTerm={searchTerm} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guidelines" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Clinical Guidelines</CardTitle>
              <Sheet open={isGuidelineSheetOpen} onOpenChange={setIsGuidelineSheetOpen}>
                <SheetTrigger asChild>
                  <Button>Add New Guideline</Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Add New Clinical Guideline</SheetTitle>
                    <SheetDescription>
                      Add a new clinical guideline to the knowledge base.
                    </SheetDescription>
                  </SheetHeader>
                  <Form {...guidelineForm}>
                    <form onSubmit={guidelineForm.handleSubmit(onGuidelineSubmit)} className="space-y-4 py-4">
                      <FormField
                        control={guidelineForm.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Parkinson's Disease" {...field} />
                            </FormControl>
                            <FormDescription>
                              The medical condition this guideline applies to.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={guidelineForm.control}
                        name="guideline_text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guideline Text</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter the clinical guideline information"
                                className="resize-none min-h-[150px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={guidelineForm.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., American Academy of Neurology Practice Guidelines, 2023" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              The organization or publication source of this guideline.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <SheetFooter className="pt-4">
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={addGuidelineMutation.isPending}
                        >
                          {addGuidelineMutation.isPending ? "Adding..." : "Add Guideline"}
                        </Button>
                      </SheetFooter>
                    </form>
                  </Form>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent>
              {guidelinesLoading ? (
                <div className="text-center py-4">Loading guidelines...</div>
              ) : !filteredGuidelines || filteredGuidelines.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No guidelines found. Add your first guideline to get started.
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredGuidelines.map((guideline: Guideline) => (
                    <Card key={guideline.id} className="bg-gray-50">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="bg-blue-500 mb-2">{guideline.condition}</Badge>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">{guideline.source}</span>
                            <Popover 
                              open={openPopoverId === guideline.id} 
                              onOpenChange={(open) => {
                                if (open) setOpenPopoverId(guideline.id);
                                else setOpenPopoverId(null);
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  aria-label={`Delete guideline for ${guideline.condition}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-4">
                                <div className="space-y-4">
                                  <h4 className="font-medium">Confirm Deletion</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Are you sure you want to delete this guideline for {guideline.condition}? This action cannot be undone.
                                  </p>
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setOpenPopoverId(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleDeleteGuideline(guideline.id)}
                                      disabled={deleteGuidelineMutation.isPending}
                                    >
                                      {deleteGuidelineMutation.isPending ? "Deleting..." : "Delete"}
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap">{guideline.guideline_text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <ExerciseSemanticSearch />
        </TabsContent>
      </Tabs>
    </div>
  )
}