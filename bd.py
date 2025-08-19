import sqlite3
from pathlib import Path

DB_PATH = Path("/storage/emulated/0/MASSAGER/chat.db")

def init_db():
    """Инициализация БД с индексами"""
    conn = sqlite3.connect(DB_PATH)
    try:
        c = conn.cursor()
        
        # Таблицы
        c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            nickname TEXT NOT NULL
        )''')
        
        c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            user TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        c.execute('''
        CREATE TABLE IF NOT EXISTS user_chats (
            username TEXT,
            chat_id TEXT,
            PRIMARY KEY (username, chat_id)
        )''')
        
        # Индексы
        c.execute('CREATE INDEX IF NOT EXISTS idx_msg_chat ON messages (chat_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_msg_user ON messages (user)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_uchats_user ON user_chats (username)')
        
        conn.commit()
    finally:
        conn.close()

def get_db():
    """Безопасное подключение с обработкой ошибок"""
    try:
        return sqlite3.connect(DB_PATH, isolation_level=None)
    except sqlite3.Error as e:
        print(f"DB connection error: {e}")
        raise

# Инициализация при первом запуске
if not DB_PATH.exists():
    init_db()