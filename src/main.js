

import { preguntarAGemini, generarRutina } from './gemini-service.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('../service-worker.js')
    .then(() => console.log('✅ Service Worker registrado correctamente'))
    .catch((err) => console.error('❌ Error registrando el SW:', err));
}



// Claves para guardar datos en el navegador (localStorage)
const CLAVE_ALMACENAMIENTO_SESIONES = 'sesionesEntrenamiento';
const CLAVE_ALMACENAMIENTO_RUTINA = 'miRutinaSemanal';

// URL base para descargar rutinas
const URL_BASE_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;


// Mapeo de ídolos fitness 
const RUTINAS_DISPONIBLES = {
    "Carlos Belcast": "api/fitness/routines/carlos-belcast",
    "Andoni Fitness": "api/fitness/routines/andoni-fitness/",
    "Joan Pradells": "api/fitness/routines/joan-pradells/",
    "The Saiyan Kiwi": "api/fitness/routines/the-saiyan-kiwi/",
    "Vikika Costa": "api/fitness/routines/vikika-costa/",
};

// Días de la semana en español
const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ============================================
// NOTIFICACIONES
// ============================================

document.getElementById("btn5min").addEventListener("click", () => {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            setTimeout(() => {
                new Notification("¡Han pasado 1 minutos!", {
                    body: "¡Hora de continuar, SmartFit Bitácoras! 💪🔥",
                    icon: "./icons/icon-192.png"
                });
            }, 1 * 60 * 1000);

            Toastify({
                text: "✅ Notificación programada para 1 minuto",
                duration: 3000,
                gravity: "top",
                position: "right",
                className: "toastify-success",
                stopOnFocus: true
            }).showToast();
        }
    });
});

// Registrar Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
}


/**
 * Muestra solo la pestaña seleccionada y oculta las demás
 */
function mostrarSoloSeccion(idSeccion) {
    const todasLasSecciones = document.querySelectorAll('.content-section');
    todasLasSecciones.forEach(seccion => {
        seccion.classList.toggle('active', seccion.id === idSeccion);
    });
}

/**
 * Cambia entre pestañas y recarga datos si es necesario
 */
window.showTab = function(idPestana, botonElemento) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(seccion => {
        seccion.classList.remove('active');
    });

    // Mostrar la sección seleccionada
    document.getElementById(idPestana).classList.add('active');

    // Actualizar botones de navegación
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });
    botonElemento.classList.add('active');

    // Recargar datos según la pestaña
    if (idPestana === 'bitacora-tab') {
        cargarBitacoraGuardada();
    }
    if (idPestana === 'planeacion-tab') {
        const datosRutina = localStorage.getItem(CLAVE_ALMACENAMIENTO_RUTINA);
        if (datosRutina) {
            cargarRutinaCompleta(JSON.parse(datosRutina));
        } else {
            cargarRutinaPorDefecto(); 
        }
    }
    mostrarSoloSeccion(idPestana);
}

// ============================================
// FUNCIONES DE BITÁCORA (HISTORIAL)
// ============================================

/**
 * Carga la fecha y hora actual en los campos
 */
function cargarFechaYHora() {
    const ahora = new Date();
    const opcionesFecha = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    
    const textoFecha = ahora.toLocaleDateString('es-ES', opcionesFecha);
    const textoDia = DIAS_SEMANA[ahora.getDay()];

    document.getElementById('fecha').value = textoFecha;
    document.getElementById('dia-semana').value = textoDia;
}

/**
 * Muestra los registros de sesiones en pantalla
 */
function mostrarRegistros(registros) {
    const listaElement = document.getElementById('bitacora-list');
    listaElement.innerHTML = ''; 
    
    if (registros.length === 0) {
        listaElement.innerHTML = '<li style="color: #a0a0a0;"><strong>¡Empecemos!</strong> Aún no tienes sesiones registradas.</li>';
        return;
    }

    // Mostrar del más reciente al más antiguo
    registros.slice().reverse().forEach(registro => {
        const itemLista = document.createElement('li');
        itemLista.innerHTML = `
            <strong>${registro.diaSemana} - ${registro.fecha}</strong>
            <p>${registro.comentarios}</p>
        `;
        listaElement.appendChild(itemLista); 
    });
}

