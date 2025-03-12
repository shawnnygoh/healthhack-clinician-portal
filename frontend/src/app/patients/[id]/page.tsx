"use client"

import { useParams } from "next/navigation"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PatientExercises } from "@/components/patient-exercises"
import { SimilarPatients } from "@/components/similar-patients"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, Save } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Patient {
  id: number
  patient_id: string
  name: string
  age: number
  gender: string 
  condition: string
  medical_history: string
  current_treatment: string
  treatment_outcomes: string
  progress_notes: string
  assessment: string
  adherence_rate?: number
  recommended_exercises?: {
    name: string
    description: string
    benefits: string
  }[]
}

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = parseInt(params.id as string)
  const queryClient = useQueryClient()
  
  // Add state for edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [editedPatient, setEditedPatient] = useState<Patient | null>(null)

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}`)
        return response.data.patient as Patient
      } catch (error) {
        console.error("Error fetching patient:", error)
        throw error
      }
    }
  })

  // Mutation for updating patient data
  const updatePatientMutation = useMutation({
    mutationFn: async (updatedPatient: Patient) => {
      return axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}`, 
        updatedPatient
      )
    },
    onSuccess: () => {
      toast.success("Patient updated successfully")
      setIsEditing(false)
      
      // Invalidate all related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] })
    },
    onError: (error) => {
      toast.error("Failed to update patient")
      console.error("Error updating patient:", error)
    }
  })

  // Function to handle edit button click
  const handleEditClick = () => {
    if (patient) {
      setEditedPatient({
        ...JSON.parse(JSON.stringify(patient))
      })
      setIsEditing(true)
    }
  }

  // Function to handle save button click
  const handleSaveClick = () => {
    if (editedPatient) {
      updatePatientMutation.mutate(editedPatient)
    }
  }

  // Function to handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (editedPatient) {
      setEditedPatient({
        ...editedPatient,
        [name]: value
      })
    }
  }

  // Function to handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (editedPatient) {
      setEditedPatient({
        ...editedPatient,
        [name]: parseInt(value) || 0
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold text-gray-800">Loading patient details...</h1>
        </div>
        <div className="p-12 text-center">Loading patient details...</div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold text-gray-800">Patient not found</h1>
        </div>
        <div className="p-12 text-center bg-red-50 rounded-md text-red-500">
          Could not load patient data. Please try again or select a different patient.
        </div>
      </div>
    )
  }

  const activePatient = isEditing ? editedPatient : patient

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold text-gray-800">
            Patient: {patient.name}
          </h1>
        </div>
        {isEditing ? (
          <Button onClick={handleSaveClick} disabled={updatePatientMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updatePatientMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        ) : (
          <Button onClick={handleEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Patient
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Patient ID:</div>
                <div className="col-span-2">{patient.patient_id}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Age:</div>
                {isEditing ? (
                  <div className="col-span-2">
                    <Input 
                      type="number" 
                      name="age" 
                      value={activePatient?.age} 
                      onChange={handleNumberChange}
                    />
                  </div>
                ) : (
                  <div className="col-span-2">{patient.age}</div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Gender:</div>
                {isEditing ? (
                  <div className="col-span-2">
                    <Select
                      name="gender"
                      value={editedPatient?.gender || ''}
                      onValueChange={(value) => {
                        if (editedPatient) {
                          setEditedPatient({
                            ...editedPatient,
                            gender: value
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="col-span-2">{patient.gender || 'Not specified'}</div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Condition:</div>
                {isEditing ? (
                  <div className="col-span-2">
                    <Input 
                      name="condition" 
                      value={activePatient?.condition} 
                      onChange={handleInputChange}
                    />
                  </div>
                ) : (
                  <div className="col-span-2">{patient.condition}</div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Adherence Rate:</div>
                <div className="col-span-2">
                  {patient.adherence_rate !== undefined ? (
                    <span className={`font-bold ${
                      (patient.adherence_rate || 0) >= 90 ? 'text-green-600' : 
                      (patient.adherence_rate || 0) >= 75 ? 'text-blue-600' : 
                      'text-yellow-600'
                    }`}>
                      {patient.adherence_rate}%
                    </span>
                  ) : (
                    <span className="text-gray-500">Not available</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea 
                name="medical_history" 
                value={activePatient?.medical_history} 
                onChange={handleInputChange}
                className="min-h-[150px]"
              />
            ) : (
              <p className="whitespace-pre-wrap">{patient.medical_history}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="treatment">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="treatment">Treatment</TabsTrigger>
          <TabsTrigger value="progress">Progress Notes</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="similar">Similar Patients</TabsTrigger>
        </TabsList>
        <TabsContent value="treatment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Treatment</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea 
                  name="current_treatment" 
                  value={activePatient?.current_treatment} 
                  onChange={handleInputChange}
                  className="min-h-[150px]"
                />
              ) : (
                <p className="whitespace-pre-wrap">{patient.current_treatment}</p>
              )}
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Treatment Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea 
                  name="treatment_outcomes" 
                  value={activePatient?.treatment_outcomes || ''} 
                  onChange={handleInputChange}
                  className="min-h-[150px]"
                />
              ) : (
                <p className="whitespace-pre-wrap">{patient.treatment_outcomes || 'No treatment outcomes recorded'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="progress" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea 
                  name="progress_notes" 
                  value={activePatient?.progress_notes} 
                  onChange={handleInputChange}
                  className="min-h-[150px]"
                />
              ) : (
                <p className="whitespace-pre-wrap">{patient.progress_notes}</p>
              )}
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea 
                  name="assessment" 
                  value={activePatient?.assessment} 
                  onChange={handleInputChange}
                  className="min-h-[150px]"
                />
              ) : (
                <p className="whitespace-pre-wrap">{patient.assessment}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="exercises" className="mt-6">
          <PatientExercises 
            patientId={patientId} 
            patientName={patient.name} 
            condition={patient.condition} 
          />
        </TabsContent>
        <TabsContent value="similar" className="mt-6">
          <SimilarPatients patientId={patientId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}