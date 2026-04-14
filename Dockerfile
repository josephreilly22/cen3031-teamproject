FROM node:20-bookworm-slim AS frontend-builder

ENV CI=false

WORKDIR /app/src/frontend
COPY src/frontend/package.json src/frontend/package-lock.json ./
RUN npm install
COPY src/frontend/ ./
RUN npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/src/backend

COPY src/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/backend/ ./
COPY --from=frontend-builder /app/src/frontend/build ./frontend_build

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
