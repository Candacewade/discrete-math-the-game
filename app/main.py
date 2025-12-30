from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .routes import router

app = FastAPI()

# session storage (signed cookie)
app.add_middleware(SessionMiddleware, secret_key="dev-change-me")

# serve /static
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# routes
app.include_router(router)
