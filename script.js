// Chat functionality + Denuncia (local) + base de conocimiento simple

let chatOpen = false

function toggleChat() {
  const chatContainer = document.getElementById("chatContainer")
  chatOpen = !chatOpen
  if (chatContainer) {
    chatContainer.style.display = chatOpen ? "flex" : "none"
    chatContainer.setAttribute("aria-hidden", String(!chatOpen))
    if (chatOpen) {
      const input = document.getElementById("messageInput")
      setTimeout(() => input && input.focus(), 120)
    }
  }
}

function openChat() {
  const chatContainer = document.getElementById("chatContainer")
  chatOpen = true
  if (chatContainer) {
    chatContainer.style.display = "flex"
    chatContainer.setAttribute("aria-hidden", "false")
    const input = document.getElementById("messageInput")
    setTimeout(() => input && input.focus(), 120)
  }
}

function closeChat() {
  const chatContainer = document.getElementById("chatContainer")
  chatOpen = false
  if (chatContainer) {
    chatContainer.style.display = "none"
    chatContainer.setAttribute("aria-hidden", "true")
  }
}

function sendMessage() {
  const input = document.getElementById("messageInput")
  if (!input) return
  const message = input.value.trim()
  if (!message) return

  addMessage(message, "user")
  input.value = ""
  showTypingIndicator(true)

  // preparar historial reducido (últimos 20 mensajes) para contexto
  const hist = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]")
  const last = hist.slice(-20).map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }))

  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: last }),
  })
    .then((r) => {
      if (!r.ok) throw new Error("no backend")
      return r.json()
    })
    .then((data) => {
      const reply = data?.reply || getAssistantResponse(message)
      showTypingIndicator(false)
      addMessage(reply, "assistant")
    })
    .catch((err) => {
      // fallback local si no hay servidor o falla la petición
      console.warn("Fallo al llamar al backend de IA, usando KB local:", err)
      const reply = getAssistantResponse(message)
      showTypingIndicator(false)
      addMessage(reply, "assistant")
    })
}

