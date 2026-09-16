from app.services.pdf_service import extract_text_from_pdf


file_path = "uploads/CV_TilakVasani_LJIET.pdf"

text = extract_text_from_pdf(file_path)

print("========== RESUME TEXT ==========")
print(text)
print("=================================")