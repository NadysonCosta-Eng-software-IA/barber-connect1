// ⚠️ TROCAR AQUI depois do deploy no Render:
// Ex: 'https://barber-connect-backend.onrender.com'
const API_URL = 'http://localhost:3000';

// ── NAVBAR SCROLL ──
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

// ── HAMBURGER ──
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('mobile-open');
}

// ── REVEAL ON SCROLL ──
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── FORMULÁRIO DE CONTATO (visual, não grava no banco) ──
function enviarFormulario() {
  const nome = document.getElementById('fname').value.trim();
  const tel  = document.getElementById('fphone').value.trim();
  if (!nome || !tel) { alert('Por favor, preencha ao menos nome e telefone.'); return; }
  document.getElementById('formSuccess').style.display = 'block';
  setTimeout(() => document.getElementById('formSuccess').style.display = 'none', 5000);
}

// ══════════════════════════════════════════════════
// CHATBOT — conectado ao backend Node + Express + SQLite
// O histórico desta variável é só o que aparece na tela;
// quem decide function calling e grava no banco é o server.mjs
// ══════════════════════════════════════════════════
let chatOpen = false;
let chatHistory = []; // formato: [{role:'user',parts:[{text}]}, {role:'model',parts:[{text}]}]

function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chat-window');
  win.classList.toggle('open', chatOpen);
  document.getElementById('chat-badge').style.display = 'none';
  if (chatOpen && chatHistory.length === 0) {
    addBotMessage('Olá! Sou o BarberBot da Barber Connect. 💈 Como posso te ajudar hoje?');
  }
}

function addBotMessage(text) {
  const msgs = document.getElementById('chat-messages');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'msg msg-bot';
  div.innerHTML = `<div class="msg-bubble">${escapeHtml(text).replace(/\n/g,'<br>')}</div><div class="msg-time">${now}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addUserMessage(text) {
  const msgs = document.getElementById('chat-messages');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'msg msg-user';
  div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div><div class="msg-time">${now}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function showTyping() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg msg-bot'; div.id = 'typing';
  div.innerHTML = `<div class="msg-bubble typing-indicator"><span></span><span></span><span></span></div>`;
  msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

function sendSuggestion(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  addUserMessage(text);
  document.getElementById('suggestions').style.display = 'none';
  showTyping();

  // Aviso de "acordando servidor" — relevante no free tier do Render,
  // onde o backend dorme após 15 min sem uso e a 1ª resposta pode demorar
  const coldStartTimer = setTimeout(() => {
    const typingEl = document.getElementById('typing');
    if (typingEl) {
      typingEl.querySelector('.msg-bubble').outerHTML =
        '<div class="msg-bubble">Ainda a processar... o servidor pode estar "acordando" (pode levar até 1 minuto na primeira mensagem).</div>';
    }
  }, 6000);

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory })
    });

    clearTimeout(coldStartTimer);

    if (!res.ok) throw new Error('Erro na resposta do servidor');

    const data = await res.json();
    const botText = data.text || 'Desculpe, não consegui processar sua mensagem.';

    removeTyping();
    addBotMessage(botText);

    // Mantém o histórico no formato esperado pelo server.mjs / Gemini
    chatHistory.push({ role: 'user', parts: [{ text }] });
    chatHistory.push({ role: 'model', parts: [{ text: botText }] });

  } catch (e) {
    clearTimeout(coldStartTimer);
    console.error('Erro na comunicação com o backend:', e);
    removeTyping();
    addBotMessage('Desculpe, encontrei um problema ao me conectar ao sistema de agendamentos. Tente novamente em instantes, ou entre em contato pelo telefone (86) 9 9999-0001.');
  }
}
