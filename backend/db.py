import sqlite3
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = sqlite3.connect('badminton.db')
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Initialize the database with required tables"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Match table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS match (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            match_number TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            court TEXT NOT NULL,
            umpire TEXT,
            service_judge TEXT,
            start_time TEXT,
            end_time TEXT,
            duration TEXT,
            shuttles_used INTEGER DEFAULT 0,
            max_points INTEGER DEFAULT 21,
            total_sets INTEGER DEFAULT 3,
            deuce_enabled BOOLEAN DEFAULT 1,
            player1 TEXT NOT NULL,
            player2 TEXT NOT NULL,
            status TEXT DEFAULT 'scheduled',
            current_set INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Score table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS score (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            set_number INTEGER NOT NULL,
            player1_score INTEGER DEFAULT 0,
            player2_score INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES match (id) ON DELETE CASCADE
        )
        ''')
        
        # Player table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS player (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            team TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Settings table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Insert default settings
        cursor.execute('''
        INSERT OR IGNORE INTO settings (key, value) VALUES
        ('default_max_points', '21'),
        ('default_total_sets', '3'),
        ('default_deuce_enabled', '1'),
        ('default_courts', '1,2,3,4'),
        ('default_event_types', 'Singles,Doubles,Mixed Doubles')
        ''')
        
        conn.commit()

def get_db():
    """Get a database connection"""
    return get_db_connection()