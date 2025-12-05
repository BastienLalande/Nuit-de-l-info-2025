const responses = [
    "Salut ! Comment puis-je t'aider aujourd'hui ?",
    "Je ne suis qu'un simple bot, mais je suis là pour discuter !",
    "Interessant, raconte m'en plus.",
    "Désolé, je n'ai pas compris. Peux-tu reformuler ?",
    "Haha, c'est amusant !",
    "Je suis là si tu as besoin de parler.",
    "Peux-tu préciser ta question ?",
    "Bonne journée à toi !",
    "C'est une bonne question.",
    "Tu veux parler de quelque chose en particulier ?"
  ];
  
  function getRandomBotResponse() {
    const randIndex = Math.floor(Math.random() * responses.length);
    return responses[randIndex];
  }
  
  /* =========================
     Helpers UI
     ========================= */
  const messagesEl = document.getElementById('messages');
  const formEl = document.getElementById('chat-form');
  const inputEl = document.getElementById('userInput');
  const chatEl = document.getElementById('chat');
  
  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  function sendBotMsg() {
    const div = document.createElement('div');
    div.className = "msg bot";
    div.textContent = getRandomBotResponse();
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }
  
  /* =========================
     Interactions
     ========================= */
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    inputEl.value = '';
    setTimeout(sendBotMsg, 400);
  });
  
  // Ouverture/fermeture au clavier (Entrée/Espace) quand focus sur le container
  chatEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const expanded = chatEl.getAttribute('aria-expanded') === 'true';
      chatEl.setAttribute('aria-expanded', String(!expanded));
      if (!expanded) {
        // Donner le focus au champ
        setTimeout(() => inputEl?.focus(), 0);
      }
      e.preventDefault();
    }
  });
  
  // Cliquer sur la bulle ouvre/ferme (mobile friendly)
  chatEl.addEventListener('click', (e) => {
    // Si on clique hors des éléments interactifs déjà visibles, toggle
    const isExpanded = chatEl.getAttribute('aria-expanded') === 'true';
    // Si déjà élargi et qu'on clique dans le formulaire ou messages, ne pas fermer
    const target = e.target;
    const clickedInsideExpandedContent = target.closest('.input-area') || target.closest('.messages') || target.closest('.chat-header');
    if (!isExpanded || (!clickedInsideExpandedContent && window.matchMedia('(max-width: 640px)').matches)) {
      chatEl.setAttribute('aria-expanded', String(!isExpanded));
      if (!isExpanded) setTimeout(() => inputEl?.focus(), 0);
    }
  });