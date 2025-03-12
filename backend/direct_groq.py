import os
from dotenv import load_dotenv

# Load environment variables from .env.local file if it exists
env_file_path = '.env.local'
if os.path.exists(env_file_path):
    print(f"Found .env.local file, loading environment variables")
    load_dotenv(env_file_path)
else:
    # Try loading from .env if .env.local doesn't exist
    print(".env.local file not found, trying .env")
    load_dotenv()

def get_groq_client():
    """Get a Groq client without using additional parameters that might cause issues"""
    try:
        # Import here to handle import errors gracefully
        from groq import Groq
        
        # Check if GROQ_API_KEY is set
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            print("❌ GROQ_API_KEY environment variable is not set")
            return None
            
        # Create client with minimal parameters
        client = Groq(api_key=api_key)
        print("✅ Groq client initialized successfully!")
        return client
    except Exception as e:
        print(f"❌ Error initializing Groq client: {e}")
        import traceback
        print(traceback.format_exc())
        return None

def generate_llm_response(system_prompt, user_prompt):
    """Generate a response using the Groq API with improved debugging"""
    client = get_groq_client()
    if not client:
        print("⚠️ Falling back to template-based responses (no Groq client)")
        return None
    
    try:
        print("🚀 Generating response with Groq LLM...")
        
        # Prepare the messages for the chat completion
        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ]
        
        print(f"📤 System prompt length: {len(system_prompt)} characters")
        print(f"📤 User prompt length: {len(user_prompt)} characters")
        
        # Use simpler parameters first to reduce potential errors
        try:
            response = client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                temperature=0.5
            )
                
            # Extract the response content
            content = response.choices[0].message.content
            print("✅ Successfully generated LLM response with model")
            print(f"Response content (first 100 chars): {content[:100]}...")
            return content
        except Exception as second_error:
            print(f"❌ Error with alternate model: {second_error}")
            raise second_error
        
    except Exception as e:
        print(f"❌ Error generating LLM response: {e}")
        import traceback
        print(traceback.format_exc())
        return None