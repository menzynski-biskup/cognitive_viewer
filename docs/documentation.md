# Cognitive Viewer - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend](#backend)
   - [API Endpoints](#api-endpoints)
   - [Database Schema](#database-schema)
4. [Frontend](#frontend)
5. [Setup and Configuration](#setup-and-configuration)
6. [Development Guide](#development-guide)

## Overview

The Cognitive Viewer is a web application designed to help users explore and understand cognitive concepts and brain structures. It provides a searchable interface for cognitive processes, their definitions, classifications, and relationships, as well as brain structures, their descriptions, and hierarchical relationships. The application is built with a FastAPI backend, PostgreSQL database, and a simple HTML/CSS/JavaScript frontend.

## Architecture

The application follows a client-server architecture:

- **Backend**: FastAPI application that provides API endpoints for searching and retrieving cognitive concepts
- **Database**: PostgreSQL database that stores cognitive concepts, their classifications, and relationships
- **Frontend**: HTML/CSS/JavaScript interface that allows users to search for and view cognitive concepts

### Component Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │  Database   │
│  (Browser)  │────▶│   (FastAPI) │────▶│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
```

## Backend

The backend is built with FastAPI, a modern, fast web framework for building APIs with Python. It uses asyncpg for asynchronous PostgreSQL database access.

### API Endpoints

#### 1. Home Page
- **Endpoint**: `GET /`
- **Description**: Renders the home page HTML
- **Response**: HTML page

#### 2. Database Connection
- **Endpoint**: `POST /api/connect`
- **Description**: Connects to the database with user-provided credentials
- **Request Body**: JSON object with database connection details
  ```json
  {
    "host": "localhost",
    "port": "5432",
    "username": "postgres",
    "password": "your_password",
    "database": "your_database"
  }
  ```
- **Response**: JSON object with connection status
  ```json
  {
    "status": "success",
    "message": "Connected to database successfully"
  }
  ```

#### 3. Connection Status
- **Endpoint**: `GET /api/connection_status`
- **Description**: Checks the current database connection status
- **Response**: JSON object with connection status
  ```json
  {
    "connected": true
  }
  ```

#### 4. Search Concepts
- **Endpoint**: `GET /api/search`
- **Parameters**: `query` (string) - The search term
- **Description**: Searches for cognitive concepts by name
- **Response**: JSON array of matching concepts with their IDs and names
- **Example Response**:
  ```json
  [
    {"concept_id": "c001", "name": "Working Memory"},
    {"concept_id": "c002", "name": "Short-term Memory"}
  ]
  ```

#### 5. Get Concept Details
- **Endpoint**: `GET /api/concept/{concept_id}`
- **Parameters**: `concept_id` (string) - The ID of the concept
- **Description**: Retrieves detailed information about a specific concept
- **Response**: JSON object with concept details
- **Example Response**:
  ```json
  {
    "name": "Working Memory",
    "definition": "The cognitive system responsible for temporarily holding information available for processing.",
    "class": {
      "name": "Executive Function",
      "description": "Higher-order cognitive processes that are necessary for the cognitive control of behavior"
    },
    "relationships": [
      {
        "relationship": "KINDOF",
        "direction": "child",
        "target": "Memory"
      },
      {
        "relationship": "MEASUREDBY",
        "direction": "parent",
        "target": "Digit Span Test"
      }
    ]
  }
  ```

#### 6. Search Brain Structures
- **Endpoint**: `GET /api/brain-search`
- **Parameters**: `query` (string) - The search term
- **Description**: Searches for brain structures by name or synonym
- **Response**: JSON array of matching brain structures with their IDs and names
- **Example Response**:
  ```json
  [
    {"structure_id": "bs001", "name": "Cerebrum"},
    {"structure_id": "bs005", "name": "Hippocampus"}
  ]
  ```

#### 7. Get Brain Structure Details
- **Endpoint**: `GET /api/brain-structure/{structure_id}`
- **Parameters**: `structure_id` (string) - The ID of the brain structure
- **Description**: Retrieves detailed information about a specific brain structure, including its description, synonyms, and hierarchical relationships
- **Response**: JSON object with brain structure details
- **Example Response**:
  ```json
  {
    "structure_id": "bs005",
    "name": "Hippocampus",
    "description": "A structure in the temporal lobe that plays a major role in learning and memory.",
    "synonyms": ["Hippocampal Formation"],
    "parents": [
      {"structure_id": "bs004", "name": "Temporal Lobe"}
    ],
    "children": [],
    "hierarchy": {
      "ancestors": [
        {"structure_id": "bs001", "name": "Cerebrum"},
        {"structure_id": "bs004", "name": "Temporal Lobe"}
      ],
      "descendants": []
    }
  }
  ```

### Database Schema

The application uses the following database tables:

#### Cognitive Concepts Tables

#### cognitive_concepts
- `concept_id` (string): Primary key
- `name` (string): Name of the concept
- `definition_text` (text): Definition of the concept
- `concept_class` (string): Foreign key to concept_classes

#### concept_classes
- `concept_class_id` (string): Primary key
- `name` (string): Name of the class
- `description` (text): Description of the class

#### relationships
- `concept_id` (string): Foreign key to cognitive_concepts
- `related_concept_id` (string): Foreign key to cognitive_concepts or tasks
- `relationship` (string): Type of relationship (e.g., KINDOF, PARTOF, MEASUREDBY)
- `direction` (string): Direction of the relationship (parent or child)

#### tasks
- `task_id` (string): Primary key
- `name` (string): Name of the task
- `description` (text): Description of the task

#### Brain Structures Tables

#### brain_structures
- `structure_id` (string): Primary key
- `name` (string): Name of the brain structure
- `description` (text): Description of the brain structure

#### structure_parents
- `parent_id` (string): Foreign key to brain_structures, representing the parent structure
- `child_id` (string): Foreign key to brain_structures, representing the child structure
- Primary key is the combination of `parent_id` and `child_id`

#### synonyms
- `synonym_id` (serial): Primary key
- `structure_id` (string): Foreign key to brain_structures
- `synonym` (string): Alternative name for the brain structure
- Unique constraint on the combination of `structure_id` and `synonym`

## Frontend

The frontend is a simple web interface built with HTML, CSS, and JavaScript. It uses Bootstrap for styling and provides a database connection interface, search functionality, and concept details view.

### Components

#### 1. Database Connection Modal
- Form for entering database connection details (host, port, username, password, database name)
- Connection status indicator
- Error message display for failed connections

#### 2. Navigation Tabs
- Tabs for switching between "Cognitive Processes" and "Brain Structures" views
- Each tab has its own search interface and details view

#### 3. Cognitive Processes Tab

##### Search Interface
- Search input field for entering concept names (enabled only when database is connected)
- Debounced search to prevent excessive API calls
- Display of search results as clickable buttons

##### Concept Details View
- Display of concept name, definition, and class
- Organized display of relationships in categories:
  - "Tasks that measure" the concept
  - "These are types of" the concept
  - "Concepts that are part of" the concept
  - Concepts that the current concept "Is part of"

#### 4. Brain Structures Tab

##### Search Interface
- Search input field for entering brain structure names or synonyms (enabled only when database is connected)
- Debounced search to prevent excessive API calls
- Display of search results as clickable buttons

##### Brain Structure Details View
- Display of brain structure name, description, and synonyms
- Hierarchical display of brain structure relationships:
  - Parent structures above the current structure
  - The current structure highlighted in bold
  - Child structures below the current structure
- Interactive hierarchy tree with hyperlinks to navigate to related structures

### JavaScript Functions

The frontend JavaScript (app.js) includes the following key functions:

#### Database Connection
- `checkConnectionStatus(retryCount)`: Checks if the database is connected and updates the UI accordingly
- `connectToDatabase()`: Sends database connection credentials to the server and handles the response

#### Cognitive Processes Search and Display
- `handleSearchInput(query)`: Processes user input in the cognitive search field
- `fetchSearchResults(query)`: Fetches cognitive search results from the API
- `displaySearchResults(concepts)`: Displays cognitive search results as buttons
- `fetchConceptDetails(id, name)`: Fetches and displays concept details
- `fetchConceptFromAPI(id)`: Fetches concept details from the API
- `displayConceptDetails(concept)`: Renders the concept details view
- `initializeRelationshipGroups()`: Creates empty arrays for different relationship types
- `populateRelationshipGroups(concept, groups)`: Sorts relationships into appropriate groups
- `generateRelationshipsHtml(concept, groups)`: Generates HTML for displaying relationships

#### Brain Structures Search and Display
- `handleBrainSearchInput(query)`: Processes user input in the brain structure search field
- `fetchBrainSearchResults(query)`: Fetches brain structure search results from the API
- `displayBrainSearchResults(structures)`: Displays brain structure search results as buttons
- `fetchBrainStructureDetails(id, name)`: Fetches and displays brain structure details
- `fetchBrainStructureFromAPI(id)`: Fetches brain structure details from the API
- `displayBrainStructureDetails(structure)`: Renders the brain structure details view
- `generateBrainHierarchyHtml(structure)`: Generates HTML for displaying the brain structure hierarchy tree

## Setup and Configuration

### Prerequisites
- Python 3.7+
- PostgreSQL database

### Installation
1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Run the application: `uvicorn app.main:app --reload`

### Database Configuration
The application uses a dynamic database connection approach, allowing users to connect to the database through the web interface. No pre-configuration in the code is required.

1. When you first access the application, a database connection modal will appear
2. Enter your PostgreSQL database credentials:
   - Host (e.g., "localhost")
   - Port (e.g., "5432")
   - Username (e.g., "postgres")
   - Password
   - Database name

The application will attempt to connect to the database with the provided credentials. If successful, you'll be able to use the search functionality. If not, an error message will be displayed, and you can try again with different credentials.

### Database Schema Requirements
Your PostgreSQL database should have the following tables:

#### Cognitive Concepts Tables

```sql
CREATE TABLE concept_classes (
    concept_class_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT
);

CREATE TABLE cognitive_concepts (
    concept_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    definition_text TEXT,
    concept_class VARCHAR REFERENCES concept_classes(concept_class_id)
);

CREATE TABLE tasks (
    task_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT
);

CREATE TABLE relationships (
    concept_id VARCHAR REFERENCES cognitive_concepts(concept_id),
    related_concept_id VARCHAR,
    relationship VARCHAR NOT NULL,
    direction VARCHAR NOT NULL,
    PRIMARY KEY (concept_id, related_concept_id, relationship)
);
```

#### Brain Structures Tables

```sql
CREATE TABLE brain_structures (
    structure_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT
);

CREATE TABLE structure_parents (
    parent_id VARCHAR REFERENCES brain_structures(structure_id),
    child_id VARCHAR REFERENCES brain_structures(structure_id),
    PRIMARY KEY (parent_id, child_id)
);

CREATE TABLE synonyms (
    synonym_id SERIAL PRIMARY KEY,
    structure_id VARCHAR REFERENCES brain_structures(structure_id),
    synonym VARCHAR NOT NULL,
    UNIQUE (structure_id, synonym)
);
```


## Development Guide

### Adding New Features

#### Backend
1. Add new endpoints in `app/main.py`
2. Add new database queries in `app/models.py`
3. Update database schema if necessary
4. Enhance database connection handling in `app/database.py` if needed

#### Frontend
1. Modify HTML templates in `frontend/templates/`
2. Update JavaScript in `frontend/static/js/app.js`
3. Update CSS styles in `frontend/static/css/styles.css`

### Modifying Database Connection
If you need to modify the database connection functionality:

1. Backend changes:
   - Update the `connect_db()` function in `app/database.py` to handle new connection parameters or logic
   - Modify the `/api/connect` endpoint in `app/main.py` if the request/response format changes

2. Frontend changes:
   - Update the database connection modal in `frontend/templates/index.html`
   - Modify the `connectToDatabase()` function in `frontend/static/js/app.js`
   - Update the `checkConnectionStatus()` function if connection status handling changes

### Testing
- Manual testing can be performed by running the application and using the web interface
- API endpoints can be tested using tools like curl, Postman, or the FastAPI automatic documentation at `/docs`
- Test database connections with various PostgreSQL configurations to ensure compatibility

### Deployment
The application can be deployed using various methods:
- Docker container
- Traditional web server with WSGI/ASGI server (e.g., Gunicorn, Uvicorn)
- Cloud platforms (e.g., Heroku, AWS, Google Cloud)

For production deployment, consider:
- Using environment variables for sensitive information
- Setting up proper logging
- Implementing authentication for database connections
- Optimizing database queries
- Adding proper error handling
- Implementing connection pooling for better performance
- Adding SSL/TLS for secure database connections
