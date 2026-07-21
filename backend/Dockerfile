# Use lightweight Python 3.11 image
FROM python:3.11-slim

# Prevent Python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first (leverages Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose Django REST port
EXPOSE 8000

# Start WSGI server for production
CMD ["gunicorn", "core_backend.wsgi:application", "--bind", "0.0.0.0:8000"]