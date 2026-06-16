# Build context is the REPOSITORY ROOT (not backend/), so the image can bundle
# both the application code and the versioned SQL migrations the runner applies.
#   docker build -f backend/docker/Dockerfile -t <img> .
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/src

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/src ./src
# Migration SQL must live in the image so the migrate Job can apply it.
COPY versioning/sql ./versioning/sql
COPY backend/docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && addgroup --system app \
    && adduser --system --ingroup app --home /app app \
    && chown -R app:app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/').read()"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["serve"]
