/**
 * Handles database connection, search input, and displays search results and concept details.
 * Also handles brain structure search and display.
 */

// DOM Elements - Cognitive Processes
const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");
const detailsDiv = document.getElementById("details");

// DOM Elements - Brain Structures
const brainSearchInput = document.getElementById("brainSearchInput");
const brainResultsDiv = document.getElementById("brainResults");
const brainDetailsDiv = document.getElementById("brainDetails");
const hierarchyModelContainer = document.getElementById("hierarchyModelContainer");
const hierarchyModelSelect = document.getElementById("hierarchyModelSelect");

// DOM Elements - Shared
const connectionStatusDiv = document.getElementById("connectionStatus");
const dbConnectionModal = new bootstrap.Modal(document.getElementById("dbConnectionModal"));
const connectButton = document.getElementById("connectButton");
const connectionErrorDiv = document.getElementById("connectionError");

// Database connection form elements
const dbHost = document.getElementById("dbHost");
const dbPort = document.getElementById("dbPort");
const dbUsername = document.getElementById("dbUsername");
const dbPassword = document.getElementById("dbPassword");
const dbName = document.getElementById("dbName");

// Debounce timeouts
let cognitiveTimeout = null;
let brainTimeout = null;

// Check connection status on page load
document.addEventListener("DOMContentLoaded", function() {
    // Pre-fill the connection form with the provided credentials
    dbHost.value = "localhost";
    dbPort.value = "5432";
    dbUsername.value = "postgres";
    dbPassword.value = "";
    dbName.value = "postgres";

    checkConnectionStatus();
});

// Event listener for cognitive search input
searchInput.addEventListener("input", function () {
    clearTimeout(cognitiveTimeout);
    cognitiveTimeout = setTimeout(() => {
        handleSearchInput(this.value);
    }, 300); // Debounce delay of 300ms
});

// Event listener for brain structure search input
brainSearchInput.addEventListener("input", function () {
    clearTimeout(brainTimeout);
    brainTimeout = setTimeout(() => {
        handleBrainSearchInput(this.value);
    }, 300); // Debounce delay of 300ms
});

// Event listener for connect button
connectButton.addEventListener("click", connectToDatabase);

// Event listener for hierarchy model selection
hierarchyModelSelect.addEventListener("change", function() {
    // If a brain structure is currently displayed, refresh it with the new hierarchy model
    const currentStructureId = brainDetailsDiv.dataset.structureId;
    if (currentStructureId) {
        fetchBrainStructureDetails(currentStructureId, brainDetailsDiv.dataset.structureName);
    }
});

/**
 * Fetches available hierarchy models from the API and populates the dropdown menu.
 */
async function fetchHierarchyModels() {
    try {
        const response = await fetch("/api/hierarchy-models");
        const models = await response.json();

        console.log("Hierarchy models:", models);

        // Clear existing options
        hierarchyModelSelect.innerHTML = "";

        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a hierarchy model";
        hierarchyModelSelect.appendChild(defaultOption);

        // Add options for each hierarchy model
        models.forEach(model => {
            const option = document.createElement("option");
            option.value = model;
            option.textContent = model;
            hierarchyModelSelect.appendChild(option);
        });

        // Show the hierarchy model container
        hierarchyModelContainer.classList.remove("d-none");
    } catch (error) {
        console.error("Error fetching hierarchy models:", error);
        hierarchyModelSelect.innerHTML = "<option value=''>Error loading hierarchy models</option>";
    }
}

/**
 * Checks the database connection status and updates the UI accordingly.
 * @param {number} retryCount - Number of retries left (for handling race conditions)
 */
