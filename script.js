/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Replace this placeholder with your deployed Cloudflare Worker URL.
const WORKER_URL = "https://your-worker-url.workers.dev/";

const SYSTEM_PROMPT =
  "You are a helpful L'Oréal beauty assistant. Only answer questions about L'Oréal products, routines, skincare, makeup, haircare, fragrance, or beauty recommendations. If a user asks something unrelated, politely say you can only help with L'Oréal beauty topics.";

const promptButtons = document.querySelectorAll(".prompt-pill");
const clearChatButton = document.getElementById("clearChatBtn");

let conversation = [{ role: "system", content: SYSTEM_PROMPT }];
let userName = "friend";

function addMessage(role, content) {
  const messageWrapper = document.createElement("div");
  messageWrapper.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;

  messageWrapper.appendChild(bubble);
  chatWindow.appendChild(messageWrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageWrapper;
}

function addTypingIndicator() {
  const messageWrapper = document.createElement("div");
  messageWrapper.className = "message assistant";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';

  messageWrapper.appendChild(bubble);
  chatWindow.appendChild(messageWrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageWrapper;
}

function showGreeting() {
  chatWindow.innerHTML = "";
  addMessage(
    "assistant",
    "Bonjour! I’m your L’Oréal Beauty Assistant. Ask me about skincare, makeup, haircare, fragrance, or a routine.",
  );
}

function looksRelevant(text) {
  const lowerText = text.toLowerCase();
  const keywords = [
    "loreal",
    "l’oréal",
    "skincare",
    "makeup",
    "haircare",
    "fragrance",
    "beauty",
    "routine",
    "product",
    "recommend",
  ];

  return keywords.some((keyword) => lowerText.includes(keyword));
}

function rememberName(text) {
  const nameMatch = text.match(/my name is ([a-zA-ZÀ-ÿ]+(?: [a-zA-ZÀ-ÿ]+)*)/i);
  if (nameMatch) {
    userName = nameMatch[1];
  }
}

function isWorkerConfigured() {
  return !WORKER_URL.includes("your-worker-url");
}

function fillPrompt(prompt) {
  userInput.value = prompt;
  userInput.focus();
}

showGreeting();

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    fillPrompt(button.dataset.prompt);
  });
});

clearChatButton.addEventListener("click", () => {
  conversation = [{ role: "system", content: SYSTEM_PROMPT }];
  showGreeting();
});

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage) {
    return;
  }

  rememberName(userMessage);
  userInput.value = "";

  addMessage("user", userMessage);

  if (!looksRelevant(userMessage)) {
    const refusal = `I can only help with L’Oréal products, routines, and beauty recommendations. Ask me about skincare, makeup, haircare, or fragrance and I’ll be happy to assist.`;
    conversation.push({ role: "assistant", content: refusal });
    addMessage("assistant", refusal);
    return;
  }

  const loadingMessage = addTypingIndicator();
  const sendButton = document.getElementById("sendBtn");
  sendButton.disabled = true;
  userInput.disabled = true;

  conversation.push({ role: "user", content: userMessage });

  if (!isWorkerConfigured()) {
    loadingMessage.querySelector(".bubble").innerHTML =
      "Please update the Cloudflare Worker URL in script.js so the assistant can reply.";
    sendButton.disabled = false;
    userInput.disabled = false;
    userInput.focus();
    return;
  }

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversation,
      }),
    });

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "I’m sorry, I couldn’t get a response right now.";

    conversation.push({ role: "assistant", content: reply });
    loadingMessage.querySelector(".bubble").textContent = reply;
  } catch (error) {
    loadingMessage.querySelector(".bubble").textContent =
      "I’m having trouble connecting to the worker right now. Please update the worker URL in script.js and try again.";
  } finally {
    sendButton.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
});
