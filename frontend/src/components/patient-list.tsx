"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { X, PencilIcon, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label";

// Form schema for patient data validation
const patientSchema = z.object({
  id: z.number(),
  patient_id: z.string().min(1, { message: "Patient ID is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  age: z.coerce.number().int().positive({ message: "Age must be a positive number" }),
  condition: z.string().min(1, { message: "Condition is required" }),
  medical_history: z.string().min(1, { message: "Medical history is required" }),
  current_treatment: z.string().min(1, { message: "Current treatment is required" }),
  progress_notes: z.string(),
  assessment: z.string().min(1, { message: "Assessment is required" }),
  treatment_outcomes: z.string().optional(),
  gender: z.string().optional(),
})

type PatientFormValues = z.infer<typeof patientSchema>

interface Patient {
  id: number;
  name: string;
  age: number;
  condition: string;
  medical_history: string;
  current_treatment: string;
  progress_notes: string;
  patient_id: string;
  assessment: string;
  adherence_rate: number;
  gender: string;
  treatment_outcomes?: string;
}

interface Exercise {
  id: number;
  exercise_name: string;
  description: string;
  severity: string;
  condition: string;
  benefits?: string;
  contraindications?: string;
}

interface PatientExercise {
  id: number;
  exercise_id: number;
  assigned_date: string;
  status: string;
  notes: string;
  exercise_name: string;
  description?: string;
  benefits?: string;
  contraindications?: string;
  severity?: string;
}

// Using type Record<never, never> to indicate component requires no props
type PatientListProps = Record<never, never>;

function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patients`)
      return response.data
    },
    // These options ensure data stays fresh
    refetchOnWindowFocus: true,
    staleTime: 0, // Consider data stale immediately
  })
}

function useDeletePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (patientId: number) => {
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}`)
      return response.data
    },
    onSuccess: () => {
      // Invalidate the cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      toast.success("Patient deleted successfully")
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(errorMessage)
    }
  })
}

