from app.services.ai_service import ask_ai


messages = [
    {
        "role": "user",
        "content": "Hello! Introduce yourself in one sentence."
    }
]


response = ask_ai(messages)


print("AI Response:")
print(response)