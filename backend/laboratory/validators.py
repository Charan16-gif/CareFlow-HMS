import os
from django.core.exceptions import ValidationError

ALLOWED_LAB_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"]
ALLOWED_LAB_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"]
MAX_LAB_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_lab_report_file(file):
    if not file:
        return

    # Check file size (5 MB limit)
    file_size = getattr(file, "size", None)
    if file_size and file_size > MAX_LAB_FILE_SIZE_BYTES:
        raise ValidationError(
            f"File size exceeds maximum permitted limit of 5 MB. Current size: {round(file_size / (1024 * 1024), 2)} MB."
        )

    # Check file extension
    file_name = getattr(file, "name", "")
    ext = os.path.splitext(file_name)[1].lower()
    if ext not in ALLOWED_LAB_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Only PDF, JPG, JPEG, and PNG files are allowed."
        )

    # Check content_type if available (from multipart form uploads)
    content_type = getattr(file, "content_type", None)
    if content_type and content_type.lower() not in ALLOWED_LAB_MIME_TYPES:
        raise ValidationError(
            f"Invalid file content type '{content_type}'. Must be application/pdf, image/jpeg, or image/png."
        )

    # Inspect magic header bytes
    try:
        file.seek(0)
        header = file.read(8)
        file.seek(0)
        if ext == ".pdf" and not header.startswith(b"%PDF-"):
            raise ValidationError("Invalid PDF file content. The file does not have a valid PDF header.")
        elif ext in [".jpg", ".jpeg"] and not header.startswith(b"\xff\xd8\xff"):
            raise ValidationError("Invalid JPEG file content. The file does not have a valid JPEG header.")
        elif ext == ".png" and not header.startswith(b"\x89PNG"):
            raise ValidationError("Invalid PNG file content. The file does not have a valid PNG header.")
    except ValidationError:
        raise
    except Exception:
        pass
