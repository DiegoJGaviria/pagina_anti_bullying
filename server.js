const express = require("express")
const cors = require("cors")
const fetch = require("node-fetch") // node-fetch v2
const path = require("path")

const app = express()
app.use(cors())
app.use(express.json())

const OPENAI_KEY = process.env.OPENAI_API_KEY
const PORT = process.env.PORT || 3000

// Servir ficheros estáticos (frontend)
app.use(express.static(path.join(__dirname, ".")))

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }))

// Endpoint de chat: recibe { message, history }
app.post("/api/chat", async (req, res) => {
    if (!OPENAI_KEY) return res.status(500).json({ error: "OPENAI_API_KEY no configurada en el servidor" })
    const { message, history } = req.body || {}
    if (!message) return res.status(400).json({ error: "Mensaje vacío" })

    const systemPrompt = `Eres un asistente empático y de apoyo enfocado en bullying. Ofrece orientación general, pasos para documentar, contactar ayuda y apoyo emocional. Si detectas riesgo de daño inmediato o suicidio, indica claramente llamar a emergencias (911) y sugiere buscar ayuda profesional. No otorgues diagnósticos médicos ni instrucciones peligrosas.`

    const messages = [{ role: "system", content: systemPrompt }]
    if (Array.isArray(history)) {
        history.forEach((m) => {
            messages.push({ role: m.role === "user" ? "user" : "assistant", content: m.content })
        })
    }
    messages.push({ role: "user", content: message })

    try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages,
                max_tokens: 600,
                temperature: 0.7,
            }),
        })

        if (!resp.ok) {
            const errText = await resp.text()
            console.error("OpenAI error:", resp.status, errText)
            return res.status(502).json({ error: "Error desde OpenAI", detail: errText })
        }

        const data = await resp.json()
        const reply = data.choices?.[0]?.message?.content || "Lo siento, no tengo respuesta ahora."
        return res.json({ reply })
    } catch (err) {
        console.error("Error en /api/chat:", err)
        return res.status(500).json({ error: "Error interno del servidor" })
    }
})

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`))