# Docker Setup for FootballHubManager

This directory contains the Docker Compose configuration to run the FootballHubManager application.

## Services

### MySQL Database
- **Image**: MySQL 8.0
- **Database**: footballhub
- **User**: footballuser
- **Password**: footballpass
- **Root Password**: rootpassword
- **Port**: 3306
- **Initialization**: Loads the schema from `../../versioning/sql/actual.sql`

### Backend (Commented)
- Python application
- Port: 8000
- Depends on MySQL

### Frontend (Commented)
- Web application
- Port: 3000
- Depends on Backend

## Usage

1. Ensure Docker and Docker Compose are installed.

2. From this directory (`docker/`), run:
   ```
   docker-compose up -d
   ```

3. To stop:
   ```
   docker-compose down
   ```

4. To view logs:
   ```
   docker-compose logs -f
   ```

## Future Versions
The backend and frontend services are commented out. Uncomment and configure the respective Dockerfiles when ready to deploy the full application.