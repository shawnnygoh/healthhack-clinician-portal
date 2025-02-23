"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

const patients = [
  { id: 1, name: "John Doe", age: 65, condition: "Parkinson's", lastExercise: "2025-02-10", adherenceRate: "85%" },
  { id: 2, name: "Jane Smith", age: 58, condition: "Arthritis", lastExercise: "2025-02-11", adherenceRate: "92%" },
  { id: 3, name: "Bob Johnson", age: 70, condition: "Parkinson's", lastExercise: "2025-02-09", adherenceRate: "78%" },
  { id: 4, name: "Alice Brown", age: 62, condition: "Arthritis", lastExercise: "2025-02-11", adherenceRate: "88%" },
  { id: 5, name: "Charlie Davis", age: 68, condition: "Parkinson's", lastExercise: "2025-02-10", adherenceRate: "95%" },
]

interface Patient {
  id: number;
  name: string;
  age: number;
  condition: string;
  lastExercise: string;
  adherenceRate: string;
}

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
}

export function PatientList({ onSelectPatient }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredPatients = patients.filter((patient) => patient.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Patient List</h2>
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
              <TableHead>Last Exercise</TableHead>
              <TableHead>Adherence Rate</TableHead>
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
                <TableCell>{patient.lastExercise}</TableCell>
                <TableCell>{patient.adherenceRate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
