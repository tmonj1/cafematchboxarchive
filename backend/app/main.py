from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from app.api import auth, matchboxes, images, auth_oidc
from app import config

app = FastAPI(title="Cafe Matchbox Archive API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(auth_oidc.router, prefix="/api/auth", tags=["auth"])
app.include_router(matchboxes.router, prefix="/api/matchboxes", tags=["matchboxes"])
app.include_router(images.router, prefix="/api/matchboxes", tags=["images"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


handler = Mangum(app)
