from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import json
import os
from dotenv import load_dotenv
from clinical_rag import ClinicalRAG

# Load environment variables from .env.local file if it exists
env_file_path = '.env.local'
if os.path.exists(env_file_path):
    load_dotenv(env_file_path)
else:
    # Try loading from .env if .env.local doesn't exist
    load_dotenv()

app = Flask(__name__)
CORS(app, 
     resources={r"/api/*": {"origins": "http://localhost:3000"}}, 
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"])

# Check for Groq API key in environment
if not os.environ.get("GROQ_API_KEY"):
    print("Warning: GROQ_API_KEY environment variable not set. LLM functionality will fall back to templates.")
    print("To use Groq's LLM, create a .env.local file with:")
    print("GROQ_API_KEY=your-api-key")

# Initialize the Clinical RAG pipeline
clinical_rag = ClinicalRAG()

@app.route('/api/initialize', methods=['POST'])
def initialize_database():
    """Initialize database tables for the clinical application"""
    try:
        conn = clinical_rag.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create schema if it doesn't exist
            cursor.execute(f"CREATE SCHEMA {clinical_rag.SCHEMA_NAME}")
        except Exception:
            # Schema might already exist
            pass
        
        try:
            # Drop existing tables if they exist
            cursor.execute(f"DROP TABLE {clinical_rag.PATIENT_TABLE}")
            cursor.execute(f"DROP TABLE {clinical_rag.GUIDELINES_TABLE}")
            cursor.execute(f"DROP TABLE {clinical_rag.EXERCISES_TABLE}")
        except Exception:
            # Tables might not exist yet
            pass
        
        # Create patient data table with vector embeddings
        cursor.execute(f"""
            CREATE TABLE {clinical_rag.PATIENT_TABLE} (
                id INTEGER PRIMARY KEY,
                patient_id VARCHAR(50),
                name VARCHAR(100),
                age INTEGER,
                condition VARCHAR(100),
                medical_history VARCHAR(1000),
                current_treatment VARCHAR(1000),
                progress_notes VARCHAR(2000),
                assessment VARCHAR(2000),
                embedded_notes VECTOR(DOUBLE, 384)
            )
        """)
        
        # Create clinical guidelines table with vector embeddings
        cursor.execute(f"""
            CREATE TABLE {clinical_rag.GUIDELINES_TABLE} (
                id INTEGER PRIMARY KEY,
                condition VARCHAR(100),
                guideline_text VARCHAR(2000),
                source VARCHAR(200),
                embedded_text VECTOR(DOUBLE, 384)
            )
        """)
        
        # Create exercise recommendations table with vector embeddings
        cursor.execute(f"""
            CREATE TABLE {clinical_rag.EXERCISES_TABLE} (
                id INTEGER PRIMARY KEY,
                condition VARCHAR(100),
                severity VARCHAR(50),
                exercise_name VARCHAR(100),
                description VARCHAR(1000),
                benefits VARCHAR(1000),
                contraindications VARCHAR(500),
                embedded_text VECTOR(DOUBLE, 384)
            )
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Database initialized successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/seed_data', methods=['POST'])
def seed_sample_data():
    """Seed the database with sample clinical data"""
    try:
        # Sample patient data
        patients = [
            {
                "id": 1,
                "patient_id": "P001",
                "name": "John Doe",
                "age": 65,
                "condition": "Parkinson's Disease",
                "medical_history": "Diagnosed with Parkinson's 3 years ago. History of hypertension.",
                "current_treatment": "Levodopa 100mg TID, Physical therapy twice weekly",
                "progress_notes": "Patient shows improvement in fine motor control after 4 weeks of hand exercises. Tremor reduced by approximately 30%. Still having difficulty with balance during walking exercises.",
                "assessment": "Moderate improvement in motor symptoms. Gait still unstable. Recommend continuing with current exercise regimen and adding additional balance exercises."
            },
            {
                "id": 2,
                "patient_id": "P002",
                "name": "Jane Smith",
                "age": 58,
                "condition": "Rheumatoid Arthritis",
                "medical_history": "RA diagnosed 5 years ago. Joint deformities in hands. Previous knee replacement.",
                "current_treatment": "Methotrexate weekly, Low-impact exercises daily",
                "progress_notes": "Patient reports reduced pain following consistent exercise program. Range of motion in wrists improved by 15 degrees. Still experiencing morning stiffness lasting approximately 45 minutes.",
                "assessment": "Good adherence to exercise program with notable improvements. Consider adding gentle resistance training to build muscle around affected joints."
            },
            {
                "id": 3,
                "patient_id": "P003",
                "name": "Bob Johnson",
                "age": 70,
                "condition": "Parkinson's Disease",
                "medical_history": "Diagnosed with Parkinson's 7 years ago. Advanced stage with significant tremor and rigidity.",
                "current_treatment": "Carbidopa-levodopa 25-100mg QID, Deep brain stimulation (DBS) 6 months ago",
                "progress_notes": "Since DBS placement, patient shows 60% reduction in tremor. Exercise tolerance has improved significantly. Now able to complete full 30-minute therapy sessions without excessive fatigue.",
                "assessment": "Excellent response to DBS with significant improvement in motor symptoms. Continue with current exercise program focusing on balance and coordination."
            },
            {
                "id": 4,
                "patient_id": "P004",
                "name": "Alice Brown",
                "age": 50,
                "condition": "Rheumatoid Arthritis",
                "medical_history": "RA diagnosed 2 years ago. Early intervention with biologics. No significant joint deformities.",
                "current_treatment": "Adalimumab biweekly, Daily range-of-motion exercises, Pool therapy twice weekly",
                "progress_notes": "Patient maintains excellent compliance with exercise regimen. Reports minimal morning stiffness (15 minutes or less). Pain levels consistently 2/10 or lower.",
                "assessment": "Disease well-controlled with current regimen. Recommend maintaining current exercise program with gradual increase in resistance training as tolerated."
            },
            {
                "id": 5,
                "patient_id": "P005",
                "name": "Charlie Davis",
                "age": 45,
                "condition": "Parkinson's Disease",
                "medical_history": "Early-onset Parkinson's, diagnosed 1 year ago at age 42. Family history positive.",
                "current_treatment": "Ropinirole 2mg TID, LSVT BIG therapy program, High-intensity interval training 3x weekly",
                "progress_notes": "Excellent response to LSVT BIG program with significant improvement in stride length and arm swing. Voice volume improved with concurrent LSVT LOUD therapy. Maintaining full-time employment.",
                "assessment": "Excellent progress with aggressive early intervention. Continue current exercise regimen with emphasis on maintaining intensity. Consider adding cognitive training exercises."
            }
        ]
        
        # Clinical guidelines
        guidelines = [
            {
                "id": 1,
                "condition": "Parkinson's Disease",
                "guideline_text": "Regular physical exercise can help improve motor symptoms in Parkinson's disease. Focus on exercises that improve balance, flexibility, and strength. Tai chi and dance therapy have shown benefits for balance and mobility. Recommend 150 minutes of moderate exercise per week, divided into 30-minute sessions.",
                "source": "American Academy of Neurology Practice Guidelines, 2023"
            },
            {
                "id": 2,
                "condition": "Rheumatoid Arthritis",
                "guideline_text": "Low-impact aerobic exercises and resistance training are beneficial for patients with RA. Water exercises can reduce joint stress while improving cardiovascular fitness. Avoid high-impact activities during disease flares. Range-of-motion exercises should be performed daily, even during flares, to maintain joint flexibility.",
                "source": "American College of Rheumatology Guidelines, 2023"
            },
            {
                "id": 3,
                "condition": "Parkinson's Disease",
                "guideline_text": "LSVT BIG therapy has demonstrated effectiveness for improving movement amplitude in Parkinson's disease. The program involves high-amplitude, high-effort exercises performed with intensive training (4 days/week for 4 weeks). Continued practice of learned exercises is essential for maintaining benefits.",
                "source": "Movement Disorders Society Recommendations, 2023"
            },
            {
                "id": 4,
                "condition": "Parkinson's Disease",
                "guideline_text": "Cognitive exercise combined with physical exercise may provide additional benefits for patients with Parkinson's disease. Dual-task training (performing cognitive and motor tasks simultaneously) can improve both mobility and cognitive function. Start with simple combinations and progressively increase difficulty.",
                "source": "International Parkinson and Movement Disorder Society, 2024"
            },
            {
                "id": 5,
                "condition": "Rheumatoid Arthritis",
                "guideline_text": "Hand exercises are crucial for maintaining function in RA patients with hand involvement. Regular gentle squeezing of a soft ball, finger walking, and wrist rotations can help preserve grip strength and dexterity. Hand exercises should be performed daily, with 5-10 repetitions of each exercise, as tolerated.",
                "source": "European League Against Rheumatism (EULAR) Recommendations, 2023"
            }
        ]
        
        # Exercise recommendations
        exercises = [
            {
                "id": 1,
                "condition": "Parkinson's Disease",
                "severity": "Moderate",
                "exercise_name": "Seated Marching",
                "description": "While seated in a chair with good posture, lift knees alternatively as if marching in place. Aim for 20-30 repetitions per leg, 2-3 sets daily.",
                "benefits": "Improves lower limb strength, enhances rhythmic movement patterns, and prepares for walking activities. Can help reduce freezing of gait.",
                "contraindications": "Not recommended for patients with severe postural instability without support."
            },
            {
                "id": 2,
                "condition": "Parkinson's Disease",
                "severity": "Mild to Moderate",
                "exercise_name": "Hand Grip Exercises",
                "description": "Using a soft stress ball or therapy putty, practice squeezing and releasing with each hand. Hold squeeze for 5 seconds, release, and repeat 10-15 times per hand, 3 sets daily.",
                "benefits": "Improves hand strength and dexterity, reduces tremor, and enhances fine motor control needed for daily activities.",
                "contraindications": "Modify pressure for patients with hand joint pain or very limited hand strength."
            },
            {
                "id": 3,
                "condition": "Rheumatoid Arthritis",
                "severity": "Mild to Moderate",
                "exercise_name": "Gentle Wrist Stretches",
                "description": "Extend arm with palm facing down, use opposite hand to gently press hand downward. Hold 15-20 seconds. Then turn palm up and gently press downward. Repeat 3-5 times per wrist, twice daily.",
                "benefits": "Maintains wrist flexibility, reduces stiffness, and improves range of motion for daily activities like writing and typing.",
                "contraindications": "Should not cause pain. Avoid during acute flares with significant wrist inflammation."
            },
            {
                "id": 4,
                "condition": "Parkinson's Disease",
                "severity": "All Levels",
                "exercise_name": "Tai Chi",
                "description": "Slow, flowing movements with emphasis on weight shifting and controlled movement. Practice in 20-30 minute sessions, 2-3 times weekly, preferably with an instructor experienced in neurological conditions.",
                "benefits": "Improves balance, reduces fall risk, and enhances postural stability. Also provides cognitive benefits through learning movement sequences.",
                "contraindications": "Adapt movements for those with significant balance impairment; may need to begin with seated versions."
            },
            {
                "id": 5,
                "condition": "Rheumatoid Arthritis",
                "severity": "Moderate",
                "exercise_name": "Aquatic Therapy",
                "description": "Exercises performed in warm water (92-96°F/33-35°C). Include walking forwards/backwards, gentle arm circles, and leg kicks. Sessions of 30-45 minutes, 2-3 times weekly.",
                "benefits": "Water buoyancy reduces joint stress while providing resistance. Warm water helps reduce pain and stiffness. Improves cardiovascular fitness with minimal joint impact.",
                "contraindications": "Open wounds, fear of water, severe heart conditions that contraindicate warm water immersion."
            },
            {
                "id": 6,
                "condition": "Parkinson's Disease",
                "severity": "Moderate to Advanced",
                "exercise_name": "LSVT BIG Walking Program",
                "description": "Exaggerated walking with large steps and arm swings. Focus on heel strike, full extension of legs, and large arm movements. Practice 20-30 minutes daily after completing formal LSVT BIG program.",
                "benefits": "Improves stride length, arm swing, and overall mobility. Helps counteract the shuffling gait pattern typical in Parkinson's disease.",
                "contraindications": "Should be adapted for patients with freezing of gait or significant balance impairment."
            },
            {
                "id": 7,
                "condition": "Rheumatoid Arthritis",
                "severity": "Mild to Moderate",
                "exercise_name": "Resistance Band Hand Exercises",
                "description": "Using a light resistance band, practice opening hands against resistance by placing band around fingers and extending fingers outward. Perform 10-15 repetitions, 2 sets daily.",
                "benefits": "Strengthens finger extensors which are often weak in RA, improves hand opening function for gripping activities.",
                "contraindications": "Avoid during acute flares. Start with very light resistance and progress gradually."
            },
            {
                "id": 8,
                "condition": "Parkinson's Disease",
                "severity": "Mild to Moderate",
                "exercise_name": "Boxing Training",
                "description": "Modified boxing exercises focusing on punching movements, footwork, and agility drills. Sessions should last 45-60 minutes, 2-3 times weekly, with proper supervision.",
                "benefits": "Improves coordination, balance, mobility, and can help reduce bradykinesia. Also provides cardiovascular conditioning and may help reduce depression.",
                "contraindications": "Modify intensity for those with cardiovascular concerns or severe postural instability."
            },
            {
                "id": 9,
                "condition": "Parkinson's Disease",
                "severity": "All Levels",
                "exercise_name": "Chair Yoga",
                "description": "Modified yoga poses performed while seated or using a chair for support. Focus on breathing, stretching, and gentle twisting movements. Practice for 20-30 minutes, 3-5 times weekly.",
                "benefits": "Improves flexibility, reduces rigidity, enhances breathing capacity, and helps manage stress and anxiety.",
                "contraindications": "Avoid excessive neck extension or flexion. Modify twisting poses for those with osteoporosis."
            },
            {
                "id": 10,
                "condition": "Parkinson's Disease",
                "severity": "Mild to Moderate",
                "exercise_name": "Facial Exercises",
                "description": "Exaggerated facial movements including smiling widely, puckering lips, raising eyebrows, and blowing air through pursed lips. Perform 5-10 repetitions of each exercise, 2-3 times daily.",
                "benefits": "Helps maintain facial expressivity, improves speech clarity, and may help with swallowing function.",
                "contraindications": "None significant; suitable for most patients."
            },
            {
                "id": 11,
                "condition": "Parkinson's Disease",
                "severity": "Moderate",
                "exercise_name": "Rhythmic Auditory Stimulation Walking",
                "description": "Walking to a rhythmic beat provided by metronome, music, or other auditory cues. Practice for 15-20 minutes daily, gradually increasing speed as tolerated.",
                "benefits": "Improves gait cadence, stride length, and walking speed. The external rhythm helps overcome freezing of gait episodes.",
                "contraindications": "Ensure proper supervision if balance is severely compromised."
            },
            {
                "id": 12,
                "condition": "Rheumatoid Arthritis",
                "severity": "Mild to Moderate",
                "exercise_name": "Finger Walking",
                "description": "Place hand palm down on a flat surface. Slowly 'walk' fingers forward and then backward, like a spider. Repeat 5-10 times per hand, twice daily.",
                "benefits": "Improves individual finger mobility and dexterity. Helps maintain fine motor skills needed for daily activities.",
                "contraindications": "Stop if causing significant pain. Modify range of movement during flares."
            },
            {
                "id": 13,
                "condition": "Rheumatoid Arthritis",
                "severity": "All Levels",
                "exercise_name": "Stationary Cycling",
                "description": "Low-resistance cycling on a stationary bike with proper seat height. Begin with 5-10 minutes and gradually increase to 20-30 minutes, 3-5 times weekly.",
                "benefits": "Provides low-impact cardiovascular exercise while minimizing stress on weight-bearing joints. Improves knee range of motion and overall endurance.",
                "contraindications": "Adjust seat height and handlebar position to avoid wrist strain. Not recommended during acute knee flares."
            },
            {
                "id": 14,
                "condition": "Rheumatoid Arthritis",
                "severity": "Moderate",
                "exercise_name": "Standing Wall Slides",
                "description": "Stand with back against wall, feet shoulder-width apart. Slowly slide down wall to a comfortable partial squat position, hold for 5-10 seconds, then slide back up. Repeat 5-10 times, once daily.",
                "benefits": "Strengthens lower body muscles that support knee and hip joints while providing back support.",
                "contraindications": "Avoid during acute knee or hip flares. Do not slide lower than comfortable."
            },
            {
                "id": 15,
                "condition": "Rheumatoid Arthritis",
                "severity": "Mild to Moderate",
                "exercise_name": "Neck Mobility Exercises",
                "description": "Gentle neck movements including looking left and right, up and down, and ear-to-shoulder tilts. Hold each position 5-10 seconds, 5 repetitions each direction, twice daily.",
                "benefits": "Maintains neck mobility and reduces stiffness in cervical spine. Can help reduce tension headaches associated with RA.",
                "contraindications": "Perform slowly and gently. Avoid during acute cervical spine inflammation."
            }
        ]
        
        conn = clinical_rag.get_db_connection()
        cursor = conn.cursor()
        
        # Insert patients
        for patient in patients:
            combined_text = f"{patient['medical_history']} {patient['current_treatment']} {patient['progress_notes']} {patient['assessment']}"
            embedding = clinical_rag.model.encode(combined_text, normalize_embeddings=True).tolist()
            
            cursor.execute(
                f"INSERT INTO {clinical_rag.PATIENT_TABLE} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TO_VECTOR(?))",
                (
                    patient["id"], 
                    patient["patient_id"], 
                    patient["name"], 
                    patient["age"],
                    patient["condition"], 
                    patient["medical_history"], 
                    patient["current_treatment"], 
                    patient["progress_notes"], 
                    patient["assessment"],
                    str(embedding)
                )
            )
        
        # Insert guidelines
        for guideline in guidelines:
            embedding = clinical_rag.model.encode(guideline["guideline_text"], normalize_embeddings=True).tolist()
            
            cursor.execute(
                f"INSERT INTO {clinical_rag.GUIDELINES_TABLE} VALUES (?, ?, ?, ?, TO_VECTOR(?))",
                (
                    guideline["id"],
                    guideline["condition"],
                    guideline["guideline_text"],
                    guideline["source"],
                    str(embedding)
                )
            )
        
        # Insert exercises
        for exercise in exercises:
            combined_text = f"{exercise['exercise_name']} {exercise['description']} {exercise['benefits']}"
            embedding = clinical_rag.model.encode(combined_text, normalize_embeddings=True).tolist()
            
            cursor.execute(
                f"INSERT INTO {clinical_rag.EXERCISES_TABLE} VALUES (?, ?, ?, ?, ?, ?, ?, TO_VECTOR(?))",
                (
                    exercise["id"],
                    exercise["condition"],
                    exercise["severity"],
                    exercise["exercise_name"],
                    exercise["description"],
                    exercise["benefits"],
                    exercise["contraindications"],
                    str(embedding)
                )
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Sample data seeded successfully", 
            "patients_added": len(patients),
            "guidelines_added": len(guidelines),
            "exercises_added": len(exercises)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/patients', methods=['GET'])
def get_patients():
    """Get a list of all patients"""
    try:
        conn = clinical_rag.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            f"SELECT * FROM {clinical_rag.PATIENT_TABLE}"
        )
        
        patients = []
        for row in cursor.fetchall():
            patients.append({
                "id": row[0],
                "patient_id": row[1],
                "name": row[2],
                "age": row[3],
                "condition": row[4],
                "medical_history": row[5],
                "current_treatment": row[6],
                "progress_notes": row[7],
                "assessment": row[8]
            })
        
        cursor.close()
        conn.close()
        
        response = jsonify({"patients": patients})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/patients/count', methods=['GET'])
def get_patient_count():
    """Get the total count of patients in the database"""
    try:
        conn = clinical_rag.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            f"SELECT COUNT(*) FROM {clinical_rag.PATIENT_TABLE}"
        )
        
        count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({"patient_count": count})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/patient/<int:patient_id>', methods=['GET'])
def get_patient_details(patient_id):
    """Get detailed information about a specific patient"""
    try:
        conn = clinical_rag.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            f"SELECT * FROM {clinical_rag.PATIENT_TABLE} WHERE id = ?",
            (patient_id,)
        )
        
        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            return jsonify({"error": "Patient not found"}), 404
        
        patient = {
            "id": row[0],
            "patient_id": row[1],
            "name": row[2],
            "condition": row[3],
            "medical_history": row[4],
            "current_treatment": row[5],
            "progress_notes": row[6],
            "assessment": row[7]
        }
        
        # Get relevant exercises for this patient's condition
        cursor.execute(
            f"""
            SELECT exercise_name, description, benefits
            FROM {clinical_rag.EXERCISES_TABLE}
            WHERE condition = ?
            LIMIT 3
            """,
            (patient["condition"],)
        )
        
        exercises = []
        for row in cursor.fetchall():
            exercises.append({
                "name": row[0],
                "description": row[1],
                "benefits": row[2]
            })
        
        patient["recommended_exercises"] = exercises
        
        cursor.close()
        conn.close()
        
        return jsonify({"patient": patient})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/patient', methods=['POST'])
def add_patient():
    """Add a new patient to the database"""
    try:
        data = request.json

        # Validate required fields
        required_fields = ["patient_id", "name", "age", "condition", "medical_history", 
                          "current_treatment", "progress_notes", "assessment"]
        
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Add patient using RAG service
        result = clinical_rag.add_patient(data)
        
        return jsonify(result), 201
    
    except Exception as e:
        print(f"Error in add_patient route: {str(e)}")
        print("Request data:")
        print(request.json)
        return jsonify({"error": str(e)}), 500

@app.route('/api/patient/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    """Delete a patient from the database"""
    try:
        # Delete patient using RAG service
        result = clinical_rag.delete_patient(patient_id)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/patient/<int:patient_id>', methods=['PUT'])
def update_patient_progress(patient_id):
    """Update a patient's progress notes and assessment"""
    try:
        data = request.json
        
        # Validate required fields
        if "progress_notes" not in data or "assessment" not in data:
            return jsonify({"error": "Missing required fields: progress_notes and assessment"}), 400
        
        # Update patient using RAG service
        result = clinical_rag.update_progress_notes(
            patient_id,
            data["progress_notes"],
            data["assessment"]
        )
        
        if result.get("status") == "error":
            return jsonify(result), 404
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/exercises', methods=['GET'])
def get_exercises():
    """Get exercise recommendations, optionally filtered by condition"""
    try:
        condition = request.args.get('condition')
        
        conn = clinical_rag.get_db_connection()
        cursor = conn.cursor()
        
        query = f"SELECT * FROM {clinical_rag.EXERCISES_TABLE}"
        params = []
        
        if condition:
            query += " WHERE condition = ?"
            params.append(condition)
        
        cursor.execute(query, params)
        
        exercises = []
        for row in cursor.fetchall():
            exercises.append({
                "id": row[0],
                "condition": row[1],
                "severity": row[2],
                "name": row[3],
                "description": row[4],
                "benefits": row[5],
                "contraindications": row[6]
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({"exercises": exercises})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/exercises', methods=['POST'])
def add_exercise():
    """Add a new exercise recommendation"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["condition", "severity", "exercise_name", "description", 
                          "benefits", "contraindications"]
        
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Add exercise using RAG service
        result = clinical_rag.add_exercise(data)
        
        return jsonify(result), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/guidelines', methods=['GET'])
def get_guidelines():
    """Get clinical guidelines, optionally filtered by condition"""
    try:
        condition = request.args.get('condition')
        
        conn = clinical_rag.get_db_connection()
        cursor = conn.cursor()
        
        query = f"SELECT * FROM {clinical_rag.GUIDELINES_TABLE}"
        params = []
        
        if condition:
            query += " WHERE condition = ?"
            params.append(condition)
        
        cursor.execute(query, params)
        
        guidelines = []
        for row in cursor.fetchall():
            guidelines.append({
                "id": row[0],
                "condition": row[1],
                "guideline_text": row[2],
                "source": row[3]
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({"guidelines": guidelines})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/guidelines', methods=['POST'])
def add_guideline():
    """Add a new clinical guideline"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["condition", "guideline_text", "source"]
        
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Add guideline using RAG service
        result = clinical_rag.add_clinical_guideline(data)
        
        return jsonify(result), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/patients', methods=['GET'])
def debug_patients():
    """Debug endpoint to list all patients"""
    try:
        conn = clinical_rag.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT id, name, condition FROM {clinical_rag.PATIENT_TABLE}")
        
        patients = []
        for row in cursor.fetchall():
            patients.append({
                "id": row[0],
                "name": row[1],
                "condition": row[2]
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({"patients": patients})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
def chat():
    """Process a clinician's query using the RAG pipeline with robust error handling"""
    try:
        print("\n==== Starting Chat Request Processing ====")
        data = request.json
        query = data.get('query')
        patient_id = data.get('patient_id')
        condition = data.get('condition')
        
        print(f"Query: {query}")
        print(f"Patient ID: {patient_id}")
        print(f"Condition: {condition}")
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        # Process the query through the RAG pipeline
        result = clinical_rag.process_query(query, patient_id, condition)
        
        # Check if we got a valid result
        if not result or "response" not in result:
            print("⚠️ Invalid result returned from process_query")
            # Generate a fallback response
            response = "I apologize, but I encountered an issue processing your query. Please try again or rephrase your question."
            return jsonify({"response": response, "supporting_evidence": None})
        
        # Log the supporting evidence for debugging
        if result.get("supporting_evidence") and result["supporting_evidence"].get("patient_info"):
            print(f"✅ Found patient info: {result['supporting_evidence']['patient_info'].get('name', 'Unknown')}")
        else:
            print("⚠️ No patient info found in result")
        
        print("==== Completed Chat Request Processing ====\n")
        return jsonify(result)
    
    except Exception as e:
        print(f"❌ Error in chat route: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return a friendly error message
        return jsonify({
            "response": "I apologize, but I encountered an error processing your request. Our technical team has been notified. In the meantime, please try rephrasing your question.",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5011)