/**
 * Carga los registros guardados desde localStorage
 */
function cargarBitacoraGuardada() {
    const registrosJSON = localStorage.getItem(CLAVE_ALMACENAMIENTO_SESIONES);
    const registros = registrosJSON ? JSON.parse(registrosJSON) : [];
    mostrarRegistros(registros);
}

/**
 * Guarda una nueva sesión de entrenamiento
 */
window.registrarSesion = function() {
    const fecha = document.getElementById('fecha').value;
    const diaSemana = document.getElementById('dia-semana').value;
    const comentarios = document.getElementById('comentarios').value;
    
    // Validar que haya comentarios
    if (!comentarios.trim()) {
        Toastify({
            text: "⚠️ Por favor, ingresa los detalles de tu sesión",
            duration: 3000,
            gravity: "top",
            position: "center",
            className: "toastify-warning"
        }).showToast();
        return;
    }
    
    // Crear nuevo registro
    const nuevoRegistro = { fecha, diaSemana, comentarios: comentarios.trim() };
    
    // Obtener registros existentes
    const registrosJSON = localStorage.getItem(CLAVE_ALMACENAMIENTO_SESIONES);
    const registros = registrosJSON ? JSON.parse(registrosJSON) : [];

    // Agregar nuevo registro y guardar
    registros.push(nuevoRegistro);
    localStorage.setItem(CLAVE_ALMACENAMIENTO_SESIONES, JSON.stringify(registros));
    
    // Limpiar formulario
    document.getElementById('comentarios').value = '';
    cargarFechaYHora();

    // Mostrar confirmación
    Toastify({
        text: "✨ ¡Sesión registrada con éxito!",
        duration: 3000,
        gravity: "top",
        position: "center",
        className: "toastify-success"
    }).showToast();
}

// ============================================
// FUNCIONES DE PLANEACIÓN (RUTINAS)
// ============================================

/**
 * Genera una clave única para guardar el progreso del día
 */
function obtenerClaveProgreso(rutina) {
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `PROGRESO_RUTINA_${hoy}_${rutina.semana || 'Personalizada'}`;
}

/**
 * Guarda cuando se completa una serie de un ejercicio
 */
window.toggleSeriesCompletion = function(checkbox, claveProgreso) {
    const estadoProgreso = JSON.parse(localStorage.getItem(claveProgreso)) || {};
    const indiceEjercicio = checkbox.getAttribute('data-exercise-index');
    const numeroSerie = checkbox.getAttribute('data-series-num');
    const idUnico = `e${indiceEjercicio}s${numeroSerie}`;
    
    estadoProgreso[idUnico] = checkbox.checked;
    localStorage.setItem(claveProgreso, JSON.stringify(estadoProgreso));
}

/**
 * Carga la rutina del día actual con checkboxes
 */
function cargarRutinaDelDia(diaHoy, datosRutina) {
    const contenedor = document.getElementById('daily-routine-content');
    const tituloElement = document.getElementById('current-day-title');
    
    // Buscar rutina de hoy
    const rutinaHoy = datosRutina.dias.find(d => d.dia.toLowerCase() === diaHoy.toLowerCase());
    
    // Obtener progreso guardado
    const claveProgreso = obtenerClaveProgreso(datosRutina);
    const estadoProgreso = JSON.parse(localStorage.getItem(claveProgreso)) || {};

    contenedor.innerHTML = ''; 

    if (rutinaHoy && rutinaHoy.ejercicios.length > 0) {
        tituloElement.textContent = `Rutina del Día: ${rutinaHoy.dia} (${rutinaHoy.enfoque})`;
        
        // Crear una tarjeta por cada ejercicio
        rutinaHoy.ejercicios.forEach((ejercicio, indice) => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'exercise-card';
            
            // Crear checkboxes para cada serie
            let htmlCheckboxes = '<div class="series-checklist">';
            const numeroSeries = parseInt(ejercicio.series);

            for (let i = 1; i <= numeroSeries; i++) {
                const idSerie = `e${indice}s${i}`;
                const estaCompletada = estadoProgreso[idSerie] === true;

                htmlCheckboxes += `
                    <label for="${idSerie}" class="series-item">
                        <input type="checkbox" id="${idSerie}" 
                               data-exercise-index="${indice}" 
                               data-series-num="${i}" 
                               ${estaCompletada ? 'checked' : ''} 
                               onchange="toggleSeriesCompletion(this, '${claveProgreso}')">
                        <span>Serie ${i}</span>
                    </label>
                `;
            }
            htmlCheckboxes += '</div>';

            tarjeta.innerHTML = `
                <h4>${ejercicio.nombre}</h4>
                <p><strong>Series:</strong> ${ejercicio.series} | <strong>Repeticiones:</strong> ${ejercicio.repeticiones}</p>
                ${htmlCheckboxes}
            `;
            contenedor.appendChild(tarjeta);
        });
    } else {
        tituloElement.textContent = `Rutina del Día: ${diaHoy} (Descanso o Vacía)`;
        contenedor.innerHTML = '<p class="p-message">¡Hoy es día de descanso! Genera una rutina con el Coach IA o descarga una.</p>';
    }
}

