# Cognitive Viewer Web App

A web application for searching and exploring cognitive concepts and brain structures. This tool helps users understand cognitive processes and brain anatomy, including definitions, classifications, relationships, and hierarchical structures.

## Features

### Cognitive Processes
- Search for cognitive concepts by name
- View detailed information about cognitive concepts
- Explore relationships between concepts
- Understand how concepts are classified
- See which tasks measure specific cognitive processes

### Brain Structures
- Search for brain structures by name or synonym
- View detailed information about brain structures
- Explore hierarchical relationships between brain structures
- Navigate through the brain structure hierarchy with interactive links
- View synonyms for brain structures

### General
- Tabbed interface to switch between cognitive processes and brain structures
- Dynamic database connection through user interface

## Prerequisites

- Python 3.7+
- PostgreSQL database

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cognitive_viewer.git
cd cognitive_viewer
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Prepare your database:
   - Create a PostgreSQL database with tables for cognitive concepts, concept classes, relationships, and tasks
   - Have your database credentials ready (host, port, username, password, database name)

## How to Run

1. Start the server:
```bash
uvicorn app.main:app --reload
```

2. Open your browser:
```bash
http://127.0.0.1:8000
```

## Usage

1. Connect to your database by providing connection details in the connection modal
2. Enter a cognitive concept name in the search box
3. Click on a concept from the search results to view its details
4. Explore the concept's definition, classification, and relationships

## Project Structure

- `app/`: Backend code (FastAPI)
  - `main.py`: API endpoints and application setup
  - `models.py`: Data models and database queries
  - `database.py`: Database connection management
- `frontend/`: Frontend code
  - `templates/`: HTML templates
  - `static/`: CSS and JavaScript files
    - `js/app.js`: Frontend logic for database connection, search, and display
    - `css/styles.css`: Custom styling
- `docs/`: Documentation

## Database Schema

The application uses the following database tables:

### Cognitive Concepts Tables
- `cognitive_concepts`: Stores concept information (ID, name, definition, class)
- `concept_classes`: Stores classification information (ID, name, description)
- `relationships`: Stores relationships between concepts (concept ID, related concept ID, relationship type, direction)
- `tasks`: Stores tasks that measure cognitive concepts (ID, name, description)

### Brain Structures Tables
- `brain_structures`: Stores brain structure information (ID, name, description)
- `structure_parents`: Stores parent-child relationships between brain structures (parent ID, child ID)
- `synonyms`: Stores synonyms for brain structures (ID, structure ID, synonym)


## Documentation

For more detailed technical documentation, see [documentation.md](docs/documentation.md).
