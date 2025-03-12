import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

interface Exercise {
  id: number;
  condition: string;
  severity: string;
  exercise_name: string; // The backend sends this field
  name?: string; // Just in case this field is used
  description: string;
  benefits: string;
  contraindications: string;
}

export function ExerciseTable({ 
  condition = "all", 
  searchTerm = "" 
}: { 
  condition?: string; 
  searchTerm?: string;
}) {
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Delete exercise mutation
  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: number) => {
      return axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/exercises/${exerciseId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting exercise:", error);
      toast.error("Failed to delete exercise");
    }
  });

  const handleDeleteExercise = (exerciseId: number) => {
    deleteExerciseMutation.mutate(exerciseId);
    setOpenPopoverId(null); // Close the popover
  };

  const { data: exercisesData, isLoading } = useQuery({
    queryKey: ["exercises", condition],
    queryFn: async () => {
      const url = condition && condition !== "all"
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/exercises?condition=${encodeURIComponent(condition)}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/exercises`;
      
      try {
        const response = await axios.get(url);
        console.log("API Response:", response.data);
        
        // Process all exercise data to ensure each has exercise_name
        const processedExercises = response.data.exercises.map((ex: Partial<Exercise>) => {
          // Make sure each exercise has an exercise_name property
          if (!ex.exercise_name && ex.name) {
            ex.exercise_name = ex.name;
          } else if (!ex.exercise_name) {
            ex.exercise_name = "Unnamed Exercise";
          }
          return ex;
        });
        
        return processedExercises;
      } catch (error) {
        console.error("Error fetching exercises:", error);
        setDebugMessage("Error loading exercises. See console for details.");
        return [];
      }
    }
  });

  // Filter exercises based on search term
  const filteredExercises = exercisesData?.filter((exercise: Exercise) => {
    // Guard against undefined properties
    const exerciseName = exercise?.exercise_name || '';
    const description = exercise?.description || '';
    const condition = exercise?.condition || '';
    const searchTermLower = searchTerm.toLowerCase();
    
    return exerciseName.toLowerCase().includes(searchTermLower) ||
           description.toLowerCase().includes(searchTermLower) ||
           condition.toLowerCase().includes(searchTermLower);
  }) || [];

  // Debug output to help diagnose issues
  useEffect(() => {
    if (exercisesData && exercisesData.length > 0) {
      console.log("First exercise sample:", exercisesData[0]);
    }
  }, [exercisesData]);

  if (isLoading) {
    return <div className="text-center py-4">Loading exercises...</div>;
  }

  if (debugMessage) {
    return <div className="text-center py-4 text-red-500">{debugMessage}</div>;
  }

  if (!filteredExercises || filteredExercises.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No exercises found. Add your first exercise to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Exercise Name</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredExercises.map((exercise: Exercise) => (
            <TableRow key={exercise.id}>
              <TableCell className="font-medium">
                {exercise.exercise_name || exercise.name || "Unnamed Exercise"}
              </TableCell>
              <TableCell>{exercise.condition}</TableCell>
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
              <TableCell className="max-w-md">
                <div className="line-clamp-2">{exercise.description}</div>
              </TableCell>
              <TableCell>
                <Popover open={openPopoverId === exercise.id} onOpenChange={(open) => {
                  if (open) setOpenPopoverId(exercise.id);
                  else setOpenPopoverId(null);
                }}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      aria-label={`Delete exercise ${exercise.exercise_name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">Confirm Deletion</h4>
                      <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete <strong>{exercise.exercise_name}</strong>? This action cannot be undone.
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
                          onClick={() => handleDeleteExercise(exercise.id)}
                          disabled={deleteExerciseMutation.isPending}
                        >
                          {deleteExerciseMutation.isPending ? "Deleting..." : "Delete"}
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
  );
}