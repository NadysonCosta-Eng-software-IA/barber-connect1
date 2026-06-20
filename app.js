// ⚠️ Link do backend no Render (Usado para servir os arquivos e rotas)
const API_URL = 'https://barber-connect-javascript.onrender.com';

let chatOpen = false;

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

// ── FORMULÁRIO DE CONTATO TRADICIONAL (Abaixo da página) ──
function enviarFormulario() {
  const nome = document.getElementById('fname').value.trim();
  const tel  = document.getElementById('fphone').value.trim();
  const servico  = document.getElementById('fservice').value.trim();
  const mensagem1  = document.getElementById('fmsg').value.trim();

  if (!nome || !tel) { 
    alert('Por favor, preencha ao menos nome e telefone.'); 
    return; 
  }

  const numeroWhats = "5586994517396"; 

  const mensagem = `Olá! Gostaria de solicitar um agendamento:\n\n` +
                   `*Nome:* ${nome}\n` +
                   `*Telefone de contato:* ${tel}\n` +
                   `*Serviço:* ${servico}\n` +
                   `*Data/Hora:* ${mensagem1}`;

  const mensagemCodificada = encodeURIComponent(mensagem);
  const urlWhatsapp = `https://api.whatsapp.com/send?phone=${numeroWhats}&text=${mensagemCodificada}`;

  document.getElementById('formSuccess').style.display = 'block';
  
  setTimeout(() => {
    document.getElementById('formSuccess').style.display = 'none';
    window.open(urlWhatsapp, '_blank');
  }, 1000);
}

// ══════════════════════════════════════════════════
// CHATBOT ESTRUTURADO POR BOTÕES (SEM IA)
// ══════════════════════════════════════════════════

let currentStep = 'inicio';
let dadosAgendamento = {
  nome: '',
  telefone: '',
  servico: '',
  profissional: '',
  horario: ''
};
let chatTimeout; // Guarda o temporizador ativo

// Função que será executada se o usuário demorar demais

function estourouTempoInatividade() {
  addBotMessage('Parece que você ficou um tempinho fora... ⏱️ Por segurança e para manter nosso sistema organizado, encerrei este atendimento.');
  addBotMessage('Se quiser tentar novamente, basta abrir o chat ou digitar "Olá"!');
  resetarAgendamento();
}

// Função que gerencia o reset do temporizador a cada passo
function gerenciarTimerInatividade() {
  // Cancela o timer anterior se ele existir
  if (chatTimeout) clearTimeout(chatTimeout);

  // Define um novo timer. O tempo é dado em milissegundos.
  // Exemplos: 60000 = 1 minuto | 120000 = 2 minutos | 180000 = 3 minutos
  chatTimeout = setTimeout(estourouTempoInatividade, 10000); 
}

// Listas atualizadas baseadas no seu HTML oficial
const servicosDisponiveis = [
  'Corte Clássico – R$ 45,00', 
  'Barba Completa – R$ 35,00', 
  'Combo Premium – R$ 90,00',
  'Hidratação Capilar – R$ 55,00',
  'Luzes & Coloração – R$ 120,00',
  'Sobrancelha Design – R$ 20,00'
];
const profissionais = ['Marcos Oliveira (Master)', 'Rafael Santos (Sênior)', 'Diego Costa (Colorista)', 'Bruno Mendes'];
const horarios = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

// Abre e fecha a janela do chat
function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chat-window');
  win.style.display = chatOpen ? 'flex' : 'none';
  
  const badge = document.getElementById('chat-badge');
  if (badge) badge.style.display = 'none';
  
  // Dispara a saudação inicial na primeira vez que abre
  if (chatOpen && currentStep === 'inicio') {
    processarFluxoChat('');
  }
}

// Controla o fluxo de perguntas e respostas por texto
function processarFluxoChat(mensagemUsuario) {
  gerenciarTimerInatividade();
  const inputField = document.getElementById('chat-input');
  
  // Lista de saudações comuns para o bot ignorar na etapa do nome
  const saudacoes = [
    'ola', 'olá', 'oi', 'oie', 'bom dia', 'boa tarde', 'boa noite', 
    'eae', 'eaí', 'opa', 'salve', 'tudo bem', 'tudo bom'
  ];

  // Normaliza a mensagem (remove espaços extras e deixa tudo em minúsculo)
  const mensagemLimpa = mensagemUsuario.trim().toLowerCase();

  switch (currentStep) {
    case 'inicio':
      addBotMessage('Olá! Bem-vindo à Barber Connect. Para iniciarmos o seu agendamento, qual o seu nome?');
      currentStep = 'aguardando_nome';
      break;

    case 'aguardando_nome':
      // Se o usuário digitou apenas uma saudação, o bot não avança e pede o nome de novo
      if (saudacoes.includes(mensagemLimpa) || mensagemLimpa.length < 2) {
        addBotMessage('Para eu poder te ajudar, por favor, me diga o seu **nome** primeiro: 😊');
        return; // Para a execução aqui e espera o nome real
      }

      dadosAgendamento.nome = mensagemUsuario;
      addBotMessage(`Prazer, ${mensagemUsuario}! Qual o seu telefone de contato com DDD?`);
      currentStep = 'aguardando_telefone';
      break;

    case 'aguardando_telefone':
      dadosAgendamento.telefone = mensagemUsuario;
      inputField.disabled = true; // Desativa teclado para priorizar os botões
      document.getElementById('suggestions').style.display = 'none'; // Oculta sugestões estáticas
      
      addBotMessage('Este número informado é WhatsApp? Podemos falar com você por lá se necessário?');
      adicionarBotoesOpcoes(['Sim, pode ser!', 'Não, apenas ligação'], (escolha) => {
        addBotMessage('Excelente! Vamos selecionar o serviço.');
        exibirOpcoesServico();
      });
      break;
  }
}