/**
 * Muestra el resumen semanal de la rutina
 */
function cargarResumenSemanal(datosRutina) {
    const contenedor = document.getElementById('weekly-overview-cards');
    contenedor.innerHTML = ''; 

    const orden = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const mapaDias = new Map();
    
    // Crear mapa con información de cada día
    datosRutina.dias.forEach(diaData => {
        mapaDias.set(diaData.dia, {
            enfoque: diaData.enfoque,
            duracion: `${diaData.duracion_sugerida_min || '??'} min`,
            esDescanso: false,
            cantidadEjercicios: diaData.ejercicios.length
        });
    });

    // Agregar día de descanso si existe
    if (datosRutina.descanso) {
        mapaDias.set(datosRutina.descanso, {
            enfoque: "Día de Descanso",
            duracion: "Recuperación.",
            esDescanso: true,
            cantidadEjercicios: 0
        });
    }
    
    const hoy = new Date();
    const diaHoy = DIAS_SEMANA[hoy.getDay()];
    
    // Crear tarjetas para cada día
    orden.forEach(nombreDia => {
        const datos = mapaDias.get(nombreDia);
        
        if (datos) {
            const tarjeta = document.createElement('div');
            let claseCSS = 'weekly-card';
            if (nombreDia === diaHoy) claseCSS += ' current-day-highlight';
            else if (datos.esDescanso) claseCSS += ' rest-day';
            tarjeta.className = claseCSS;
            
            const textoEnfoque = datos.esDescanso ? datos.enfoque : `Enfoque: ${datos.enfoque}`;
            const textoEjercicios = datos.cantidadEjercicios > 0 ? `(${datos.cantidadEjercicios} ejercicios)` : '';

            tarjeta.innerHTML = `
                <h4>${nombreDia}</h4>
                <p><strong>${textoEnfoque}</strong> ${textoEjercicios}</p>
                <p>Duración: ${datos.duracion}</p>
            `;
            contenedor.appendChild(tarjeta);
        }
    });
}

/**
 * Carga tanto la rutina del día como el resumen semanal
 */
function cargarRutinaCompleta(rutina) {
    const titulo = document.getElementById('planeacion-main-title');
    const nota = document.getElementById('routine-note');

    titulo.textContent = `📋 Rutina: ${rutina.semana || 'Planeación'}`;
    nota.innerHTML = `**Nota del Entrenador:** ${rutina.nota_estilo || 'Rutina personalizada.'}`;

    const hoy = new Date();
    const diaHoy = DIAS_SEMANA[hoy.getDay()];
    
    cargarRutinaDelDia(diaHoy, rutina);
    cargarResumenSemanal(rutina);
}

/**
 * Carga una rutina predeterminada vacía
 */