async function checkConnectionStatus(retryCount = 3) {
    try {
        const response = await fetch("/api/connection_status");
        const data = await response.json();

        console.log("Connection status response:", data);

        if (data.connected) {
            // Database is connected
            connectionStatusDiv.classList.remove("alert-warning", "alert-danger");
            connectionStatusDiv.classList.add("alert-success");
            connectionStatusDiv.textContent = "Connected to database";
            searchInput.disabled = false;
            brainSearchInput.disabled = false;

            // Fetch hierarchy models
            fetchHierarchyModels();
        } else {
            // Database is not connected
            if (retryCount > 0) {
                // Retry after a short delay (possible race condition)
                console.log(`Connection not detected, retrying... (${retryCount} attempts left)`);
                setTimeout(() => checkConnectionStatus(retryCount - 1), 500);
                return;
            }

            connectionStatusDiv.classList.remove("alert-success", "alert-danger");
            connectionStatusDiv.classList.add("alert-warning");
            connectionStatusDiv.textContent = "Database not connected. Please provide connection details.";
            searchInput.disabled = true;
            brainSearchInput.disabled = true;

            // Hide the hierarchy model container
            hierarchyModelContainer.classList.add("d-none");

            // Show the connection modal
            dbConnectionModal.show();
        }
    } catch (error) {
        console.error("Error checking connection status:", error);
        connectionStatusDiv.classList.remove("alert-success", "alert-warning");
        connectionStatusDiv.classList.add("alert-danger");
        connectionStatusDiv.textContent = "Error checking connection status: " + error.message;
        searchInput.disabled = true;
        brainSearchInput.disabled = true;

        // Hide the hierarchy model container
        hierarchyModelContainer.classList.add("d-none");
    }
}

/**
 * Connects to the database with the provided credentials.
 */
async function connectToDatabase() {
    // Hide any previous error
    connectionErrorDiv.classList.add("d-none");

    // Get form values
    const connectionData = {
        host: dbHost.value,
        port: dbPort.value,
        username: dbUsername.value,
        password: dbPassword.value,
        database: dbName.value
    };

    try {
        // Disable the connect button while connecting
        connectButton.disabled = true;
        connectButton.textContent = "Connecting...";

        // Send connection request to the server
        console.log("Sending connection request with data:", connectionData);
        const response = await fetch("/api/connect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(connectionData)
        });

        const data = await response.json();
        console.log("Connection response:", data);

        if (response.ok && data.status === "success") {
            // Connection successful
            dbConnectionModal.hide();
            // Add a longer delay before checking connection status to ensure backend has updated
            setTimeout(() => {
                console.log("Checking connection status after successful connection...");
                checkConnectionStatus(); // Update UI
            }, 2000);
        } else {
            // Connection failed
            connectionErrorDiv.textContent = data.message || "Failed to connect to database";
            connectionErrorDiv.classList.remove("d-none");
        }
    } catch (error) {
        console.error("Error connecting to database:", error);
        connectionErrorDiv.textContent = "Error: " + error.message;
        connectionErrorDiv.classList.remove("d-none");
    } finally {
        // Re-enable the connect button
        connectButton.disabled = false;
        connectButton.textContent = "Connect";
    }
}

/**
 * Handles the cognitive search input and fetches matching concepts.
 * @param {string} query - The search query entered by the user.
 */
async function handleSearchInput(query) {
    if (!query) {
        clearResults();
        return;
    }
    displaySearchingMessage();
    const concepts = await fetchSearchResults(query);
    displaySearchResults(concepts);
}

/**
 * Handles the brain structure search input and fetches matching structures.
 * @param {string} query - The search query entered by the user.
 */
async function handleBrainSearchInput(query) {
    if (!query) {
        clearBrainResults();
        return;
    }
    displayBrainSearchingMessage();
    const structures = await fetchBrainSearchResults(query);
    displayBrainSearchResults(structures);
}

/**
 * Clears the cognitive search results.
 */
function clearResults() {
    resultsDiv.innerHTML = "";
}

/**
 * Clears the brain structure search results.
 */
function clearBrainResults() {
    brainResultsDiv.innerHTML = "";
}