export function PatientList({}: PatientListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null)

  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);

  const { status, data, error } = usePatients()
  const deletePatientMutation = useDeletePatient()
  const queryClient = useQueryClient()

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      id: 0,
      patient_id: "",
      name: "",
      age: 0,
      condition: "",
      medical_history: "",
      current_treatment: "",
      progress_notes: "",
      assessment: "",
    }
  })

  // Reset the form with patient data when patientToEdit changes
  useEffect(() => {
    if (patientToEdit) {
      form.reset({
        id: patientToEdit.id,
        patient_id: patientToEdit.patient_id,
        name: patientToEdit.name,
        age: patientToEdit.age,
        gender: patientToEdit.gender || "", 
        condition: patientToEdit.condition,
        medical_history: patientToEdit.medical_history || "",
        current_treatment: patientToEdit.current_treatment || "",
        progress_notes: patientToEdit.progress_notes || "",
        assessment: patientToEdit.assessment || "",
        treatment_outcomes: patientToEdit.treatment_outcomes || "",
      })
    }
  }, [patientToEdit, form])

  const patientsArray = data?.patients || [];
  const filteredPatients: Patient[] = patientsArray.filter((patient: Patient) => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeletePatient = (patientId: number) => {
    deletePatientMutation.mutate(patientId);
    setOpenPopoverId(null); // Close the popover
  }

  const handleEditClick = (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    setPatientToEdit(patient);
    
    // Reset form with patient data in correct order
    form.reset({
      id: patient.id,
      patient_id: patient.patient_id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender || "", // Handle potential undefined
      condition: patient.condition,
      medical_history: patient.medical_history || "",
      current_treatment: patient.current_treatment || "",
      treatment_outcomes: patient.treatment_outcomes || "",
      progress_notes: patient.progress_notes || "",
      assessment: patient.assessment || "",
    });
    
    // Fetch exercises for this patient's condition
    if (patient.condition) {
      fetchExercisesForPatient(patient.condition);
    }
    
    setIsEditSheetOpen(true);
  };

  const navigateToPatient = (patientId: number) => {
    router.push(`/patients/${patientId}`);
  }

  const fetchExercisesForPatient = async (condition: string) => {
    setIsLoadingExercises(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/exercises?condition=${encodeURIComponent(condition)}`
      );

      // Use a more specific type for the response data
      interface ExerciseResponse {
        exercises: Array<{
          id: number;
          exercise_name?: string;
          name?: string;
          description: string;
          severity: string;
          condition: string;
          benefits?: string;
          contraindications?: string;
        }>;
      }

      const data = response.data as ExerciseResponse;
      
      // Map the response to our Exercise interface
      const exercises = data.exercises.map((ex) => ({
        id: ex.id,
        exercise_name: ex.exercise_name || ex.name || "Unknown Exercise",
        description: ex.description,
        severity: ex.severity,
        condition: ex.condition,
        benefits: ex.benefits,
        contraindications: ex.contraindications
      }));

      setAvailableExercises(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Failed to load exercises");
    } finally {
      setIsLoadingExercises(false);
    }
  };

  async function onSubmit(values: PatientFormValues) {
    try {
      // Ensure age is sent as a number
      const dataToSend = {
        ...values,
        age: Number(values.age)
      };
      
      // Create the final data object with optional exercise information
      const finalData = selectedExercise 
        ? {
            ...dataToSend,
            exercise_id: parseInt(selectedExercise),
            exercise_notes: "Assigned during patient update"
          }
        : dataToSend;
      
      console.log("Submitting updated patient data:", finalData);
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${values.id}`, 
        finalData
      );
      
      console.log("Update response:", response.data);
      toast.success("Patient updated successfully");
      
      // Invalidate all related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", values.id] });
      
      // If we assigned an exercise, also invalidate patient exercises
      if (selectedExercise) {
        queryClient.invalidateQueries({ queryKey: ["patientExercises", values.id] });
      }
      
      // Ensure immediate refetch of the patients list
      await queryClient.refetchQueries({ queryKey: ["patients"] });
      
      // Reset the selected exercise
      setSelectedExercise("");
      
      // Close the edit sheet
      setIsEditSheetOpen(false);
      
    } catch (error: unknown) {
      console.error("Error updating patient:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update patient';
      toast.error(errorMessage);
    }
  }

  const AssignedExercisesList = ({ patientId }: { patientId: number }) => {
    const { data: assignedExercises, isLoading } = useQuery({
      queryKey: ["patientExercises", patientId],
      queryFn: async () => {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}/exercises`);
        return response.data.exercises as PatientExercise[];
      },
      enabled: !!patientId,
    });

    const queryClient = useQueryClient();
    
    const deleteExerciseMutation = useMutation({
      mutationFn: async (exerciseId: number) => {
        return axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}/exercises/${exerciseId}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["patientExercises", patientId] });
        toast.success("Exercise removed successfully");
      },
      onError: (error) => {
        toast.error("Failed to remove exercise");
        console.error("Error removing exercise:", error);
      }
    });

    if (isLoading) return <div>Loading assigned exercises...</div>;
    
    if (!assignedExercises || assignedExercises.length === 0) {
      return <div className="text-sm text-gray-500 mt-2">No exercises assigned yet.</div>;
    }
    
    return (
      <div className="mt-4">
        <h4 className="font-medium mb-2">Currently Assigned Exercises</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {assignedExercises.map((exercise: PatientExercise) => (
            <div key={exercise.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
              <div>
                <div className="font-medium text-sm">{exercise.exercise_name}</div>
                <div className="text-xs text-gray-500">Status: {exercise.status}</div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => deleteExerciseMutation.mutate(exercise.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <>
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Patient List</h2>
        {status === "pending" ? (
          <p>Loading...</p>
        ) : status === "error" ? (
          <p>Error: {error instanceof Error ? error.message : 'An unknown error occurred'}</p>
        ) : (
          <div>
            <Input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Adherence Rate</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell 
                    onClick={() => navigateToPatient(patient.id)}
                    className="font-medium text-blue-600 hover:underline flex items-center"
                  >
                    {patient.name}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </TableCell>
                  <TableCell onClick={() => navigateToPatient(patient.id)}>
                    {patient.age}
                  </TableCell>
                  <TableCell onClick={() => navigateToPatient(patient.id)}>
                    {patient.condition}
                  </TableCell>
                  <TableCell onClick={() => navigateToPatient(patient.id)}>
                    {patient.assessment}
                  </TableCell>
                  <TableCell onClick={() => navigateToPatient(patient.id)}>
                    {patient.adherence_rate ? `${patient.adherence_rate}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    {/* Edit Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      aria-label={`Edit patient ${patient.name}`}
                      onClick={(e) => handleEditClick(e, patient)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>   

                    {/* Delete Button */}                 
                    <Popover open={openPopoverId === patient.id} onOpenChange={(open) => {
                      if (open) setOpenPopoverId(patient.id);
                      else setOpenPopoverId(null);
                    }}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Delete patient ${patient.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-4">
                        <div className="space-y-4">
                          <h4 className="font-medium">Confirm Deletion</h4>
                          <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete {patient.name}? This action cannot be undone.
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
                              onClick={() => handleDeletePatient(patient.id)}
                              disabled={deletePatientMutation.isPending}
                            >
                              {deletePatientMutation.isPending ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </div>
    </div>

      {/* Edit Patient Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
      <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Patient: {patientToEdit?.name}</SheetTitle>
          <SheetDescription>
            Make changes to the patient&apos;s progess notes or assessment below.
          </SheetDescription>
        </SheetHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                {/* Patient ID field (disabled) */}
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient ID</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={true} className="bg-gray-50 text-gray-700"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Name field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Age field */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Gender field */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Condition field */}
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Condition</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Medical History field */}
                <FormField
                  control={form.control}
                  name="medical_history"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical History</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="resize-none min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Current Treatment field */}
                <FormField
                  control={form.control}
                  name="current_treatment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Treatment</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="resize-none min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Treatment Outcomes field */}
                <FormField
                  control={form.control}
                  name="treatment_outcomes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment Outcomes</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="resize-none min-h-[100px]" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Progress Notes field */}
                <FormField
                  control={form.control}
                  name="progress_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="resize-none min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Assessment field */}
                <FormField
                  control={form.control}
                  name="assessment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="resize-none min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            <div className="border-t mt-6 pt-6">
              <h3 className="font-medium text-lg mb-4">Assign Exercise</h3>
              
              {isLoadingExercises ? (
                <div className="py-2 text-gray-500">Loading exercises...</div>
              ) : availableExercises.length === 0 ? (
                <div className="py-2 text-gray-500">No exercises available for this condition</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Exercise</Label>
                    <Select
                      value={selectedExercise}
                      onValueChange={(value) => setSelectedExercise(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an exercise to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableExercises.map((exercise) => (
                          <SelectItem key={exercise.id} value={exercise.id.toString()}>
                            <div className="flex flex-col">
                              <span>{exercise.exercise_name}</span>
                              <span className="text-xs text-gray-500">
                                {exercise.severity} | {exercise.condition}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {patientToEdit && (
                      <AssignedExercisesList patientId={patientToEdit.id} />
                    )}
                  </div>
                  
                  {selectedExercise && (
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      {availableExercises.find(ex => ex.id.toString() === selectedExercise)?.description}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500">
                    This exercise will be assigned to the patient when you update their progress.
                  </div>
                </div>
              )}
            </div>
            
            <SheetFooter className="pt-4">
              <Button type="submit" className="w-full">
                Update Patient
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  </>
  )
}