function cargarRutinaPorDefecto() {
    const rutinaPorDefecto = {
        semana: "Planeación Inicial",
        nota_estilo: "Esta es tu planeación pre-cargada. Los ejercicios que añadas con el Coach IA se guardarán aquí.",
        dias: [
            { dia: "Lunes", enfoque: "Full Body", duracion_sugerida_min: 60, ejercicios: [] },
            { dia: "Martes", enfoque: "Cardio", duracion_sugerida_min: 60, ejercicios: [] },
            { dia: "Miércoles", enfoque: "Híbrido", duracion_sugerida_min: 30, ejercicios: [] },
            { dia: "Jueves", enfoque: "Pierna/Fuerza", duracion_sugerida_min: 65, ejercicios: [] },
            { dia: "Viernes", enfoque: "Pecho y Espalda", duracion_sugerida_min: 60, ejercicios: [] },
            { dia: "Sábado", enfoque: "Circuito/Deporte", duracion_sugerida_min: 60, ejercicios: [] },
        ],
        descanso: "Domingo"
    };
    localStorage.setItem(CLAVE_ALMACENAMIENTO_RUTINA, JSON.stringify(rutinaPorDefecto));
    cargarRutinaCompleta(rutinaPorDefecto);
}

/**
 * Descarga una rutina seleccionada de los ídolos fitness
 */
window.descargarRutinaSeleccionada = async function() {
    const selector = document.getElementById('fitness-idol');
    const idoloSeleccionado = selector.value;

    if (!idoloSeleccionado) {
        Toastify({
            text: "⚠️ Por favor, selecciona un ídolo fitness de la lista",
            duration: 3000,
            gravity: "top",
            position: "center",
            className: "toastify-warning"
        }).showToast();
        return;
    }

    const boton = document.getElementById('descarga-btn');
    const textoOriginal = boton.textContent;
    boton.textContent = 'Descargando...';
    boton.disabled = true;

    const endpoint = RUTINAS_DISPONIBLES[idoloSeleccionado];
    const urlCompleta = URL_BASE_API + endpoint;
    
    try {
        const respuesta = await fetch(urlCompleta);
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }
        
        const datosRutina = await respuesta.json();
        if (!datosRutina.semana) {
            datosRutina.semana = `Rutina de ${idoloSeleccionado}`;
        }

        localStorage.setItem(CLAVE_ALMACENAMIENTO_RUTINA, JSON.stringify(datosRutina));
        cargarRutinaCompleta(datosRutina);

        Toastify({
            text: `🎉 Rutina de ${idoloSeleccionado} descargada con éxito`,
            duration: 3000,
            gravity: "top",
            position: "center",
            className: "toastify-success"
        }).showToast();
    } catch (error) {
        console.error("Error al descargar la rutina:", error);
        Toastify({
            text: `❌ Error al descargar la rutina de ${idoloSeleccionado}`,
            duration: 4000,
            gravity: "top",
            position: "center",
            className: "toastify-error"
        }).showToast();
    } finally {
        boton.textContent = textoOriginal;
        boton.disabled = false;
    }
}

// ============================================
// FUNCIONES DE GEMINI IA
// ============================================

/**
 * Envía una pregunta a Gemini y muestra la respuesta
 */
window.askGemini = async function() {
    const pregunta = document.getElementById('gemini-input').value.trim();
    const areaRespuesta = document.getElementById('gemini-response-area');
    
    if (!pregunta) {
        areaRespuesta.innerHTML = '<p class="p-message error-message">Por favor, ingresa una pregunta.</p>';
        return;
    }

    // Agregar mensaje del usuario al chat
    const mensajeUsuario = document.createElement('div');
    mensajeUsuario.className = 'chat-message user-message';
    mensajeUsuario.innerHTML = `<strong style="color: var(--color-primary);">Tú:</strong> ${pregunta}`;
    areaRespuesta.appendChild(mensajeUsuario);

    // Limpiar input
    document.getElementById('gemini-input').value = '';

    // Mostrar indicador de carga
    const cargando = document.createElement('div');
    cargando.className = 'loading-message';
    cargando.innerHTML = '💬 Pensando... ✨';
    areaRespuesta.appendChild(cargando);

    // Scroll al final
    areaRespuesta.scrollTop = areaRespuesta.scrollHeight;

    try {
        const respuesta = await preguntarAGemini(pregunta);
        
        // Quitar indicador de carga
        areaRespuesta.removeChild(cargando);
        
        // Agregar respuesta del asistente
        const mensajeIA = document.createElement('div');
        mensajeIA.className = 'chat-message ai-message';
        mensajeIA.innerHTML = `<strong style="color: var(--color-secondary);">Gemini:</strong><br>${respuesta.replace(/\n/g, '<br>')}`;
        areaRespuesta.appendChild(mensajeIA);

        // Scroll al final
        areaRespuesta.scrollTop = areaRespuesta.scrollHeight;

    } catch (error) {
        console.error("Error al preguntar a Gemini:", error);
        areaRespuesta.removeChild(cargando);
        
        const mensajeError = document.createElement('div');
        mensajeError.className = 'error-message';
        mensajeError.innerHTML = '❌ Ocurrió un error. Intenta de nuevo.';
        areaRespuesta.appendChild(mensajeError);
    }
}

