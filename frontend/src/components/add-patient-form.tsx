"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  patient_id: z.string().min(1, { message: "Patient ID is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  age: z.coerce.number().int().positive({ message: "Age must be a positive number" }),
  gender: z.string().min(1, { message: "Gender is required" }),
  condition: z.string().min(1, { message: "Condition is required" }),
  medical_history: z.string().min(1, { message: "Medical history is required" }),
  current_treatment: z.string().min(1, { message: "Current treatment is required" }),
  treatment_outcomes: z.string().optional(),
  progress_notes: z.string(),
  assessment: z.string().min(1, { message: "Assessment is required" }),
})

type FormValues = z.infer<typeof formSchema>

export function AddPatientSheet() {
  const [open, setOpen] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: "",
      name: "",
      age: undefined,
      gender: "",
      condition: "",
      medical_history: "",
      current_treatment: "",
      treatment_outcomes: "",
      progress_notes: "",
      assessment: "",
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient`, values)
      console.log("Added patient:", response.data)
      toast.success("Patient added successfully")
      form.reset()
      setOpen(false)
    } catch (error) {
      toast.error("Failed to add patient")
      console.error("Error adding patient:", error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>Add New Patient</Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>Add New Patient</SheetTitle>
          <SheetDescription>
            Fill out the form below to add a new patient to the system.
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
                    <Input placeholder="e.g., P12345" {...field} />
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
                    <Input placeholder="Patient's full name" {...field} />
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
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
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
            
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Condition</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Frozen Shoulder" {...field} />
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
                      placeholder="Relevant medical history" 
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
              name="current_treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Treatment</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Current treatment plan" 
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
              name="treatment_outcomes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Outcomes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any observed outcomes from treatments" 
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
              name="progress_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any progress notes (optional)" 
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
                      placeholder="Initial assessment" 
                      className="resize-none min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="pt-4">
              <Button type="submit" className="w-full">Add Patient</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}