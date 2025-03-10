"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
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
import { X, PencilIcon } from "lucide-react"

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
})

type PatientFormValues = z.infer<typeof patientSchema>

interface Patient {
  id: number;
  name: string;
  age: number;
  condition: string;
  medical_history: string;
  current_treatment: string;
  progress_notes: string
  patient_id: string;
  assessment: string;
}

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
}

function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patients`)
      return response.data
    }
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
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}



export function PatientList({ onSelectPatient }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null)

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
        condition: patientToEdit.condition,
        medical_history: patientToEdit.medical_history || "",
        current_treatment: patientToEdit.current_treatment || "",
        progress_notes: patientToEdit.progress_notes || "",
        assessment: patientToEdit.assessment || "",
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
  
  // Reset form with patient data
  form.reset({
    id: patient.id,
    patient_id: patient.patient_id,
    name: patient.name,
    age: patient.age,
    condition: patient.condition,
    medical_history: patient.medical_history || "",
    current_treatment: patient.current_treatment || "",
    progress_notes: patient.progress_notes || "",
    assessment: patient.assessment || "",
  });
  
  setIsEditSheetOpen(true);
}

async function onSubmit(values: PatientFormValues) {
  try {
    const response = await axios.put(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${values.id}`, values)
    console.log("Updated patient:", response.data)
    toast.success("Patient updated successfully")
    queryClient.invalidateQueries({ queryKey: ["patients"] })
    setIsEditSheetOpen(false)
  } catch (error) {
    toast.error("Failed to update patient")
    console.error("Error updating patient:", error)
  }
}

  return (
    <>
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Patient List</h2>
        {status === "pending" ? (
          <p>Loading...</p>
        ) : status === "error" ? (
          <p>Error: {error.message}</p>
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
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell>{patient.name}</TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell>{patient.condition}</TableCell>
                  <TableCell>{patient.assessment}</TableCell>
                  <TableCell>85%</TableCell>
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
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={true} className="bg-gray-50 text-gray-700"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={true} className="bg-gray-50 text-gray-700"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Condition</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={true} className="bg-gray-50 text-gray-700"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="medical_history"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical History</FormLabel>
                  <FormControl>
                    <Textarea 
                      className="resize-none min-h-[100px] bg-gray-50 text-gray-700" 
                      {...field} 
                      disabled={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="current_treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Treatment</FormLabel>
                  <FormControl>
                    <Textarea 
                      className="resize-none min-h-[100px] bg-gray-50 text-gray-700" 
                      {...field} 
                      disabled={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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

            <SheetFooter className="pt-4">
              <Button type="submit" className="w-full">
                Update Progress
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  </>
  )
}
