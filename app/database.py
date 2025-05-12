import asyncpg
from typing import Optional
import urllib.parse
import asyncio

# Global variables
db_pool = None
is_connected = False
# Store connection credentials for reconnection
connection_params = {
    "host": None,
    "port": None,
    "username": None,
    "password": None,
    "database": None
}

async def connect_db(host: str = None, port: str = None, 
                    username: str = None, password: str = None, 
                    database: str = None):
    """
    Initializes the database connection pool if it doesn't already exist.
    This function should be called during the application startup or when
    connection parameters are provided by the user.

    Args:
        host (str, optional): Database host address
        port (str, optional): Database port
        username (str, optional): Database username
        password (str, optional): Database password
        database (str, optional): Database name

    Returns:
        asyncpg.pool.Pool: The database connection pool.
    """
    global db_pool, is_connected, connection_params

    # If connection parameters are provided, create a new connection and store them
    if host and port and username and password and database:
        # Store the connection parameters for future reconnections
        connection_params = {
            "host": host,
            "port": port,
            "username": username,
            "password": password,
            "database": database
        }
        # Close existing connection if any
        if db_pool:
            await db_pool.close()
            db_pool = None

        # Create connection URL from parameters
        # URL encode username and password to handle special characters
        encoded_username = urllib.parse.quote_plus(username)
        encoded_password = urllib.parse.quote_plus(password)


        database_url = f"postgresql://{encoded_username}:{encoded_password}@{host}:{port}/{database}"

        try:
            print(f"Connecting to database at {host}:{port}/{database} with username {username}")
            db_pool = await asyncpg.create_pool(database_url)

            # Verify connection by executing a simple query
            async with db_pool.acquire() as conn:
                await conn.execute("SELECT 1")

            is_connected = True
            print(f"Connection successful! is_connected = {is_connected}")
        except Exception as e:
            is_connected = False
            print(f"Error connecting to database: {str(e)}")
            if db_pool:
                await db_pool.close()
                db_pool = None
            raise e
    # If we're using an existing connection, verify it's still valid
    elif db_pool:
        try:
            print("Verifying existing connection...")
            # Verify connection by executing a simple query
            async with db_pool.acquire() as conn:
                await conn.execute("SELECT 1")

            is_connected = True
            print(f"Existing connection verified successfully. is_connected = {is_connected}")
        except Exception as e:
            is_connected = False
            print(f"Error verifying existing connection: {str(e)}")
            if db_pool:
                await db_pool.close()
                db_pool = None

    # If not connected but we have stored credentials, try to reconnect
    if not is_connected and not db_pool and all(connection_params.values()):
        print("Attempting to reconnect using stored credentials...")
        try:
            # Create connection URL from stored parameters
            encoded_username = urllib.parse.quote_plus(connection_params["username"])
            encoded_password = urllib.parse.quote_plus(connection_params["password"])

            database_url = f"postgresql://{encoded_username}:{encoded_password}@{connection_params['host']}:{connection_params['port']}/{connection_params['database']}"

            print(f"Reconnecting to database at {connection_params['host']}:{connection_params['port']}/{connection_params['database']} with username {connection_params['username']}")
            db_pool = await asyncpg.create_pool(database_url)

            # Verify connection by executing a simple query
            async with db_pool.acquire() as conn:
                await conn.execute("SELECT 1")

            is_connected = True
            print(f"Reconnection successful! is_connected = {is_connected}")
        except Exception as e:
            is_connected = False
            print(f"Error reconnecting to database: {str(e)}")
            if db_pool:
                await db_pool.close()
                db_pool = None
    # Return None if not connected to prevent using an invalid connection
    if not is_connected:
        return None

    return db_pool

async def close_db():
    """
    Closes the database connection pool if it exists.
    This function should be called during the application shutdown.
    """
    global db_pool, is_connected, connection_params
    if db_pool:
        await db_pool.close()
        db_pool = None

    # Reset connection status and parameters
    is_connected = False
    connection_params = {
        "host": None,
        "port": None,
        "username": None,
        "password": None,
        "database": None
    }