/**
 * Displays a "Searching..." message in the cognitive results section.
 */
function displaySearchingMessage() {
    resultsDiv.innerHTML = "Searching...";
}

/**
 * Displays a "Searching..." message in the brain structure results section.
 */
function displayBrainSearchingMessage() {
    brainResultsDiv.innerHTML = "Searching...";
}

/**
 * Fetches cognitive search results from the API.
 * @param {string} query - The search query.
 * @returns {Promise<Array>} - A promise resolving to an array of concepts.
 */
async function fetchSearchResults(query) {
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!response.ok) {
            // Handle error response
            if (response.status === 503 && data.message === "Database not connected") {
                // Database connection error
                connectionStatusDiv.classList.remove("alert-success", "alert-warning");
                connectionStatusDiv.classList.add("alert-danger");
                connectionStatusDiv.textContent = "Database not connected. Please provide connection details.";
                searchInput.disabled = true;
                brainSearchInput.disabled = true;
                dbConnectionModal.show();
                throw new Error("Database not connected");
            } else {
                throw new Error(data.message || "Error fetching search results");
            }
        }

        return data;
    } catch (error) {
        console.error("Error fetching search results:", error);
        resultsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        return [];
    }
}

/**
 * Fetches brain structure search results from the API.
 * @param {string} query - The search query.
 * @returns {Promise<Array>} - A promise resolving to an array of brain structures.
 */
