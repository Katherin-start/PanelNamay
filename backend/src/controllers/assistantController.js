const fetch = require('node-fetch');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama3-8b-8192';

const SYSTEM_PROMPT = `Eres Namay, el asistente virtual de la clínica dental Dental Namay en Lima, Perú.
Tu función es ayudar a los pacientes con información sobre:
- Servicios dentales disponibles (consulta, limpieza, blanqueamiento, ortodoncia, implantes, etc.)
- Horarios y disponibilidad de citas
- Precios aproximados y métodos de pago (efectivo y Yape)
- Cuidado e higiene dental
- Preparación para procedimientos dentales
- Dudas generales sobre salud bucal

Reglas:
- Responde siempre en español, de forma amable y profesional.
- Si el paciente pregunta algo médico específico (diagnóstico, tratamiento concreto), recomiéndale que consulte con su odontólogo.
- Si no sabes algo, dilo honestamente y sugiere llamar a la clínica.
- Mantén respuestas concisas (máx. 3-4 oraciones), a menos que se necesite más detalle.
- No inventes datos concretos de la clínica (dirección exacta, teléfono, etc.) que no tengas.`;

const mobileAssistantChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío', code: 'MISSING_MESSAGE' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'Servicio de IA no configurado', code: 'AI_NOT_CONFIGURED' });
    }

    // Construir historial para Groq (máx últimos 10 turnos para no exceder contexto)
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentHistory,
      { role: 'user', content: message.trim() },
    ];

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error('[mobileAssistantChat] Groq error:', groqRes.status, errBody);
      return res.status(502).json({ message: 'Error al contactar el servicio de IA', code: 'AI_ERROR' });
    }

    const groqData = await groqRes.json();
    const reply = groqData.choices?.[0]?.message?.content?.trim() ?? 'No pude generar una respuesta.';

    // Actualizar historial para la siguiente llamada
    const updatedHistory = [
      ...recentHistory,
      { role: 'user',      content: message.trim() },
      { role: 'assistant', content: reply },
    ];

    res.json({ code: 'ASSISTANT_SUCCESS', reply, history: updatedHistory });
  } catch (err) {
    console.error('[mobileAssistantChat] Error:', err.message);
    res.status(500).json({ message: 'Error interno del asistente', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = { mobileAssistantChat };
