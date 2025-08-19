const socket = io();

let username = "";
let currentChatId = "general"; // по умолчанию

const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');
const chatHeader = document.getElementById('chatHeader');
const chatWindow = document.getElementById('chatWindow');
const chatList = document.getElementById('chatList');

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('nicknameModal');
  const loginBtn = document.getElementById('loginBtn');
  const loginUsername = document.getElementById('loginUsername');
  const registerBtn = document.getElementById('registerBtn');
  const regNickname = document.getElementById('regNickname');
  const regUsername = document.getElementById('regUsername');

  const tabLoginBtn = document.getElementById('tabLogin');
  const tabRegisterBtn = document.getElementById('tabRegister');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const sidebar = document.getElementById('sidebar');

  // Показать модалку
  modal.style.display = 'flex';

  // Переключение вкладок
  tabLoginBtn.onclick = () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  };
  tabRegisterBtn.onclick = () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  };

  // Общая функция после входа/регистрации
  function completeLogin(name) {
    username = name;

    modal.style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    sidebar.style.display = 'flex';
    chatWindow.style.display = 'flex';
    document.getElementById('inputArea').style.display = 'flex';

    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';

    const chatId = `fav_${username}`; // Избранное
    const chatBtn = document.createElement('div');
    chatBtn.className = 'chat-avatar';
    chatBtn.textContent = 'И';
    chatBtn.title = 'Избранное';
    chatBtn.onclick = () => switchChat(chatId);
    chatList.appendChild(chatBtn);

    switchChat(chatId);
  }

  // Вход
  if (loginBtn && loginUsername) {
    loginBtn.onclick = () => {
      const input = loginUsername.value.trim();
      if (!input) return alert('Введите username для входа');
      completeLogin(input);
    };

    loginUsername.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loginBtn.click();
    });
  }

  // Регистрация
  if (registerBtn && regNickname && regUsername) {
    registerBtn.onclick = () => {
      const nick = regNickname.value.trim();
      const user = regUsername.value.trim();
      if (!nick || !user) return alert('Введите ник и username');
      // Тут можно добавить проверку, свободен ли username
      completeLogin(user);
    };

    regUsername.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') registerBtn.click();
    });
  }
});

socket.on('user_chats', (data) => {
  chatList.innerHTML = '';

  // Добавим вручную "Избранное" первым
  const favChatId = `fav_${username}`;
  const favBtn = document.createElement('div');
  favBtn.className = 'chat-avatar';
  favBtn.textContent = "★";
  favBtn.title = "Избранное";
  favBtn.onclick = () => switchChat(favChatId);
  chatList.appendChild(favBtn);

  // Остальные чаты
  data.chats.forEach(chatId => {
    if (chatId === favChatId) return; // не дублируем
    const chatBtn = document.createElement('div');
    chatBtn.className = 'chat-avatar';
    chatBtn.textContent = getInitials(chatId);
    chatBtn.title = chatId;
    chatBtn.onclick = () => switchChat(chatId);
    chatList.appendChild(chatBtn);
  });

  switchChat(favChatId); // стартуем с Избранного
});

function switchChat(chatId) {
  if (currentChatId === chatId) return;

  socket.emit('leave_chat', { chat_id: currentChatId });
  currentChatId = chatId;
  messagesContainer.innerHTML = "";

  // Устанавливаем правильный заголовок чата
  if (chatId === "general") {
    chatHeader.textContent = "Общий чат";
  } else if (chatId.startsWith("fav_")) {
    chatHeader.textContent = "Избранное";
  } else {
    chatHeader.textContent = chatId;
  }

  socket.emit('join_chat', { username, chat_id: chatId });
}

socket.on('chat_history', (data) => {
  if (data.chat_id !== currentChatId) return;

  messagesContainer.innerHTML = '';
  data.history.forEach(msg => {
    renderMessage(msg.user, msg.text, msg.user === username);
  });
  scrollToBottom();
});

socket.on('chat_message', (data) => {
  if (data.chat_id !== currentChatId) return;

  renderMessage(data.user, data.text, data.user === username);
  scrollToBottom();
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || !username) return;

  renderMessage(username, message, true);
  socket.emit('chat_message', {
    chat_id: currentChatId,
    user: username,
    text: message
  });

  messageInput.value = '';
  scrollToBottom();
}

function renderMessage(user, text, isMine) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isMine ? 'sent' : 'received'}`;
  messageElement.innerHTML = `<strong>${user}</strong><br>${text}`;
  messagesContainer.appendChild(messageElement);
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function getInitials(chatId) {
  if (chatId === "general") return "G";
  const parts = chatId.split('_');
  return parts.map(p => p[0]?.toUpperCase() || '').join('').slice(0, 2);
}
