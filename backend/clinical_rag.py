import os
import iris
import json
from sentence_transformers import SentenceTransformer
import numpy as np
from dotenv import load_dotenv
from direct_groq import generate_llm_response
import atexit

# Load environment variables if not already loaded
env_file_path = '.env.local'
if os.path.exists(env_file_path):
    load_dotenv(env_file_path)
else:
    # Try loading from .env if .env.local doesn't exist
    load_dotenv()

class ClinicalRAG:
    def __init__(self):
        # IRIS Database Connection Settings
        self.username = 'demo'
        self.password = 'demo'
        self.hostname = os.getenv('IRIS_HOSTNAME', 'localhost')
        self.port = '1972'
        self.namespace = 'USER'
        self.CONNECTION_STRING = f"{self.hostname}:{self.port}/{self.namespace}"
        
        # Initialize the embedding model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Table settings
        self.SCHEMA_NAME = "Rehab"
        self.PATIENT_TABLE = f"{self.SCHEMA_NAME}.PatientData"
        self.GUIDELINES_TABLE = f"{self.SCHEMA_NAME}.ClinicalGuidelines"
        self.EXERCISES_TABLE = f"{self.SCHEMA_NAME}.ExerciseRecommendations"
        
        # System prompt for the LLM
        self.system_prompt = """
        You are Iris, an AI clinical assistant for rehabilitation professionals. You provide evidence-based 
        recommendations and information about rehabilitation treatments, exercises, and guidelines.
        
        When responding:
        - Be conversational, warm and clear - speak directly to the clinician as if you're having a chat
        - Present information in a cohesive, flowing narrative rather than formal academic sections
        - Synthesize all provided context information into a unified, helpful response
        - Ground your responses in the provided patient data and clinical evidence
        - If you don't have enough information, acknowledge this briefly and suggest what would help
        - When discussing exercises, include practical details rather than just theory
        
        Focus on being helpful and practical rather than comprehensive or academic. The clinician needs 
        actionable information they can use immediately with their patients.
        """

        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        except Exception as e:
            print(f"Error initializing SentenceTransformer: {e}")
            self.model = None
            
        # Register cleanup method
        atexit.register(self.cleanup)
    
    def get_db_connection(self):
        """Create and return a connection to the IRIS database"""
        return iris.connect(self.CONNECTION_STRING, self.username, self.password)
  
    def _get_patient_info(self, cursor, patient_id):
        """Retrieve comprehensive information about a specific patient"""
        try:
            cursor.execute(
                f"""
                SELECT id, patient_id as external_id, name, condition, medical_history, 
                    current_treatment, progress_notes, assessment 
                FROM {self.PATIENT_TABLE} 
                WHERE id = ?
                """,
                (patient_id,)
            )
            
            row = cursor.fetchone()
            if not row:
                print(f"No patient found with ID: {patient_id}")
                return None
            
            # Extract data safely
            try:
                p_id = row[0]
                external_id = row[1]
                name = row[2]
                condition = row[3]
                medical_history = row[4]
                current_treatment = row[5]
                progress_notes = row[6]
                assessment = row[7]
            except Exception as e:
                print(f"Error extracting row data: {e}")
                # Try with dictionary-like access
                try:
                    p_id = row["id"]
                    external_id = row["external_id"]
                    name = row["name"]
                    condition = row["condition"]
                    medical_history = row["medical_history"]
                    current_treatment = row["current_treatment"]
                    progress_notes = row["progress_notes"]
                    assessment = row["assessment"]
                except Exception as e2:
                    print(f"Error extracting row data as dict: {e2}")
                    return None
            
            # Get relevant exercises for this patient's condition - without vector search
            try:
                cursor.execute(
                    f"""
                    SELECT TOP 5 exercise_name, description, benefits, contraindications, severity
                    FROM {self.EXERCISES_TABLE}
                    WHERE condition = ?
                    """,
                    (condition,)
                )
                
                exercises = []
                for ex_row in cursor.fetchall():
                    try:
                        exercises.append({
                            "name": ex_row[0] if isinstance(ex_row, (list, tuple)) else ex_row["exercise_name"],
                            "description": ex_row[1] if isinstance(ex_row, (list, tuple)) else ex_row["description"],
                            "benefits": ex_row[2] if isinstance(ex_row, (list, tuple)) else ex_row["benefits"],
                            "contraindications": ex_row[3] if isinstance(ex_row, (list, tuple)) else ex_row["contraindications"],
                            "severity": ex_row[4] if isinstance(ex_row, (list, tuple)) else ex_row["severity"]
                        })
                    except Exception as e:
                        print(f"Error processing exercise row: {e}")
                
                print(f"Retrieved {len(exercises)} exercises for {name}'s condition")
            except Exception as e:
                print(f"Error retrieving exercises: {e}")
                exercises = []
            
            # Get relevant guidelines for this patient's condition - without vector search
            try:
                cursor.execute(
                    f"""
                    SELECT TOP 3 guideline_text, source
                    FROM {self.GUIDELINES_TABLE}
                    WHERE condition = ?
                    """,
                    (condition,)
                )
                
                guidelines = []
                for guide_row in cursor.fetchall():
                    try:
                        guidelines.append({
                            "text": guide_row[0] if isinstance(guide_row, (list, tuple)) else guide_row["guideline_text"],
                            "source": guide_row[1] if isinstance(guide_row, (list, tuple)) else guide_row["source"],
                            "condition": condition
                        })
                    except Exception as e:
                        print(f"Error processing guideline row: {e}")
                
                print(f"Retrieved {len(guidelines)} guidelines for {name}'s condition")
            except Exception as e:
                print(f"Error retrieving guidelines: {e}")
                guidelines = []
            
            return {
                "id": p_id,
                "patient_id": external_id,
                "name": name,
                "condition": condition,
                "medical_history": medical_history,
                "current_treatment": current_treatment,
                "progress_notes": progress_notes,
                "assessment": assessment,
                "recommended_exercises": exercises,
                "relevant_guidelines": guidelines
            }
        except Exception as e:
            print(f"Error in _get_patient_info: {e}")
            import traceback
            traceback.print_exc()
            return None

    def find_patient_by_name(self, cursor, patient_name):
        """Find a patient by name (full or partial match)"""
        try:
            print(f"Searching for patient with name like '%{patient_name}%'")
            cursor.execute(
                f"""
                SELECT TOP 1 id, patient_id, name, condition, medical_history, 
                    current_treatment, progress_notes, assessment 
                FROM {self.PATIENT_TABLE} 
                WHERE name LIKE ?
                """,
                (f"%{patient_name}%",)
            )
            
            row = cursor.fetchone()
            if not row:
                print(f"No patient found with name like '%{patient_name}%'")
                return None
            
            try:
                patient_id = row["id"] if "id" in row else row[0]
                external_id = row["patient_id"] if "patient_id" in row else row[1]
                name = row["name"] if "name" in row else row[2]
                condition = row["condition"] if "condition" in row else row[3]
                medical_history = row["medical_history"] if "medical_history" in row else row[4]
                current_treatment = row["current_treatment"] if "current_treatment" in row else row[5]
                progress_notes = row["progress_notes"] if "progress_notes" in row else row[6]
                assessment = row["assessment"] if "assessment" in row else row[7]
            except Exception as e:
                print(f"Error accessing row data: {e}")
                try:
                    row_dict = dict(zip(["id", "patient_id", "name", "condition", "medical_history", 
                                "current_treatment", "progress_notes", "assessment"], row))
                    patient_id = row_dict["id"]
                    external_id = row_dict["patient_id"]
                    name = row_dict["name"]
                    condition = row_dict["condition"]
                    medical_history = row_dict["medical_history"]
                    current_treatment = row_dict["current_treatment"]
                    progress_notes = row_dict["progress_notes"]
                    assessment = row_dict["assessment"]
                except Exception as nested_e:
                    print(f"Error converting row to dict: {nested_e}")
                    return None
            
            print(f"Found patient: {name} with condition: {condition}")
            
            # Get relevant exercises for this patient's condition - without vector search
            try:
                cursor.execute(
                    f"""
                    SELECT TOP 5 exercise_name, description, benefits, contraindications, severity
                    FROM {self.EXERCISES_TABLE}
                    WHERE condition = ?
                    """,  
                    (condition,)
                )
                
                exercises = []
                for ex_row in cursor.fetchall():
                    try:
                        exercises.append({
                            "name": ex_row[0] if isinstance(ex_row, (list, tuple)) else ex_row["exercise_name"],
                            "description": ex_row[1] if isinstance(ex_row, (list, tuple)) else ex_row["description"],
                            "benefits": ex_row[2] if isinstance(ex_row, (list, tuple)) else ex_row["benefits"],
                            "contraindications": ex_row[3] if isinstance(ex_row, (list, tuple)) else ex_row["contraindications"],
                            "severity": ex_row[4] if isinstance(ex_row, (list, tuple)) else ex_row["severity"]
                        })
                    except Exception as e:
                        print(f"Error processing exercise row: {e}")
                print(f"Retrieved {len(exercises)} exercises for condition: {condition}")
            except Exception as e:
                print(f"Error retrieving exercises: {str(e)}")
                exercises = []
            
            # Get relevant guidelines for this patient's condition - without vector search
            try:
                cursor.execute(
                    f"""
                    SELECT TOP 3 guideline_text, source
                    FROM {self.GUIDELINES_TABLE}
                    WHERE condition = ?
                    """,  
                    (condition,)
                )
                
                guidelines = []
                for guide_row in cursor.fetchall():
                    try:
                        guidelines.append({
                            "text": guide_row[0] if isinstance(guide_row, (list, tuple)) else guide_row["guideline_text"],
                            "source": guide_row[1] if isinstance(guide_row, (list, tuple)) else guide_row["source"],
                            "condition": condition
                        })
                    except Exception as e:
                        print(f"Error processing guideline row: {e}")
                print(f"Retrieved {len(guidelines)} guidelines for condition: {condition}")
            except Exception as e:
                print(f"Error retrieving guidelines: {str(e)}")
                guidelines = []
            
            return {
                "id": patient_id,
                "patient_id": external_id,
                "name": name,
                "condition": condition,
                "medical_history": medical_history,
                "current_treatment": current_treatment,
                "progress_notes": progress_notes,
                "assessment": assessment,
                "recommended_exercises": exercises,
                "relevant_guidelines": guidelines
            }
        except Exception as e:
            print(f"Error in find_patient_by_name: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def process_query(self, query, patient_id=None, condition=None):
        """
        Process a clinical query using improved RAG retrieval
        """
        # Retrieve relevant information from the database
        patient_info = None
        guidelines = None
        exercises = None
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get comprehensive patient information if patient_id is provided
            if patient_id:
                print(f"Retrieving patient info for ID: {patient_id}")
                patient_info = self._get_patient_info(cursor, patient_id)
                if patient_info:
                    print(f"Successfully retrieved patient info for: {patient_info.get('name', 'Unknown')}")
                else:
                    print(f"No patient found with ID: {patient_id}")
            
            # If no patient_id is provided, try to extract patient name from query
            if not patient_info:
                import re
                patient_name_patterns = [
                    r"patient\s+([A-Za-z]+\s+[A-Za-z]+)",
                    r"about\s+([A-Za-z]+\s+[A-Za-z]+)",
                    r"for\s+([A-Za-z]+\s+[A-Za-z]+)",
                ]
                
                patient_name = None
                for pattern in patient_name_patterns:
                    match = re.search(pattern, query, re.IGNORECASE)
                    if match:
                        patient_name = match.group(1)
                        print(f"Extracted patient name: {patient_name}")
                        break
            
                if patient_name:
                    print(f"Attempting to find patient with extracted name: {patient_name}")
                    try:
                        patient_info = self.find_patient_by_name(cursor, patient_name)
                        if patient_info:
                            print(f"Successfully found patient by name: {patient_info['name']}")
                        else:
                            print(f"No patient found with name: {patient_name}")
                    except Exception as e:
                        print(f"Error finding patient by name: {str(e)}")
                        import traceback
                        traceback.print_exc()
            
            # Additional debugging for exercises and guidelines
            if patient_info and "recommended_exercises" in patient_info:
                exercises = patient_info.pop("recommended_exercises", [])
                print(f"Found {len(exercises)} exercises for patient")
            if patient_info and "relevant_guidelines" in patient_info:
                guidelines = patient_info.pop("relevant_guidelines", [])
                print(f"Found {len(guidelines)} guidelines for patient")
                        
            # Generate a response based on the retrieved information
            print("Attempting to generate response...")
            try:
                response = self._generate_response(query, patient_info, guidelines, exercises)
                print("Response generated successfully")
            except Exception as e:
                print(f"Error generating response: {str(e)}")
                import traceback
                traceback.print_exc()
                response = self._generate_template_response(query, patient_info, guidelines, exercises)
                print("Used fallback template response")
                
            return {
                "response": response,
                "supporting_evidence": {
                    "patient_info": patient_info,
                    "guidelines": guidelines,
                    "exercises": exercises
                }
            }
        
        except Exception as e:
            print(f"Error in process_query: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "response": f"I apologize, but I encountered an error while processing your query. Please try again or rephrase your question. Technical details: {str(e)}",
                "supporting_evidence": None
            }
        
        finally:
            cursor.close()
            conn.close()

    def _get_relevant_guidelines(self, cursor, query_embedding, filter_condition=""):
        """Retrieve relevant clinical guidelines using vector search"""
        sql = f"""
            SELECT TOP 3 condition, guideline_text, source
            FROM {self.GUIDELINES_TABLE}
            {filter_condition}
            ORDER BY VECTOR_DOT_PRODUCT(embedded_text, TO_VECTOR(?)) DESC
        """
        
        cursor.execute(sql, (str(query_embedding),))
        
        guidelines = []
        for row in cursor.fetchall():
            guidelines.append({
                "condition": row[0],
                "text": row[1],
                "source": row[2]
            })
        
        return guidelines
    
    def _get_relevant_exercises(self, cursor, query_embedding, filter_condition=""):
        """Retrieve relevant exercise recommendations using vector search"""
        sql = f"""
            SELECT TOP 3 condition, severity, exercise_name, description, benefits, contraindications
            FROM {self.EXERCISES_TABLE}
            {filter_condition}
            ORDER BY VECTOR_DOT_PRODUCT(embedded_text, TO_VECTOR(?)) DESC
        """
        
        cursor.execute(sql, (str(query_embedding),))
        
        exercises = []
        for row in cursor.fetchall():
            exercises.append({
                "condition": row[0],
                "severity": row[1],
                "name": row[2],
                "description": row[3],
                "benefits": row[4],
                "contraindications": row[5]
            })
        
        return exercises
    
    def _generate_response(self, query, patient_info, guidelines, exercises):
        """
        Generate a response based on the retrieved information
        
        Uses Groq LLM when available, falls back to template-based responses if not
        """
        try:
            print("Attempting to generate response with LLM...")
            response = self._generate_response_with_llm(query, patient_info, guidelines, exercises)
            print("Successfully generated LLM response")
            return response
        except Exception as e:
            print(f"Error using Groq LLM: {e}")
            import traceback
            traceback.print_exc()
            # Fall back to template if LLM fails
            print("Falling back to template response")
            return self._generate_template_response(query, patient_info, guidelines, exercises)

    def _generate_response_with_llm(self, query, patient_info, guidelines, exercises):
        """Generate a response using the direct Groq integration with improved prompt structure and debugging"""
        try:
            print("\n==== Starting LLM Response Generation ====")
            print(f"Query: {query}")
            print(f"Patient info available: {patient_info is not None}")
            print(f"Guidelines available: {len(guidelines) if guidelines else 0}")
            print(f"Exercises available: {len(exercises) if exercises else 0}")
            
            # Format context
            context_parts = []
            
            if patient_info:
                print(f"Using patient info for: {patient_info.get('name', 'Unknown')}")
                patient_context = f"""
                PATIENT INFORMATION:
                Name: {patient_info.get('name', 'Unknown')}
                Condition: {patient_info.get('condition', 'Unknown')}
                Medical History: {patient_info.get('medical_history', 'Not available')}
                Current Treatment: {patient_info.get('current_treatment', 'Not available')}
                Progress Notes: {patient_info.get('progress_notes', 'Not available')}
                Assessment: {patient_info.get('assessment', 'Not available')}
                """
                context_parts.append(patient_context)
            
            if guidelines:
                guidelines_context = "RELEVANT CLINICAL GUIDELINES:\n"
                for i, guide in enumerate(guidelines, 1):
                    condition_text = f" for {guide.get('condition', 'this condition')}" if guide.get('condition') else ""
                    guidelines_context += f"- Guideline{condition_text}: {guide.get('text', 'No text available')} (Source: {guide.get('source', 'Unknown')})\n"
                context_parts.append(guidelines_context)
            
            if exercises:
                exercises_context = "RECOMMENDED EXERCISES:\n"
                for i, ex in enumerate(exercises, 1):
                    exercises_context += f"- {ex.get('name', 'Unknown exercise')} for {ex.get('condition', 'Unknown condition')} ({ex.get('severity', 'Unknown')} severity):\n"
                    exercises_context += f"  Description: {ex.get('description', 'Not available')}\n"
                    exercises_context += f"  Benefits: {ex.get('benefits', 'Not available')}\n"
                    if ex.get('contraindications'):
                        exercises_context += f"  Cautions: {ex.get('contraindications')}\n"
                context_parts.append(exercises_context)
            
            # Combine all context
            combined_context = "\n\n".join(context_parts)
            
            print("\n== Prompt Context ==")
            print(combined_context[:500] + "..." if len(combined_context) > 500 else combined_context)
            
            # Updated system prompt to encourage brevity and natural style
            improved_system_prompt = """
            You are Iris, an AI clinical assistant for rehabilitation professionals. You provide evidence-based 
            recommendations and information about rehabilitation treatments, exercises, and guidelines.
            
            IMPORTANT INSTRUCTIONS:
            - Keep responses brief and to the point - 3-5 sentences is often enough unless detailed information is requested
            - Use conversational, natural language as if speaking directly to a colleague
            - Avoid formulaic introductions like "John Doe, let's take a closer look at his case"
            - Reference medical guidelines but focus on practical advice when necessary
            - Avoid lengthy, comprehensive responses unless specifically asked for detailed information
            - Present key information in a concise manner
            
            Your responses should be helpful but brief, like a quick hallway consultation between clinicians.
            """
            
            # Define user_prompt
            if patient_info:
                user_prompt = f"""
                Query from clinician: {query}
                
                Information about {patient_info.get('name', 'the patient')}:
                
                {combined_context}
                
                Provide a BRIEF, direct response focused on key information. Keep your answer concise (2-4 sentences) unless detailed information is explicitly requested.
                """
            else:
                user_prompt = f"""
                Query from clinician: {query}
                
                Information that may help answer this query:
                
                {combined_context}
                
                Provide a BRIEF, direct response focused on key information. Keep your answer concise (2-4 sentences) unless detailed information is explicitly requested.
                """
            
            print("\n== Calling Groq LLM ==")
            # Generate response using direct Groq integration with improved system prompt
            response = generate_llm_response(improved_system_prompt, user_prompt)
            
            if response:
                print("\n== Got LLM Response ==")
                print(response[:500] + "..." if len(response) > 500 else response)
                return response
            else:
                print("\n== LLM Response Failed, Using Template Fallback ==")
                return self._generate_template_response(query, patient_info, guidelines, exercises)
            
        except Exception as e:
            print(f"\n==== ERROR in _generate_response_with_llm: {str(e)} ====")
            import traceback
            traceback.print_exc()
            # Return a template response as fallback
            return self._generate_template_response(query, patient_info, guidelines, exercises)

    def _generate_template_response(self, query, patient_info, guidelines, exercises):
        """
        Generate a robust template-based response as fallback if LLM call fails
        Guarantees to return a response even with incomplete information
        """
        print("Generating template response")
        response_parts = []
        
        # Add a greeting that acknowledges patient when available
        if patient_info and patient_info.get('name'):
            response_parts.append(f"Here's what I know about patient {patient_info['name']}:")
            
            # Add patient info
            if patient_info.get('condition'):
                response_parts.append(f"\n**Condition:** {patient_info['condition']}")
            
            if patient_info.get('medical_history'):
                response_parts.append(f"\n**Medical History:** {patient_info['medical_history']}")
            
            if patient_info.get('current_treatment'):
                response_parts.append(f"\n**Current Treatment:** {patient_info['current_treatment']}")
            
            if patient_info.get('progress_notes'):
                response_parts.append(f"\n**Progress Notes:** {patient_info['progress_notes']}")
            
            if patient_info.get('assessment'):
                response_parts.append(f"\n**Assessment:** {patient_info['assessment']}")
        else:
            # Check if query is about a patient
            import re
            patient_match = re.search(r"patient\s+([A-Za-z]+\s+[A-Za-z]+)", query, re.IGNORECASE)
            if patient_match:
                patient_name = patient_match.group(1)
                response_parts.append(f"I don't have specific information about patient {patient_name} in my database. To provide personalized recommendations, I would need details about their condition and medical history.")
            else:
                response_parts.append("Based on the available information:")
        
        # Add relevant guidelines if available
        if guidelines and len(guidelines) > 0:
            response_parts.append("\n\n**Relevant Clinical Guidelines:**")
            for guide in guidelines:
                condition = guide.get('condition', '')
                condition_text = f" for {condition}" if condition else ""
                response_parts.append(f"\n- {guide.get('text', 'No text available')}{condition_text} (Source: {guide.get('source', 'Unknown')})")
        
        # Add relevant exercises if available
        if exercises and len(exercises) > 0:
            response_parts.append("\n\n**Recommended Exercises:**")
            for ex in exercises:
                response_parts.append(f"\n- **{ex.get('name', 'Exercise')}** ({ex.get('severity', 'Unknown')} severity):")
                response_parts.append(f"  *Description:* {ex.get('description', 'No description available')}")
                response_parts.append(f"  *Benefits:* {ex.get('benefits', 'Not specified')}")
                if ex.get('contraindications'):
                    response_parts.append(f"  *Cautions:* {ex.get('contraindications')}")
        
        # If we don't have any specific information, give a generic response
        if len(response_parts) <= 1:
            response_parts.append("\nI don't have enough specific information to answer your question fully. If you're asking about a particular patient, exercise recommendations, or clinical guidelines, please provide more details so I can give you a more targeted response.")
        
        # Add a helpful closing
        response_parts.append("\n\nLet me know if you need any clarification or have additional questions.")
        
        return "".join(response_parts)

    def add_patient(self, patient_data):
        """Add a new patient to the database with vector embeddings"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create embedding for combined notes
            combined_text = f"{patient_data['medical_history']} {patient_data['current_treatment']} {patient_data['progress_notes']} {patient_data['assessment']}"
            embedding = self.model.encode(combined_text, normalize_embeddings=True).tolist()
            
            # Get the next available ID
            cursor.execute(f"SELECT MAX(id) FROM {self.PATIENT_TABLE}")
            max_id = cursor.fetchone()[0]
            new_id = 1 if max_id is None else max_id + 1
            
            # Insert into database
            cursor.execute(
                f"INSERT INTO {self.PATIENT_TABLE} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TO_VECTOR(?))",
                (
                    new_id, 
                    patient_data["patient_id"], 
                    patient_data["name"], 
                    patient_data["age"],
                    patient_data["condition"], 
                    patient_data["medical_history"], 
                    patient_data["current_treatment"], 
                    patient_data["progress_notes"], 
                    patient_data["assessment"],
                    str(embedding)
                )
            )
            
            conn.commit()
            return {"id": new_id, "status": "success"}
        
        finally:
            cursor.close()
            conn.close()
    
    def delete_patient(self, patient_id):
        """Delete a patient from the database"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"DELETE FROM {self.PATIENT_TABLE} WHERE id = ?", (patient_id,))
            conn.commit()
            return {"status": "success"}
        
        finally:
            cursor.close()
            conn.close()

    def update_progress_notes(self, patient_id, new_notes, new_assessment):
        """Update a patient's progress notes and assessment, with updated embeddings"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # First get current patient data
            cursor.execute(
                f"SELECT medical_history, current_treatment FROM {self.PATIENT_TABLE} WHERE id = ?",
                (patient_id,)
            )
            
            row = cursor.fetchone()
            if not row:
                return {"status": "error", "message": "Patient not found"}
            
            medical_history = row[0]
            current_treatment = row[1]
            
            # Create new embedding
            combined_text = f"{medical_history} {current_treatment} {new_notes} {new_assessment}"
            embedding = self.model.encode(combined_text, normalize_embeddings=True).tolist()
            
            # Update the database
            cursor.execute(
                f"UPDATE {self.PATIENT_TABLE} SET progress_notes = ?, assessment = ?, embedded_notes = TO_VECTOR(?) WHERE id = ?",
                (new_notes, new_assessment, str(embedding), patient_id)
            )
            
            conn.commit()
            return {"status": "success"}
        
        finally:
            cursor.close()
            conn.close()
    
    def add_clinical_guideline(self, guideline_data):
        """Add a new clinical guideline with vector embedding"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create embedding
            embedding = self.model.encode(guideline_data["guideline_text"], normalize_embeddings=True).tolist()
            
            # Get the next available ID
            cursor.execute(f"SELECT MAX(id) FROM {self.GUIDELINES_TABLE}")
            max_id = cursor.fetchone()[0]
            new_id = 1 if max_id is None else max_id + 1
            
            # Insert into database
            cursor.execute(
                f"INSERT INTO {self.GUIDELINES_TABLE} VALUES (?, ?, ?, ?, TO_VECTOR(?))",
                (
                    new_id,
                    guideline_data["condition"],
                    guideline_data["guideline_text"],
                    guideline_data["source"],
                    str(embedding)
                )
            )
            
            conn.commit()
            return {"id": new_id, "status": "success"}
        
        finally:
            cursor.close()
            conn.close()
    
    def add_exercise(self, exercise_data):
        """Add a new exercise recommendation with vector embedding"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create embedding
            combined_text = f"{exercise_data['exercise_name']} {exercise_data['description']} {exercise_data['benefits']}"
            embedding = self.model.encode(combined_text, normalize_embeddings=True).tolist()
            
            # Get the next available ID
            cursor.execute(f"SELECT MAX(id) FROM {self.EXERCISES_TABLE}")
            max_id = cursor.fetchone()[0]
            new_id = 1 if max_id is None else max_id + 1
            
            # Insert into database
            cursor.execute(
                f"INSERT INTO {self.EXERCISES_TABLE} VALUES (?, ?, ?, ?, ?, ?, ?, TO_VECTOR(?))",
                (
                    new_id,
                    exercise_data["condition"],
                    exercise_data["severity"],
                    exercise_data["exercise_name"],
                    exercise_data["description"],
                    exercise_data["benefits"],
                    exercise_data["contraindications"],
                    str(embedding)
                )
            )
            
            conn.commit()
            return {"id": new_id, "status": "success"}
        
        finally:
            cursor.close()
            conn.close()

    def cleanup(self):
        """Clean up resources to prevent leaks"""
        try:
            # Clear the model to release resources
            if hasattr(self, 'model') and self.model is not None:
                import gc
                del self.model
                gc.collect()
                print("Cleaned up SentenceTransformer resources")
        except Exception as e:
            print(f"Error during cleanup: {e}")