function addMessage(text, sender) {
  const messagesContainer = document.getElementById("chatMessages")
  if (!messagesContainer) return

  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${sender}`

  const contentDiv = document.createElement("div")
  contentDiv.className = "message-content"
  contentDiv.innerHTML = sanitize(text)

  messageDiv.appendChild(contentDiv)
  messagesContainer.appendChild(messageDiv)
  messagesContainer.scrollTop = messagesContainer.scrollHeight

  // guardar historial (mantener tamaño razonable)
  saveChatMessage({ id: `m-${Date.now()}`, sender, text, time: new Date().toISOString() })
}

function sanitize(str) {
  return String(str).replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>")
}

/* --- Persistencia y gestión de historial de chat --- */
const CHAT_KEY = "apoyo_seguro_chat_history"
const CHAT_MAX = 200

function saveChatMessage(msg) {
  try {
    const hist = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]")
    hist.push(msg)
    if (hist.length > CHAT_MAX) hist.splice(0, hist.length - CHAT_MAX)
    localStorage.setItem(CHAT_KEY, JSON.stringify(hist))
  } catch (e) {
    console.warn("No se pudo guardar historial de chat:", e)
  }
}

function loadChatHistory() {
  try {
    const hist = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]")
    const messagesContainer = document.getElementById("chatMessages")
    if (!messagesContainer) return
    messagesContainer.innerHTML = ""
    if (!hist || hist.length === 0) {
      // mensaje inicial del asistente (no duplicar en storage)
      const welcome = "Hola, soy tu asistente de apoyo. Pregúntame cualquier cosa sobre el bullying o cuéntame cómo te sientes."
      const msgDiv = document.createElement("div")
      msgDiv.className = "message assistant"
      const contentDiv = document.createElement("div")
      contentDiv.className = "message-content"
      contentDiv.innerHTML = sanitize(welcome)
      msgDiv.appendChild(contentDiv)
      messagesContainer.appendChild(msgDiv)
      messagesContainer.scrollTop = messagesContainer.scrollHeight
      return
    }
    hist.forEach((m) => {
      const messageDiv = document.createElement("div")
      messageDiv.className = `message ${m.sender}`
      const contentDiv = document.createElement("div")
      contentDiv.className = "message-content"
      contentDiv.innerHTML = sanitize(m.text)
      messageDiv.appendChild(contentDiv)
      messagesContainer.appendChild(messageDiv)
    })
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  } catch (e) {
    console.warn("Error leyendo historial de chat:", e)
  }
}

function clearChatHistory() {
  localStorage.removeItem(CHAT_KEY)
  const messagesContainer = document.getElementById("chatMessages")
  if (!messagesContainer) return
  messagesContainer.innerHTML = ""
  const welcome = "Historial borrado. Hola, soy tu asistente de apoyo. ¿En qué puedo ayudarte?"
  const msgDiv = document.createElement("div")
  msgDiv.className = "message assistant"
  const contentDiv = document.createElement("div")
  contentDiv.className = "message-content"
  contentDiv.innerHTML = sanitize(welcome)
  msgDiv.appendChild(contentDiv)
  messagesContainer.appendChild(msgDiv)
  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

/* indicador de escritura */
let typingIndicatorEl = null
function showTypingIndicator(show) {
  const container = document.getElementById("chatMessages")
  if (!container) return
  if (!typingIndicatorEl) {
    typingIndicatorEl = document.createElement("div")
    typingIndicatorEl.className = "message assistant typing-indicator"
    typingIndicatorEl.innerHTML = `<div class="message-content">escribiendo…</div>`
  }
  if (show) {
    container.appendChild(typingIndicatorEl)
    container.scrollTop = container.scrollHeight
  } else {
    if (typingIndicatorEl && typingIndicatorEl.parentNode) typingIndicatorEl.parentNode.removeChild(typingIndicatorEl)
  }
}

/* Base de conocimiento (preguntas frecuentes y guías) */
const knowledgeBase = [
  {
    id: "definicion",
    keywords: ["qué es bullying", "que es bullying", "que es el bullying", "definición", "definicion", "que es el acoso", "acoso escolar"],
    answer:
      "El bullying es un comportamiento agresivo y repetido hacia una persona con un desequilibrio de poder. Puede ser físico, verbal, social o por medios digitales (ciberbullying).",
  },
  {
    id: "tipos",
    keywords: ["tipos", "físico", "fisico", "verbal", "social", "ciberbullying", "cibernético", "cibernetico", "online", "tipo"],
    answer:
      "Tipos comunes: físico (golpes), verbal (insultos, amenazas), social (exclusión, rumores) y ciberbullying (acoso en redes o mensajes).",
  },
  {
    id: "señales",
    keywords: ["señales", "síntomas", "sintomas", "senales", "cambios", "alerta", "síntoma", "sintoma"],
    answer:
      "Señales: cambios en el estado de ánimo, aislamiento, problemas para dormir, bajada en el rendimiento escolar, daños en pertenencias o evasión de ciertos lugares.",
  },
  {
    id: "documentar",
    keywords: ["documentar", "evidencias", "guardar", "captura", "pruebas"],
    answer:
      "Documenta: anota fecha/hora, lugar, personas involucradas, guarda capturas, mensajes y fotos. Mantén copias seguras y organiza la información cronológicamente.",
  },
  {
    id: "reportar",
    keywords: ["reportar", "denuncia", "reporto", "cómo reportar", "como reportar", "informar"],
    answer:
      "Para reportar: habla con un adulto de confianza, notifica a autoridades escolares, conserva evidencia y, si no te responden, escala a la administración o a las autoridades competentes.",
  },
  {
    id: "riesgo",
    keywords: ["peligro", "riesgo", "amenaza", "suicidio", "autolesión", "autolesion", "riesgo inmediato"],
    answer:
      "Si hay riesgo inmediato para tu seguridad o hay amenazas serias, llama a emergencias (911) o busca ayuda urgente de un adulto o servicios de emergencia.",
  },
  {
    id: "ciberbullying",
    keywords: ["internet", "redes", "ciber", "ciberbullying", "online", "mensaje", "instagram", "facebook", "whatsapp"],
    answer:
      "En ciberbullying: guarda capturas, bloquea al agresor, reporta en la plataforma y evita responder. Habla con un adulto y considera reportarlo formalmente si persiste.",
  },
  {
    id: "apoyo",
    keywords: ["ayuda", "apoyo", "consejero", "psicólogo", "psicologo", "amigos", "familia"],
    answer:
      "Busca apoyo con familiares, amigos de confianza, consejeros escolares o profesionales de salud mental. Las líneas de apoyo también pueden ofrecer orientación inmediata.",
  },
  {
    id: "legal",
    keywords: ["legal", "derechos", "ley", "abogado"],
    answer:
      "Tienes derecho a un ambiente seguro. Las universidades suelen tener políticas anti-bullying; documenta todo y consulta la normativa local o busca asesoría legal si es necesario.",
  },
  {
    id: "como ayudar a un amigo",
    keywords: ["amigo", "ayudar a un amigo", "apoyar a un amigo", "apoyar"],
    answer:
      "Si apoyas a alguien: escucha sin juzgar, anima a documentar, acompaña a hablar con un adulto y ofrécele ayuda para reportar o buscar profesional si lo necesita.",
  },
]

function getAssistantResponse(message) {
  const lower = message.toLowerCase()

  // respuestas directas por palabras clave simples
  const quick = {
    "hola": "Hola, me alegra que hayas decidido hablar conmigo. ¿Cómo te sientes hoy?",
    "hola!": "Hola, me alegra que hayas decidido hablar conmigo. ¿Cómo te sientes hoy?",
    "gracias": "De nada. Si necesitas más información, pregúntame cualquier cosa sobre el bullying.",
    "gracias!": "De nada. Si necesitas más información, pregúntame cualquier cosa sobre el bullying.",
    "ayuda": "Dime qué necesitas: ¿información, apoyo emocional, cómo denunciar o dónde conseguir ayuda?",
    "emergencia": "Si estás en peligro inmediato, llama a emergencias (911) ahora mismo.",
  }

  for (const key in quick) {
    if (lower.includes(key)) return quick[key]
  }

  // búsqueda en la base de conocimiento por coincidencia de palabras clave
  const found = findBestKnowledgeAnswer(lower)
  if (found) return found

  // fallback conversacional
  return (
    "Entiendo. Puedo ayudarte con: 1) Definir qué es el bullying; 2) Cómo documentarlo; 3) Cómo reportarlo; 4) Recursos de apoyo. " +
    "Cuéntame más o pregunta por cualquiera de esos temas. Si estás en peligro, llama a emergencias (911)."
  )
}

function findBestKnowledgeAnswer(text) {
  const tokens = tokenize(text)
  let best = { score: 0, answer: null }

  knowledgeBase.forEach((item) => {
    let score = 0
    item.keywords.forEach((k) => {
      const kw = k.toLowerCase()
      if (text.includes(kw)) score += 4
      const ktoks = tokenize(kw)
      ktoks.forEach((t) => {
        if (tokens.includes(t)) score += 1
      })
    })
    if (score > best.score) {
      best = { score, answer: item.answer }
    }
  })

  return best.score >= 2 ? best.answer : null
}

function tokenize(str) {
  return String(str)
    .replace(/[^\wáéíóúñ]+/gi, " ")
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length > 2)
}

// manejador Enter
function handleKeyPress(event) {
  if (event.key === "Enter") {
    event.preventDefault()
    sendMessage()
  }
}

// Action cards functionality (modals)
function showActionInfo(action) {
  const modal = document.getElementById("actionModal")
  const title = document.getElementById("actionModalTitle")
  const content = document.getElementById("actionModalContent")
  if (!modal || !title || !content) return

  const actionInfo = {
    documentar: {
      title: "Cómo Documentar el Bullying",
      content: `
      
                <h2>Pasos para documentar:</h2>
                <br/>
                <div class="action-card1">
                  <ul>
                    <li><strong>Fecha y hora:</strong> Anota cuándo ocurrió cada incidente</li>
                    <li><strong>Lugar:</strong> Dónde sucedió (aula, patio, en línea, etc.)</li>
                    <li><strong>Personas involucradas:</strong> Nombres de agresores y testigos</li>
                    <li><strong>Descripción:</strong> Qué pasó exactamente</li>
                    <li><strong>Evidencias:</strong> Capturas de pantalla, fotos, mensajes</li>
                    <li><strong>Impacto:</strong> Cómo te afectó física y emocionalmente</li>
                </ul>
                <p><strong>Importante:</strong> Guarda toda la información en un lugar seguro.</p>
                </div>
            `,
    },
    hablar: {
      title: "Con Quién Hablar",
      content: ` 
                <h2>Personas de confianza:</h2>
                <br/>
                <div class="action-card1">
                <ul>
                    <li><strong>Familia:</strong> Padres, hermanos mayores, tíos, abuelos</li>
                    <li><strong>Universidad:</strong> Maestros, consejeros, directores</li>
                    <li><strong>Amigos:</strong> Amigos cercanos y sus familias</li>
                    <li><strong>Profesionales:</strong> Psicólogos, trabajadores sociales</li>
                    <li><strong>Líneas de apoyo:</strong> Consejeros especializados</li>
                </ul>
                <p><strong>Recuerda:</strong> No tienes que enfrentar esto solo/a.</p>
            </div>`,
    },
    reportar: {
      title: "Cómo Reportar el Bullying",
      content: `
                <h2>Pasos para reportar:</h2>
                <br/>
                <div class="action-card1">
                <ol>
                    <li><strong>Universidad:</strong> Habla con un maestro o consejero</li>
                    <li><strong>Administración:</strong> Si no hay respuesta, contacta al director</li>
                    <li><strong>Distrito escolar:</strong> Escala al nivel superior si es necesario</li>
                    <li><strong>Autoridades:</strong> En casos graves, contacta a la policía</li>
                    <li><strong>Líneas especializadas:</strong> Llama a números de apoyo</li>
                </ol>
                <p><strong>Importante:</strong> Mantén copias de todos los reportes.</p>
            </div>`,
    },
    proteger: {
    
      title: "Cómo Protegerte",
      content: `
                <h2>Estrategias de protección:</h2>
                
                <br/>
                <div class="action-card1">
                <ul>
                    <li><strong>Evita estar solo/a:</strong> Mantente cerca de amigos o adultos</li>
                    <li><strong>Rutas seguras:</strong> Usa caminos donde haya supervisión</li>
                    <li><strong>Confianza:</strong> Mantén la cabeza alta y camina con seguridad</li>
                    <li><strong>No respondas:</strong> No devuelvas la agresión</li>
                    <li><strong>Busca ayuda:</strong> Grita o pide ayuda si es necesario</li>
                    <li><strong>Tecnología:</strong> Bloquea y reporta en redes sociales</li>
                </ul>
                <p><strong>Recuerda:</strong> Tu seguridad es lo más importante.</p>
            </div>`,
    },
  }

  const info = actionInfo[action]
  if (!info) return
  title.textContent = info.title
  content.innerHTML = info.content
  modal.style.display = "flex"
}

/* Resources functionality */
function showResource(resource) {
  const modal = document.getElementById("resourceModal")
  const title = document.getElementById("resourceModalTitle")
  const content = document.getElementById("resourceModalContent")
  if (!modal || !title || !content) return

  const resourceInfo = {
    guias: {
      title: "Guías Educativas",
      content: `
                <h2>Recursos educativos disponibles:</h2>
                <div class="action-card1">
                <div style="margin: 1rem 0;">
                    <h3>¿Qué es el bullying?</h3>
                    <br/>
                    <ul>
                    <li>El bullying es un comportamiento agresivo repetitivo con desequilibrio de poder.</li>
                    </p>
                    
                </div>
                <div style="margin: 1rem 0;">
                    <h3>Tipos de bullying:</h3>
                    <br/>
                    <ul>
                        <li>Físico: golpes, empujones</li>
                        <li>Verbal: insultos, amenazas</li>
                        <li>Social: exclusión, rumores</li>
                        <li>Ciberbullying: acoso en línea</li>
                    </ul>
                </div>
                    </div>
            `,
    },
    apoyo: {
      title: "Apoyo Emocional",
      content: `
                <h4>Cuidando tu bienestar mental:</h4>
                <div style="margin: 1rem 0;">
                <div class="action-card1">
                    <h3>Técnicas de relajación:</h3>
                    <br/>
                    <ul>
                        <li>Respiración profunda</li>
                        <li>Meditación mindfulness</li>
                        <li>Ejercicio regular</li>
                        <li>Actividades que disfrutes</li>
                    </ul>
                </div>
                </div>
            `,
    },
    legal: {
      title: "Derechos Legales",
      content: `
                <h4>Tus derechos legales:</h4>
                <div style="margin: 1rem 0;">
                <div class="action-card1">
                    <h3>Derecho a un ambiente seguro:</h3>
                    <br/>
                    <ul>
                    <li>Tienes derecho a estar seguro/a en la universidad y en línea.</li>
                    <li>Derecho a la protección inmediata de tu integridad física y emocional</li>
                    <li>Derecho a la confidencialidad en el manejo de tu caso</li>
                    <li>Derecho a recibir atención psicológica y acompañamiento profesional</li>
                    <li>Derecho a que se tomen medidas preventivas inmediatas</li>
                    <li>Derecho a ser informado sobre el proceso y las acciones tomadas</li>
                    <li>Derecho a la no revictimización durante el proceso</li>
                    </ul>
                </div>
                </div>
            `,
    },
  }

  const info = resourceInfo[resource]
  if (!info) return
  title.textContent = info.title
  content.innerHTML = info.content
  modal.style.display = "flex"
}

/* Modal functionality */
function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) modal.style.display = "none"
}

function showEmergencyModal() {
  const modal = document.getElementById("emergencyModal")
  if (modal) modal.style.display = "flex"
}

/* Phone call functionality */
function callNumber(number) {
  window.location.href = `tel:${number}`
}

/* Smooth scrolling */
function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId)
  if (el) {
    el.scrollIntoView({
      behavior: "smooth",
    })
  }
}

/* Close modals when clicking outside */
window.onclick = (event) => {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  })
}

/* Denuncia (guardar local y descargar) */
function submitReport() {
  const nameEl = document.getElementById("reportName")
  const emailEl = document.getElementById("reportEmail")
  const dateEl = document.getElementById("reportDate")
  const locationEl = document.getElementById("reportLocation")
  const descriptionEl = document.getElementById("reportDescription")
  const evidenceInput = document.getElementById("reportEvidence")

  if (!dateEl || !locationEl || !descriptionEl) return alert("Formulario incompleto.")

  const name = nameEl ? nameEl.value.trim() : ""
  const email = emailEl ? emailEl.value.trim() : ""
  const date = dateEl.value
  const location = locationEl.value.trim()
  const description = descriptionEl.value.trim()

  if (!date || !location || !description) {
    alert("Por favor completa los campos requeridos.")
    return
  }

  const report = {
    id: "r-" + Date.now(),
    name,
    email,
    date,
    location,
    description,
    createdAt: new Date().toISOString(),
    evidenceName: null,
    evidenceData: null,
  }

  const file = evidenceInput && evidenceInput.files ? evidenceInput.files[0] : null
  if (file) {
    const reader = new FileReader()
    reader.onload = function (e) {
      report.evidenceName = file.name
      report.evidenceData = e.target.result // base64 data URL
      saveReport(report)
    }
    reader.readAsDataURL(file)
  } else {
    saveReport(report)
  }
}

function saveReport(report) {
  const reports = JSON.parse(localStorage.getItem("reports") || "[]")
  reports.push(report)
  localStorage.setItem("reports", JSON.stringify(reports))
  renderReportsList()
  const form = document.getElementById("reportForm")
  if (form) form.reset()
  alert("Denuncia guardada exitosamente.")
}

function renderReportsList() {
  const reports = JSON.parse(localStorage.getItem("reports") || "[]")
  const list = document.getElementById("reportsList")
  if (!list) return
  list.innerHTML = ""
  if (reports.length === 0) {
    list.innerHTML = "<li>No hay denuncias guardadas.</li>"
    return
  }
  reports.slice().reverse().forEach((r) => {
    const li = document.createElement("li")
    li.innerHTML = `<strong>${escapeHtml(r.date)}</strong> — ${escapeHtml(r.description.slice(0, 80))}${r.description.length > 80 ? "..." : ""} <button class="btn btn-outline" onclick="downloadReport('${r.id}')">Descargar</button> <button class="btn btn-secondary" onclick="deleteReport('${r.id}')">Eliminar</button>`
    list.appendChild(li)
  })
}

function downloadReport(id) {
  const reports = JSON.parse(localStorage.getItem("reports") || "[]")
  const r = reports.find((x) => x.id === id)
  if (!r) return alert("Denuncia no encontrada.")
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(r, null, 2))
  const a = document.createElement("a")
  a.href = dataStr
  a.download = `denuncia-${r.id}.json`
  a.click()
}

function downloadReports() {
  const reports = JSON.parse(localStorage.getItem("reports") || "[]")
  if (reports.length === 0) return alert("No hay denuncias para descargar.")
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2))
  const a = document.createElement("a")
  a.href = dataStr
  a.download = `denuncias-${Date.now()}.json`
  a.click()
}

function deleteReport(id) {
  let reports = JSON.parse(localStorage.getItem("reports") || "[]")
  reports = reports.filter((r) => r.id !== id)
  localStorage.setItem("reports", JSON.stringify(reports))
  renderReportsList()
}

/* Utilidades */
function escapeHtml(str) {
  return String(str || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

/* Inicialización */
document.addEventListener("DOMContentLoaded", () => {
  renderReportsList()
  loadChatHistory()
  // teclado: ESC para cerrar chat
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeChat()
  })
})
// Funciones para denuncias públicas/privadas + utilidades

/* Storage keys */
const PUBLIC_KEY = "publicReports"
const PRIVATE_KEY = "privateReports"

/* Enviar formulario y guardar según visibilidad */
function submitReport() {
  const name = (document.getElementById("reportName") || {}).value?.trim() || ""
  const email = (document.getElementById("reportEmail") || {}).value?.trim() || ""
  const date = (document.getElementById("reportDate") || {}).value || ""
  const location = (document.getElementById("reportLocation") || {}).value?.trim() || ""
  const description = (document.getElementById("reportDescription") || {}).value?.trim() || ""
  const evidenceInput = document.getElementById("reportEvidence")
  const visibility = document.querySelector('input[name="visibility"]:checked')?.value || "private"

  if (!date || !location || !description) {
    alert("Por favor completa los campos requeridos.")
    return
  }

  const report = {
    id: `${visibility[0]}-${Date.now()}`,
    name,
    email,
    date,
    location,
    description,
    visibility,
    createdAt: new Date().toISOString(),
    evidenceName: null,
    evidenceData: null,
  }

  const file = evidenceInput && evidenceInput.files && evidenceInput.files[0] ? evidenceInput.files[0] : null
  if (file) {
    const reader = new FileReader()
    reader.onload = function (e) {
      report.evidenceName = file.name
      report.evidenceData = e.target.result
      saveReport(report)
    }
    reader.readAsDataURL(file)
  } else {
    saveReport(report)
  }
}

/* Guardar en el localStorage correspondiente */
function saveReport(report) {
  const key = report.visibility === "public" ? PUBLIC_KEY : PRIVATE_KEY
  const arr = JSON.parse(localStorage.getItem(key) || "[]")
  arr.push(report)
  localStorage.setItem(key, JSON.stringify(arr))
  renderReports()
  const form = document.getElementById("reportForm")
  if (form) form.reset()
  alert(report.visibility === "public" ? "Denuncia guardada públicamente." : "Denuncia guardada de forma privada en este dispositivo.")
}

/* Renderizar ambas listas */
function renderReports() {
  renderPublicReports()
  renderPrivateReports()
}

/* Listado público (visible siempre) */
function renderPublicReports() {
  const listEl = document.getElementById("reportsListPublic")
  if (!listEl) return
  const reports = JSON.parse(localStorage.getItem(PUBLIC_KEY) || "[]")
  listEl.innerHTML = ""
  if (reports.length === 0) {
    listEl.innerHTML = "<li>No hay denuncias públicas.</li>"
    return
  }
  reports.slice().reverse().forEach((r) => {
    const li = document.createElement("li")
    li.innerHTML = `<strong>${escapeHtml(r.date)}</strong> — ${escapeHtml(r.description.slice(0, 120))}${r.description.length > 120 ? "..." : ""}
      <span class="reports-actions">
        <button class="btn btn-outline" onclick="downloadReport('${r.id}','public')"><i class="fas fa-download"></i></button>
        <button class="btn btn-danger" onclick="deleteReport('${r.id}','public')"><i class="fas fa-trash"></i></button>
      </span>`
    listEl.appendChild(li)
  })
}

/* Listado privado (oculto por defecto) */
function renderPrivateReports() {
  const listEl = document.getElementById("reportsListPrivate")
  if (!listEl) return
  const reports = JSON.parse(localStorage.getItem(PRIVATE_KEY) || "[]")
  listEl.innerHTML = ""
  if (reports.length === 0) {
    listEl.innerHTML = "<li>No hay denuncias privadas en este dispositivo.</li>"
    return
  }
  reports.slice().reverse().forEach((r) => {
    const li = document.createElement("li")
    li.innerHTML = `<strong>${escapeHtml(r.date)}</strong> — ${escapeHtml(r.description.slice(0, 120))}${r.description.length > 120 ? "..." : ""}
      <span class="reports-actions">
        <button class="btn btn-outline" onclick="downloadReport('${r.id}','private')"><i class="fas fa-download"></i></button>
        <button class="btn btn-secondary" onclick="makePublic('${r.id}')">Hacer pública</button>
        <button class="btn btn-danger" onclick="deleteReport('${r.id}','private')"><i class="fas fa-trash"></i></button>
      </span>`
    listEl.appendChild(li)
  })
}

/* Descargar una denuncia individual */
function downloadReport(id, visibility) {
  const key = visibility === "public" ? PUBLIC_KEY : PRIVATE_KEY
  const arr = JSON.parse(localStorage.getItem(key) || "[]")
  const r = arr.find((x) => x.id === id)
  if (!r) return alert("Denuncia no encontrada.")
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(r, null, 2))
  const a = document.createElement("a")
  a.href = dataStr
  a.download = `denuncia-${r.id}.json`
  a.click()
}

/* Descargar todas (filtrar por visibility opcional) */
function downloadReports(which = "all") {
  if (which === "all" || which === "public") {
    const publicReports = JSON.parse(localStorage.getItem(PUBLIC_KEY) || "[]")
    if (publicReports.length > 0) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(publicReports, null, 2))
      const a = document.createElement("a")
      a.href = dataStr
      a.download = `denuncias-publicas-${Date.now()}.json`
      a.click()
    } else if (which === "public") {
      alert("No hay denuncias públicas para descargar.")
    }
  }
  if (which === "all" || which === "private") {
    const privateReports = JSON.parse(localStorage.getItem(PRIVATE_KEY) || "[]")
    if (privateReports.length > 0) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(privateReports, null, 2))
      const a = document.createElement("a")
      a.href = dataStr
      a.download = `denuncias-privadas-${Date.now()}.json`
      a.click()
    } else if (which === "private") {
      alert("No hay denuncias privadas para descargar.")
    }
  }
}

/* Eliminar denuncia */
function deleteReport(id, visibility) {
  const key = visibility === "public" ? PUBLIC_KEY : PRIVATE_KEY
  let arr = JSON.parse(localStorage.getItem(key) || "[]")
  arr = arr.filter((r) => r.id !== id)
  localStorage.setItem(key, JSON.stringify(arr))
  renderReports()
}

/* Convertir privada a pública */
function makePublic(id) {
  let privateArr = JSON.parse(localStorage.getItem(PRIVATE_KEY) || "[]")
  const idx = privateArr.findIndex((r) => r.id === id)
  if (idx === -1) return alert("Denuncia no encontrada.")
  const report = privateArr.splice(idx, 1)[0]
  report.visibility = "public"
  // opcional: quitar datos sensibles antes de publicar (no se hace aquí, queda a decisión del usuario)
  const publicArr = JSON.parse(localStorage.getItem(PUBLIC_KEY) || "[]")
  publicArr.push(report)
  localStorage.setItem(PUBLIC_KEY, JSON.stringify(publicArr))
  localStorage.setItem(PRIVATE_KEY, JSON.stringify(privateArr))
  renderReports()
}

/* Mostrar / ocultar sección privada */
function togglePrivateList() {
  const section = document.getElementById("privateSection")
  const btn = document.querySelector(".toggle-private-btn")
  if (!section || !btn) return
  if (section.style.display === "block") {
    section.style.display = "none"
    btn.textContent = "Mostrar denuncias privadas"
  } else {
    // confirmación mínima (no es autenticación)
    const ok = confirm("Las denuncias privadas están almacenadas solo en este dispositivo. ¿Deseas mostrarlas?")
    if (!ok) return
    section.style.display = "block"
    btn.textContent = "Ocultar denuncias privadas"
    renderPrivateReports()
  }
}

/* Util */
function escapeHtml(str) {
  return String(str || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

/* Inicializar */
document.addEventListener("DOMContentLoaded", () => {
  renderReports()
},

  {
    "name": "bullying-support-app",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "start": "node server.js"
    },
    "dependencies": {
      "cors": "^2.8.5",
      "express": "^4.18.2",
      "node-fetch": "^2.6.7"
    }
  }
)
