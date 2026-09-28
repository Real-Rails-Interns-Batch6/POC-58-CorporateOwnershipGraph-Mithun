# Corporate Ownership Graph PoC

Phase 1 includes a Next.js graph dashboard and a FastAPI backend with a sample company directory.

## Run locally

Start the API from the repository root in one terminal:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Next.js rewrite proxies `/api/*` requests to `http://localhost:8000`; set `OWNERSHIP_API_URL` before starting Next.js to use another backend URL. The API health check is available at `http://localhost:8000/health`.

The Companies page lists the seeded sample companies. Choose **View graph** to open an entity in the graph dashboard. Unknown company IDs return a not found response, and graph and directory requests show loading and error states.

## Production build

```powershell
cd frontend
npm run build
npm run start
```
