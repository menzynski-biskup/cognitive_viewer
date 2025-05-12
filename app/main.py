from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
from pydantic import BaseModel
from .models import search_concepts_by_name, get_concept_details, search_brain_structures_by_name, get_brain_structure_details
from .database import connect_db, close_db
import app.database as database

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="frontend/templates")

# Database connection model
class DatabaseConnection(BaseModel):
    host: str
    port: str
    username: str
    password: str
    database: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for application startup and shutdown.
    Handles database connection setup and teardown.
    """
    # No automatic connection on startup - will connect when user provides credentials
    yield
    await close_db()  # Shutdown logic

# Initialize FastAPI application with lifespan
app = FastAPI(lifespan=lifespan)

# Mount static files directory
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """
    Renders the home page.

    Args:
        request (Request): The HTTP request object.

    Returns:
        HTMLResponse: The rendered home page.
    """
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/connect")
async def connect_to_database(connection: DatabaseConnection):
    """
    API endpoint to connect to the database with user-provided credentials.

    Args:
        connection (DatabaseConnection): The database connection details.

    Returns:
        dict: A status message indicating success or failure.
    """
    try:
        await connect_db(
            host=connection.host,
            port=connection.port,
            username=connection.username,
            password=connection.password,
            database=connection.database
        )
        print(f"Database connection successful in connect_to_database endpoint. is_connected = {database.is_connected}")
        return {"status": "success", "message": "Connected to database successfully"}
    except Exception as e:
        print(f"Error in connect_to_database endpoint: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to connect to database: {str(e)}"}
        )

@app.get("/api/connection_status")
async def get_connection_status():
    """
    API endpoint to check the database connection status.

    Returns:
        dict: The current connection status.
    """
    print(f"Connection status check: is_connected = {database.is_connected}")
    return {"connected": database.is_connected}

@app.get("/api/search")
async def api_search(query: str):
    """
    API endpoint to search for concepts by name.

    Args:
        query (str): The search query.

    Returns:
        list: A list of matching concepts.
    """
    if not database.is_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "Database not connected"}
        )

    try:
        results = await search_concepts_by_name(query)
        return results
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": f"Database error: {str(e)}"}
        )

@app.get("/api/concept/{concept_id}")
async def api_concept(concept_id: str):
    """
    API endpoint to fetch details of a specific concept.

    Args:
        concept_id (str): The ID of the concept.

    Returns:
        dict: The details of the concept.

    Raises:
        HTTPException: If the concept is not found.
    """
    if not database.is_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "Database not connected"}
        )

    try:
        concept = await get_concept_details(concept_id)
        if not concept:
            raise HTTPException(status_code=404, detail="Concept not found")
        return concept
    except HTTPException:
        # Re-raise HTTPException to maintain the 404 status
        raise
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": f"Database error: {str(e)}"}
        )

@app.get("/api/brain-search")
async def api_brain_search(query: str):
    """
    API endpoint to search for brain structures by name or synonym.

    Args:
        query (str): The search query.

    Returns:
        list: A list of matching brain structures.
    """
    if not database.is_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "Database not connected"}
        )

    try:
        results = await search_brain_structures_by_name(query)
        return results
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": f"Database error: {str(e)}"}
        )

@app.get("/api/brain-structure/{structure_id}")
async def api_brain_structure(structure_id: str, hierarchy_model: str = None):
    """
    API endpoint to fetch details of a specific brain structure.

    Args:
        structure_id (str): The ID of the brain structure.
        hierarchy_model (str, optional): The hierarchy model to use for the relationship tree.

    Returns:
        dict: The details of the brain structure.

    Raises:
        HTTPException: If the brain structure is not found.
    """
    if not database.is_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "Database not connected"}
        )

    try:
        structure = await get_brain_structure_details(structure_id, hierarchy_model)
        if not structure:
            raise HTTPException(status_code=404, detail="Brain structure not found")
        return structure
    except HTTPException:
        # Re-raise HTTPException to maintain the 404 status
        raise
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": f"Database error: {str(e)}"}
        )

@app.get("/api/hierarchy-models")
async def api_hierarchy_models():
    """
    API endpoint to fetch all available hierarchy models.

    Returns:
        list: A list of available hierarchy models.
    """
    if not database.is_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "Database not connected"}
        )

    try:
        pool = await connect_db()
        if pool is None:
            raise Exception("Database connection not available")

        async with pool.acquire() as conn:
            models = await conn.fetch(
                """
                SELECT DISTINCT hierarchy_model_name
                FROM structure_parents
                ORDER BY hierarchy_model_name
                """
            )

        return [model["hierarchy_model_name"] for model in models]
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": f"Database error: {str(e)}"}
        )
