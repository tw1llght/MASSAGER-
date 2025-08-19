from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
from bd import get_db
import threading
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*")
lock = threading.Lock()

def register_user(username, nickname):
    """Регистрация нового пользователя"""
    with lock:
        with get_db() as conn:  # Используем контекстный менеджер
            cursor = conn.cursor()
            cursor.execute('SELECT 1 FROM users WHERE username = ?', (username,))
            if cursor.fetchone():
                return False
            
            cursor.execute('INSERT INTO users VALUES (?, ?)', (username, nickname))
            cursor.execute('INSERT INTO user_chats VALUES (?, ?)', (username, "general"))
            conn.commit()
            return True

def get_nickname(username):
    """Получение никнейма пользователя"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT nickname FROM users WHERE username = ?', (username,))
        result = cursor.fetchone()
        return result[0] if result else None

def load_history(chat_id, current_user=None):
    """Загрузка истории сообщений"""
    with get_db() as conn:
        cursor = conn.cursor()
        if chat_id.startswith("fav_") and current_user:
            cursor.execute('''
                SELECT user, text, strftime('%Y-%m-%d %H:%M:%S', timestamp) 
                FROM messages 
                WHERE chat_id = ? AND user = ?
                ORDER BY timestamp
            ''', (chat_id, current_user))
        else:
            cursor.execute('''
                SELECT user, text, strftime('%Y-%m-%d %H:%M:%S', timestamp) 
                FROM messages 
                WHERE chat_id = ? 
                ORDER BY timestamp
            ''', (chat_id,))
        
        return [{"user": row[0], "text": row[1], "timestamp": row[2]} for row in cursor.fetchall()]

def save_message(chat_id, user, text):
    """Сохранение сообщения"""
    with lock:
        with get_db() as conn:
            conn.execute('INSERT INTO messages (chat_id, user, text) VALUES (?, ?, ?)', 
                        (chat_id, user, text))
            conn.commit()

def get_user_chats(username):
    """Получение списка чатов"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT chat_id FROM user_chats 
            WHERE username = ? AND chat_id != ?
        ''', (username, f"fav_{username}"))
        chats = [row[0] for row in cursor.fetchall()]
        chats.insert(0, f"fav_{username}")
        return chats

@app.route('/')
def home():
    return render_template('index.html')

@socketio.on('join_chat')
def on_join_chat(data):
    username = data.get('username')
    chat_id = data.get('chat_id', 'general')

    if chat_id.startswith("fav_"):
        owner = chat_id.replace("fav_", "")
        if username != owner:
            return

    join_room(chat_id)
    history = load_history(chat_id, username)
    emit('chat_history', {'chat_id': chat_id, 'history': history})

@socketio.on('leave_chat')
def on_leave_chat(data):
    leave_room(data.get('chat_id', 'general'))

@socketio.on('chat_message')
def handle_message(data):
    chat_id = data.get('chat_id', 'general')
    user = data.get('user')
    text = data.get('text')
    
    if not all([chat_id, user, text]):
        return

    if chat_id.startswith("fav_"):
        owner = chat_id.replace("fav_", "")
        if user != owner:
            return

    save_message(chat_id, user, text)
    emit('chat_message', {'chat_id': chat_id, 'user': user, 'text': text}, 
         room=chat_id, include_self=False)

@socketio.on('get_user_chats')
def handle_get_user_chats(data):
    if username := data.get('username'):
        emit('user_chats', {'chats': get_user_chats(username)})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)