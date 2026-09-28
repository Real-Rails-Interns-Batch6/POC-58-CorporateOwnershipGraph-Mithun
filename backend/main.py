from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class Company(BaseModel):
    id: str
    name: str
    jurisdiction: str


class Node(BaseModel):
    id: str
    company: Company
    node_type: str = "company"


class Edge(BaseModel):
    source: str
    target: str
    ownership_percentage: float = Field(ge=0, le=100)


class OwnershipGraphResponse(BaseModel):
    company_id: str
    nodes: list[Node]
    edges: list[Edge]

app = FastAPI(
    title="Corporate Ownership Graph API",
    version="0.1.0",
)

SAMPLE_COMPANIES = [
    Company(id="sample-co-root", name="Sample Holdings Inc.", jurisdiction="US"),
    Company(id="sample-co-alpha", name="Sample Alpha Ltd", jurisdiction="GB"),
    Company(id="sample-co-beta", name="Sample Beta GmbH", jurisdiction="DE"),
]


@app.get("/")
def root():
    return {
        "message": "Corporate Ownership Graph API is running",
        "status": "ok",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.get("/api/companies", response_model=list[Company])
def companies() -> list[Company]:
    return SAMPLE_COMPANIES


@app.get(
    "/api/companies/{company_id}/ownership-graph",
    response_model=OwnershipGraphResponse,
)
def ownership_graph(company_id: str) -> OwnershipGraphResponse:
    root = next((company for company in SAMPLE_COMPANIES if company.id == company_id), None)
    if root is None:
        raise HTTPException(status_code=404, detail=f"Company '{company_id}' was not found.")
    alpha, beta = SAMPLE_COMPANIES[1:]

    return OwnershipGraphResponse(
        company_id=company_id,
        nodes=[
            Node(id=root.id, company=root),
            Node(id=alpha.id, company=alpha),
            Node(id=beta.id, company=beta),
        ],
        edges=[
            Edge(source=root.id, target=alpha.id, ownership_percentage=75.0),
            Edge(source=root.id, target=beta.id, ownership_percentage=25.0),
        ],
    )
