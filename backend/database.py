
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        return psycopg2.connect(database_url)

    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "intelligent_alarm"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )
def check_database_connection():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT
                current_database(),
                current_user,
                inet_server_addr(),
                inet_server_port()
        """)

        print("DATABASE CONNECTION:", cursor.fetchone())

        cursor.execute("""
            SELECT COUNT(*)
            FROM habit_scores
            WHERE user_id = 1
        """)

        print("USER 1 HABIT SCORE COUNT:", cursor.fetchone()[0])

    finally:
        cursor.close()
        connection.close()