import os
import iris
from sentence_transformers import SentenceTransformer
import numpy as np
from dotenv import load_dotenv
from direct_groq import generate_llm_response
import atexit
import torch

# Load environment variables if not already loaded
env_file_path = '.env.local'
if os.path.exists(env_file_path):
    load_dotenv(env_file_path)
else:
    # Try loading from .env if .env.local doesn't exist
    load_dotenv()

_model = None

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

        self.system_prompt = """
        You are Iris, a clinical assistant for rehabilitation professionals. Provide concise, practical information about patients, treatments, and exercises.

        Guidelines:
        - Be extremely concise - only include essential information
        - Always add proper spacing between paragraphs (use double line breaks)
        - After first mention, refer to patients by their first name only
        - Never mention limitations in data unless directly asked
        - Never speculate beyond available information
        - Don't suggest actions unless directly asked for recommendations
        - Only mention exercises or treatments if directly relevant to the query
        - Focus on facts, not opinions or encouragement

        Your responses should be direct, factual, and to-the-point. Avoid phrases like "we don't have information on" or "I think" or "it's recommended that".
        """

        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        except Exception as e:
            print(f"Error initializing SentenceTransformer: {e}")
            self.model = None
        
        # Use the global model instance or create it if it doesn't exist
        global _model
        if _model is None:
            print("Initializing SentenceTransformer model...")
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        self.model = _model

        # Register cleanup method
        atexit.register(self.cleanup)

    def _cleanup_resources(self):
        """Clean up resources when the application exits"""
        global _model
        if _model is not None:
            # Clear CUDA cache if using GPU
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Delete model reference
            _model = None
            print("Cleaned up SentenceTransformer resources")
    
    def get_db_connection(self):
        """Create and return a connection to the IRIS database"""
        return iris.connect(self.CONNECTION_STRING, self.username, self.password)
  
    def _get_patient_info(self, cursor, patient_id):
        """Retrieve comprehensive information about a specific patient"""
        try:
            cursor.execute(
                f"""
                SELECT id, patient_id as external_id, name, age, gender, condition, medical_history, 
                    current_treatment, progress_notes, assessment, treatment_outcomes 
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
                age = row[3]
                gender = row[4]
                condition = row[5]
                medical_history = row[6]
                current_treatment = row[7]
                progress_notes = row[8]
                assessment = row[9]
                treatment_outcomes = row[10] if len(row) > 10 else None
            except Exception as e:
                print(f"Error extracting row data: {e}")
                # Try with dictionary-like access
                try:
                    p_id = row["id"]
                    external_id = row["external_id"]
                    name = row["name"]
                    age = row["age"]
                    gender = row["gender"]
                    condition = row["condition"]
                    medical_history = row["medical_history"]
                    current_treatment = row["current_treatment"]
                    progress_notes = row["progress_notes"]
                    assessment = row["assessment"]
                    treatment_outcomes = row.get("treatment_outcomes", None)
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
            
            # Create the final patient info dictionary with all available fields
            return {
                "id": p_id,
                "patient_id": external_id,
                "name": name,
                "age": age,  # Make sure age is included
                "gender": gender,  # Make sure gender is included
                "condition": condition,
                "medical_history": medical_history,
                "current_treatment": current_treatment,
                "progress_notes": progress_notes,
                "assessment": assessment,
                "treatment_outcomes": treatment_outcomes,
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

    def process_query(self, query_text, patient_id=None, condition_filter=None):
        """
        Process a clinical query using intent-based RAG retrieval with specialized handlers
        """
        # Check explicitly for similar patients queries
        if any(phrase in query_text.lower() for phrase in [
            "similar patient", "similar patients", "patients like", "patient like", 
            "patients similar", "who are similar", "which patients"
        ]) and not "based on" in query_text.lower():
            print("Detected direct query about similar patients, using specialized handler")
            # Use our specialized handler for similar patient queries
            result = self.handle_similar_patients_query(query_text, patient_id)
            
            # If the patient is found by name but not ID
            if not patient_id:
                import re
                patient_name_match = re.search(r"(?:patient|about|to|for|like)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)", query_text, re.IGNORECASE)
                if patient_name_match:
                    patient_name = patient_name_match.group(1)
                    print(f"Extracted patient name for similar patients query: {patient_name}")
                    
                    conn = self.get_db_connection()
                    cursor = conn.cursor()
                    try:
                        patient_info = self.find_patient_by_name(cursor, patient_name)
                        if patient_info and 'id' in patient_info:
                            print(f"Found patient by name: {patient_info['name']} with ID: {patient_info['id']}")
                            result = self.handle_similar_patients_query(query_text, patient_info['id'])
                    finally:
                        cursor.close()
                        conn.close()
            
            return result
            
        # Check for treatment recommendations based on similar patients
        if any(phrase in query_text.lower() for phrase in [
            "based on similar patient", "based on similar patients", 
            "from similar patient", "from similar patients",
            "like other patient", "like other patients"
        ]):
            print("Detected query about treatments based on similar patients")
            result = self.handle_treatment_recommendation_query(query_text, patient_id)
            
            # If the patient is found by name but not ID
            if not patient_id:
                import re
                patient_name_match = re.search(r"(?:patient|about|to|for|like)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)", query_text, re.IGNORECASE)
                if patient_name_match:
                    patient_name = patient_name_match.group(1)
                    print(f"Extracted patient name for recommendation query: {patient_name}")
                    
                    conn = self.get_db_connection()
                    cursor = conn.cursor()
                    try:
                        patient_info = self.find_patient_by_name(cursor, patient_name)
                        if patient_info and 'id' in patient_info:
                            print(f"Found patient by name: {patient_info['name']} with ID: {patient_info['id']}")
                            result = self.handle_treatment_recommendation_query(query_text, patient_info['id'])
                    finally:
                        cursor.close()
                        conn.close()
            
            return result
        
        # For all other queries, continue with normal processing
        # Classify the intent
        intent = self._classify_query_intent(query_text)
        print(f"Query intent classified as: {intent}")
        
        # Initialize context and supporting evidence containers
        context = {}
        supporting_evidence = {}
        
        # Get DB connection
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Always retrieve basic patient info if patient_id provided
            patient_info = None
            if patient_id:
                print(f"Retrieving patient info for ID: {patient_id}")
                patient_info = self._get_patient_info(cursor, patient_id)
                context["patient"] = patient_info
                supporting_evidence["patient_info"] = patient_info
                
                # Get similar patients for context enrichment
                similar_patients_result = self.find_similar_patients_iris_vector(patient_id, limit=3)
                if isinstance(similar_patients_result, dict) and "similar_patients" in similar_patients_result:
                    similar_patients = similar_patients_result["similar_patients"]
                    context["similar_patients"] = similar_patients
                    supporting_evidence["similar_patients"] = similar_patients
                    print(f"Found {len(similar_patients)} similar patients")
            
            # Try to extract patient name if no ID provided
            if not patient_info:
                import re
                patient_name_match = re.search(r"(?:patient|about|to|for|like)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)", query_text, re.IGNORECASE)
                if patient_name_match:
                    patient_name = patient_name_match.group(1)
                    print(f"Extracted patient name: {patient_name}")
                    patient_info = self.find_patient_by_name(cursor, patient_name)
                    if patient_info:
                        context["patient"] = patient_info
                        supporting_evidence["patient_info"] = patient_info
                        print(f"Found patient by name: {patient_info['name']}")
                        
                        # Now that we found a patient, get their condition
                        if 'condition' in patient_info:
                            condition_filter = patient_info['condition']
                        
                        # Also get similar patients for patient identified by name
                        if 'id' in patient_info:
                            similar_patients_result = self.find_similar_patients_iris_vector(patient_info['id'], limit=3)
                            if isinstance(similar_patients_result, dict) and "similar_patients" in similar_patients_result:
                                similar_patients = similar_patients_result["similar_patients"]
                                context["similar_patients"] = similar_patients
                                supporting_evidence["similar_patients"] = similar_patients
                                print(f"Found {len(similar_patients)} similar patients for {patient_info['name']}")
            
            # Create embeddings for semantic search
            query_embedding = self.model.encode(query_text, normalize_embeddings=True).tolist()
            
            # Only retrieve guidelines and exercises for relevant intents or when explicitly asked
            if intent in ["RECOMMENDATION", "EXERCISE", "GUIDELINE"] or "guideline" in query_text.lower():
                guidelines = self._get_relevant_guidelines(cursor, query_embedding, condition_filter)
                if guidelines:
                    context["guidelines"] = guidelines
                    supporting_evidence["guidelines"] = guidelines
                    print(f"Retrieved {len(guidelines)} relevant guidelines")
            
            if intent in ["RECOMMENDATION", "EXERCISE"] or "exercise" in query_text.lower():
                exercises = self._get_relevant_exercises(cursor, query_embedding, condition_filter)
                if exercises:
                    context["exercises"] = exercises
                    supporting_evidence["exercises"] = exercises
                    print(f"Retrieved {len(exercises)} relevant exercises")
            
            # IMPORTANT: If we have patient info with recommended_exercises, include these in the context
            if patient_info and 'recommended_exercises' in patient_info and patient_info['recommended_exercises']:
                # If exercises aren't already in context, add them
                if 'exercises' not in context:
                    context['exercises'] = []
                
                # Add the patient's recommended exercises to the context
                if isinstance(patient_info['recommended_exercises'], list):
                    context['exercises'].extend(patient_info['recommended_exercises'])
                
            # IMPORTANT: If we have patient info with relevant_guidelines, include these in the context
            if patient_info and 'relevant_guidelines' in patient_info and patient_info['relevant_guidelines']:
                # If guidelines aren't already in context, add them
                if 'guidelines' not in context:
                    context['guidelines'] = []
                
                # Add the patient's relevant guidelines to the context
                if isinstance(patient_info['relevant_guidelines'], list):
                    context['guidelines'].extend(patient_info['relevant_guidelines'])
            
            # Debug output to see what's in the context
            print(f"Final context keys: {list(context.keys())}")
            
            # Generate response with intent-specific instructions
            response = self._generate_response_with_llm(query_text, context, intent)
            
            # Debug the response before returning
            print(f"Response content (first 100 chars): {response[:100] if response else 'None'}...")
            
            # Return in the expected format the API endpoint expects
            result = {
                "response": response,
                "supporting_evidence": supporting_evidence
            }
            
            print(f"Returning response object: {str(result)[:200]}...")
            return result
        
        except Exception as e:
            print(f"Error in process_query: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "response": f"I apologize, but I encountered an error while processing your query. Please try again or rephrase your question. Technical details: {str(e)}",
                "supporting_evidence": {}
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

    def _classify_query_intent(self, query_text):
        """Classify the intent of the user query"""
        
        # Check for similar patients query first
        if any(x in query_text.lower() for x in ["similar patient", "similar patients", "patients like", "patient like"]):
            return "SIMILAR_PATIENTS"
        
        # Simple rule-based classification
        query_lower = query_text.lower()
        if any(x in query_lower for x in ["what is", "who is", "tell me about", "information"]):
            return "INFORMATION"
        elif any(x in query_lower for x in ["recommend", "suggestion", "what should", "treatment"]):
            return "RECOMMENDATION"
        elif "exercise" in query_lower:
            return "EXERCISE"
        elif "guideline" in query_lower:
            return "GUIDELINE"
        else:
            return "GENERAL"    

    def _format_context(self, context):
        """Format the context dictionary into a string for the LLM prompt"""
        formatted_parts = []
        
        # Format patient information if available
        if "patient" in context and context["patient"]:
            patient = context["patient"]
            patient_str = "PATIENT INFORMATION:\n"
            patient_str += f"Name: {patient.get('name', 'Unknown')}\n"
            
            # Explicitly include age and gender if available
            age = patient.get('age')
            if age:
                patient_str += f"Age: {age}\n"
                
            gender = patient.get('gender')
            if gender:
                patient_str += f"Gender: {gender}\n"
                
            patient_str += f"Diagnosis: {patient.get('condition', 'Unknown')}\n"
            
            # Include medical history
            if patient.get('medical_history'):
                patient_str += f"Medical History: {patient.get('medical_history')}\n"
                
            # Include current treatment
            if patient.get('current_treatment'):
                patient_str += f"Current Treatment: {patient.get('current_treatment')}\n"
                
            # Include progress notes
            if patient.get('progress_notes'):
                patient_str += f"Progress Notes: {patient.get('progress_notes')}\n"
                
            # Include assessment
            if patient.get('assessment'):
                patient_str += f"Assessment: {patient.get('assessment')}\n"
                
            # Include treatment outcomes if available
            if patient.get('treatment_outcomes'):
                patient_str += f"Treatment Outcomes: {patient.get('treatment_outcomes')}\n"
                
            formatted_parts.append(patient_str)
        
        # Format similar patients if available - improved section
        if "similar_patients" in context and context["similar_patients"]:
            similar_str = "SIMILAR PATIENTS:\n"
            for i, patient in enumerate(context["similar_patients"], 1):
                similar_str += f"{i}. {patient.get('name', 'Unknown Patient')}"
                
                # Add basic demographics
                similar_str += f" - {patient.get('age', 'N/A')} year old"
                if patient.get('gender'):
                    similar_str += f" {patient.get('gender')}"
                similar_str += f", {patient.get('condition', 'Unknown condition')}\n"
                
                # Add key treatment info in a concise format
                if patient.get('current_treatment'):
                    similar_str += f"   Treatment: {patient.get('current_treatment')}\n"
                
                # Add outcomes if available
                if patient.get('treatment_outcomes'):
                    similar_str += f"   Outcomes: {patient.get('treatment_outcomes')}\n"
                
                # Add similarity score
                if patient.get('similarity_score'):
                    similar_str += f"   Similarity: {patient.get('similarity_score')}\n"
                
                # Add separator between patients for readability
                if i < len(context["similar_patients"]):
                    similar_str += "\n"
                    
            formatted_parts.append(similar_str)
        
        # Format guidelines if available
        if "guidelines" in context and context["guidelines"]:
            guidelines_str = "RELEVANT CLINICAL GUIDELINES:\n"
            for i, guideline in enumerate(context["guidelines"], 1):
                guidelines_str += f"{i}. "
                if "condition" in guideline:
                    guidelines_str += f"For {guideline['condition']}: "
                guidelines_str += f"{guideline.get('text', 'No content')}\n"
                if guideline.get('source'):
                    guidelines_str += f"   Source: {guideline.get('source')}\n"
            formatted_parts.append(guidelines_str)
        
        # Format exercises if available
        if "exercises" in context and context["exercises"]:
            exercises_str = "RELEVANT EXERCISES:\n"
            for i, exercise in enumerate(context["exercises"], 1):
                exercises_str += f"{i}. {exercise.get('name', 'Untitled')}\n"
                exercises_str += f"   Description: {exercise.get('description', 'No description')}\n"
                exercises_str += f"   Benefits: {exercise.get('benefits', 'No benefits listed')}\n"
                if exercise.get('contraindications'):
                    exercises_str += f"   Contraindications: {exercise.get('contraindications')}\n"
                if exercise.get('severity'):
                    exercises_str += f"   Severity: {exercise.get('severity')}\n"
            formatted_parts.append(exercises_str)
        
        # If no context was found, explicitly state that
        if not formatted_parts:
            return "No relevant context information found for this query."
        
        # Combine all parts with clear separation
        return "\n\n".join(formatted_parts)
    

    def _generate_response_with_llm(self, query, context, intent):
        """
        Generate a response using the LLM with context and intent-specific instructions.
        """
        # Format the context for insertion into the prompt
        formatted_context = self._format_context(context)
        
        # Add intent-specific instructions based on query classification
        if intent == "SIMILAR_PATIENTS":
            specific_instructions = """
            List only the similar patients found in the data without commentary or speculation.
            
            For each patient include:
            1. Name and age
            2. Diagnosis
            3. Current treatment
            4. One key outcome or assessment detail
            
            Format with proper paragraph breaks. If no similar patients are found, simply state "No similar patients found in the database."
            """
        elif intent == "INFORMATION":
            specific_instructions = """
            Provide only essential facts about the patient in 2-3 very short paragraphs.
            
            First paragraph: Current diagnosis and key status.
            
            Second paragraph: Current treatment and specific progress metrics.
            
            Use only the patient's first name after first mention. Add proper paragraph breaks between paragraphs.
            """
        elif intent == "RECOMMENDATION":
            specific_instructions = """
            Provide exactly 1-2 specific recommendations based on the patient's needs.
            
            Keep it factual and direct - no encouraging language or speculation.
            
            Format with proper paragraph breaks.
            """
        elif intent == "EXERCISE":
            specific_instructions = """
            List 1-2 most relevant exercises with specific parameters.
            
            Format: Name, brief description, specific frequency/duration.
            
            Format with proper paragraph breaks.
            """
        elif intent == "GUIDELINE":
            specific_instructions = """
            Summarize only the single most relevant guideline.
            
            Keep it under 3 sentences and focused on the specific query.
            
            Format with proper paragraph breaks.
            """
        else:  # GENERAL
            specific_instructions = """
            Provide a direct answer in 1-2 very short paragraphs.
            
            Include only essential facts directly related to the query.
            
            Format with proper paragraph breaks.
            """
        
        user_prompt = f"""Query: {query}

        Context Information:
        {formatted_context}

        Instructions:
        {specific_instructions}

        Answer the query in a concise, focused way using the provided context information.
        """

        # Add these debug lines:
        print(f"Context keys available: {list(context.keys())}")
        print(f"Patient info in context: {bool('patient' in context)}")
        if 'patient' in context:
            print(f"Patient keys: {list(context['patient'].keys() if context['patient'] else [])}")
        print(f"Similar patients in context: {bool('similar_patients' in context)}")
        print(f"Formatted context (first 200 chars): {formatted_context[:200]}...")

        # Then call the LLM
        response = generate_llm_response(self.system_prompt, user_prompt)
        
        # Make sure to return the response
        return response

    def handle_similar_patients_query(self, query_text, patient_id):
        """Directly handle queries about similar patients"""
        if not patient_id:
            return {
                "response": "To find similar patients, please first focus on a specific patient.",
                "supporting_evidence": {}
            }
            
        # Get patient information first
        conn = self.get_db_connection()
        cursor = conn.cursor()
        patient_info = None
        
        try:
            patient_info = self._get_patient_info(cursor, patient_id)
            if not patient_info:
                return {
                    "response": "Patient information not found. Please check the patient ID.",
                    "supporting_evidence": {}
                }
        finally:
            cursor.close()
            conn.close()
            
        # Get similar patients using our vector search
        similar_patients_result = self.find_similar_patients_iris_vector(patient_id, limit=10)
        
        if (not isinstance(similar_patients_result, dict) or 
            "similar_patients" not in similar_patients_result or
            not similar_patients_result["similar_patients"]):
            return {
                "response": "No similar patients found in the database for this patient.",
                "supporting_evidence": {"patient_info": patient_info}
            }
        
        all_similar_patients = similar_patients_result["similar_patients"]
        patient_condition = patient_info.get('condition')
        
        # Filter only high and medium matches with same condition
        filtered_patients = []
        for patient in all_similar_patients:
            # Only include patients with the same condition
            if patient_condition and patient.get('condition') != patient_condition:
                continue
                
            # Only include high and medium similarity scores
            similarity = patient.get('similarity_score', '')
            raw_score = patient.get('raw_score', 0)
            
            if (similarity == 'High' or similarity == 'Medium' or 
                (isinstance(raw_score, (int, float)) and raw_score >= 0.6)):
                filtered_patients.append(patient)
        
        # Limit to top 3 most similar
        similar_patients = filtered_patients[:3]
        
        supporting_evidence = {
            "patient_info": patient_info,
            "similar_patients": similar_patients
        }
        
        if not similar_patients:
            return {
                "response": f"No patients with similar profiles to this patient found with the same condition ({patient_condition}).",
                "supporting_evidence": supporting_evidence
            }
        
        # Build a clear, simple response
        response = f"Similar patients with {patient_condition}:\n\n"
        
        for i, patient in enumerate(similar_patients, 1):
            name = patient.get('name', 'Unknown')
            age = patient.get('age', 'Unknown age')
            condition = patient.get('condition', 'Unknown condition')
            treatment = patient.get('current_treatment', 'No treatment info')
            outcomes = patient.get('treatment_outcomes', '')
            
            response += f"{i}. {name}, {age}, {condition}, {treatment}"
            if outcomes:
                response += f", {outcomes}"
            response += "\n\n"
        
        return {
            "response": response,
            "supporting_evidence": supporting_evidence
        }

    def handle_treatment_recommendation_query(self, query_text, patient_id):
        """Handle queries about treatment recommendations based on similar patients with improved formatting"""
        if not patient_id:
            return {
                "response": "To provide treatment recommendations based on similar patients, please first focus on a specific patient.",
                "supporting_evidence": {}
            }
        
        # Get the patient's information
        conn = self.get_db_connection()
        cursor = conn.cursor()
        patient_info = None
        similar_patients = []
        
        try:
            patient_info = self._get_patient_info(cursor, patient_id)
            if not patient_info:
                return {
                    "response": "Patient information not found. Please check the patient ID.",
                    "supporting_evidence": {}
                }
            
            # Find similar patients
            similar_patients_result = self.find_similar_patients_iris_vector(patient_id, limit=5)
            if isinstance(similar_patients_result, dict) and "similar_patients" in similar_patients_result:
                all_similar = similar_patients_result["similar_patients"]
                
                # Filter to get only patients with same condition and high/medium similarity
                for patient in all_similar:
                    if (patient.get('condition') == patient_info.get('condition') and 
                        (patient.get('similarity_score') in ['High', 'Medium'] or
                        patient.get('raw_score', 0) >= 0.6)):
                        similar_patients.append(patient)
                
                # Limit to top 3
                similar_patients = similar_patients[:3]
        
        finally:
            cursor.close()
            conn.close()
        
        if not similar_patients:
            return {
                "response": "No similar patients found with matching conditions to base recommendations on.",
                "supporting_evidence": {"patient_info": patient_info}
            }
        
        # Create context for LLM with patient info and similar patients
        context = {
            "patient": patient_info,
            "similar_patients": similar_patients
        }
        
        # Prepare supporting evidence for the return value
        supporting_evidence = {
            "patient_info": patient_info,
            "similar_patients": similar_patients
        }
        
        # Create a system prompt specifically for treatment recommendations
        system_prompt = """
        You are Iris, a clinical assistant for rehabilitation professionals. Provide concise, evidence-based 
        treatment recommendations based on outcomes from similar patients.
        
        Guidelines:
        - Focus only on recommending treatments, exercises, or approaches
        - Base recommendations directly on what worked for similar patients
        - Be specific about treatment types, frequencies, and expected outcomes
        - Do not list the similar patients - focus only on actionable recommendations
        - Be concise and direct
        """
        
        # Format the context
        formatted_context = self._format_context(context)
        
        # Create specific instructions for this query type with explicit formatting guidelines
        specific_instructions = """
        Based on the similar patients provided in the context, recommend specific treatments, 
        exercises, or therapeutic approaches for the main patient.
        
        Format your response as follows:
        1. First recommendation
        
        2. Second recommendation
        
        3. Third recommendation
        
        For each recommendation include:
        - The specific treatment or exercise name
        - Frequency or duration
        - Expected benefit based on similar patients' outcomes
        
        Be specific and practical. Do NOT list the similar patients - focus only on recommendations.
        Ensure proper spacing between numbered items with blank lines.
        """
        
        # Generate the prompt
        user_prompt = f"""Query: {query_text}

        Context Information:
        {formatted_context}

        Instructions:
        {specific_instructions}

        Provide concise, practical treatment recommendations based on what worked for similar patients.
        """
        
        # Generate the response
        raw_response = generate_llm_response(system_prompt, user_prompt)
        
        # If no response was generated, create a fallback
        if not raw_response:
            response = "Based on similar patients with the same condition, the following treatments have shown positive outcomes:\n\n"
            
            for i, patient in enumerate(similar_patients, 1):
                treatment = patient.get('current_treatment', '')
                outcomes = patient.get('treatment_outcomes', '')
                
                if treatment and outcomes and 'effective' in outcomes.lower():
                    response += f"{i}. {treatment} - This approach has shown {outcomes.lower()}\n\n"
            
            return {
                "response": response,
                "supporting_evidence": supporting_evidence
            }
        
        # Post-process the response to fix formatting issues
        # 1. Look for consecutive numbers without proper line breaks
        import re
        
        # Fix numbered lists with regex
        # This pattern matches a number followed by a period, then text, then another number
        fixed_response = re.sub(
            r'(\d+\.\s+.+?)(\s*)(\d+\.)',
            r'\1\n\n\3',
            raw_response
        )
        
        # Also ensure we have double line breaks after each recommendation
        fixed_response = re.sub(
            r'(\d+\.\s+.+?)(\n)(?!\n)',
            r'\1\n\n',
            fixed_response
        )
        
        return {
            "response": fixed_response,
            "supporting_evidence": supporting_evidence
        }

    def _generate_template_response(self, query, patient_info, guidelines, exercises, similar_patients=None):
        """
        Generate a robust template-based response as fallback if LLM call fails
        Guarantees to return a response even with incomplete information
        """
        print("Generating template response")
        response_parts = []
    
        if patient_info and patient_info.get('name'):
            response_parts.append(f"Here's information about {patient_info.get('name')}, who has {patient_info.get('condition', 'an unknown condition')}. ")
        else:
            response_parts.append("I don't have specific information about that patient. ")
        
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
        """Add a new patient to the database with multiple vector embeddings"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create separate embeddings for different aspects
            history_embedding = self.model.encode(patient_data['medical_history'], normalize_embeddings=True).tolist()
            treatment_embedding = self.model.encode(patient_data['current_treatment'], normalize_embeddings=True).tolist()
            
            # Create demographics embedding
            demographics_text = f"Age {patient_data['age']} {patient_data.get('gender', 'Unknown')} {patient_data['condition']}"
            demographics_embedding = self.model.encode(demographics_text, normalize_embeddings=True).tolist()
            
            # Create outcomes embedding if available, otherwise use assessment
            outcomes_text = patient_data.get('treatment_outcomes', patient_data['assessment'])
            outcomes_embedding = self.model.encode(outcomes_text, normalize_embeddings=True).tolist()
            
            # Create combined embedding for backward compatibility
            combined_text = f"{patient_data['medical_history']} {patient_data['current_treatment']} {patient_data['progress_notes']} {patient_data['assessment']}"
            combined_embedding = self.model.encode(combined_text, normalize_embeddings=True).tolist()
            
            # Get the next available ID
            cursor.execute(f"SELECT MAX(id) FROM {self.PATIENT_TABLE}")
            max_id = cursor.fetchone()[0]
            new_id = 1 if max_id is None else max_id + 1
            
            # Insert into database with all embeddings
            cursor.execute(
                f"""
                INSERT INTO {self.PATIENT_TABLE} 
                (id, patient_id, name, age, gender, condition, medical_history, current_treatment, 
                progress_notes, assessment, adherence_rate, treatment_outcomes, 
                embedded_notes, embedded_history, embedded_treatment, embedded_demographics, embedded_outcomes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TO_VECTOR(?), TO_VECTOR(?), TO_VECTOR(?), TO_VECTOR(?), TO_VECTOR(?))
                """,
                (
                    new_id, 
                    patient_data["patient_id"], 
                    patient_data["name"], 
                    patient_data["age"],
                    patient_data.get("gender", "Unknown"),
                    patient_data["condition"], 
                    patient_data["medical_history"], 
                    patient_data["current_treatment"], 
                    patient_data["progress_notes"], 
                    patient_data["assessment"],
                    patient_data.get("adherence_rate", 0),
                    patient_data.get("treatment_outcomes", ""),
                    str(combined_embedding),
                    str(history_embedding),
                    str(treatment_embedding),
                    str(demographics_embedding),
                    str(outcomes_embedding)
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

    def find_similar_patients_iris_vector(self, patient_id, limit=3):
        """
        Use IRIS's native vector search capabilities to find similar patients
        without causing segmentation faults
        """
        conn = None
        cursor = None
        
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # First get the target patient's data and embeddings
            cursor.execute(
                f"""
                SELECT id, embedded_demographics, embedded_history, embedded_treatment, embedded_outcomes 
                FROM {self.PATIENT_TABLE} 
                WHERE id = ?
                """,
                (patient_id,)
            )
            
            target = cursor.fetchone()
            if not target:
                return {"error": "Patient not found", "similar_patients": []}
            
            # Use SQL to find similar patients based on vector dot product
            # IRIS's native vector functions handle the similarity calculation
            query = f"""
                SELECT TOP {limit} id, name, condition, age, gender, medical_history, 
                    current_treatment, assessment, treatment_outcomes,
                    VECTOR_DOT_PRODUCT(embedded_demographics, TO_VECTOR(?)) AS demographics_sim,
                    VECTOR_DOT_PRODUCT(embedded_history, TO_VECTOR(?)) AS history_sim,
                    VECTOR_DOT_PRODUCT(embedded_treatment, TO_VECTOR(?)) AS treatment_sim,
                    VECTOR_DOT_PRODUCT(embedded_outcomes, TO_VECTOR(?)) AS outcomes_sim
                FROM {self.PATIENT_TABLE}
                WHERE id != ?
                ORDER BY (
                    VECTOR_DOT_PRODUCT(embedded_demographics, TO_VECTOR(?)) * 0.3 +
                    VECTOR_DOT_PRODUCT(embedded_history, TO_VECTOR(?)) * 0.3 +
                    VECTOR_DOT_PRODUCT(embedded_treatment, TO_VECTOR(?)) * 0.2 +
                    VECTOR_DOT_PRODUCT(embedded_outcomes, TO_VECTOR(?)) * 0.2
                ) DESC
            """
            
            # Execute the query with the patient's embeddings as parameters
            # Pass each embedding twice due to the ORDER BY clause
            cursor.execute(query, [
                str(target[1]), str(target[2]), str(target[3]), str(target[4]), 
                patient_id,
                str(target[1]), str(target[2]), str(target[3]), str(target[4])
            ])
            
            # Process results
            similar_patients = []
            for row in cursor.fetchall():
                # Calculate combined similarity score
                demographics_sim = float(row[9]) if row[9] is not None else 0.0
                history_sim = float(row[10]) if row[10] is not None else 0.0
                treatment_sim = float(row[11]) if row[11] is not None else 0.0
                outcomes_sim = float(row[12]) if row[12] is not None else 0.0
                
                combined_score = (
                    demographics_sim * 0.3 + 
                    history_sim * 0.3 + 
                    treatment_sim * 0.2 + 
                    outcomes_sim * 0.2
                )
                
                # Map combined score to category
                if combined_score > 0.8:
                    category = "High"
                elif combined_score > 0.6:
                    category = "Medium"
                else:
                    category = "Low"
                
                similar_patients.append({
                    "id": row[0],
                    "name": row[1],
                    "condition": row[2],
                    "age": row[3],
                    "gender": row[4],
                    "medical_history": row[5],
                    "current_treatment": row[6],
                    "assessment": row[7],
                    "treatment_outcomes": row[8],
                    "similarity_score": category,
                    "raw_score": round(combined_score, 2)
                })
            
            return {"similar_patients": similar_patients}
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": str(e), "similar_patients": []}
        
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass

    def _calculate_cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity between two vectors using numpy"""
        try:
            import numpy as np
            a = np.array(vec1)
            b = np.array(vec2)
            
            # Check if vectors are non-zero
            norm_a = np.linalg.norm(a)
            norm_b = np.linalg.norm(b)
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
                
            return float(np.dot(a, b) / (norm_a * norm_b))
        except Exception as e:
            print(f"Error calculating cosine similarity: {e}")
            return 0.0

    def find_exercises_by_description(self, query_text, limit=5, condition=None):
        """
        Find exercises that semantically match the query description using vector search
        """
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create embedding for the query text
            query_embedding = self.model.encode(query_text, normalize_embeddings=True).tolist()
            
            # Update all exercise embeddings for consistency
            cursor.execute(f"SELECT id, exercise_name, description, benefits FROM {self.EXERCISES_TABLE}")
            all_exercises = cursor.fetchall()
            
            updated_count = 0
            for ex in all_exercises:
                ex_id = ex[0]
                    
                # Create consistent embeddings for each exercise
                combined_text = f"{ex[1]} {ex[2]} {ex[3]}"
                new_embedding = self.model.encode(combined_text, normalize_embeddings=True).tolist()
                
                # Update the embedding
                cursor.execute(
                    f"""
                    UPDATE {self.EXERCISES_TABLE}
                    SET embedded_text = TO_VECTOR(?)
                    WHERE id = ?
                    """,
                    (str(new_embedding), ex_id)
                )
                updated_count += 1
            
            if updated_count > 0:
                print(f"Updated embeddings for {updated_count} exercises to ensure consistent dimensions")
                conn.commit()
            
            # Build the SQL query with condition filter if provided
            if condition:
                cursor.execute(f"""
                    SELECT TOP ? id, exercise_name, description, benefits, contraindications, severity, condition,
                        VECTOR_DOT_PRODUCT(embedded_text, TO_VECTOR(?)) as relevance
                    FROM {self.EXERCISES_TABLE}
                    WHERE condition = ?
                    ORDER BY relevance DESC
                """, (limit, str(query_embedding), condition))
            else:
                cursor.execute(f"""
                    SELECT TOP ? id, exercise_name, description, benefits, contraindications, severity, condition,
                        VECTOR_DOT_PRODUCT(embedded_text, TO_VECTOR(?)) as relevance
                    FROM {self.EXERCISES_TABLE}
                    ORDER BY relevance DESC
                """, (limit, str(query_embedding)))
            
            exercises = []
            for row in cursor.fetchall():
                relevance_score = float(row[7])  # Convert to float explicitly
                exercises.append({
                    "id": row[0],
                    "exercise_name": row[1],
                    "description": row[2],
                    "benefits": row[3],
                    "contraindications": row[4],
                    "severity": row[5],
                    "condition": row[6],
                    "relevance": relevance_score
                })
            
            return {"exercises": exercises}
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": str(e)}, 500
        
        finally:
            cursor.close()
            conn.close()

    def find_similar_patients_simple(self, patient_id, limit=3):
        """
        A simplified version of finding similar patients that doesn't use SentenceTransformer at runtime
        """
        import numpy as np
        
        conn = None
        cursor = None
        
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Get the patient's data
            cursor.execute(
                f"SELECT id, name, condition, age, gender, medical_history, current_treatment, assessment, treatment_outcomes FROM {self.PATIENT_TABLE} WHERE id = ?",
                (patient_id,)
            )
            
            patient_row = cursor.fetchone()
            if not patient_row:
                return {"error": "Patient not found", "similar_patients": []}
                
            # Get patient's condition for a simple match
            patient_condition = patient_row[2]
            
            # Use f-string to insert the limit directly - not using parameter for TOP
            cursor.execute(
                f"""
                SELECT TOP {limit} id, name, condition, age, gender, medical_history, current_treatment, assessment, treatment_outcomes
                FROM {self.PATIENT_TABLE} 
                WHERE id != ? AND condition LIKE ?
                """,
                (patient_id, f"%{patient_condition}%")
            )
            
            similar_patients = []
            
            for row in cursor.fetchall():
                try:
                    # Calculate a simple text similarity based on condition
                    from difflib import SequenceMatcher
                    
                    def similarity(a, b):
                        return SequenceMatcher(None, a, b).ratio()
                    
                    # Calculate similarity based on condition
                    condition_similarity = similarity(patient_condition, row[2])
                    
                    # Map similarity score to category
                    similarity_category = "High" if condition_similarity > 0.8 else "Medium" if condition_similarity > 0.5 else "Low"
                    
                    similar_patients.append({
                        "id": row[0],
                        "name": row[1],
                        "condition": row[2],
                        "age": row[3],
                        "gender": row[4],
                        "medical_history": row[5],
                        "current_treatment": row[6],
                        "assessment": row[7],
                        "treatment_outcomes": row[8],
                        "similarity_score": similarity_category,
                        "raw_score": condition_similarity
                    })
                except Exception as e:
                    print(f"Error processing similarity row: {e}")
                    continue
            
            # Sort by similarity (highest first)
            similar_patients.sort(key=lambda x: x["raw_score"], reverse=True)
            
            return {"similar_patients": similar_patients}
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": str(e), "similar_patients": []}
        
        finally:
            # Make sure we clean up resources
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def cleanup(self):
        """Clean up resources to prevent leaks"""
        try:
            # Clear global model reference
            global _model
            if _model is not None:
                # Clear CUDA cache if using GPU
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                
                # Delete model reference
                _model = None
                print("Cleaned up SentenceTransformer resources")
        except Exception as e:
            print(f"Error during cleanup: {e}")