async function fetchBrainSearchResults(query) {
    try {
        const response = await fetch(`/api/brain-search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!response.ok) {
            // Handle error response
            if (response.status === 503 && data.message === "Database not connected") {
                // Database connection error
                connectionStatusDiv.classList.remove("alert-success", "alert-warning");
                connectionStatusDiv.classList.add("alert-danger");
                connectionStatusDiv.textContent = "Database not connected. Please provide connection details.";
                searchInput.disabled = true;
                brainSearchInput.disabled = true;
                dbConnectionModal.show();
                throw new Error("Database not connected");
            } else {
                throw new Error(data.message || "Error fetching brain structure search results");
            }
        }

        return data;
    } catch (error) {
        console.error("Error fetching brain structure search results:", error);
        brainResultsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        return [];
    }
}

/**
 * Displays the cognitive search results as buttons.
 * @param {Array} concepts - The list of concepts returned by the API.
 */
function displaySearchResults(concepts) {
    if (concepts.length === 0) {
        resultsDiv.innerHTML = '<div class="alert alert-info">No results found</div>';
        return;
    }

    resultsDiv.innerHTML = concepts.map(concept =>
        `<button class="btn btn-outline-primary w-100 mb-2" onclick="fetchConceptDetails('${concept.concept_id}', '${concept.name}')">${concept.name}</button>`
    ).join("");
}

/**
 * Displays the brain structure search results as buttons.
 * @param {Array} structures - The list of brain structures returned by the API.
 */
function displayBrainSearchResults(structures) {
    if (structures.length === 0) {
        brainResultsDiv.innerHTML = '<div class="alert alert-info">No brain structures found</div>';
        return;
    }

    brainResultsDiv.innerHTML = structures.map(structure =>
        `<button class="btn btn-outline-primary w-100 mb-2" onclick="fetchBrainStructureDetails('${structure.structure_id}', '${structure.name}')">${structure.name}</button>`
    ).join("");
}

/**
 * Fetches and displays the details of a selected concept.
 * @param {string} id - The ID of the selected concept.
 * @param {string} name - The name of the selected concept.
 */
async function fetchConceptDetails(id, name) {
    displayLoadingDetailsMessage();
    try {
        const concept = await fetchConceptFromAPI(id);
        clearResults(); // Clear search results when showing details
        displayConceptDetails(concept);
    } catch (error) {
        // Error is already handled in fetchConceptFromAPI
        // Just prevent the function from proceeding
    }
}

/**
 * Fetches and displays the details of a selected brain structure.
 * @param {string} id - The ID of the selected brain structure.
 * @param {string} name - The name of the selected brain structure.
 * @param {string} [hierarchyModel] - The hierarchy model to use for the relationship tree.
 */
async function fetchBrainStructureDetails(id, name, hierarchyModel) {
    displayLoadingBrainDetailsMessage();
    try {
        // If no hierarchy model is specified, use the selected one from the dropdown
        if (!hierarchyModel && hierarchyModelSelect.value) {
            hierarchyModel = hierarchyModelSelect.value;
        }

        const structure = await fetchBrainStructureFromAPI(id, hierarchyModel);
        clearBrainResults(); // Clear search results when showing details

        // If the structure has hierarchy models, update the dropdown
        if (structure.hierarchy_models && structure.hierarchy_models.length > 0) {
            // Show the hierarchy model container
            hierarchyModelContainer.classList.remove("d-none");

            // Update the dropdown with the structure's hierarchy models
            hierarchyModelSelect.innerHTML = "";

            // Add default option
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Select a hierarchy model";
            hierarchyModelSelect.appendChild(defaultOption);

            // Add options for each hierarchy model
            structure.hierarchy_models.forEach(model => {
                const option = document.createElement("option");
                option.value = model;
                option.textContent = model;
                // Select the current hierarchy model if specified
                if (structure.current_hierarchy_model && model === structure.current_hierarchy_model) {
                    option.selected = true;
                }
                hierarchyModelSelect.appendChild(option);
            });
        } else {
            // Hide the hierarchy model container if no models are available
            hierarchyModelContainer.classList.add("d-none");
        }

        displayBrainStructureDetails(structure);
    } catch (error) {
        // Error is already handled in fetchBrainStructureFromAPI
        // Just prevent the function from proceeding
    }
}

/**
 * Displays a "Loading details..." message in the cognitive details section.
 */
function displayLoadingDetailsMessage() {
    detailsDiv.innerHTML = "Loading details...";
}

/**
 * Displays a "Loading details..." message in the brain structure details section.
 */
function displayLoadingBrainDetailsMessage() {
    brainDetailsDiv.innerHTML = "Loading details...";
}

/**
 * Fetches concept details from the API.
 * @param {string} id - The ID of the concept.
 * @returns {Promise<Object>} - A promise resolving to the concept details.
 */
async function fetchConceptFromAPI(id) {
    try {
        const response = await fetch(`/api/concept/${id}`);
        const data = await response.json();

        if (!response.ok) {
            // Handle error response
            if (response.status === 503 && data.message === "Database not connected") {
                // Database connection error
                connectionStatusDiv.classList.remove("alert-success", "alert-warning");
                connectionStatusDiv.classList.add("alert-danger");
                connectionStatusDiv.textContent = "Database not connected. Please provide connection details.";
                searchInput.disabled = true;
                brainSearchInput.disabled = true;
                dbConnectionModal.show();
                throw new Error("Database not connected");
            } else if (response.status === 404) {
                throw new Error("Concept not found");
            } else {
                throw new Error(data.message || "Error fetching concept details");
            }
        }

        return data;
    } catch (error) {
        console.error("Error fetching concept details:", error);
        detailsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        throw error;
    }
}

/**
 * Fetches brain structure details from the API.
 * @param {string} id - The ID of the brain structure.
 * @param {string} [hierarchyModel] - The hierarchy model to use for the relationship tree.
 * @returns {Promise<Object>} - A promise resolving to the brain structure details.
 */
async function fetchBrainStructureFromAPI(id, hierarchyModel) {
    try {
        // If no hierarchy model is specified, use the selected one from the dropdown
        if (!hierarchyModel && hierarchyModelSelect.value) {
            hierarchyModel = hierarchyModelSelect.value;
        }

        // Build the URL with the hierarchy model parameter if specified
        let url = `/api/brain-structure/${id}`;
        if (hierarchyModel) {
            url += `?hierarchy_model=${encodeURIComponent(hierarchyModel)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            // Handle error response
            if (response.status === 503 && data.message === "Database not connected") {
                // Database connection error
                connectionStatusDiv.classList.remove("alert-success", "alert-warning");
                connectionStatusDiv.classList.add("alert-danger");
                connectionStatusDiv.textContent = "Database not connected. Please provide connection details.";
                searchInput.disabled = true;
                brainSearchInput.disabled = true;
                dbConnectionModal.show();
                throw new Error("Database not connected");
            } else if (response.status === 404) {
                throw new Error("Brain structure not found");
            } else {
                throw new Error(data.message || "Error fetching brain structure details");
            }
        }

        return data;
    } catch (error) {
        console.error("Error fetching brain structure details:", error);
        brainDetailsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        throw error;
    }
}

/**
 * Displays the details of a concept, including its relationships.
 * @param {Object} concept - The concept details.
 */
function displayConceptDetails(concept) {
    const groups = initializeRelationshipGroups();
    populateRelationshipGroups(concept, groups);
    const relationshipsHtml = generateRelationshipsHtml(concept, groups);

    detailsDiv.innerHTML = `
        <div class="card shadow p-4">
            <h2 class="mb-3">${concept.name}</h2>
            <p><strong>Class:</strong> ${concept.class.name} - ${concept.class.description}</p>
            <p><strong>Definition:</strong> ${concept.definition}</p>
            <hr>
            ${relationshipsHtml}
        </div>
    `;
}

/**
 * Initializes the relationship groups.
 * @returns {Object} - An object with empty arrays for each relationship group.
 */
function initializeRelationshipGroups() {
    return {
        "Tasks that measure": [],
        "These are types of": [],
        "Concepts that are part of": [],
        "Is part of": []
    };
}

/**
 * Populates the relationship groups based on the concept's relationships.
 * @param {Object} concept - The concept details.
 * @param {Object} groups - The relationship groups to populate.
 */
function populateRelationshipGroups(concept, groups) {
    concept.relationships.forEach(relationship => {
        if (relationship.relationship === "MEASUREDBY") {
            groups["Tasks that measure"].push(relationship.target);
        } else if (relationship.relationship === "KINDOF" && relationship.direction === "child") {
            groups["These are types of"].push(relationship.target);
        } else if (relationship.relationship === "PARTOF" && relationship.direction === "child") {
            groups["Concepts that are part of"].push(relationship.target);
        } else if (relationship.relationship === "PARTOF" && relationship.direction === "parent") {
            groups["Is part of"].push(relationship.target);
        }
    });
}

/**
 * Generates the HTML for the relationships section.
 * @param {Object} concept - The concept details.
 * @param {Object} groups - The relationship groups.
 * @returns {string} - The HTML string for the relationships section.
 */
function generateRelationshipsHtml(concept, groups) {
    let html = "";

    for (const [title, items] of Object.entries(groups)) {
        if (items.length > 0) {
            const displayTitle = title === "Is part of"
                ? `<em>${capitalizeFirstLetter(concept.name)}</em> is part of`
                : `${title} <em>${concept.name}</em>`;
            html += `
                <div class="mb-4">
                    <h5>${displayTitle}:</h5>
                    <ul class="list-group list-group-flush">
                        ${items.map(item => `<li class="list-group-item">${item}</li>`).join("")}
                    </ul>
                </div>
            `;
        }
    }

    return html;
}

/**
 * Displays the details of a brain structure, including its description and relationships.
 * @param {Object} structure - The brain structure details.
 */
function displayBrainStructureDetails(structure) {
    // Store the structure ID and name in the brainDetailsDiv dataset for later use
    brainDetailsDiv.dataset.structureId = structure.structure_id;
    brainDetailsDiv.dataset.structureName = structure.name;

    // Create the hierarchy tree HTML
    const hierarchyHtml = generateBrainHierarchyHtml(structure);

    // Create the synonyms HTML
    const synonymsHtml = structure.synonyms.length > 0 
        ? `<p><strong>Synonyms:</strong> ${structure.synonyms.join(", ")}</p>` 
        : "";

    // Create the hierarchy model info HTML
    const hierarchyModelHtml = structure.current_hierarchy_model 
        ? `<p><strong>Current Hierarchy Model:</strong> ${structure.current_hierarchy_model}</p>` 
        : "";

    // Create additional details HTML
    const additionalDetailsHtml = `
        <div class="mt-3">
            ${structure.acronym ? `<p><strong>Acronym:</strong> ${structure.acronym}</p>` : ""}
            ${structure.neuronames_id ? `<p><strong>NeuroNames ID:</strong> ${structure.neuronames_id}</p>` : ""}
            ${structure.structure_type ? `<p><strong>Structure Type:</strong> ${structure.structure_type}</p>` : ""}
            ${structure.brain_info_url ? `<p><strong>Brain Info URL:</strong> <a href="${structure.brain_info_url}" target="_blank">${structure.brain_info_url}</a></p>` : ""}
        </div>
    `;

    // Build the complete HTML
    brainDetailsDiv.innerHTML = `
        <div class="card shadow p-4">
            <h2 class="mb-3">${structure.name}</h2>
            ${synonymsHtml}
            ${hierarchyModelHtml}
            <p><strong>Description:</strong> ${structure.description || "No description available."}</p>
            ${additionalDetailsHtml}
            <hr>
            <h4>Brain Structure Hierarchy</h4>
            <div class="brain-hierarchy mt-3">
                ${hierarchyHtml}
            </div>
        </div>
    `;
}

/**
 * Generates the HTML for the brain structure hierarchy tree.
 * @param {Object} structure - The brain structure details.
 * @returns {string} - The HTML string for the hierarchy tree.
 */
function generateBrainHierarchyHtml(structure) {
    // Start with ancestors (from highest to current)
    let html = '<ul class="list-group list-group-flush hierarchy-tree">';

    // Add ancestors (if any)
    if (structure.hierarchy.ancestors.length > 0) {
        // Sort ancestors by their position in the hierarchy (this is a simplification)
        // In a real implementation, you would need to determine the actual hierarchy levels
        const ancestors = [...structure.hierarchy.ancestors];

        // Add each ancestor as a list item
        ancestors.forEach(ancestor => {
            html += `
                <li class="list-group-item">
                    <a href="#" onclick="fetchBrainStructureDetails('${ancestor.structure_id}', '${ancestor.name}'); return false;">
                        ${ancestor.name}
                    </a>
                    <ul class="list-group list-group-flush">
            `;
        });

        // Add the current structure (bold)
        html += `
            <li class="list-group-item">
                <strong>${structure.name}</strong>
        `;
    } else {
        // If no ancestors, just add the current structure
        html += `
            <li class="list-group-item">
                <strong>${structure.name}</strong>
        `;
    }

    // Add direct children (if any)
    if (structure.children.length > 0) {
        html += '<ul class="list-group list-group-flush">';
        structure.children.forEach(child => {
            html += `
                <li class="list-group-item">
                    <a href="#" onclick="fetchBrainStructureDetails('${child.structure_id}', '${child.name}'); return false;">
                        ${child.name}
                    </a>
                </li>
            `;
        });
        html += '</ul>';
    }

    // Close all open tags
    html += '</li>'; // Close current structure

    // Close ancestor tags if any
    if (structure.hierarchy.ancestors.length > 0) {
        for (let i = 0; i < structure.hierarchy.ancestors.length; i++) {
            html += '</ul></li>';
        }
    }

    html += '</ul>'; // Close the main list

    return html;
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} string - The input string.
 * @returns {string} - The string with the first letter capitalized.
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
