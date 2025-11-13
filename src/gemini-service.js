

import { GoogleGenerativeAI } from "@google/generative-ai";


const CLAVE_API = "AIzaSyCBpYFtU8QRwYDQnrVBviaYw7alOUlcM4M";

// Inicializar la instancia del cliente Gemini
const ia = new GoogleGenerativeAI(CLAVE_API);


const MODELO =  "gemini-2.5-flash";

// Guardar la sesión de chat 
let sesionChat = null;

function iniciarSesionChat() {
  const modelo = ia.getGenerativeModel({
    model: MODELO,
    systemInstruction:
      "Eres un entrenador personal y nutricionista amigable. Ayudas con consejos de fitness, rutinas, ejercicios y nutrición. Responde de forma clara, breve y motivadora.",
  });

  sesionChat = modelo.startChat({ history: [] });
}

/**

 * @param {string} preguntaUsuario - Texto con la pregunta del usuario
 */
export async function preguntarAGemini(preguntaUsuario) {
  try {
    if (!sesionChat) iniciarSesionChat();

    const resultado = await sesionChat.sendMessage(preguntaUsuario);
    const respuesta = resultado.response.text();

    return respuesta;
  } catch (error) {
    console.error("Error al preguntar a Gemini:", error);
    throw new Error("No pude procesar tu pregunta. Intenta de nuevo.");
  }
}

/**
 * Genera una rutina personalizada de ejercicios
 * @param {string} grupoMuscular - Grupo muscular (ej. 'Pecho', 'Espalda', 'Piernas')
 */
export async function generarRutina(grupoMuscular) {
  try {
    const modelo = ia.getGenerativeModel({
      model: MODELO,
      systemInstruction:
        "Eres un generador de rutinas de fitness. Devuelve un JSON con 3 a 5 ejercicios efectivos para el grupo muscular indicado.",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nombre: { type: "string" },
              series: { type: "string" },
              repeticiones: { type: "string" },
            },
            required: ["nombre", "series", "repeticiones"],
          },
        },
      },
    });

    const prompt = `Genera una rutina de 3 a 5 ejercicios para el grupo muscular: ${grupoMuscular}`;
    const resultado = await modelo.generateContent(prompt);

    const texto = resultado.response.text();
    const rutina = JSON.parse(texto);

    return rutina;
  } catch (error) {
    console.error("Error al generar rutina:", error);
    throw new Error("No pude generar la rutina. Intenta de nuevo.");
  }
}

//limpiar chat
export function limpiarHistorialChat() {
  sesionChat = null;
}
