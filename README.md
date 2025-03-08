# HealthHack 2025 Clinician Portal

## Overview
The **Dexterity Dash Clinician Portal** is a comprehensive web-app designed for healthcare professionals working with patients suffering from Parkinson's disease and Rheumatoid Arthritis. The platform leverages AI to assist clinicians in managing rehabilitation exercises, tracking patient progress, and providing evidence-based recommendations.

<br>

### Key Features
- **AI-Powered Assistant**: Built-in clinical assistant "Iris" that responds to queries about patient data, exercises, and treatment guidelines
- **Patient Management**: Track patient information, treatment plans, and progress
- **Exercise Library**: Access condition-specific exercise recommendations
- **Clinical Guidelines**: Evidence-based rehabilitation guidelines
- **Progress Tracking**: Monitor patient adherence and improvements over time
- **Authentication**: Secure user authentication and role management

<br>

## Architecture
The application follows a modern web architecture with:
- **Frontend**: Next.js-based single-page application
- **Backend**: Flask-based API server with an AI-powered RAG (Retrieval Augmented Generation) system
- **Database**: IRIS database for patient data and clinical information
- **Authentication**: Auth0 integration
- **User Data**: Firebase for user metadata storage
- **LLM Integration**: Groq API for large language model capabilities

<br>

## Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher) or **yarn** (v1.22.x or higher)
- **Python** (v3.9 or higher)
- **pip** (latest version)
- **InterSystems IRIS** (for database)
- A **Firebase** account with a project created
- An **Auth0** account and application
- A **Groq** API key

<br>

## Installation
1. Clone the repository:
```sh
git clone git@github.com:shawnnygoh/healthhack-clinician-portal.git
```

2. Navigate to the project directory:
```sh
cd healthhack-clinician-portal
```

<br>

### Setting up the Frontend
1. From the root project directory, navigate to the frontend directory:
```sh
cd frontend
```

2. Install dependencies:
```sh
npm install
# or
yarn install
```

3. Create a `.env.local` file in the frontend directory with the following variables:
```
# Auth0 Configuration
AUTH0_SECRET='your-auth0-secret'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY='your-firebase-api-key'
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN='your-project.firebaseapp.com'
NEXT_PUBLIC_FIREBASE_PROJECT_ID='your-project-id'
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET='your-project.appspot.com'
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID='your-messaging-sender-id'
NEXT_PUBLIC_FIREBASE_APP_ID='your-app-id'

# For Firebase Admin SDK
FIREBASE_PROJECT_ID='your-project-id'
FIREBASE_CLIENT_EMAIL='your-client-email'
FIREBASE_PRIVATE_KEY='your-private-key'
```

4. Run the development server:
```sh
npm run dev
# or
yarn dev
```

5. Access the frontend at http://localhost:3000

<br>

### Setting up InterSystems IRIS with Docker
1. Run the IRIS Community Edition container:
```sh
docker run -d --name iris-comm -p 1972:1972 -p 52773:52773 -e IRIS_PASSWORD=demo -e IRIS_USERNAME=demo intersystemsdc/iris-community:latest
```

2. Verify the container is running:
```sh
docker ps
```

3. The IRIS container is now running and accessible on:
   - Port 1972 (IRIS Superserver)
   - Port 52773 (IRIS Web Portal - http://localhost:52773/csp/sys/UtilHome.csp)
   - Default credentials: Username: `demo`, Password: `demo`

<br>

### Setting up the Backend
1. Navigate to the backend directory:
```sh
cd backend
```

2. Create a Python virtual environment:
```sh
python -m venv venv
```

3. Activate the virtual environment:
```sh
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

4. Install dependencies:
```sh
pip install -r requirements.txt
```

5. Install IRIS Python package:
```sh
# On macOS/Linux
pip install ../install/intersystems_irispython-5.0.1-8026-cp38.cp39.cp310.cp311.cp312-cp38.cp39.cp310.cp311.cp312-macosx_10_9_universal2.whl

# On Windows AMD64:
pip install ../install/intersystems_irispython-5.0.1-8026-cp38.cp39.cp310.cp311.cp312-cp38.cp39.cp310.cp311.cp312-win_amd64.whl

# On Windows 32:
pip install ../install/intersystems_irispython-5.0.1-8026-cp38.cp39.cp310.cp311.cp312-cp38.cp39.cp310.cp311.cp312-win32.whl

# On Linux aarch64:
pip install ../install/intersystems_irispython-5.0.1-8026-cp38.cp39.cp310.cp311.cp312-cp38.cp39.cp310.cp311.cp312-manylinux_2_17_aarch64.manylinux2014_aarch64.whl

# On Linux x86_64:
pip install ../install/intersystems_irispython-5.0.1-8026-cp38.cp39.cp310.cp311.cp312-cp38.cp39.cp310.cp311.cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl
```

6. Create a `.env.local` file in the backend directory with the following variables:
```
# IRIS Database Connection
IRIS_HOSTNAME='localhost'
IRIS_USERNAME='demo'
IRIS_PASSWORD='demo'

# Groq API for LLM
GROQ_API_KEY='your-groq-api-key'
```

7. Run the backend server:
```sh
python app.py
```

8. The backend API will be available at http://localhost:5011

<br>

### Setting up the Database
1. Ensure you have InterSystems IRIS installed and running
2. The backend will automatically initialize the database schema and tables
3. To initialize the database with sample data, make a POST request to:
```sh
curl -X POST http://localhost:5011/api/initialize
```

4. To seed the database with sample data, make a POST request to:
```sh
curl -X POST http://localhost:5011/api/seed_data
```

5. To add more exercises to the database, make a POST request to:
```sh
curl -X POST http://localhost:5011/api/exercises \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "Parkinson'\''s Disease",
    "severity": "Mild",
    "exercise_name": "Finger Tapping",
    "description": "Tap each finger to the thumb in sequence, moving from index to pinky and back. Perform 10 complete sequences per hand, 3 sets daily.",
    "benefits": "Improves fine motor control and finger dexterity. Helps maintain independence with tasks requiring finger precision.",
    "contraindications": "None, but modify speed and pressure for comfort."
  }'