/**
 * Genera una rutina personalizada con IA
 */
window.generateRoutine = async function() {
    const grupoMuscular = document.getElementById('muscle-group').value.trim();
    const areaEstado = document.getElementById('coach-status-area');
    
    if (!grupoMuscular) {
        areaEstado.innerHTML = '<p class="p-message error-message">Por favor, ingresa un grupo muscular (Ej: Espalda, Piernas).</p>';
        return;
    }

    areaEstado.innerHTML = `<p class="loading-message">Generando rutina para: <strong>${grupoMuscular}</strong>... 🧠</p>`;
    
    try {
        const nuevosEjercicios = await generarRutina(grupoMuscular);
        
        if (nuevosEjercicios.length > 0) {
            // Obtener rutina actual o crear una nueva
            const rutinaJSON = localStorage.getItem(CLAVE_ALMACENAMIENTO_RUTINA);
            let rutina = rutinaJSON ? JSON.parse(rutinaJSON) : null;

            if (!rutina) {
                cargarRutinaPorDefecto();
                const rutinaDefectoJSON = localStorage.getItem(CLAVE_ALMACENAMIENTO_RUTINA);
                rutina = JSON.parse(rutinaDefectoJSON);
            }

            // Encontrar el día de hoy
            const hoy = new Date();
            const diaHoy = DIAS_SEMANA[hoy.getDay()];
            let rutinaDelDia = rutina.dias.find(d => d.dia === diaHoy);
            
            // Si no existe el día, crearlo
            if (!rutinaDelDia) {
                rutinaDelDia = { dia: diaHoy, enfoque: grupoMuscular, duracion_sugerida_min: 45, ejercicios: [] };
                rutina.dias.push(rutinaDelDia);
            }
            
            // Actualizar enfoque y agregar ejercicios
            rutinaDelDia.enfoque = `${rutinaDelDia.enfoque} + ${grupoMuscular} (IA)`;
            rutinaDelDia.ejercicios = [...rutinaDelDia.ejercicios, ...nuevosEjercicios];
            
            // Guardar y recargar
            localStorage.setItem(CLAVE_ALMACENAMIENTO_RUTINA, JSON.stringify(rutina));
            cargarRutinaCompleta(rutina);
            
            areaEstado.innerHTML = `
                <p class="success-message">🎉 Rutina generada y agregada a tu plan de ${diaHoy}!</p>
                <p style="color: #e0e0e0;">Ve a la pestaña 🗓️ Planeación para ver los ${nuevosEjercicios.length} nuevos ejercicios.</p>
            `;
        } else {
            areaEstado.innerHTML = '<p class="error-message">No pude generar ejercicios. Intenta con otro enfoque.</p>';
        }
    } catch (error) {
        console.error("Error al generar rutina:", error);
        areaEstado.innerHTML = '<p class="error-message">❌ Error al generar rutina. Revisa tu conexión.</p>';
    }
}

// ============================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ============================================

window.onload = function() {
    // Cargar fecha y hora actual
    cargarFechaYHora();

    // Cargar rutina guardada o por defecto
    const datosRutina = localStorage.getItem(CLAVE_ALMACENAMIENTO_RUTINA);
    if (datosRutina) {
        cargarRutinaCompleta(JSON.parse(datosRutina));
    } else {
        cargarRutinaPorDefecto();
    }
    
    // Cargar bitácora guardada
    cargarBitacoraGuardada();
    
    // Mostrar la pestaña de registro por defecto
    showTab('registrar-tab', document.querySelector('.nav-bar button:nth-child(1)'));
};
