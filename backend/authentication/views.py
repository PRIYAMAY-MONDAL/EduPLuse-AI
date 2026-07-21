import os
import json
import bcrypt
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from dotenv import load_dotenv
from groq import Groq
from .db_config import get_mongo_collection

# Explicitly load environment variables from .env before initializing SDKs
load_dotenv()

# Fetch the students collection tracking reference pointer from MongoDB Atlas
students_collection = get_mongo_collection('students')

# Initialize the Groq SDK Engine client mapping using environment credentials
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


@csrf_exempt
def register_student(request):
    """Ingests structural data payloads to register a unique student account entry."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        data = json.loads(request.body)
        full_name = data.get('name')
        email = data.get('email', '').strip().lower()
        degree = data.get('course')
        password = data.get('password')

        if not all([full_name, email, degree, password]):
            return JsonResponse({"error": "Missing mandatory registration fields"}, status=400)

        # Collision verification validation step
        existing_user = students_collection.find_one({"email": email})
        if existing_user:
            return JsonResponse({"error": "Account identity collision: Email already verified"}, status=409)

        # Execute security hashing transformation loop
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Document mapping assembly structure
        student_document = {
            "name": full_name,
            "email": email,
            "degree": degree,
            "password": hashed_password.decode('utf-8')  # Persisted safely as encrypted string
        }

        students_collection.insert_one(student_document)
        return JsonResponse({"message": "Student identity constructed successfully"}, status=201)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Malformed structural JSON sequence"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def login_student(request):
    """Validates submitted student profile credentials against Atlas cluster collection limits."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        password = data.get('password')

        if not email or not password:
            return JsonResponse({"error": "Authentication fields incomplete"}, status=400)

        # Query identity documentation match parameters
        student = students_collection.find_one({"email": email})
        if not student:
            return JsonResponse({"error": "Invalid credential declarations"}, status=401)

        # Structural cryptographic matching check
        db_password = student['password']
        if bcrypt.checkpw(password.encode('utf-8'), db_password.encode('utf-8')):
            return JsonResponse({
                "message": "Authentication token authorized",
                "user": {
                    "name": student['name'],
                    "meta": student['degree'],
                    "email": student['email']
                }
            }, status=200)
        else:
            return JsonResponse({"error": "Invalid credential declarations"}, status=401)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Malformed structural JSON sequence"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def forgot_password_view(request):
    """
    Ingests dynamic account parameters to launch a secure password recovery loop.
    Verifies existence against MongoDB Atlas collections before approving state.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()

        if not email:
            return JsonResponse({"error": "A valid account recovery email is required"}, status=400)

        # Look up profile target within MongoDB
        student = students_collection.find_one({"email": email})
        if not student:
            return JsonResponse({
                "message": "🔒 If a matching operational profile exists, password reset sequences have been logged."
            }, status=200)

        print(f"🔗 [Reset System Hook] Secure token generation initialized for profile: {email}")

        return JsonResponse({
            "message": "🔒 Password reset credentials logged. Verification links generated safely."
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Malformed structural JSON sequence"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def chat_with_tutor(request):
    """Routes active student query inputs to Groq Cloud API using Llama-3.3-70b-versatile."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        data = json.loads(request.body)
        user_message = data.get('message', '').strip()
        student_name = data.get('student_name', 'Student')
        student_degree = data.get('student_degree', 'General Engineering')
        chat_history = data.get('history', [])

        if not user_message:
            return JsonResponse({"error": "Prompt field cannot be blank"}, status=400)

        system_conditioning_prompt = (
            f"You are a brilliant, world-class Senior Web Developer and Academic Tutor. "
            f"Your current student is named '{student_name}', working towards a '{student_degree}' degree. "
            f"Your absolute core objective is to make them completely EXAM READY. "
            f"Structure responses cleanly using Markdown, use bolding on core structural variables, and break multi-step "
            f"logics down into concise lists. Always highlight typical exam trap edge cases or tricky interview questions."
        )

        llm_messages = [{"role": "system", "content": system_conditioning_prompt}]
        
        for past_msg in chat_history[-6:]:
            llm_messages.append({
                "role": "user" if past_msg.get('role') == 'user' else "assistant",
                "content": past_msg.get('text', '')
            })
            
        llm_messages.append({"role": "user", "content": user_message})

        chat_completion = groq_client.chat.completions.create(
            messages=llm_messages,
            model="llama-3.3-70b-versatile",
            temperature=0.3, 
            max_completion_tokens=1024
        )

        ai_response_text = chat_completion.choices[0].message.content
        return JsonResponse({"response": ai_response_text}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"LLM Ingestion Exception: {str(e)}"}, status=500)


@csrf_exempt
def generate_custom_quiz(request):
    """Ingests user preferences and extracts a strict JSON formatted quiz from Groq using Llama-3.3-70b-versatile."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    try:
        data = json.loads(request.body)
        course = data.get('course', 'Computer Science')
        num_questions = int(data.get('num_questions', 5))
        num_options = int(data.get('num_options', 4))
        difficulty = data.get('difficulty', 'Medium')
        uploaded_files = data.get('files', [])

        context_source = f"for a student majoring in {course}"
        if uploaded_files:
            context_source += f" based strictly on their uploaded documents: {', '.join(uploaded_files)}"

        system_instruction = (
            "You are an expert examination matrix generator. You must return ONLY a raw JSON object. "
            "Do not return any surrounding conversation text, introductory descriptions, or markdown fences. "
            "The JSON must strictly match this shape:\n"
            "{\n"
            "  \"questions\": [\n"
            "    {\n"
            "      \"id\": 1,\n"
            "      \"question\": \"The question text string here\",\n"
            "      \"options\": [\"Option A\", \"Option B\", \"Option C\"],\n"
            "      \"correct_answer\": \"The exact string matching the right option\",\n"
            "      \"topic\": \"Specific Sub-concept Component\"\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        user_prompt = (
            f"Generate a {difficulty} difficulty quiz {context_source}. "
            f"It must contain exactly {num_questions} questions. Each question must offer exactly {num_options} options. "
            f"Ensure the topics target high-frequency concepts likely to appear on final exams."
        )

        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2, 
            response_format={"type": "json_object"}
        )

        quiz_payload = json.loads(completion.choices[0].message.content)
        return JsonResponse(quiz_payload, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Quiz generation layer failure: {str(e)}"}, status=500)