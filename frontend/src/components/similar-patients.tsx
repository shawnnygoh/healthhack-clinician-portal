import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { useState } from "react"
import Link from 'next/link'

interface SimilarPatient {
  id: number
  patient_id: string
  name: string
  condition: string
  age: number
  gender?: string
  medical_history: string
  current_treatment: string
  assessment: string
  treatment_outcomes?: string
  similarity_score: "High" | "Medium" | "Low"
  raw_score: number
}

interface SimilarPatientsProps {
  patientId: number
}

// Helper function to create a visual badge for similarity score
function getSimilarityBadge(similarityScore: string, rawScore?: number) {
  const scoreDisplay = rawScore ? ` (${Math.round(rawScore * 100)}%)` : '';
  
  switch (similarityScore) {
    case 'High':
      return (
        <Badge className="bg-green-500">
          High Match{scoreDisplay}
        </Badge>
      );
    case 'Medium':
      return (
        <Badge className="bg-blue-500">
          Medium Match{scoreDisplay}
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-500">
          Low Match{scoreDisplay}
        </Badge>
      );
  }
}

export function SimilarPatients({ patientId }: SimilarPatientsProps) {
  const [weights, setWeights] = useState({
    history: 25,
    treatment: 25,
    demographics: 25,
    outcomes: 25
  });
  const [isCustomWeights, setIsCustomWeights] = useState(false);

  // Build query string for weights
  const buildWeightsQuery = () => {
    if (!isCustomWeights) return "";
    
    // Convert to decimal and build query string
    const params = new URLSearchParams();
    Object.entries(weights).forEach(([key, value]) => {
      params.append(`weight_${key}`, (value / 100).toString());
    });
    return `&${params.toString()}`;
  };

  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ["similarPatients", patientId, isCustomWeights, weights],
    queryFn: async () => {
      const weightsQuery = buildWeightsQuery();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/patient/${patientId}/similar?limit=5${weightsQuery}`
      );
      console.log("API response:", response.data);
      return response.data;
    }
  });

  // Safely access the similar_patients array with optional chaining
  const similarPatients: SimilarPatient[] = responseData?.similar_patients || [];

  const handleWeightChange = (type: string, value: number[]) => {
    setWeights(prev => ({
      ...prev,
      [type]: value[0]
    }));
  };

  const applyCustomWeights = () => {
    setIsCustomWeights(true);
    refetch();
  };

  const resetWeights = () => {
    setWeights({
      history: 25,
      treatment: 25,
      demographics: 25,
      outcomes: 25
    });
    setIsCustomWeights(false);
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Similar Patients</span>
          <span className="text-sm font-normal text-gray-500">
            Using Vector Search to find patients with similar profiles
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add a collapsible section for custom weights */}
        <Accordion type="single" collapsible>
          <AccordionItem value="weights">
            <AccordionTrigger>Customize Similarity Weights</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Medical History</Label>
                    <span>{weights.history}%</span>
                  </div>
                  <Slider 
                    value={[weights.history]} 
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(value: number[]) => handleWeightChange("history", value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Current Treatment</Label>
                    <span>{weights.treatment}%</span>
                  </div>
                  <Slider 
                    value={[weights.treatment]} 
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(value: number[]) => handleWeightChange("treatment", value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Demographics (Age, Gender)</Label>
                    <span>{weights.demographics}%</span>
                  </div>
                  <Slider 
                    value={[weights.demographics]} 
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(value: number[]) => handleWeightChange("demographics", value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Treatment Outcomes</Label>
                    <span>{weights.outcomes}%</span>
                  </div>
                  <Slider 
                    value={[weights.outcomes]} 
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(value: number[]) => handleWeightChange("outcomes", value)} 
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={applyCustomWeights}>Apply Weights</Button>
                  <Button variant="outline" onClick={resetWeights}>Reset</Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {isLoading ? (
          <div className="text-center py-4">Loading similar patients...</div>
        ) : !similarPatients || similarPatients.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No similar patients found.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              These patients have similar profiles based on their medical history, condition, and treatment response. 
              You may want to consider similar approaches that worked well for them.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Current Treatment</TableHead>
                  <TableHead>Similarity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {similarPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Link 
                        href={`/patients/${patient.id}`} 
                        className="hover:underline font-medium text-blue-600"
                      >
                        {patient.name}
                      </Link>
                    </TableCell>
                    <TableCell>{patient.age}</TableCell>
                    <TableCell>{patient.gender || 'Not specified'}</TableCell>
                    <TableCell>{patient.condition}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="line-clamp-2">{patient.current_treatment}</div>
                    </TableCell>
                    <TableCell>
                      {getSimilarityBadge(patient.similarity_score, patient.raw_score)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* If there are outcomes, show them in a collapsible section */}
            {similarPatients.some(p => p.treatment_outcomes) && (
              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value="outcomes">
                  <AccordionTrigger>View Treatment Outcomes</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {similarPatients.map(patient => (
                        <div key={`outcome-${patient.id}`} className="p-4 border rounded-md">
                          <h4 className="font-medium">{patient.name}</h4>
                          <p className="text-sm mt-2">{patient.treatment_outcomes || 'No outcome data available'}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}