function exibirOpcoesServico() {
  gerenciarTimerInatividade();
  currentStep = 'aguardando_servico';
  addBotMessage('Qual serviço você deseja agendar hoje?');
  adicionarBotoesOpcoes(servicosDisponiveis, (servicoEscolhido) => {
    dadosAgendamento.servico = servicoEscolhido;
    exibirOpcoesProfissional();
  });
}

function exibirOpcoesProfissional() {
  gerenciarTimerInatividade();
  currentStep = 'aguardando_profissional';
  addBotMessage('Perfeito. Qual profissional você prefere para o atendimento?');
  adicionarBotoesOpcoes(profissionais, (profissionalEscolhido) => {
    dadosAgendamento.profissional = profissionalEscolhido;
    exibirOpcoesHorario();
  });
}

function exibirOpcoesHorario() {
  gerenciarTimerInatividade();
  currentStep = 'aguardando_horario';
  addBotMessage('E qual o melhor horário para você?');
  adicionarBotoesOpcoes(horarios, (horarioEscolhido) => {
    dadosAgendamento.horario = horarioEscolhido;
    
    addBotMessage('Tudo pronto! Confirmamos seus dados. Deseja finalizar o atendimento e enviar os detalhes para o nosso WhatsApp?');
    adicionarBotoesOpcoes(['Sim, finalizar no WhatsApp 💬', 'Cancelar agendamento 🔄'], (opcaoFinal) => {
      if (opcaoFinal.includes('Sim')) {
        enviarParaOWhatsApp();
      } else {
        addBotMessage('Agendamento cancelado. Digite "Olá" ou reabra o chat para reiniciar.');
        resetarAgendamento();
      }
    });
  });
}

// Cria dinamicamente os grupos de botões na janela do chat
function adicionarBotoesOpcoes(opcoes, callback) {
  const msgsContainer = document.getElementById('chat-messages');
  const botonsDiv = document.createElement('div');
  botonsDiv.className = 'chat-buttons-group';

  opcoes.forEach(opcao => {
    const botao = document.createElement('button');
    botao.innerText = opcao;
    botao.className = 'btn-chat-opcao';
    botao.onclick = () => {
      botonsDiv.remove(); 
      addUserMessage(opcao); 
      callback(opcao); 
    };
    botonsDiv.appendChild(botao);
  });

  msgsContainer.appendChild(botonsDiv);
  msgsContainer.scrollTop = msgsContainer.scrollHeight;
}

// Captura envio do input de digitação padrão
function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  addUserMessage(text);

  // Envia o texto para a validação do script ativo
  processarFluxoChat(text);
}

// Respostas automáticas rápidas para os botões de sugestões fixas do cabeçalho
function sendSuggestion(text) {
  addUserMessage(text);
  document.getElementById('suggestions').style.display = 'none';
  
  if (text.toLowerCase().includes('agendar') || text.toLowerCase().includes('serviços') || text.toLowerCase().includes('preços')) {
    currentStep = 'inicio';
    processarFluxoChat('');
  } else if (text.toLowerCase().includes('horário')) {
    addBotMessage('Nosso horário de funcionamento é de Segunda a Sexta das 09h às 20h, e aos Sábados das 08h às 18h.');
  }
}

// Renderiza mensagem do Bot na janela
function addBotMessage(text) {
  const msgs = document.getElementById('chat-messages');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'message bot-message'; // Compatibilizado com classes injetadas
  div.innerHTML = `<div class="msg-bubble">${escapeHtml(text).replace(/\n/g,'<br>')}</div><div class="msg-time" style="font-size:0.7rem; color:gray; margin-top:2px; padding-left:5px;">${now}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// Renderiza mensagem do Usuário na janela
function addUserMessage(text) {
  const msgs = document.getElementById('chat-messages');
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'message user-message';
  div.innerHTML = `<div class="msg-bubble" style="background-color: var(--gold, #d4af37); color: black; margin-left: auto; border-radius: 15px 15px 0 15px; padding: 10px; max-width: 80%; width: fit-content;">${escapeHtml(text)}</div><div class="msg-time" style="font-size:0.7rem; color:gray; text-align: right; margin-top:2px; padding-right:5px;">${now}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Dispara o link do WhatsApp finalizando o atendimento
function enviarParaOWhatsApp() {
  const numeroWhats = "5586994517396"; 
  
  const textoMensagem = `*NOVO AGENDAMENTO VIA CHATBOT*\n\n` +
                        `👤 *Cliente:* ${dadosAgendamento.nome}\n` +
                        `📞 *Contato:* ${dadosAgendamento.telefone}\n` +
                        `✂️ *Serviço:* ${dadosAgendamento.servico}\n` +
                        `💈 *Profissional:* ${dadosAgendamento.profissional}\n` +
                        `⏰ *Horário:* ${dadosAgendamento.horario}`;

  const linkFinal = `https://api.whatsapp.com/send?phone=${numeroWhats}&text=${encodeURIComponent(textoMensagem)}`;
  
  window.open(linkFinal, '_blank');
  resetarAgendamento();
}

function resetarAgendamento() {
  if (chatTimeout) clearTimeout(chatTimeout); // 👈 ADICIONE ESTA LINHA AQUI
  
  currentStep = 'inicio';
  dadosAgendamento = { nome: '', telefone: '', servico: '', profissional: '', horario: '' };
  document.getElementById('chat-input').disabled = false;
  document.getElementById('suggestions').style.display = 'flex';
}