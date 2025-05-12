from .database import connect_db

async def search_concepts_by_name(name_query: str):
    """
    Searches for cognitive concepts by name.

    Args:
        name_query (str): The search query string.

    Returns:
        list: A list of dictionaries containing concept IDs and names.
    """
    print(f"Searching for concepts with query: {name_query}")
    pool = await connect_db()
    if pool is None:
        print("Database connection not available in search_concepts_by_name")
        raise Exception("Database connection not available")

    print("Database connection available, executing query")
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT concept_id, name 
            FROM cognitive_concepts 
            WHERE name ILIKE $1 
            LIMIT 20
            """,
            f"%{name_query}%"
        )
    result = [{"concept_id": r["concept_id"], "name": r["name"]} for r in rows]
    print(f"Found {len(result)} concepts matching query: {name_query}")
    return result

async def search_brain_structures_by_name(name_query: str):
    """
    Searches for brain structures by name or synonym.

    Args:
        name_query (str): The search query string.

    Returns:
        list: A list of dictionaries containing structure IDs and names.
    """
    print(f"Searching for brain structures with query: {name_query}")
    pool = await connect_db()
    if pool is None:
        print("Database connection not available in search_brain_structures_by_name")
        raise Exception("Database connection not available")

    print("Database connection available, executing query")
    async with pool.acquire() as conn:
        # Search in brain_structures table
        structure_rows = await conn.fetch(
            """
            SELECT id, standard_name 
            FROM brain_structures 
            WHERE standard_name ILIKE $1 
            LIMIT 20
            """,
            f"%{name_query}%"
        )

        # Search in synonyms table
        synonym_rows = await conn.fetch(
            """
            SELECT bs.id, bs.standard_name 
            FROM brain_structures bs
            JOIN synonyms ss ON bs.id = ss.brain_structure_id
            WHERE ss.synonym_name ILIKE $1 
            LIMIT 20
            """,
            f"%{name_query}%"
        )

    # Combine results, removing duplicates
    result_dict = {}
    for r in structure_rows:
        result_dict[r["id"]] = {"structure_id": r["id"], "name": r["standard_name"]}

    for r in synonym_rows:
        result_dict[r["id"]] = {"structure_id": r["id"], "name": r["standard_name"]}

    result = list(result_dict.values())
    print(f"Found {len(result)} brain structures matching query: {name_query}")
    return result

async def get_concept_details(concept_id: str):
    """
    Fetches detailed information about a specific cognitive concept.

    Args:
        concept_id (str): The ID of the concept.

    Returns:
        dict: A dictionary containing the concept's details, including its name, definition, class, and relationships.
        None: If the concept is not found.
    """
    print(f"Fetching details for concept with ID: {concept_id}")
    pool = await connect_db()
    if pool is None:
        print("Database connection not available in get_concept_details")
        raise Exception("Database connection not available")

    print("Database connection available, executing query for concept details")
    async with pool.acquire() as conn:
        # Fetch the main concept details
        concept = await conn.fetchrow(
            """
            SELECT name, definition_text, concept_class 
            FROM cognitive_concepts 
            WHERE concept_id=$1
            """,
            concept_id
        )
        if not concept:
            print(f"Concept with ID {concept_id} not found")
            return None

        # Fetch the concept class details
        concept_class = await conn.fetchrow(
            """
            SELECT name, description 
            FROM concept_classes 
            WHERE concept_class_id=$1
            """,
            concept["concept_class"]
        )

        # Fetch the relationships of the concept
        relationships = await conn.fetch(
            """
            SELECT r.relationship, r.direction,
                   c.name AS concept_name, t.name AS task_name
            FROM relationships r
            LEFT JOIN cognitive_concepts c ON r.related_concept_id = c.concept_id
            LEFT JOIN tasks t ON r.related_concept_id = t.task_id
            WHERE r.concept_id = $1
            """,
            concept_id
        )

    result = {
        "name": concept["name"],
        "definition": concept["definition_text"],
        "class": {
            "name": concept_class["name"] if concept_class else "Unknown",
            "description": concept_class["description"] if concept_class else ""
        },
        "relationships": [
            {
                "relationship": r["relationship"],
                "direction": r["direction"],
                "target": r["concept_name"] or r["task_name"] or "[Unnamed]"
            } for r in relationships
        ]
    }
    print(f"Returning details for concept: {result['name']}")
    return result

async def get_brain_structure_details(structure_id: str, hierarchy_model: str = None):
    """
    Fetches detailed information about a specific brain structure.

    Args:
        structure_id (str): The ID of the brain structure.
        hierarchy_model (str, optional): The hierarchy model to use for the relationship tree.

    Returns:
        dict: A dictionary containing the structure's details, including its name, description,
              parent-child relationships, and synonyms.
        None: If the structure is not found.
    """
    print(f"Fetching details for brain structure with ID: {structure_id}, hierarchy model: {hierarchy_model}")
    pool = await connect_db()
    if pool is None:
        print("Database connection not available in get_brain_structure_details")
        raise Exception("Database connection not available")

    # Convert structure_id to integer
    try:
        structure_id_int = int(structure_id)
    except ValueError:
        print(f"Invalid structure ID: {structure_id} - must be an integer")
        raise ValueError(f"Invalid structure ID: {structure_id} - must be an integer")

    print("Database connection available, executing query for brain structure details")
    async with pool.acquire() as conn:
        # Fetch the main structure details
        structure = await conn.fetchrow(
            """
            SELECT id, neuronames_id, standard_name, standard_acronym, definition, brain_info_url, structure_type
            FROM brain_structures 
            WHERE id=$1
            """,
            structure_id_int
        )
        if not structure:
            print(f"Brain structure with ID {structure_id} not found")
            return None

        # Fetch the structure's synonyms
        synonyms = await conn.fetch(
            """
            SELECT synonym_name, synonym_language, organism, synonym_source, source_title, pubmed_hit_count
            FROM synonyms 
            WHERE brain_structure_id=$1
            """,
            structure_id_int
        )

        # Fetch available hierarchy models for this structure
        hierarchy_models = await conn.fetch(
            """
            SELECT DISTINCT hierarchy_model_name
            FROM structure_parents
            WHERE child_id = $1 OR parent_id = $1
            """,
            structure_id_int
        )

        # If no hierarchy model is specified but there are available models, use the first one
        if not hierarchy_model and hierarchy_models:
            hierarchy_model = hierarchy_models[0]["hierarchy_model_name"]
            print(f"No hierarchy model specified, using: {hierarchy_model}")

        # Fetch the structure's parents based on the hierarchy model
        parents_query = """
            SELECT p.id, p.standard_name 
            FROM brain_structures p
            JOIN structure_parents sr ON p.id = sr.parent_id
            WHERE sr.child_id = $1
            """

        if hierarchy_model:
            parents_query += " AND sr.hierarchy_model_name = $2"
            parents = await conn.fetch(parents_query, structure_id_int, hierarchy_model)
        else:
            parents = await conn.fetch(parents_query, structure_id_int)

        # Fetch the structure's children based on the hierarchy model
        children_query = """
            SELECT c.id, c.standard_name 
            FROM brain_structures c
            JOIN structure_parents sr ON c.id = sr.child_id
            WHERE sr.parent_id = $1
            """

        if hierarchy_model:
            children_query += " AND sr.hierarchy_model_name = $2"
            children = await conn.fetch(children_query, structure_id_int, hierarchy_model)
        else:
            children = await conn.fetch(children_query, structure_id_int)

        # Build the complete hierarchy tree
        # First, get all ancestors (parents, grandparents, etc.)
        ancestors = []
        current_parents = parents
        while current_parents:
            next_level_parents = []
            for parent in current_parents:
                if parent["id"] not in [a["id"] for a in ancestors]:
                    ancestors.append(parent)
                    # Get this parent's parents
                    higher_parents_query = """
                        SELECT p.id, p.standard_name 
                        FROM brain_structures p
                        JOIN structure_parents sr ON p.id = sr.parent_id
                        WHERE sr.child_id = $1
                        """

                    if hierarchy_model:
                        higher_parents_query += " AND sr.hierarchy_model_name = $2"
                        higher_parents = await conn.fetch(higher_parents_query, int(parent["id"]), hierarchy_model)
                    else:
                        higher_parents = await conn.fetch(higher_parents_query, int(parent["id"]))

                    next_level_parents.extend(higher_parents)
            current_parents = next_level_parents

        # Then, get all descendants (children, grandchildren, etc.)
        descendants = []
        current_children = children
        while current_children:
            next_level_children = []
            for child in current_children:
                if child["id"] not in [d["id"] for d in descendants]:
                    descendants.append(child)
                    # Get this child's children
                    lower_children_query = """
                        SELECT c.id, c.standard_name 
                        FROM brain_structures c
                        JOIN structure_parents sr ON c.id = sr.child_id
                        WHERE sr.parent_id = $1
                        """

                    if hierarchy_model:
                        lower_children_query += " AND sr.hierarchy_model_name = $2"
                        lower_children = await conn.fetch(lower_children_query, int(child["id"]), hierarchy_model)
                    else:
                        lower_children = await conn.fetch(lower_children_query, int(child["id"]))

                    next_level_children.extend(lower_children)
            current_children = next_level_children

    # Build the result
    result = {
        "structure_id": structure["id"],
        "name": structure["standard_name"],
        "acronym": structure["standard_acronym"],
        "description": structure["definition"],
        "brain_info_url": structure["brain_info_url"],
        "structure_type": structure["structure_type"],
        "neuronames_id": structure["neuronames_id"],
        "synonyms": [s["synonym_name"] for s in synonyms],
        "synonym_details": [
            {
                "name": s["synonym_name"],
                "language": s["synonym_language"],
                "organism": s["organism"],
                "source": s["synonym_source"],
                "source_title": s["source_title"],
                "pubmed_hit_count": s["pubmed_hit_count"]
            } for s in synonyms
        ],
        "parents": [{"structure_id": p["id"], "name": p["standard_name"]} for p in parents],
        "children": [{"structure_id": c["id"], "name": c["standard_name"]} for c in children],
        "hierarchy": {
            "ancestors": [{"structure_id": a["id"], "name": a["standard_name"]} for a in ancestors],
            "descendants": [{"structure_id": d["id"], "name": d["standard_name"]} for d in descendants]
        },
        "hierarchy_models": [model["hierarchy_model_name"] for model in hierarchy_models],
        "current_hierarchy_model": hierarchy_model
    }
    print(f"Returning details for brain structure: {result['name']}")
    return result
