# Tiempos Betting Platform

Production-ready scalable betting platform for Costa Rica & Nicaragua Tiempos (2-digit lotteries).

## Project Structure
- **/backend**: Express.js REST API with Socket.io real-time engine and PostgreSQL + Redis integration.
- **/frontend**: Next.js (React) Customer & Admin dashboards using Tailwind CSS.

## Running Locally Without Docker
1. Start PostgreSQL and Redis locally or on a cloud provider. Ensure credentials match the `/backend/.env` file.
2. Setup Backend:
   ```bash
   cd backend
   npm install
   npx tsc
   node dist/index.js
   ```
3. Setup Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Running Production with Docker

### 1. Build Docker Images
Create your Dockerfiles for backend and frontend. The included `docker-compose.yml` provides the database layer. You can extend `docker-compose.yml` to include the backend/frontend images.

```yaml
# Add to docker-compose.yml
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    depends_on:
      - db
      - redis
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
```

### 2. Kubernetes (K8s)
For scaling to millions of users:
1. Deploy a **Managed PostgreSQL Cluster** (e.g., AWS RDS or DigitalOcean Managed DB) for high availability.
2. Deploy a **Managed Redis Cluster** (e.g., AWS ElastiCache).
3. Containerize your Node.js and Next.js applications and deploy them to your Kubernetes cluster using horizontal pod autoscalers (HPA).
4. For high-concurrency WebSocket connections, configure sticky sessions at the Load Balancer level or use Redis Pub/Sub adapter for Socket.io to share messages across multiple running backend pods.

### 3. Database Migration
Run the `schema.sql` found in `backend/schema.sql` against your PostgreSQL database to initialize the tables securely.