```

<br>

## API Documentation

### Authentication Endpoints
- `GET/POST /api/auth/[auth0]/*` - Auth0 authentication routes
- `GET /api/auth/refresh` - Refresh user data from Auth0
- `GET /api/user` - Get current user data
- `PATCH /api/user` - Update user data

### Database Initialization
- `POST /api/initialize` - Initialize database tables
- `POST /api/seed_data` - Seed the database with sample clinical data

### Patient Management
- `GET /api/patients` - Get a list of all patients
- `GET /api/patient/:id` - Get detailed information about a specific patient
- `POST /api/patient` - Add a new patient
- `PUT /api/patient/:id` - Update a patient's progress notes and assessment

### Clinical Resources
- `GET /api/exercises` - Get exercise recommendations (can filter by condition)
- `POST /api/exercises` - Add a new exercise recommendation
- `GET /api/guidelines` - Get clinical guidelines (can filter by condition)
- `POST /api/guidelines` - Add a new clinical guideline

### AI Assistant
- `POST /api/chat` - Process a clinician's query using the RAG pipeline
  - Request body should include:
    - `query`: The clinician's question
    - `patient_id`: (Optional) Specific patient context
    - `condition`: (Optional) Specific condition context

<br>

## Project Structure
```
healthhack-clinician-portal/
├── backend/                  # Flask backend
│   ├── app.py               # Main application entry point
│   ├── clinical_rag.py      # RAG system for clinical data
│   ├── direct_groq.py       # Groq LLM integration
│   └── requirements.txt     # Python dependencies
└── frontend/                # Next.js frontend
    ├── public/              # Static assets
    ├── src/                 # Source code
    │   ├── app/             # Next.js app router
    │   ├── components/      # React components
    │   ├── context/         # React context providers
    │   ├── hooks/           # Custom React hooks
    │   ├── lib/             # Utility functions and services
    │   └── types/           # TypeScript type definitions
    ├── .env.local           # Environment variables (create this)
    ├── next.config.ts       # Next.js configuration
    ├── package.json         # Node.js dependencies
    └── tailwind.config.ts   # Tailwind CSS configuration
```

<br>

## Using the AI Clinical Assistant
The application includes an AI-powered clinical assistant called "Iris." To interact with it:

1. Navigate to any page in the application
2. Click on the AI chat widget at the bottom right corner
3. Ask questions about patient data, exercises, or guidelines
4. You can focus on specific patients and their treatment plans

Examples of queries:
- "What exercises are recommended for Parkinson's patients with hand tremors?"
- "What are the latest guidelines for physical therapy in rheumatoid arthritis?"
- "What's the progress of patient John Doe?"
- "Generate a treatment plan for a patient with moderate Parkinson's"

<br>

## Development Notes

### Environment
- The frontend runs on port 3000
- The backend runs on port 5011
- Make sure to configure CORS in production environments

### Authentication
- The application uses Auth0 for authentication
- The middleware.ts file protects routes from unauthenticated access
- Configure your Auth0 application with appropriate callback URLs

### Database
- The application uses InterSystems IRIS database for storing clinical data
- The database schema is created in the `initialize` endpoint
- Vector embeddings are used for semantic search capabilities in the RAG system

<br>

## Troubleshooting

### Common Issues
1. **Connection to backend fails**
   - Ensure the backend is running on port 5011
   - Check for CORS issues in browser console

2. **Authentication problems**
   - Verify Auth0 configuration in .env.local
   - Check Auth0 callback URLs are properly set

3. **LLM responses not working**
   - Ensure GROQ_API_KEY is set correctly
   - Check the backend logs for API errors

4. **Database errors**
   - Verify IRIS is running and accessible
   - Check database credentials in .env.local