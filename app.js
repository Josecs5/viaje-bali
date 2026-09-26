/* Viaje a Bali — Planificador
 * HTML + CSS + JS puro. Sin build. Datos en localStorage.
 * Motor de itinerario, formularios por schema y service worker propios.
 */
'use strict';
(function () {

  /* ==========================================================
     Utilidades
     ========================================================== */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on = (sel, ev, fn) => { const n = $(sel); if (n) n.addEventListener(ev, fn); };
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad2 = n => String(n).padStart(2, '0');
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  // Iconos de interfaz (SVG de trazo; heredan el color del texto)
  const svgIco = (d, size, sw) => `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const PLANE = '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.2.4c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>';
  const ICON = {
    edit:   svgIco('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
    trash:  svgIco('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    chev:   svgIco('<path d="M6 9l6 6 6-6"/>', 22, 2.6),
    plus:   svgIco('<path d="M12 5v14M5 12h14"/>', 18, 2.6),
    plane:  svgIco(PLANE, 16, 2.4),
    planeL: svgIco(PLANE, 34, 2.2),
    house:  svgIco('<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>', 17, 2.6),
    pin:    svgIco('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', 14, 2.4),
    coin:   svgIco('<circle cx="12" cy="12" r="9"/><path d="M14.6 9.3c-.6-.8-1.6-1.3-2.6-1.3-1.5 0-2.6.8-2.6 2 0 2.7 5.2 1.4 5.2 4.2 0 1.2-1.1 2-2.6 2-1.1 0-2.1-.5-2.7-1.4M12 6v2M12 16v2"/>', 14, 2.4),
    moon:   svgIco('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>', 19, 2.2),
    sun:    svgIco('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 19, 2.2),
    locate: svgIco('<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>', 15, 2.4)
  };

  const MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIA_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function parseDate(s) {
    if (!s) return null;
    const [y, m, d] = String(s).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const ymd = dt => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  const hoyYMD = () => ymd(new Date());

  function fmtFecha(s, long) {
    const dt = parseDate(s);
    if (!dt) return '';
    const mes = (long ? MES_L : MES_C)[dt.getMonth()];
    return `${dt.getDate()} ${mes}${long ? ' ' + dt.getFullYear() : ''}`;
  }
  const fmtDiaSemana = s => { const dt = parseDate(s); return dt ? DIA_L[dt.getDay()] : ''; };

  function dtParts(s) {
    if (!s) return { date: '', time: '' };
    const [d, t] = String(s).split('T');
    return { date: d || '', time: (t || '').slice(0, 5) };
  }
  const toMin = t => {
    const m = String(t || '').match(/(\d{1,2}):(\d{2})/);
    return m ? (+m[1]) * 60 + (+m[2]) : 0;
  };
  const firstTime = s => {
    const m = String(s || '').match(/(\d{1,2}):(\d{2})/);
    return m ? `${pad2(+m[1])}:${m[2]}` : '';
  };

  function eachDay(a, b) {
    const out = [];
    const start = parseDate(a), end = parseDate(b);
    if (!start || !end || end < start) return out;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(ymd(new Date(d)));
    return out;
  }

  function haversine(a, b) {
    const R = 6371, toR = x => x * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  // Tiempo de trayecto estimado entre dos puntos: distancia en línea recta ×
  // un factor de rodeo genérico ÷ velocidad media mixta (coche/taxi, ciudad y
  // carretera). No hay calibración por región (a diferencia del hermano de
  // Islandia, que sí la tenía para su Ruta 1) — es solo una referencia
  // aproximada para hacerse una idea del orden de magnitud entre paradas.
  const AVG_KMH = 45;
  const PARK_MIN = 4;
  const DETOUR_FACTOR = 1.3;

  // Umbrales de dayPlan (viabilidad del día)
  const SALIDA_FLOOR_MIN = 7 * 60 + 30;   // no se empieza a moverse antes de las 07:30
  const MARGEN_ATARDECER_MIN = 30;        // colchón antes del atardecer para "ok"
  const MARGEN_ANCLA_MIN = 10;            // holgura para llegar a una hora de encuentro
  const VOLANTE_LARGO_H = 4;
  const VOLANTE_MAX_H = 6;
  const COMIDA_MIN = 50;
  const EXCURSION_MIN = 120;              // duración por defecto si la excursión no la trae
  const LUGAR_MIN = 45;                   // tiempo de visita por defecto

  function driveByRoad(a, b) {
    const kmRecta = haversine(a, b);
    const kmRuta = kmRecta * DETOUR_FACTOR;
    const min = Math.round(kmRuta / AVG_KMH * 60) + PARK_MIN;
    return { km: kmRuta, min };
  }
  const MIN_LEG_KM = 1; // por debajo de esto no se muestra trayecto (mismo sitio / a pie)

  function fmtDur(min) {
    min = Math.round(min);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  // "2 h 30 min" / "2h30" / "90 min" -> minutos (o null)
  function parseDurLoose(s) {
    s = String(s || '');
    const hm = s.match(/(\d+)\s*h[^0-9]*(\d+)?/i);
    if (hm) return (+hm[1]) * 60 + (+(hm[2] || 0));
    const mm = s.match(/(\d+)\s*m/i);
    if (mm) return +mm[1];
    const n = s.match(/^\s*(\d+)\s*$/);
    return n ? +n[1] : null;
  }
  const minusMin = (hhmm, mins) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    if (isNaN(h)) return '';
    let t = h * 60 + m - mins;
    t = ((t % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };

  // Bali va siempre en WITA (UTC+8), sin horario de verano — igual de
  // simple que el UTC+0 fijo de Islandia. Se usa para anclar los cálculos de
  // sol/luna (sky()) y de viabilidad del día (dayPlan()) a la hora local real
  // del viaje, sea cual sea la zona horaria del dispositivo que consulta la app.
  const BALI_TZ_OFFSET_H = 8;
  const BALI_TZ_OFFSET_MS = BALI_TZ_OFFSET_H * 3600000;

  /* ==========================================================
     Estado
     ========================================================== */
  const STORE_KEY = 'bali_trip_v1';

  // ~17.000 IDR/€ como referencia de partida si no hay conexión aún para
  // pedir el tipo del BCE — se sobrescribe en cuanto refreshFx() responde.
  const blankFx = () => ({ rate: 17000, date: null, source: 'default', stamp: null });
  const blankMeteo = () => ({ clouds: {}, precip: {}, fetched: null });

  const blankState = () => ({
    meta: { titulo: 'Viaje a Bali', fechaInicio: '', fechaFin: '' },
    vuelos: [], coches: [], alojamientos: [], excursiones: [], comidas: [], lugares: [], recomendaciones: [],
    gastos: [], fx: blankFx(), meteo: blankMeteo(), equipaje: [], diario: {}, antesDeViajar: []
  });

  /* ==========================================================
     Dinero — Tipo de cambio IDR↔€ y formato
     ========================================================== */
  const RATE  = () => (state.fx && state.fx.rate > 0 ? state.fx.rate : 17000);
  const toEUR = (imp, mon) => (mon === 'EUR' ? +imp : +imp / RATE());
  const toIDR = (imp, mon) => (mon === 'IDR' ? +imp : +imp * RATE());
  const fmtEUR = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const fmtIDR = n => 'Rp ' + new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

  // Tipo del día del BCE (frankfurter.dev), cacheado en state.fx. Una vez al
  // día; si no hay conexión, no hace nada. Solo se silencian los fallos de
  // red / HTTP / parseo: si peta el re-render posterior, que se vea en consola.
  function refreshFx() {
    if (!navigator.onLine) return;
    if (state.fx && state.fx.stamp === hoyYMD()) return;
    fetch('https://api.frankfurter.dev/v1/latest?from=EUR&to=IDR')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null)
      .then(j => {
        const thb = j && j.rates && j.rates.IDR;
        if (typeof thb !== 'number' || !(thb > 0)) return;
        state.fx = { rate: thb, date: j.date || hoyYMD(), source: 'api', stamp: hoyYMD() };
        save();
        renderDatos();
      });
  }

  // Lista de equipaje curada para Bali: clima tropical húmedo, templos,
  // playas/islas, temporada seca (fin sep - principios oct). Sin datos
  // personales — es una plantilla que el usuario ajusta a su viaje real
  // desde Datos.
  const EQUIPAJE_SEED = [
    { id: 'seed-eq-1', texto: 'Ropa ligera y transpirable para varios días', cat: 'Ropa', packed: false },
    { id: 'seed-eq-2', texto: 'Ropa que cubra hombros y rodillas (para entrar a templos) o un pareo/sarong ligero de repuesto', cat: 'Ropa', packed: false },
    { id: 'seed-eq-3', texto: 'Chubasquero ligero o poncho de lluvia (chubascos cortos de tarde, aunque sea temporada seca)', cat: 'Ropa', packed: false },
    { id: 'seed-eq-4', texto: 'Bañador (varios, para playa, piscina y snorkel)', cat: 'Ropa', packed: false },
    { id: 'seed-eq-5', texto: 'Pareo o toalla de secado rápido', cat: 'Ropa', packed: false },
    { id: 'seed-eq-6', texto: 'Jersey o chaqueta ligera (aire acondicionado fuerte en el coche, restaurantes y el avión)', cat: 'Ropa', packed: false },
    { id: 'seed-eq-7', texto: 'Chanclas o sandalias fáciles de quitar (templos, villa y playa)', cat: 'Calzado', packed: false },
    { id: 'seed-eq-8', texto: 'Calzado cómodo para caminar (Campuhan Ridge, Tegallalang, Uluwatu)', cat: 'Calzado', packed: false },
    { id: 'seed-eq-9', texto: 'Protector solar alto, idealmente reef-safe para Gili Air y snorkel', cat: 'Sol y mosquitos', packed: false },
    { id: 'seed-eq-10', texto: 'Repelente de mosquitos con DEET o icaridina', cat: 'Sol y mosquitos', packed: false },
    { id: 'seed-eq-11', texto: 'Gafas de sol y gorra o sombrero', cat: 'Sol y mosquitos', packed: false },
    { id: 'seed-eq-12', texto: 'After-sun o gel de aloe vera', cat: 'Sol y mosquitos', packed: false },
    { id: 'seed-eq-13', texto: 'Pasaporte con al menos 6 meses de validez desde la entrada', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-14', texto: 'e-VOA (visa on arrival electrónica) tramitada e impresa o guardada', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-15', texto: 'Bali Tourist Levy: comprobante de pago de la tasa turística', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-16', texto: 'All Indonesia Arrival Card rellenada', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-17', texto: 'Seguro de viaje: documento y teléfono de asistencia', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-18', texto: 'Copia digital y en papel del pasaporte', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-19', texto: 'Tarjeta con chip y PIN, y algo de efectivo en Rupias (IDR)', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-20', texto: 'Cargador y cable de móvil', cat: 'Electrónica', packed: false },
    { id: 'seed-eq-21', texto: 'Batería externa', cat: 'Electrónica', packed: false },
    { id: 'seed-eq-22', texto: 'Adaptador de enchufe universal (Indonesia: tomas tipo C/F, 230V)', cat: 'Electrónica', packed: false },
    { id: 'seed-eq-23', texto: 'Funda impermeable para el móvil (fast boat a Gili Air)', cat: 'Electrónica', packed: false },
    { id: 'seed-eq-24', texto: 'Analgésicos, antidiarreico y sales de rehidratación', cat: 'Botiquín y aseo', packed: false },
    { id: 'seed-eq-25', texto: 'Antihistamínico', cat: 'Botiquín y aseo', packed: false },
    { id: 'seed-eq-26', texto: 'Gel hidroalcohólico', cat: 'Botiquín y aseo', packed: false },
    { id: 'seed-eq-27', texto: 'Pastillas para el mareo (fast boat Padang Bai ↔ Gili Air)', cat: 'Botiquín y aseo', packed: false },
    { id: 'seed-eq-28', texto: 'Bolsa estanca (dry bag) pequeña', cat: 'Playa y barco', packed: false },
    { id: 'seed-eq-29', texto: 'Gafas y tubo de snorkel propios, si los tienes', cat: 'Playa y barco', packed: false },
    { id: 'seed-eq-30', texto: 'Candado pequeño para taquillas o mochila', cat: 'Playa y barco', packed: false }
  ];

  // Checklist de tareas antes de salir (no objetos que llevar, eso es
  // EQUIPAJE_SEED). "anchor" liga una tarea a un vuelo real de state.vuelos
  // ('vuelo-ida'/'vuelo-vuelta') para calcular su fecha límite en cuanto el
  // usuario añada sus vuelos — ver anteDeadline()/anteFechaTxt(). Sin vuelos
  // añadidos todavía, esas dos tareas se muestran sin fecha, como el resto.
  const ANTES_SEED = [
    { id: 'seed-an-1', texto: 'Pasaporte con mínimo 6 meses de validez desde la entrada', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-2', texto: 'Tramitar el e-VOA (visa on arrival electrónica)', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-3', texto: 'Pagar el Bali Tourist Levy (tasa turística) online', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-4', texto: 'Rellenar el All Indonesia Arrival Card antes de aterrizar', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-5', texto: 'Consultar vacunas recomendadas en un centro de vacunación internacional', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-6', texto: 'Contratar el seguro de viaje', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-7', texto: 'Activar roaming de datos o comprar una eSIM', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-8', texto: 'Facturar el vuelo de ida', cat: 'Vuelos', anchor: 'vuelo-ida', hecho: false },
    { id: 'seed-an-9', texto: 'Facturar el vuelo de vuelta', cat: 'Vuelos', anchor: 'vuelo-vuelta', hecho: false },
    { id: 'seed-an-10', texto: 'Traslado Ubud → Gili Air con recogida en Wakanda + fast boat', cat: 'Reservas clave', anchor: null, hecho: false },
    { id: 'seed-an-11', texto: 'Fast boat Gili Air → Bali (vuelta hacia Uluwatu)', cat: 'Reservas clave', anchor: null, hecho: false },
    { id: 'seed-an-12', texto: 'Conductor privado para el 30 de septiembre (Tegallalang · Besakih · Sidemen)', cat: 'Reservas clave', anchor: null, hecho: false },
    { id: 'seed-an-13', texto: 'Masaje balinés (Madu Spa, día 3)', cat: 'Reservas clave', anchor: null, hecho: false },
    { id: 'seed-an-14', texto: 'Entradas o actividades que decidamos cerrar por adelantado (p. ej. Kecak en Uluwatu)', cat: 'Reservas clave', anchor: null, hecho: false },
    { id: 'seed-an-15', texto: 'Avisar al banco de que vas a usar la tarjeta en Indonesia', cat: 'General', anchor: null, hecho: false },
    { id: 'seed-an-16', texto: 'Sacar fotocopia o foto digital del pasaporte y guardarla aparte', cat: 'General', anchor: null, hecho: false },
    { id: 'seed-an-17', texto: 'Probar la app sin conexión: abrir Mapas de cada día con wifi antes de salir', cat: 'General', anchor: null, hecho: false }
  ];

  // Viaje real: 27 sep - 7 oct 2026, con los datos que has dado. Todo sigue
  // siendo editable desde la app: esto es solo el punto de partida al abrir
  // la web por primera vez. Ubicaciones sin coordenadas exactas confirmadas
  // se pueden reajustar con «Buscar» desde la propia app.
  const META_SEED = { titulo: 'Viaje a Bali', fechaInicio: '2026-09-28', fechaFin: '2026-10-06' };

  const VUELOS_SEED = [
    {
      id: 'seed-vu-ida', tipo: 'Ida', reserva: '', antelacion: '3 h', equipaje: '30 kg facturados + 8 kg de mano por persona.',
      notas: 'Turkish Airlines, clase turista. Duración total del viaje: 18 h 40 min. Bali va 6 horas por delante de España.',
      tramos: [{
        aerolinea: 'Turkish Airlines', numero: 'TK1860', clase: 'Turista', operadoPor: '',
        origen: 'MAD', origenNombre: 'Madrid-Barajas', origenTerminal: '',
        destino: 'IST', destinoNombre: 'Estambul', destinoTerminal: '',
        salida: '2026-09-27T18:25', llegada: '2026-09-27T23:40', duracion: 'Airbus A330-300 · asientos 15A / 15B'
      }, {
        aerolinea: 'Turkish Airlines', numero: 'TK66', clase: 'Turista', operadoPor: '',
        origen: 'IST', origenNombre: 'Estambul', origenTerminal: '',
        destino: 'DPS', destinoNombre: 'Denpasar', destinoTerminal: '',
        salida: '2026-09-28T01:20', llegada: '2026-09-28T19:05', duracion: 'Airbus A350-900 · asientos 15A / 15B'
      }]
    },
    {
      id: 'seed-vu-vuelta', tipo: 'Vuelta', reserva: '', antelacion: '3 h', equipaje: '30 kg facturados + 8 kg de mano por persona.',
      notas: 'Turkish Airlines, clase turista. Duración total del viaje: 19 h 40 min. Llegada a Madrid miércoles 7 oct, 10:25 hora local.',
      tramos: [{
        aerolinea: 'Turkish Airlines', numero: 'TK67', clase: 'Turista', operadoPor: '',
        origen: 'DPS', origenNombre: 'Denpasar', origenTerminal: '',
        destino: 'IST', destinoNombre: 'Estambul', destinoTerminal: '',
        salida: '2026-10-06T20:45', llegada: '2026-10-07T04:45', duracion: 'Airbus A350-900 · asientos 15K / 15J'
      }, {
        aerolinea: 'Turkish Airlines', numero: 'TK1857', clase: 'Turista', operadoPor: '',
        origen: 'IST', origenNombre: 'Estambul', origenTerminal: '',
        destino: 'MAD', destinoNombre: 'Madrid-Barajas', destinoTerminal: '',
        salida: '2026-10-07T07:05', llegada: '2026-10-07T10:25', duracion: 'Airbus A330 · asientos 15A / 15B'
      }]
    }
  ];

  const ALOJ_SEED = [
    { id: 'seed-al-ubud', nombre: 'theWakanda A Pramana Experience',
      loc: { texto: 'Kemenuh, Ubud, Gianyar, Bali', lat: -8.5676, lng: 115.2905 },
      checkin: '2026-09-28', checkout: '2026-10-02', zona: 'Ubud (Kemenuh)', reserva: '',
      notas: '4 noches. Está en Kemenuh, no en el centro de Ubud — ten esto en cuenta para calcular traslados y recogidas.' },
    { id: 'seed-al-gili', nombre: 'Follow The Rabbit Bungalow',
      loc: { texto: 'Gili Air, Lombok Utara, Nusa Tenggara Occidental', lat: -8.3557, lng: 116.0836 },
      checkin: '2026-10-02', checkout: '2026-10-04', zona: 'Gili Air', reserva: '',
      notas: '2 noches. Sin coches ni motos en la isla: todo se mueve a pie, en bici o con carro de caballos (cidomo).' },
    { id: 'seed-al-uluwatu', nombre: 'Wira Homestay',
      loc: { texto: 'Pecatu, Uluwatu, Bali', lat: -8.8167, lng: 115.1167 },
      checkin: '2026-10-04', checkout: '2026-10-06', zona: 'Uluwatu (Pecatu)', reserva: '',
      notas: '2 noches, última etapa del viaje.' }
  ];

  // loc() sin lat/lng: solo se guarda el nombre. La app permite geocodificar
  // cada uno con el botón «Buscar» al editarlo, en vez de arriesgarse a un
  // pin inventado para templos y miradores menos conocidos.
  const gl = (texto, lat, lng) => (lat != null ? { texto, lat, lng } : { texto });

  // Fotos: se deja vacío a propósito. Sin una URL de Wikimedia Commons
  // verificada por sitio, es preferible no mostrar foto a arriesgarse a una
  // imagen equivocada o rota.
  const FOTO = {};

  const EXC_SEED = [
    { id: 'seed-ex-traslado-llegada', nombre: 'Traslado al alojamiento en Ubud (theWakanda) y descanso', fecha: '2026-09-28', hora: '20:00', duracion: '',
      encuentro: {}, proveedor: '', reserva: '', notas: 'Traslado desde el aeropuerto de Denpasar hasta Kemenuh, Ubud.' },
    { id: 'seed-ex-conductor-dia2', nombre: 'Salida de Wakanda con conductor privado', fecha: '2026-09-30', hora: '06:30', duracion: '',
      encuentro: {}, proveedor: '', reserva: '', notas: 'Conductor privado para todo el día: Tegallalang → Besakih → Sidemen → regreso a Wakanda. Madrugamos una vez porque merece la pena.' },
    { id: 'seed-ex-masaje', nombre: 'Masaje balinés en Madu Spa', fecha: '2026-10-01', hora: '17:00', duracion: '60',
      encuentro: {}, proveedor: 'Madu Spa', reserva: '', notas: 'Descanso tras Campuhan Ridge Walk y el Monkey Forest. El masaje y el descanso tienen prioridad sobre Kanto Lampo si el día aprieta.' },
    { id: 'seed-ex-recogida-gili', nombre: 'Recogida en Wakanda (pendiente de confirmación exacta con la compañía)', fecha: '2026-10-02', hora: '08:00', duracion: '',
      encuentro: {}, proveedor: '', reserva: '', notas: 'Traslado Ubud → Padang Bai → fast boat a Gili Air, en una sola reserva. La recogida exacta debe confirmarse porque el hotel está en Kemenuh, no en el núcleo de Central Ubud.' },
    { id: 'seed-ex-fastboat-ida', nombre: 'Fast boat hacia Gili Air', fecha: '2026-10-02', hora: '10:00', duracion: '140',
      encuentro: { texto: 'Padang Bai (embarcadero de fast boats)', lat: -8.5309, lng: 115.5093 }, proveedor: '', reserva: '', notas: 'Si se confirma la salida elegida.' },
    { id: 'seed-ex-snorkel', nombre: 'Snorkel desde la costa, buscando Turtle Point / zona este de la isla', fecha: '2026-10-03', hora: '09:00', duracion: '',
      encuentro: {}, proveedor: '', reserva: '', notas: 'Día de isla: aquí no hace falta una agenda militar.' },
    { id: 'seed-ex-fastboat-vuelta', nombre: 'Fast boat de regreso a Bali + traslado hacia Uluwatu', fecha: '2026-10-04', hora: '10:30', duracion: '240',
      encuentro: { texto: 'Gili Air (embarcadero)', lat: -8.3557, lng: 116.0836 }, proveedor: '', reserva: '', notas: 'Prioridad: no convertir este día en otra excursión.' },
    { id: 'seed-ex-kecak', nombre: 'Kecak Dance con puesta de sol (Uluwatu Temple)', fecha: '2026-10-05', hora: '18:00', duracion: '60',
      encuentro: { texto: 'Uluwatu Temple', lat: -8.8291, lng: 115.0849 }, proveedor: '', reserva: '',
      notas: 'Hay dos pases, uno a las 18:00 y otro a las 19:00; la entrada de la danza es aparte de la del templo. Reserva con unos días de antelación en temporada alta.' },
    { id: 'seed-ex-checkout-final', nombre: 'Recoger maletas y check-out', fecha: '2026-10-06', hora: '15:00', duracion: '',
      encuentro: {}, proveedor: '', reserva: '', notas: '' },
    { id: 'seed-ex-al-aeropuerto', nombre: 'Salida hacia el aeropuerto de Denpasar', fecha: '2026-10-06', hora: '16:00', duracion: '',
      encuentro: { texto: 'Aeropuerto de Denpasar (DPS)', lat: -8.7467, lng: 115.1667 }, proveedor: '', reserva: '', notas: 'Llegada con margen sobre las 18:00 para el vuelo de las 20:45.' }
  ];

  const LUGAR_SEED = [
    // 29 sep — Día 1: Ubud tranquilo, primer contacto
    { id: 'seed-lg-ubudpalace', nombre: 'Ubud Palace', loc: { texto: 'Ubud Palace (Puri Saren Agung)', lat: -8.5069, lng: 115.2625 }, fecha: '2026-09-29', hora: '12:00', visita: '45', prioridad: 'Alta', notas: '' },
    { id: 'seed-lg-saraswati', nombre: 'Pura Taman Saraswati y paseo por el centro', loc: { texto: 'Pura Taman Saraswati, Ubud', lat: -8.5063, lng: 115.2617 }, fecha: '2026-09-29', hora: '12:45', visita: '45', prioridad: 'Media', notas: '' },
    { id: 'seed-lg-ubudmarket', nombre: 'Ubud Market + callejeo, cafés y tiendas locales', loc: { texto: 'Ubud Market', lat: -8.5077, lng: 115.2624 }, fecha: '2026-09-29', hora: '15:00', visita: '120', prioridad: 'Media', notas: '' },
    { id: 'seed-lg-wakanda-tarde1', nombre: 'Regreso a Wakanda / tarde de piscina y descanso', loc: { texto: 'theWakanda A Pramana Experience, Kemenuh', lat: -8.5676, lng: 115.2905 }, fecha: '2026-09-29', hora: '17:00', visita: '', prioridad: 'Baja',
      notas: 'Idea del día: empezar a sentir Ubud, no «conquistarlo». Nada de correr, y cena tranquila sin obligarnos a añadir más cosas.' },
    // 30 sep — Día 2: Tegallalang · Besakih · Sidemen
    { id: 'seed-lg-tegallalang', nombre: 'Tegallalang Rice Terraces', loc: { texto: 'Tegallalang Rice Terraces', lat: -8.4312, lng: 115.2777 }, fecha: '2026-09-30', hora: '07:30', visita: '90', prioridad: 'Alta',
      notas: 'Caminar por los arrozales y disfrutar del paisaje, evitando convertirlo en una parada de foto rápida.' },
    { id: 'seed-lg-besakih', nombre: 'Pura Besakih', loc: { texto: 'Pura Besakih', lat: -8.3742, lng: 115.4517 }, fecha: '2026-09-30', hora: '10:30', visita: '150', prioridad: 'Alta',
      notas: 'El gran complejo de templos en las laderas del monte Agung.' },
    { id: 'seed-lg-sidemen', nombre: 'Sidemen', loc: { texto: 'Sidemen', lat: -8.4167, lng: 115.4667 }, fecha: '2026-09-30', hora: '14:30', visita: '120', prioridad: 'Media',
      notas: 'Arrozales, pueblo, paseo tranquilo y ambiente rural. Idea del día: paisaje agrícola → Bali espiritual → Bali rural. Nota: hemos dejado fuera Tirta Empul a propósito — no nos interesa la purificación y no queremos añadir una parada solo por la foto.' },
    // 1 oct — Día 3: Campuhan · Monkey Forest · masaje
    { id: 'seed-lg-campuhan', nombre: 'Campuhan Ridge Walk', loc: { texto: 'Campuhan Ridge Walk', lat: -8.5030, lng: 115.2571 }, fecha: '2026-10-01', hora: '08:30', visita: '90', prioridad: 'Alta',
      notas: 'Temprano para evitar el calor y disfrutar del paseo.' },
    { id: 'seed-lg-monkeyforest', nombre: 'Sacred Monkey Forest Sanctuary', loc: { texto: 'Sacred Monkey Forest Sanctuary, Ubud', lat: -8.5188, lng: 115.2588 }, fecha: '2026-10-01', hora: '10:30', visita: '120', prioridad: 'Alta', notas: '' },
    { id: 'seed-lg-kantolampo', nombre: 'Kanto Lampo Waterfall (opcional)', loc: { texto: 'Kanto Lampo Waterfall', lat: -8.4649, lng: 115.3216 }, fecha: '2026-10-01', hora: '14:30', visita: '90', prioridad: 'Baja',
      notas: 'Según energía y ganas — si obliga a ir con prisas, se elimina: el masaje y el descanso tienen prioridad.' },
    // 2 oct — Día 4: Ubud → Gili Air
    { id: 'seed-lg-padangbai', nombre: 'Llegada a Padang Bai y check-in', loc: { texto: 'Padang Bai', lat: -8.5309, lng: 115.5093 }, fecha: '2026-10-02', hora: '09:00', visita: '', prioridad: 'Media', notas: '' },
    { id: 'seed-lg-llegadagili', nombre: 'Llegada a Gili Air', loc: { texto: 'Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-02', hora: '12:20', visita: '', prioridad: 'Media', notas: '' },
    { id: 'seed-lg-bicigili1', nombre: 'Primer paseo en bici + playa + snorkel/tortugas si apetece', loc: { texto: 'Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-02', hora: '16:00', visita: '', prioridad: 'Media', notas: '' },
    { id: 'seed-lg-costagili', nombre: 'Paseo por la costa y cena', loc: { texto: 'Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-02', hora: '18:30', visita: '', prioridad: 'Baja', notas: '' },
    // 3 oct — Día 5: Gili Air, mar y bicis
    { id: 'seed-lg-bicigili2', nombre: 'Dar la vuelta a Gili Air en bici, parar donde apetezca', loc: { texto: 'Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-03', hora: '15:30', visita: '', prioridad: 'Media', notas: 'Sin ruta cerrada.' },
    { id: 'seed-lg-sunsetgili', nombre: 'Sunset en la playa', loc: { texto: 'Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-03', hora: '18:00', visita: '', prioridad: 'Media',
      notas: 'Este día está deliberadamente abierto: Gili Air se disfruta más cuando no hay que mirar el reloj.' },
    // 4 oct — Día 6: Gili Air → Uluwatu
    { id: 'seed-lg-checkinuluwatu', nombre: 'Check-in en Wira Homestay + piscina / descanso', loc: { texto: 'Wira Homestay, Pecatu', lat: -8.8167, lng: 115.1167 }, fecha: '2026-10-04', hora: '15:00', visita: '', prioridad: 'Media', notas: '' },
    { id: 'seed-lg-acantilados1', nombre: 'Primer contacto con los acantilados o una playa cercana', loc: { texto: 'Acantilados de Uluwatu', lat: -8.8291, lng: 115.0849 }, fecha: '2026-10-04', hora: '18:00', visita: '', prioridad: 'Media', notas: '' },
    // 5 oct — Día 7: Uluwatu, playas + templo + Kecak
    { id: 'seed-lg-playauluwatu', nombre: 'Playa: Padang Padang / Thomas Beach / Bingin, según apetezca', loc: { texto: 'Padang Padang Beach', lat: -8.8115, lng: 115.1088 }, fecha: '2026-10-05', hora: '09:00', visita: '', prioridad: 'Media',
      notas: 'No hace falta visitar todas las playas — elegimos las que mejor encajen con el ritmo del día.' },
    { id: 'seed-lg-acantiladosuluwatu', nombre: 'Acantilados de Uluwatu', loc: { texto: 'Acantilados de Uluwatu', lat: -8.8291, lng: 115.0849 }, fecha: '2026-10-05', hora: '15:30', visita: '60', prioridad: 'Media', notas: '' },
    { id: 'seed-lg-templouluwatu', nombre: 'Uluwatu Temple', loc: { texto: 'Pura Luhur Uluwatu', lat: -8.8291, lng: 115.0849 }, fecha: '2026-10-05', hora: '17:00', visita: '45', prioridad: 'Alta', notas: 'Antes del atardecer.' },
    // 6 oct — Día 8: últimas horas, Bali → Madrid
    { id: 'seed-lg-ultimobano', nombre: 'Último baño / paseo / café', loc: { texto: 'Wira Homestay, Pecatu', lat: -8.8167, lng: 115.1167 }, fecha: '2026-10-06', hora: '11:00', visita: '', prioridad: 'Media', notas: '' },
    { id: 'seed-lg-aeropuertomargen', nombre: 'Llegada al aeropuerto con margen', loc: { texto: 'Aeropuerto de Denpasar (DPS)', lat: -8.7467, lng: 115.1667 }, fecha: '2026-10-06', hora: '18:00', visita: '', prioridad: 'Media',
      notas: 'Cierre: fin de una aventura. Y probablemente ya estaremos pensando en volver.' }
  ];

  const COMIDA_SEED = [
    { id: 'seed-cm-desayuno1', nombre: 'Desayuno tranquilo en Wakanda + piscina', tipo: 'Desayuno', loc: { texto: 'theWakanda A Pramana Experience, Kemenuh', lat: -8.5676, lng: 115.2905 }, fecha: '2026-09-29', horario: '09:00', notas: 'Disfrutar de la villa, la piscina y el entorno.' },
    { id: 'seed-cm-comida1', nombre: 'Comida en Ubud', tipo: 'Almuerzo', loc: {}, fecha: '2026-09-29', horario: '13:30', notas: '' },
    { id: 'seed-cm-cena1', nombre: 'Cena tranquila', tipo: 'Cena', loc: {}, fecha: '2026-09-29', horario: '20:00', notas: 'Sin obligarnos a añadir más cosas.' },
    { id: 'seed-cm-comida2', nombre: 'Comida local / warung', tipo: 'Casual / rápido', loc: {}, fecha: '2026-09-30', horario: '13:00', notas: '' },
    { id: 'seed-cm-cena2', nombre: 'Cena y descanso en Wakanda', tipo: 'Cena', loc: { texto: 'theWakanda A Pramana Experience, Kemenuh', lat: -8.5676, lng: 115.2905 }, fecha: '2026-09-30', horario: '20:00', notas: '' },
    { id: 'seed-cm-desayuno3', nombre: 'Desayuno', tipo: 'Desayuno', loc: {}, fecha: '2026-10-01', horario: '08:00', notas: '' },
    { id: 'seed-cm-comida3', nombre: 'Comida', tipo: 'Almuerzo', loc: {}, fecha: '2026-10-01', horario: '13:00', notas: '' },
    { id: 'seed-cm-cena3', nombre: 'Cena y noche tranquila en el hotel', tipo: 'Cena', loc: { texto: 'theWakanda A Pramana Experience, Kemenuh', lat: -8.5676, lng: 115.2905 }, fecha: '2026-10-01', horario: '20:00', notas: '' },
    { id: 'seed-cm-desayuno4', nombre: 'Desayuno sin prisas', tipo: 'Desayuno', loc: { texto: 'theWakanda A Pramana Experience, Kemenuh', lat: -8.5676, lng: 115.2905 }, fecha: '2026-10-02', horario: '07:00', notas: '' },
    { id: 'seed-cm-comida4', nombre: 'Llegar a Follow The Rabbit, dejar equipaje y comer', tipo: 'Almuerzo', loc: { texto: 'Follow The Rabbit Bungalow, Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-02', horario: '12:30', notas: '' },
    { id: 'seed-cm-comida5', nombre: 'Comer algo fresco y descansar', tipo: 'Almuerzo', loc: { texto: 'Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-03', horario: '13:00', notas: '' },
    { id: 'seed-cm-cena5', nombre: 'Cena tranquila + paseo', tipo: 'Cena', loc: { texto: 'Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-03', horario: '20:00', notas: '' },
    { id: 'seed-cm-desayuno6', nombre: 'Desayuno + últimas horas de Gili Air', tipo: 'Desayuno', loc: { texto: 'Gili Air', lat: -8.3557, lng: 116.0836 }, fecha: '2026-10-04', horario: '08:00', notas: '' },
    { id: 'seed-cm-cena6', nombre: 'Cena en Pecatu', tipo: 'Cena', loc: { texto: 'Pecatu', lat: -8.8167, lng: 115.1167 }, fecha: '2026-10-04', horario: '20:00', notas: '' },
    { id: 'seed-cm-comida7', nombre: 'Comida y descanso', tipo: 'Almuerzo', loc: {}, fecha: '2026-10-05', horario: '13:00', notas: '' },
    { id: 'seed-cm-cena7', nombre: 'Cena tranquila', tipo: 'Cena', loc: {}, fecha: '2026-10-05', horario: '20:30', notas: '' },
    { id: 'seed-cm-desayuno8', nombre: 'Desayuno + disfrutar del alojamiento', tipo: 'Desayuno', loc: { texto: 'Wira Homestay, Pecatu', lat: -8.8167, lng: 115.1167 }, fecha: '2026-10-06', horario: '08:00', notas: '' },
    { id: 'seed-cm-comida8', nombre: 'Comida', tipo: 'Almuerzo', loc: {}, fecha: '2026-10-06', horario: '13:00', notas: '' }
  ];

  function seedState() {
    const s = blankState();
    s.meta = Object.assign({}, META_SEED);
    s.vuelos = JSON.parse(JSON.stringify(VUELOS_SEED));
    s.alojamientos = JSON.parse(JSON.stringify(ALOJ_SEED));
    s.excursiones = JSON.parse(JSON.stringify(EXC_SEED));
    s.lugares = JSON.parse(JSON.stringify(LUGAR_SEED));
    s.comidas = JSON.parse(JSON.stringify(COMIDA_SEED));
    s.equipaje = JSON.parse(JSON.stringify(EQUIPAJE_SEED));
    s.antesDeViajar = JSON.parse(JSON.stringify(ANTES_SEED));
    return s;
  }

  // Compatibilidad: vuelos antiguos de un solo tramo -> estructura con tramos[].
  function migrateVuelo(v) {
    if (v && Array.isArray(v.tramos)) {
      if (v.equipaje == null) v.equipaje = '';
      if (v.antelacion == null) v.antelacion = '';
      return v;
    }
    v = v || {};
    return {
      id: v.id || uid(),
      tipo: v.tipo || 'Ida',
      reserva: v.reserva || '',
      antelacion: v.antelacion || '',
      equipaje: v.equipaje || '',
      notas: v.notas || '',
      tramos: [{
        aerolinea: v.aerolinea || '', numero: v.numero || '', clase: '', operadoPor: '',
        origen: v.origen || '', origenNombre: '', origenTerminal: '',
        destino: v.destino || '', destinoNombre: '', destinoTerminal: '',
        salida: v.salida || '', llegada: v.llegada || '', duracion: ''
      }]
    };
  }

  // Añade a una lista de equipaje ya guardada los ítems nuevos del seed que
  // falten (por id), sin tocar los existentes ni su estado 'packed'.
  function mergeEquipajeSeed(existing) {
    const list = Array.isArray(existing) ? existing.slice() : [];
    const ids = new Set(list.map(i => i.id));
    EQUIPAJE_SEED.forEach(item => {
      if (!ids.has(item.id)) list.push(JSON.parse(JSON.stringify(item)));
    });
    return list;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return seedState();
      const p = JSON.parse(raw);
      const b = blankState();
      return {
        meta: Object.assign(b.meta, p.meta || {}),
        vuelos: (p.vuelos || []).map(migrateVuelo),
        coches: p.coches || [],
        alojamientos: p.alojamientos || [],
        excursiones: p.excursiones || [],
        comidas: p.comidas || [],
        lugares: p.lugares || [],
        recomendaciones: p.recomendaciones || [],
        gastos: p.gastos || [],
        fx: Object.assign(blankFx(), p.fx || {}),
        meteo: Object.assign(blankMeteo(), p.meteo || {}),
        equipaje: p.equipaje !== undefined ? mergeEquipajeSeed(p.equipaje) : JSON.parse(JSON.stringify(EQUIPAJE_SEED)),
        diario: p.diario || {},
        antesDeViajar: p.antesDeViajar !== undefined ? p.antesDeViajar : JSON.parse(JSON.stringify(ANTES_SEED))
      };
    } catch (e) {
      console.warn('Estado ilegible, se reinicia.', e);
      return blankState();
    }
  }

  let state = load();
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) {
        toast('No se pudo guardar (almacenamiento lleno).');
      }
    }, 150);
  }

  const COL_OF  = { vuelo: 'vuelos', coche: 'coches', alojamiento: 'alojamientos', excursion: 'excursiones', comida: 'comidas', lugar: 'lugares', recomendacion: 'recomendaciones', gasto: 'gastos' };
  const KIND_OF = { vuelos: 'vuelo', coches: 'coche', alojamientos: 'alojamiento', excursiones: 'excursion', comidas: 'comida', lugares: 'lugar', recomendaciones: 'recomendacion', gastos: 'gasto' };

  /* ==========================================================
     Lugares conocidos de Bali (autocompletado + coordenadas)
     ========================================================== */
  const GAZ = [
    { n: 'Aeropuerto de Denpasar (DPS)', lat: -8.7467, lng: 115.1667, min: 0 },
    { n: 'Ubud Palace (Puri Saren Agung)', lat: -8.5069, lng: 115.2625, min: 45 },
    { n: 'Pura Taman Saraswati', lat: -8.5063, lng: 115.2617, min: 30 },
    { n: 'Ubud Market', lat: -8.5077, lng: 115.2624, min: 60 },
    { n: 'Tegallalang Rice Terraces', lat: -8.4312, lng: 115.2777, min: 90 },
    { n: 'Pura Besakih', lat: -8.3742, lng: 115.4517, min: 120 },
    { n: 'Sidemen', lat: -8.4167, lng: 115.4667, min: 90 },
    { n: 'Campuhan Ridge Walk', lat: -8.5030, lng: 115.2571, min: 60 },
    { n: 'Sacred Monkey Forest Sanctuary', lat: -8.5188, lng: 115.2588, min: 90 },
    { n: 'Kanto Lampo Waterfall', lat: -8.4649, lng: 115.3216, min: 60 },
    { n: 'Tirta Empul', lat: -8.4154, lng: 115.3153, min: 60 },
    { n: 'Padang Bai (embarcadero)', lat: -8.5309, lng: 115.5093, min: 0 },
    { n: 'Gili Air', lat: -8.3557, lng: 116.0836, min: 0 },
    { n: 'Gili Trawangan', lat: -8.3505, lng: 116.0450, min: 30 },
    { n: 'Gili Meno', lat: -8.3479, lng: 116.0673, min: 20 },
    { n: 'Uluwatu Temple (Pura Luhur Uluwatu)', lat: -8.8291, lng: 115.0849, min: 60 },
    { n: 'Padang Padang Beach', lat: -8.8115, lng: 115.1088, min: 60 },
    { n: 'Bingin Beach', lat: -8.8034, lng: 115.1189, min: 45 },
    { n: 'Thomas Beach', lat: -8.8213, lng: 115.1067, min: 45 },
    { n: 'Pecatu', lat: -8.8167, lng: 115.1167, min: 0 },
    { n: 'Denpasar, centro', lat: -8.6500, lng: 115.2167, min: 60 },
    { n: 'Seminyak', lat: -8.6913, lng: 115.1673, min: 90 },
    { n: 'Canggu', lat: -8.6478, lng: 115.1385, min: 90 },
    { n: 'Sanur', lat: -8.6885, lng: 115.2624, min: 60 },
    { n: 'Nusa Dua', lat: -8.8005, lng: 115.2274, min: 60 },
    { n: 'Kintamani / Monte Batur', lat: -8.2422, lng: 115.3750, min: 120 },
    { n: 'Munduk', lat: -8.2667, lng: 115.0833, min: 90 },
    { n: 'Nusa Penida', lat: -8.7276, lng: 115.5444, min: 240 },
    { n: 'Nusa Lembongan', lat: -8.6785, lng: 115.4485, min: 180 }
  ];
  const GAZ_BY_NAME = k => GAZ.find(g => g.n.toLowerCase() === String(k).trim().toLowerCase());

  /* ==========================================================
     Esquemas de formulario
     ========================================================== */
  const TIPOS_COMIDA = ['Puesto callejero', 'Cafetería', 'Desayuno', 'Brunch', 'Almuerzo', 'Cena', 'Café / postre', 'Alta cocina', 'Casual / rápido', 'Mercado nocturno'];

  const CATS = ['Comida/super', 'Restaurante', 'Transporte', 'Compras', 'Actividad', 'Alojamiento', 'Otros'];

  const SCHEMAS = {
    // Los vuelos usan un formulario propio (openFlightSheet) que admite escalas.
    vuelo: { sing: 'vuelo', icon: '✈️', fields: [] },
    // Los datos del viaje (título y fechas) usan un formulario propio y corto,
    // no son una colección — ver openMetaSheet/submitMeta.
    meta: {
      sing: 'datos del viaje', icon: '🧭',
      fields: [
        { k: 'titulo', l: 'Nombre del viaje', t: 'text', req: true, ph: 'Viaje a Bali' },
        { k: 'fechaInicio', l: 'Fecha de inicio', t: 'date' },
        { k: 'fechaFin', l: 'Fecha de fin', t: 'date' }
      ]
    },
    gasto: {
      sing: 'gasto', icon: '💶',
      fields: [
        { k: 'fecha', l: 'Fecha', t: 'date', req: true },
        { k: 'concepto', l: 'Concepto', t: 'text', req: true, ph: 'Pad thai en Yaowarat' },
        { k: 'categoria', l: 'Categoría', t: 'select', opts: CATS, def: 'Comida/super', req: true },
        { k: 'moneda', l: 'Moneda', t: 'select', opts: ['IDR', 'EUR'], def: 'IDR', req: true },
        { k: 'importe', l: 'Importe', t: 'number', req: true, min: 0 },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    recomendacion: {
      sing: 'recomendación', icon: '💡',
      fields: [
        { k: 'texto', l: 'Recomendación', t: 'textarea', req: true, ph: 'Ej.: Parar a ver el atardecer en Tanah Lot de camino' },
        { k: 'categoria', l: 'Categoría', t: 'select', opts: ['Ver', 'Hacer', 'Comer', 'Comprar', 'Consejo', 'Otro'], def: 'Hacer' },
        { k: 'link', l: 'Enlace (opcional)', t: 'text', ph: 'https://…' }
      ]
    },
    coche: {
      sing: 'vehículo de alquiler', icon: '🛵',
      fields: [
        { k: 'empresa', l: 'Empresa', t: 'text', req: true, ph: 'Empresa de alquiler de moto o coche' },
        { k: 'modelo', l: 'Modelo', t: 'text', ph: 'Honda Click 125i' },
        { k: 'reserva', l: 'Nº de reserva', t: 'text', mono: true },
        { k: 'recogidaLugar', l: 'Lugar de recogida', t: 'loc', req: true },
        { k: 'recogida', l: 'Recogida (fecha y hora)', t: 'datetime-local', req: true },
        { k: 'devolucionLugar', l: 'Lugar de devolución', t: 'loc' },
        { k: 'devolucion', l: 'Devolución (fecha y hora)', t: 'datetime-local' },
        { k: 'precio', l: 'Precio total', t: 'text', ph: 'p. ej. 250 IDR/día' },
        { k: 'franquicia', l: 'Franquicia / depósito', t: 'text', ph: 'p. ej. 3.000 IDR' },
        { k: 'telefono', l: 'Teléfono', t: 'text' },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    alojamiento: {
      sing: 'alojamiento', icon: '🛏️',
      fields: [
        { k: 'nombre', l: 'Nombre', t: 'text', req: true, ph: 'Villa en Ubud' },
        { k: 'loc', l: 'Dirección / ubicación', t: 'loc', req: true },
        { k: 'checkin', l: 'Entrada (check-in)', t: 'date', req: true },
        { k: 'checkout', l: 'Salida (check-out)', t: 'date', req: true },
        { k: 'zona', l: 'Zona', t: 'text', ph: 'Kemenuh, Ubud' },
        { k: 'reserva', l: 'Localizador / reserva', t: 'text', mono: true },
        { k: 'link', l: 'Enlace (opcional)', t: 'text', ph: 'https://…' },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    excursion: {
      sing: 'excursión', icon: '🥾',
      fields: [
        { k: 'nombre', l: 'Nombre', t: 'text', req: true, ph: 'Excursión en barco a Nusa Penida' },
        { k: 'fecha', l: 'Fecha', t: 'date', req: true },
        { k: 'hora', l: 'Hora', t: 'time' },
        { k: 'duracion', l: 'Duración (minutos)', t: 'number', ph: '180', min: 0 },
        { k: 'encuentro', l: 'Punto de encuentro', t: 'loc' },
        { k: 'proveedor', l: 'Proveedor / empresa', t: 'text' },
        { k: 'reserva', l: 'Localizador / reserva', t: 'text', mono: true },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    comida: {
      sing: 'sitio para comer', icon: '🍴',
      fields: [
        { k: 'nombre', l: 'Nombre', t: 'text', req: true, ph: 'Warung Sweet Orange, Ubud' },
        { k: 'tipo', l: 'Tipo de comida', t: 'select', opts: TIPOS_COMIDA },
        { k: 'loc', l: 'Ubicación', t: 'loc' },
        { k: 'fecha', l: 'Día (opcional)', t: 'date' },
        { k: 'horario', l: 'Horario aproximado', t: 'text', ph: '12:00–14:00' },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    lugar: {
      sing: 'lugar', icon: '📍',
      fields: [
        { k: 'nombre', l: 'Nombre', t: 'text', req: true, ph: 'Tanah Lot', gaz: true },
        { k: 'loc', l: 'Ubicación', t: 'loc' },
        { k: 'fecha', l: 'Día (opcional)', t: 'date' },
        { k: 'hora', l: 'Hora aproximada (opcional)', t: 'time' },
        { k: 'visita', l: 'Tiempo estimado de visita (min)', t: 'number', ph: '60', min: 0 },
        { k: 'prioridad', l: 'Prioridad', t: 'select', opts: ['Alta', 'Media', 'Baja'], def: 'Media' },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    }
  };

  /* ==========================================================
     Geocodificación (Nominatim / OpenStreetMap)
     ========================================================== */
  async function geocode(q) {
    const hit = GAZ_BY_NAME(q);
    if (hit) return { lat: hit.lat, lng: hit.lng, label: hit.n };
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=id&q=' + encodeURIComponent(q);
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('geocode ' + r.status);
    const j = await r.json();
    if (!j.length) return null;
    return {
      lat: +(+j[0].lat).toFixed(5),
      lng: +(+j[0].lon).toFixed(5),
      label: String(j[0].display_name || '').split(',')[0]
    };
  }

  /* ==========================================================
     Formulario dinámico
     ========================================================== */
  let editing = null; // { kind, id }

  function fieldRow(f, val) {
    // Los campos de ubicación llevan un <details>, que no debe ir dentro de
    // un <label> (el clic se redirigiría al primer input y no abriría el detalle).
    const wrap = el(f.t === 'loc' ? 'div' : 'label', 'field');
    const span = el('span');
    span.textContent = f.l + (f.req ? ' *' : '');
    wrap.appendChild(span);

    if (f.t === 'loc') {
      wrap.appendChild(locControl(f, val || {}));
      return wrap;
    }

    let input;
    if (f.t === 'textarea') {
      input = el('textarea');
    } else if (f.t === 'select') {
      input = el('select');
      if (!f.req) { const o = el('option'); o.value = ''; o.textContent = '—'; input.appendChild(o); }
      (f.opts || []).forEach(op => { const o = el('option'); o.value = op; o.textContent = op; input.appendChild(o); });
    } else {
      input = el('input');
      input.type = f.t;
      if (f.min != null) input.min = f.min;
    }
    input.name = f.k;
    if (f.ph) input.placeholder = f.ph;
    if (f.req) input.required = true;
    if (f.mono) input.classList.add('mono');
    if (f.gaz) input.setAttribute('list', 'gaz-list');

    if (val != null && val !== '') input.value = val;
    else if (f.def) input.value = f.def;

    wrap.appendChild(input);
    return wrap;
  }

  function locControl(f, val) {
    const box = el('div', 'loc');
    box.dataset.loc = f.k;

    const row = el('div', 'loc__row');
    const txt = el('input');
    txt.type = 'text';
    txt.className = 'loc__text';
    txt.placeholder = 'Nombre o dirección en Bali';
    txt.value = val.texto || '';
    txt.setAttribute('list', 'gaz-list');

    const btn = el('button', 'btn btn--ghost btn--sm loc__btn');
    btn.type = 'button';
    btn.textContent = 'Buscar';
    row.append(txt, btn);

    const status = el('p', 'loc__status');

    const adv = el('details', 'loc__adv');
    const sum = el('summary');
    sum.textContent = 'Coordenadas (avanzado)';
    const latI = el('input');
    latI.type = 'number'; latI.step = 'any'; latI.placeholder = 'Latitud'; latI.className = 'loc__lat';
    if (val.lat != null) latI.value = val.lat;
    const lngI = el('input');
    lngI.type = 'number'; lngI.step = 'any'; lngI.placeholder = 'Longitud'; lngI.className = 'loc__lng';
    if (val.lng != null) lngI.value = val.lng;
    adv.append(sum, latI, lngI);

    box.append(row, status, adv);

    const paint = () => {
      const la = parseFloat(latI.value), lo = parseFloat(lngI.value);
      if (isFinite(la) && isFinite(lo)) {
        status.textContent = `📍 ${la.toFixed(4)}, ${lo.toFixed(4)}`;
        status.classList.add('is-set');
      } else {
        status.textContent = 'Sin coordenadas: no aparecerá en el mapa ni en los cálculos de trayecto.';
        status.classList.remove('is-set');
      }
    };
    latI.addEventListener('input', paint);
    lngI.addEventListener('input', paint);

    txt.addEventListener('change', () => {
      const hit = GAZ_BY_NAME(txt.value);
      if (hit) { latI.value = hit.lat; lngI.value = hit.lng; paint(); }
    });

    btn.addEventListener('click', async () => {
      const q = txt.value.trim();
      if (!q) { txt.focus(); return; }
      btn.disabled = true;
      btn.textContent = 'Buscando…';
      try {
        const res = await geocode(q);
        if (res) {
          latI.value = res.lat;
          lngI.value = res.lng;
          if (res.label && !txt.value.trim()) txt.value = res.label;
          paint();
        } else {
          toast('No se encontró esa ubicación.');
        }
      } catch (e) {
        toast('Búsqueda no disponible ahora. Prueba con coordenadas.');
        adv.open = true;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Buscar';
      }
    });

    paint();
    return box;
  }

  function readLoc(box) {
    const o = { texto: box.querySelector('.loc__text').value.trim() };
    const la = parseFloat(box.querySelector('.loc__lat').value);
    const lo = parseFloat(box.querySelector('.loc__lng').value);
    if (isFinite(la) && isFinite(lo)) { o.lat = la; o.lng = lo; }
    return o;
  }

  /* ---------- Formulario de vuelos (con escalas) ---------- */
  function labeledField(labelText, control, req) {
    const w = el('label', 'field');
    const s = el('span');
    s.textContent = labelText + (req ? ' *' : '');
    w.append(s, control);
    return w;
  }
  function mkInput(name, type, value, opts) {
    opts = opts || {};
    const i = el('input');
    i.type = type;
    i.name = name;
    if (value != null && value !== '') i.value = value;
    if (opts.ph) i.placeholder = opts.ph;
    if (opts.mono) i.classList.add('mono');
    return i;
  }
  const textField = (name, label, value, opts) =>
    labeledField(label, mkInput(name, 'text', value, opts), opts && opts.req);
  function textareaField(name, label, value) {
    const t = el('textarea');
    t.name = name;
    if (value) t.value = value;
    return labeledField(label, t);
  }
  function selectField(name, label, options, value, req) {
    const sel = el('select');
    sel.name = name;
    options.forEach(o => { const op = el('option'); op.value = o; op.textContent = o; sel.appendChild(op); });
    if (value) sel.value = value;
    return labeledField(label, sel, req);
  }

  function tramoCard(n, t) {
    t = t || {};
    const c = el('div', 'tramo');

    const head = el('div', 'tramo__head');
    const title = el('span');
    title.textContent = 'Tramo ' + n;
    const rm = el('button', 'icon-btn icon-btn--danger');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Eliminar tramo');
    rm.innerHTML = ICON.trash;
    rm.addEventListener('click', () => {
      const wrap = c.parentElement;
      if (wrap.querySelectorAll('.tramo').length <= 1) { toast('Un vuelo necesita al menos un tramo.'); return; }
      c.remove();
      Array.from(wrap.querySelectorAll('.tramo')).forEach((card, i) => {
        card.querySelector('.tramo__head span').textContent = 'Tramo ' + (i + 1);
      });
    });
    head.append(title, rm);
    c.appendChild(head);

    c.appendChild(textField('aerolinea', 'Aerolínea', t.aerolinea, { ph: 'Thai Airways' }));
    const g1 = el('div', 'field-2');
    g1.append(
      textField('numero', 'Nº de vuelo', t.numero, { mono: true, ph: 'TG 920' }),
      textField('clase', 'Clase', t.clase, { ph: 'Turista' })
    );
    c.appendChild(g1);
    c.appendChild(textField('operadoPor', 'Operado por', t.operadoPor, { ph: 'Thai Smile' }));

    const g2 = el('div', 'field-2');
    g2.append(
      textField('origen', 'Origen (código)', t.origen, { ph: 'MAD', mono: true }),
      textField('origenTerminal', 'Terminal', t.origenTerminal, { ph: '2' })
    );
    c.appendChild(g2);
    c.appendChild(textField('origenNombre', 'Aeropuerto de origen', t.origenNombre, { ph: 'Madrid Adolfo Suárez Barajas' }));

    const g3 = el('div', 'field-2');
    g3.append(
      textField('destino', 'Destino (código)', t.destino, { ph: 'BKK', mono: true }),
      textField('destinoTerminal', 'Terminal', t.destinoTerminal, { ph: '1' })
    );
    c.appendChild(g3);
    c.appendChild(textField('destinoNombre', 'Aeropuerto de destino', t.destinoNombre, { ph: 'Denpasar (DPS)' }));

    c.appendChild(labeledField('Salida (fecha y hora)', mkInput('salida', 'datetime-local', t.salida), n === 1));
    c.appendChild(labeledField('Llegada (fecha y hora)', mkInput('llegada', 'datetime-local', t.llegada)));
    c.appendChild(textField('duracion', 'Duración del tramo', t.duracion, { ph: '11h 30m' }));
    return c;
  }

  function openFlightSheet(id) {
    const data = id ? state.vuelos.find(x => x.id === id) : null;
    editing = { kind: 'vuelo', id: id || null };
    $('#sheet-title').textContent = (id ? 'Editar ' : 'Añadir ') + 'vuelo';

    const form = $('#sheet-form');
    form.innerHTML = '';
    form.appendChild(selectField('tipo', 'Tipo', ['Ida', 'Vuelta'], data ? data.tipo : 'Ida', true));
    form.appendChild(textField('reserva', 'Localizador / reserva', data ? data.reserva : '', { mono: true }));
    form.appendChild(textField('antelacion', 'Estar en el aeropuerto con', data ? data.antelacion : '', { ph: '3 h' }));
    form.appendChild(textareaField('equipaje', 'Equipaje y restricciones', data ? data.equipaje : ''));

    const tramosWrap = el('div', 'tramos');
    form.appendChild(tramosWrap);

    const addBtn = el('button', 'btn btn--ghost btn--block');
    addBtn.type = 'button';
    addBtn.textContent = '+ Añadir escala / tramo';
    addBtn.addEventListener('click', () => {
      tramosWrap.appendChild(tramoCard(tramosWrap.querySelectorAll('.tramo').length + 1, {}));
    });
    form.appendChild(addBtn);

    form.appendChild(textareaField('notas', 'Notas', data ? data.notas : ''));

    const tramos = (data && data.tramos && data.tramos.length) ? data.tramos : [{}];
    tramos.forEach((t, i) => tramosWrap.appendChild(tramoCard(i + 1, t)));

    showSheet();
  }

  function submitFlight(id, form) {
    const val = n => { const x = form.querySelector(`[name="${n}"]`); return x ? x.value.trim() : ''; };
    const tramos = Array.from(form.querySelectorAll('.tramo')).map(card => {
      const g = n => { const x = card.querySelector(`[name="${n}"]`); return x ? x.value.trim() : ''; };
      return {
        aerolinea: g('aerolinea'), numero: g('numero'), clase: g('clase'), operadoPor: g('operadoPor'),
        origen: g('origen').toUpperCase(), origenNombre: g('origenNombre'), origenTerminal: g('origenTerminal'),
        destino: g('destino').toUpperCase(), destinoNombre: g('destinoNombre'), destinoTerminal: g('destinoTerminal'),
        salida: g('salida'), llegada: g('llegada'), duracion: g('duracion')
      };
    }).filter(t => t.aerolinea || t.numero || t.origen || t.destino || t.salida);

    if (!tramos.length) { toast('Añade al menos un tramo con datos.'); return; }
    if (!tramos[0].salida) { toast('El primer tramo necesita fecha y hora de salida.'); return; }

    const obj = {
      id: id || uid(),
      tipo: val('tipo') || 'Ida',
      reserva: val('reserva'),
      antelacion: val('antelacion'),
      equipaje: val('equipaje'),
      notas: val('notas'),
      tramos
    };
    if (id) {
      const i = state.vuelos.findIndex(x => x.id === id);
      state.vuelos[i] = obj;
    } else {
      state.vuelos.push(obj);
    }
    save();
    hideSheet();
    renderAll();
    toast(id ? 'Vuelo actualizado.' : 'Vuelo añadido.');
  }

  function openMetaSheet() {
    editing = { kind: 'meta', id: null };
    $('#sheet-title').textContent = 'Editar datos del viaje';
    const form = $('#sheet-form');
    form.innerHTML = '';
    SCHEMAS.meta.fields.forEach(f => form.appendChild(fieldRow(f, state.meta[f.k])));
    showSheet();
  }

  function submitMeta(form) {
    const titulo = form.querySelector('[name="titulo"]').value.trim();
    const fechaInicio = form.querySelector('[name="fechaInicio"]').value;
    const fechaFin = form.querySelector('[name="fechaFin"]').value;
    if (!titulo) { toast('Falta: Nombre del viaje'); return; }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      toast('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }
    state.meta = { titulo, fechaInicio, fechaFin };
    save();
    hideSheet();
    renderAll();
    toast('Datos del viaje actualizados.');
  }

  function openSheet(kind, id, preset) {
    if (kind === 'vuelo') return openFlightSheet(id);
    if (kind === 'meta') return openMetaSheet();
    const sch = SCHEMAS[kind];
    const col = state[COL_OF[kind]];
    const data = id ? col.find(x => x.id === id) : null;
    editing = { kind, id: id || null };

    $('#sheet-title').textContent = (id ? 'Editar ' : 'Añadir ') + sch.sing;
    const form = $('#sheet-form');
    form.innerHTML = '';
    sch.fields.forEach(f => {
      form.appendChild(fieldRow(f, data ? data[f.k] : (preset ? preset[f.k] : null)));
    });

    // Autocompletar coords + tiempo de visita desde la lista de lugares conocidos
    const gazF = sch.fields.find(f => f.gaz);
    if (gazF) {
      const nombre = form.querySelector(`[name="${gazF.k}"]`);
      nombre.addEventListener('change', () => {
        const hit = GAZ_BY_NAME(nombre.value);
        if (!hit) return;
        const lb = form.querySelector('[data-loc]');
        if (lb) {
          lb.querySelector('.loc__lat').value = hit.lat;
          lb.querySelector('.loc__lng').value = hit.lng;
          lb.querySelector('.loc__lat').dispatchEvent(new Event('input'));
          if (!lb.querySelector('.loc__text').value.trim()) lb.querySelector('.loc__text').value = hit.n;
        }
        const vis = form.querySelector('[name="visita"]');
        if (vis && !vis.value && hit.min) vis.value = hit.min;
      });
    }

    showSheet();
  }

  on('#sheet-form', 'submit', e => {
    e.preventDefault();
    if (!editing) return;
    const { kind, id } = editing;
    const form = e.currentTarget;

    if (kind === 'vuelo') { submitFlight(id, form); return; }
    if (kind === 'meta') { submitMeta(form); return; }

    const sch = SCHEMAS[kind];

    // Validación mínima
    for (const f of sch.fields) {
      if (!f.req) continue;
      if (f.t === 'loc') {
        const t = form.querySelector(`[data-loc="${f.k}"] .loc__text`).value.trim();
        if (!t) { toast(`Falta: ${f.l}`); return; }
      } else {
        const inp = form.querySelector(`[name="${f.k}"]`);
        if (inp && !inp.value.trim()) { toast(`Falta: ${f.l}`); inp.focus(); return; }
      }
    }

    const base = id ? state[COL_OF[kind]].find(x => x.id === id) : { id: uid() };
    const obj = Object.assign({}, base);
    sch.fields.forEach(f => {
      if (f.t === 'loc') {
        obj[f.k] = readLoc(form.querySelector(`[data-loc="${f.k}"]`));
      } else {
        const inp = form.querySelector(`[name="${f.k}"]`);
        obj[f.k] = inp ? inp.value.trim() : '';
      }
    });

    if (kind === 'alojamiento' && obj.checkin && obj.checkout && obj.checkout < obj.checkin) {
      toast('El check-out no puede ser anterior al check-in.');
      return;
    }

    const collection = state[COL_OF[kind]];
    if (id) {
      const i = collection.findIndex(x => x.id === id);
      collection[i] = obj;
    } else {
      collection.push(obj);
    }
    save();
    hideSheet();
    renderAll();
    toast(id ? 'Cambios guardados.' : cap(sch.sing) + ' añadido.');
  });

  async function removeItem(kind, id) {
    const ok = await confirmAsk('¿Eliminar este elemento? No se puede deshacer.');
    if (!ok) return;
    const col = state[COL_OF[kind]];
    const i = col.findIndex(x => x.id === id);
    if (i > -1) {
      col.splice(i, 1);
      save();
      renderAll();
      toast('Elemento eliminado.');
    }
  }

  /* ==========================================================
     Pantalla: DATOS
     ========================================================== */
  function datosChip(key, label) {
    const b = el('button', 'chip');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(selectedDatosTopic === key));
    b.addEventListener('click', () => {
      if (selectedDatosTopic === key) return;
      selectedDatosTopic = key;
      renderDatos();
    });
    return b;
  }

  function renderDatos() {
    const body = $('#datos-body');
    body.innerHTML = '';

    const groups = [
      ['vuelos', 'Vuelos', vueloSummary],
      ['coches', 'Transporte propio (moto/coche)', cocheSummary],
      ['alojamientos', 'Alojamientos', alojSummary],
      ['excursiones', 'Excursiones', excSummary],
      ['comidas', 'Dónde comer', comidaSummary],
      ['lugares', 'Qué ver', lugarSummary],
      ['gastos', 'Gastos', gastoSummary]
    ];

    const chips = el('div', 'chips chips--itin');
    chips.appendChild(datosChip('all', 'Todo'));
    groups.forEach(([col, label]) => chips.appendChild(datosChip(col, SCHEMAS[KIND_OF[col]].icon + ' ' + label)));
    chips.appendChild(datosChip('antes', '✅ Antes de viajar'));
    chips.appendChild(datosChip('equipaje', '🎒 Equipaje'));
    body.appendChild(chips);

    body.appendChild(metaCard());

    groups.forEach(([col, label, sum]) => {
      if (selectedDatosTopic === 'all' || selectedDatosTopic === col) body.appendChild(groupEl(col, label, sum));
    });
    if (selectedDatosTopic === 'all' || selectedDatosTopic === 'antes') body.appendChild(antesDeViajarBlock());
    if (selectedDatosTopic === 'all' || selectedDatosTopic === 'equipaje') body.appendChild(equipajeBlock());
  }

  // Fecha límite real de una tarea "antes de viajar" ligada a un vuelo (24 h
  // antes de la salida del primer tramo). null si no hay anchor o no se
  // encuentra el vuelo todavía — la tarea se pinta entonces sin fecha, como
  // texto plano igual que las que no tienen anchor.
  function anteDeadline(anchor) {
    const tipo = anchor === 'vuelo-ida' ? 'Ida' : anchor === 'vuelo-vuelta' ? 'Vuelta' : null;
    if (!tipo) return null;
    const v = state.vuelos.find(x => x.tipo === tipo);
    const salida = v && v.tramos && v.tramos[0] && v.tramos[0].salida;
    if (!salida) return null;
    const d = new Date(salida);
    if (isNaN(d)) return null;
    d.setHours(d.getHours() - 24);
    return d;
  }
  function anteFechaTxt(anchor) {
    const d = anteDeadline(anchor);
    if (!d) return '';
    return fmtFecha(ymd(d)) + ', ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  // Cabecera común de los bloques plegables de Datos: icono de color, título,
  // contador y chevrón; recuerda abierto/cerrado en localStorage.
  function groupShell(openKey, ico, label, countTxt, color) {
    const g = el('div', 'group');
    g.style.setProperty('--gc', color);
    const isOpen = localStorage.getItem(openKey) !== '0';

    const head = el('button', 'group__head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(isOpen));
    head.innerHTML =
      `<span class="group__label"><span class="group__ico" aria-hidden="true">${ico}</span>${esc(label)}</span>` +
      `<span class="group__right"><span class="count">${countTxt}</span><span class="chev" aria-hidden="true">${ICON.chev}</span></span>`;

    const body = el('div', 'group__body');
    body.hidden = !isOpen;

    head.addEventListener('click', () => {
      const willOpen = body.hidden;
      body.hidden = !willOpen;
      head.setAttribute('aria-expanded', String(willOpen));
      localStorage.setItem(openKey, willOpen ? '1' : '0');
    });

    g.append(head, body);
    return { g, body };
  }

  // Lista de comprobación (equipaje / tareas antes de viajar). No usa
  // SCHEMAS/openSheet: son ítems de tap-to-marcar y basta con renderDatos()
  // tras cada cambio, no afectan a las demás pestañas.
  function checklistBlock(cfg) {
    const items = state[cfg.col];
    const done = items.filter(x => x[cfg.doneKey]).length;
    const { g, body } = groupShell(cfg.openKey, cfg.ico, cfg.label, `${done}/${items.length}`, cfg.color);

    if (!items.length) {
      const e = el('div', 'empty');
      e.textContent = 'Sin elementos.';
      body.appendChild(e);
    } else {
      const cats = [];
      const byCat = {};
      items.forEach(it => {
        if (!byCat[it.cat]) { byCat[it.cat] = []; cats.push(it.cat); }
        byCat[it.cat].push(it);
      });
      cats.forEach(cat => {
        const catEl = el('p', 'equipaje-cat');
        catEl.textContent = cat;
        body.appendChild(catEl);
        const list = el('div', 'equipaje-list');
        byCat[cat].forEach(it => {
          const row = el('label', 'equipaje-row' + (it[cfg.doneKey] ? ' equipaje-row--done' : ''));
          row.innerHTML =
            `<input type="checkbox"${it[cfg.doneKey] ? ' checked' : ''}>` +
            `<span>${esc(it.texto)}${cfg.extra ? cfg.extra(it) : ''}</span>`;
          row.querySelector('input').addEventListener('change', () => {
            it[cfg.doneKey] = !it[cfg.doneKey];
            save();
            renderDatos();
          });
          const del = el('button', 'icon-btn icon-btn--danger equipaje-row__del');
          del.type = 'button';
          del.setAttribute('aria-label', 'Eliminar');
          del.innerHTML = ICON.trash;
          del.addEventListener('click', async ev => {
            ev.preventDefault();
            const ok = await confirmAsk('¿Eliminar «' + it.texto + '» de la lista?');
            if (!ok) return;
            const i = items.findIndex(x => x.id === it.id);
            if (i > -1) { items.splice(i, 1); save(); renderDatos(); }
          });
          row.appendChild(del);
          list.appendChild(row);
        });
        body.appendChild(list);
      });
    }

    const addRow = el('form', 'equipaje-add');
    addRow.innerHTML = `<input type="text" placeholder="Añadir a la lista…" maxlength="60"><button type="submit" class="btn btn--ghost">${ICON.plus} Añadir</button>`;
    addRow.addEventListener('submit', e => {
      e.preventDefault();
      const input = addRow.querySelector('input');
      const texto = input.value.trim();
      if (!texto) return;
      items.push(cfg.newItem(texto));
      save();
      renderDatos();
    });
    body.appendChild(addRow);

    return g;
  }

  function equipajeBlock() {
    return checklistBlock({
      col: 'equipaje', openKey: 'open_equipaje', ico: '🎒', label: 'Equipaje', color: 'var(--terracota)',
      doneKey: 'packed',
      newItem: texto => ({ id: uid(), texto, cat: 'Otros', packed: false })
    });
  }

  // La única diferencia con equipaje es la fecha límite calculada para las
  // tareas con anchor (ver anteFechaTxt).
  function antesDeViajarBlock() {
    return checklistBlock({
      col: 'antesDeViajar', openKey: 'open_antes', ico: '✅', label: 'Antes de viajar', color: 'var(--arrozal)',
      doneKey: 'hecho',
      extra: it => {
        const f = it.anchor ? anteFechaTxt(it.anchor) : '';
        return f ? '<br><span class="ante-fecha">Disponible desde: ' + esc(f) + '</span>' : '';
      },
      newItem: texto => ({ id: uid(), texto, cat: 'General', anchor: null, hecho: false })
    });
  }

  // El viaje real (vuelos, alojamientos, excursiones, lugares, comidas y las
  // fechas) es de solo lectura: ya está reservado/planificado y no debe
  // poder borrarse o editarse por error desde el móvil. Solo quedan
  // editables las cosas pensadas para usar durante el viaje o para anotar
  // tus propios descubrimientos: coche/moto (no reservado), recomendaciones
  // propias y el registro de gastos.
  const EDITABLE_COLS = ['coches', 'recomendaciones', 'gastos'];

  function metaCard() {
    const m = state.meta;
    const c = el('section', 'trip-hero');
    const rango = (m.fechaInicio && m.fechaFin)
      ? `${fmtFecha(m.fechaInicio, true)} \u2013 ${fmtFecha(m.fechaFin, true)}`
      : 'Sin fechas';
    const dias = (m.fechaInicio && m.fechaFin) ? eachDay(m.fechaInicio, m.fechaFin).length : 0;
    const stat = (n, txt) => `<span class="stat"><b>${n}</b> ${txt}</span>`;
    c.innerHTML =
      `<h3 class="trip-hero__title">${esc(m.titulo || 'Viaje a Bali')}</h3>` +
      `<p class="trip-hero__dates">${esc(rango)}</p>` +
      `<div class="trip-hero__stats">` +
      (dias ? stat(dias, dias === 1 ? 'd\u00eda' : 'd\u00edas') : '') +
      stat(state.vuelos.length, state.vuelos.length === 1 ? 'vuelo' : 'vuelos') +
      stat(state.alojamientos.length, state.alojamientos.length === 1 ? 'alojamiento' : 'alojamientos') +
      `</div>`;
    return c;
  }

  const GROUP_COLOR = {
    vuelos: 'var(--turquesa)', coches: 'var(--arena-deep)', alojamientos: 'var(--terracota)', excursiones: 'var(--arrozal)',
    comidas: 'var(--arena-deep)', lugares: 'var(--arrozal)', gastos: 'var(--turquesa)'
  };

  function groupEl(col, label, summarize) {
    const items = state[col];
    const kind = KIND_OF[col];
    const { g, body } = groupShell('open_' + col, SCHEMAS[kind].icon, label, items.length, GROUP_COLOR[col]);

    if (col === 'gastos') body.appendChild(gastoResumen());

    const editable = EDITABLE_COLS.includes(col);

    const list = el('div', 'list');
    if (!items.length) {
      const e = el('div', 'empty');
      e.textContent = 'A\u00fan no has a\u00f1adido nada aqu\u00ed.';
      list.appendChild(e);
    } else {
      items.slice().sort(itemSorter(col)).forEach(it => list.appendChild(itemCard(kind, it, summarize(it), editable)));
    }
    body.appendChild(list);

    if (editable) {
      const add = el('button', 'btn btn--ghost btn--block');
      add.type = 'button';
      add.innerHTML = ICON.plus + ' A\u00f1adir ' + esc(SCHEMAS[kind].sing);
      add.addEventListener('click', () => openSheet(kind));
      body.appendChild(add);
    }

    return g;
  }

  function itemCard(kind, it, summaryHtml, editable) {
    const c = el('div', 'card item' + (kind === 'vuelo' ? ' card--pass' : ''));
    const main = el('div', 'item__main');
    main.innerHTML = summaryHtml;
    c.appendChild(main);

    if (editable) {
      const acts = el('div', 'item__acts');
      const edit = el('button', 'icon-btn');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Editar');
      edit.innerHTML = ICON.edit;
      edit.addEventListener('click', () => openSheet(kind, it.id));

      const del = el('button', 'icon-btn icon-btn--danger');
      del.type = 'button';
      del.setAttribute('aria-label', 'Eliminar');
      del.innerHTML = ICON.trash;
      del.addEventListener('click', () => removeItem(kind, it.id));

      acts.append(edit, del);
      c.appendChild(acts);
    }
    return c;
  }

  // Minutos de escala entre dos horas locales del mismo aeropuerto (sin desfase horario).
  function layoverMin(llegada, salida) {
    if (!llegada || !salida) return null;
    const a = new Date(llegada), b = new Date(salida);
    if (isNaN(a) || isNaN(b)) return null;
    const m = Math.round((b - a) / 60000);
    return m > 0 ? m : null;
  }

  function itemSorter(col) {
    if (col === 'gastos') return (a, b) => (b.fecha || '').localeCompare(a.fecha || '');
    const key = {
      vuelos: x => (x.tramos && x.tramos[0] && x.tramos[0].salida) || '',
      coches: x => x.recogida || '',
      alojamientos: x => x.checkin || '',
      excursiones: x => (x.fecha || '') + ' ' + (x.hora || ''),
      comidas: x => (x.fecha || '~') + (x.nombre || ''),
      lugares: x => (x.fecha || '~') + (x.hora || '') + (x.nombre || '')
    }[col];
    return (a, b) => {
      const ka = key(a), kb = key(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    };
  }

  function locLine(loc) {
    if (!loc) return '';
    const bits = [];
    if (loc.texto) bits.push(esc(loc.texto));
    if (loc.lat != null) bits.push('<span class="pin">📍</span>');
    return bits.join(' ');
  }
  function vueloEscalas(tr) {
    // [{cod, min}] para cada escala intermedia
    return tr.slice(0, -1).map((t, i) => ({ cod: t.destino || '', min: layoverMin(t.llegada, tr[i + 1].salida) }));
  }
  const escLines = s => esc(s).split('\n').join('<br>');

  function vueloSummary(v) {
    const tr = v.tramos || [];
    const a = tr[0] || {}, z = tr[tr.length - 1] || {};
    const s = dtParts(a.salida), e = dtParts(z.llegada);

    let html =
      `<div class="pass"><div class="pass__top"><span class="pass__route"><span class="mono">${esc(a.origen || '')}</span>${ICON.planeL}<span class="mono">${esc(z.destino || '')}</span></span><span class="pass__tipo">${esc(v.tipo || 'Vuelo')}</span></div>` +
      `<div class="pass__tear"></div><div class="pass__body">` +
      `<div class="fly-summary">${s.date ? fmtFecha(s.date, true) : '—'} · sale <b>${s.time || '—'}</b> · llega <b>${e.time || '—'}</b>${e.date && e.date !== s.date ? ' (' + fmtFecha(e.date) + ')' : ''}${tr.length > 1 ? ' · ' + tr.length + ' tramos' : ''}</div>`;

    html += '<div class="fly-legs">';
    tr.forEach((t, i) => {
      const ts = dtParts(t.salida), ta = dtParts(t.llegada);
      html += `<div class="fly-leg">` +
        `<div class="fly-leg__head"><span class="mono">${esc(t.numero || '')}</span> · ${esc(t.aerolinea || '')}${t.operadoPor ? ' · op. ' + esc(t.operadoPor) : ''}${t.clase ? ' · ' + esc(t.clase) : ''}</div>` +
        `<div class="fly-leg__route"><span>${esc(t.origen || '')}${t.origenTerminal ? ' <em>T' + esc(t.origenTerminal) + '</em>' : ''} ${ts.time || ''}</span><span class="fly-leg__arrow">→</span><span>${esc(t.destino || '')}${t.destinoTerminal ? ' <em>T' + esc(t.destinoTerminal) + '</em>' : ''} ${ta.time || ''}</span></div>` +
        (t.duracion ? `<div class="fly-leg__dur">${esc(t.duracion)}</div>` : '') +
        `</div>`;
      if (i < tr.length - 1) {
        const lay = layoverMin(t.llegada, tr[i + 1].salida);
        html += `<div class="fly-lay">↕ escala en ${esc(t.destino || '')}${lay ? ' · ' + fmtDur(lay) : ''}</div>`;
      }
    });
    html += '</div>';

    if (v.antelacion) {
      const mins = parseDurLoose(v.antelacion);
      const antesDe = (mins != null && s.time) ? `<br>Llega al aeropuerto sobre las <b>${minusMin(s.time, mins)}</b>.` : '';
      html += `<div class="fly-alert">Estar en el aeropuerto con <b>${esc(v.antelacion)}</b> de antelación.${antesDe}</div>`;
    }
    if (v.notas) html += `<div class="item__meta">${escLines(v.notas)}</div>`;
    if (v.reserva) html += `<div class="item__meta">Reserva: ${esc(v.reserva)}</div>`;
    if (v.equipaje) html += `<details class="fly-bags" open><summary>Equipaje y restricciones</summary><p>${esc(v.equipaje)}</p></details>`;
    return html + '</div></div>';
  }

  function alojSummary(a) {
    const noches = Math.max(0, eachDay(a.checkin, a.checkout).length - 1);
    return `<div class="item__title">${esc(a.nombre || 'Alojamiento')}</div>
      <div class="item__meta">${a.checkin ? fmtFecha(a.checkin, true) : '—'} → ${a.checkout ? fmtFecha(a.checkout, true) : '—'}${noches ? ' · ' + noches + ' noche' + (noches !== 1 ? 's' : '') : ''}</div>
      <div class="item__meta">${locLine(a.loc)}${a.zona ? ' · ' + esc(a.zona) : ''}</div>
      ${a.notas ? `<div class="item__meta">${escLines(a.notas)}</div>` : ''}
      ${a.reserva ? `<div class="item__meta">Reserva: ${esc(a.reserva)}</div>` : ''}
      ${a.link ? `<a class="btn btn--accent btn--sm aloj-link" href="${esc(a.link)}" target="_blank" rel="noopener">Ver alojamiento ›</a>` : ''}`;
  }

  function cocheSummary(v) {
    const r = dtParts(v.recogida), d = dtParts(v.devolucion);
    const dias = (v.recogida && v.devolucion)
      ? Math.max(1, Math.round((new Date(v.devolucion) - new Date(v.recogida)) / 86400000))
      : 0;

    const when = (mod, lbl, dp, loc) =>
      `<div class="coche-when ${mod}">` +
      `<div class="coche-when__lbl">${lbl}</div>` +
      `<div class="coche-when__val">${dp.date ? fmtFecha(dp.date, true) : '—'}${dp.time ? ' · ' + dp.time : ''}</div>` +
      `${loc && loc.texto ? `<div class="coche-when__loc">${esc(loc.texto)}</div>` : ''}` +
      `</div>`;

    let html = `<div class="item__title">${esc(v.empresa || 'Vehículo')}${v.modelo ? ' · ' + esc(v.modelo) : ''}${dias ? ` <span class="prio prio--media">${dias} día${dias !== 1 ? 's' : ''}</span>` : ''}</div>`;
    html += '<div class="coche-whens">' +
      when('is-in', 'Recogida', r, v.recogidaLugar) +
      when('is-out', 'Devolución', d, v.devolucionLugar) +
      '</div>';

    const metas = [];
    if (v.reserva) metas.push('Reserva: ' + esc(v.reserva));
    if (v.precio) metas.push(esc(v.precio));
    if (v.franquicia) metas.push('Franquicia: ' + esc(v.franquicia));
    if (v.telefono) metas.push('Tel.: ' + esc(v.telefono));
    if (metas.length) html += `<div class="item__meta">${metas.join(' · ')}</div>`;

    if (v.notas) html += `<details class="fly-bags" open><summary>ℹ️ Detalles y condiciones</summary><p>${esc(v.notas)}</p></details>`;
    return html;
  }
  function excSummary(e) {
    return `<div class="item__title">${esc(e.nombre || 'Excursión')}</div>
      <div class="item__meta">${e.fecha ? fmtFecha(e.fecha) : '—'} ${e.hora || ''} ${e.duracion ? '· ' + fmtDur(+e.duracion) : ''}</div>
      <div class="item__meta">${e.encuentro && e.encuentro.texto ? 'Encuentro: ' + locLine(e.encuentro) : ''}</div>
      ${e.notas ? `<div class="item__meta">${escLines(e.notas)}</div>` : ''}
      ${fotoBlock(e.foto, e.nombre, e.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption')}
      ${opcionesHtml(e.opciones)}`;
  }
  function comidaSummary(c) {
    return `<div class="item__title">${esc(c.nombre || '')}</div>
      <div class="item__meta">${esc(c.tipo || '')} ${c.horario ? '· ' + esc(c.horario) : ''}</div>
      <div class="item__meta">${locLine(c.loc)} ${c.fecha ? '· ' + fmtFecha(c.fecha) : ''}</div>
      ${c.notas ? `<div class="item__meta">${escLines(c.notas)}</div>` : ''}
      ${fotoBlock(c.foto, c.nombre, c.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption')}
      ${opcionesHtml(c.opciones)}`;
  }
  function lugarSummary(l) {
    const p = (l.prioridad || 'Media');
    return `<div class="item__title">${esc(l.nombre || '')} <span class="prio prio--${p.toLowerCase()}">${esc(p)}</span></div>
      <div class="item__meta">${locLine(l.loc)}</div>
      <div class="item__meta">${l.visita ? fmtDur(+l.visita) + ' de visita' : ''} ${l.fecha ? '· ' + fmtFecha(l.fecha) : ''}${l.hora ? ' · ' + esc(l.hora) : ''}</div>
      ${l.notas ? `<div class="item__meta">${escLines(l.notas)}</div>` : ''}
      ${fotoBlock(l.foto, l.nombre, l.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption')}
      ${opcionesHtml(l.opciones)}`;
  }
  function gastoResumen() {
    const box = el('div', 'gasto-resumen');

    // Totales y desglose por categoría (todo en € para poder sumar monedas mixtas)
    let totEUR = 0, totIDR = 0;
    const porCat = {};
    state.gastos.forEach(g => {
      const imp = +g.importe || 0;
      totEUR += toEUR(imp, g.moneda);
      totIDR += toIDR(imp, g.moneda);
      const k = g.categoria || 'Otros';
      porCat[k] = (porCat[k] || 0) + toEUR(imp, g.moneda);
    });

    const tot = el('p', 'gasto-resumen__tot');
    tot.innerHTML = `Total ≈ <b>${fmtEUR(totEUR)}</b> · ${fmtIDR(totIDR)}`;
    box.appendChild(tot);

    Object.keys(porCat)
      .filter(k => Math.abs(porCat[k]) > 0.005)   // incluye netos negativos (reembolsos) para que cuadre con el total
      .sort((a, b) => porCat[b] - porCat[a])
      .forEach(k => {
        const row = el('p', 'gasto-cat');
        row.innerHTML = `<span>${esc(k)}</span><span>${fmtEUR(porCat[k])}</span>`;
        box.appendChild(row);
      });

    // Línea de tipo de cambio (editable a mano)
    const fx = state.fx || blankFx();
    const etiqueta = fx.source === 'api' ? 'BCE ' + fmtFecha(fx.date)
      : fx.source === 'manual' ? 'manual' : 'aprox.';
    const rateShown = String(+(+fx.rate || 38).toFixed(2));   // precisión real, sin ceros de más
    const line = el('p', 'fx-line');
    line.innerHTML = `1 € = <input type="number" step="0.1" min="0" class="fx-line__rate" value="${rateShown}"> IDR <span class="muted">· ${esc(etiqueta)}</span>`;
    line.querySelector('.fx-line__rate').addEventListener('change', ev => {
      const v = +ev.target.value;
      if (v > 0) {
        state.fx = { rate: v, date: hoyYMD(), source: 'manual', stamp: hoyYMD() };
        save();
        renderDatos();
      } else {
        ev.target.value = rateShown;   // valor vacío o <= 0: no se guarda; se restaura lo que había
      }
    });
    box.appendChild(line);

    return box;
  }

  function gastoSummary(g) {
    const imp = +g.importe || 0;
    const propia = g.moneda === 'IDR' ? fmtIDR(imp) : fmtEUR(imp);
    const otra = g.moneda === 'IDR' ? fmtEUR(toEUR(imp, 'IDR')) : fmtIDR(toIDR(imp, 'EUR'));
    return `<div class="item__title">${esc(g.concepto || 'Gasto')}</div>
      <div class="item__meta">${g.fecha ? fmtFecha(g.fecha) : '—'} · <span class="chip--cat">${esc(g.categoria || 'Otros')}</span></div>
      <div class="item__meta gasto-amt"><b>${propia}</b> <span class="muted">≈ ${otra}</span></div>
      ${g.notas ? `<div class="item__meta">${escLines(g.notas)}</div>` : ''}`;
  }

  /* ==========================================================
     Motor de itinerario
     ========================================================== */
  function buildItinerary() {
    const { meta } = state;
    const days = eachDay(meta.fechaInicio, meta.fechaFin);
    const byDay = new Map(days.map(d => [d, []]));
    const unassigned = [];
    const inRange = d => byDay.has(d);
    const push = (d, item) => byDay.get(d).push(item);

    // Vuelos (con escalas)
    state.vuelos.forEach(v => {
      const tr = v.tramos || [];
      const a = tr[0] || {}, z = tr[tr.length - 1] || {};
      const p = dtParts(a.salida);
      const arr = dtParts(z.llegada);
      const escTxt = vueloEscalas(tr)
        .map(x => x.cod + (x.min ? ' ' + fmtDur(x.min) : ''))
        .filter(Boolean);
      const subBits = [];
      if (p.time) subBits.push('Sale ' + p.time + (a.origen ? ' ' + a.origen : ''));
      if (arr.time) subBits.push('llega ' + arr.time + (z.destino ? ' ' + z.destino : '') + (arr.date && arr.date !== p.date ? ' (' + fmtFecha(arr.date) + ')' : ''));
      if (escTxt.length) subBits.push('escala ' + escTxt.join(', '));

      const antesMin = parseDurLoose(v.antelacion);
      const enAeropuerto = (antesMin != null && p.time) ? minusMin(p.time, antesMin) : '';
      if (enAeropuerto) subBits.push('en el aeropuerto ' + enAeropuerto);

      const notasItin = [
        enAeropuerto
          ? `En el aeropuerto sobre las ${enAeropuerto} (${v.antelacion} antes de las ${p.time}).`
          : (v.antelacion ? `Estar en el aeropuerto con ${v.antelacion} de antelación.` : ''),
        a.origenTerminal ? `Salida por la Terminal ${a.origenTerminal} de ${a.origen}.` : '',
        v.equipaje || ''
      ].filter(Boolean).join('\n');

      const item = {
        t: 'vuelo',
        hora: p.time,
        sortT: p.time ? toMin(p.time) : 0,
        titulo: `${v.tipo || 'Vuelo'} · ${a.origen || ''} → ${z.destino || ''}`.trim(),
        sub: subBits.join(' · '),
        notas: notasItin,
        loc: null,
        tag: 'Vuelo',
        costMin: 0
      };
      if (p.date && inRange(p.date)) push(p.date, item);
      else if (arr.date && inRange(arr.date)) {
        // La salida cae fuera del rango del viaje (p. ej. un vuelo nocturno
        // que despega la víspera) pero la llegada sí — se ancla al día de
        // llegada con su hora, para no perder el vuelo del itinerario.
        push(arr.date, Object.assign({}, item, { hora: arr.time, sortT: arr.time ? toMin(arr.time) : item.sortT }));
      }
      else unassigned.push(Object.assign({ nota: p.date ? 'fecha fuera del rango' : 'sin fecha' }, item));
    });

    // Vehículo de alquiler (recogida + devolución)
    state.coches.forEach(v => {
      const rp = dtParts(v.recogida);
      const dp = dtParts(v.devolucion);
      const rLoc = v.recogidaLugar && v.recogidaLugar.lat != null ? v.recogidaLugar : null;
      const dLoc = (v.devolucionLugar && v.devolucionLugar.lat != null) ? v.devolucionLugar : rLoc;
      if (rp.date && inRange(rp.date)) {
        push(rp.date, {
          t: 'coche', hora: rp.time, sortT: rp.time ? toMin(rp.time) : 720,
          titulo: `Recogida del vehículo${v.empresa ? ' · ' + v.empresa : ''}`,
          sub: [v.modelo, v.recogidaLugar && v.recogidaLugar.texto, v.reserva].filter(Boolean).join(' · '),
          notas: v.notas || '', loc: rLoc, tag: 'Transporte', costMin: 0
        });
      }
      if (dp.date && inRange(dp.date)) {
        push(dp.date, {
          t: 'coche', hora: dp.time, sortT: dp.time ? toMin(dp.time) : 600,
          titulo: `Devolución del vehículo${v.empresa ? ' · ' + v.empresa : ''}`,
          sub: [v.devolucionLugar && v.devolucionLugar.texto || (v.recogidaLugar && v.recogidaLugar.texto), v.reserva].filter(Boolean).join(' · '),
          loc: dLoc, tag: 'Transporte', costMin: 0
        });
      }
    });

    // Alojamientos
    state.alojamientos.forEach(a => {
      const loc = a.loc && a.loc.lat != null ? a.loc : (a.loc || null);
      if (a.checkin && inRange(a.checkin)) {
        push(a.checkin, { t: 'checkin', hora: '', sortT: 1400, titulo: `Check-in · ${a.nombre || 'Alojamiento'}`, sub: a.loc && a.loc.texto || '', notas: a.notas || '', loc, tag: 'Alojamiento', costMin: 0 });
      }
      if (a.checkout && inRange(a.checkout)) {
        push(a.checkout, { t: 'checkout', hora: '', sortT: 10, titulo: `Check-out · ${a.nombre || 'Alojamiento'}`, sub: a.loc && a.loc.texto || '', loc, tag: 'Alojamiento', costMin: 0 });
      }
      eachDay(a.checkin, a.checkout).slice(0, -1).forEach(d => {
        if (inRange(d)) push(d, { t: 'noche', hora: '', sortT: 1460, titulo: `Noche en ${a.nombre || 'alojamiento'}`, sub: a.loc && a.loc.texto || '', loc, tag: 'Alojamiento', quiet: true, costMin: 0 });
      });
    });

    // Excursiones
    state.excursiones.forEach(e => {
      const item = {
        t: 'excursion',
        hora: e.hora || '',
        sortT: e.hora ? toMin(e.hora) : 540,
        titulo: e.nombre || 'Excursión',
        sub: [
          e.duracion ? fmtDur(+e.duracion) : '',
          e.encuentro && e.encuentro.texto ? 'Encuentro: ' + e.encuentro.texto : ''
        ].filter(Boolean).join(' · '),
        notas: e.notas || '',
        loc: e.encuentro && e.encuentro.lat != null ? e.encuentro : null,
        tag: 'Excursión',
        costMin: e.duracion ? +e.duracion : EXCURSION_MIN,
        foto: e.foto || null,
        desc: e.desc || null,
        opciones: e.opciones || null
      };
      if (e.fecha && inRange(e.fecha)) push(e.fecha, item);
      else unassigned.push(Object.assign({ nota: e.fecha ? 'fecha fuera del rango' : 'sin fecha' }, item));
    });

    // Comidas
    state.comidas.forEach(c => {
      const ht = firstTime(c.horario);
      const item = {
        t: 'comida',
        hora: ht,
        sortT: ht ? toMin(ht) : 780,
        titulo: c.nombre || 'Comida',
        sub: [c.tipo, c.horario].filter(Boolean).join(' · '),
        notas: c.notas || '',
        loc: c.loc && c.loc.lat != null ? c.loc : null,
        tag: 'Comida',
        costMin: COMIDA_MIN,
        foto: c.foto || null,
        desc: c.desc || null,
        opciones: c.opciones || null
      };
      if (c.fecha && inRange(c.fecha)) push(c.fecha, item);
      else unassigned.push(Object.assign({ nota: 'sin fecha' }, item));
    });

    // Lugares
    state.lugares.forEach(l => {
      const item = {
        t: 'lugar',
        hora: l.hora || '',
        sortT: l.hora ? toMin(l.hora) : 660,
        titulo: l.nombre || 'Lugar',
        sub: [
          l.prioridad ? 'Prioridad ' + l.prioridad : '',
          l.visita ? fmtDur(+l.visita) + ' de visita' : ''
        ].filter(Boolean).join(' · '),
        notas: l.notas || '',
        loc: l.loc && l.loc.lat != null ? l.loc : null,
        tag: 'Lugar',
        costMin: l.visita ? +l.visita : LUGAR_MIN,
        foto: l.foto || null,
        desc: l.desc || null,
        opciones: l.opciones || null
      };
      if (l.fecha && inRange(l.fecha)) push(l.fecha, item);
      else unassigned.push(Object.assign({ nota: 'sin fecha' }, item));
    });

    const outDays = days.map((d, i) => {
      const items = byDay.get(d).slice().sort((a, b) => a.sortT - b.sortT);
      let km = 0, prev = null;
      items.forEach(it => {
        if (it.loc && it.loc.lat != null) {
          if (prev && haversine(prev, it.loc) >= MIN_LEG_KM) km += driveByRoad(prev, it.loc).km;
          prev = it.loc;
        }
      });
      return { date: d, idx: i + 1, items, km };
    });

    return { days: outDays, unassigned, count: days.length };
  }

  /* ==========================================================
     Pantalla: ITINERARIO
     ========================================================== */
  let selectedItinDay = 'all';
  let selectedDatosTopic = 'all';
  let selectedGuiaTopic = 'all';
  // La primera vez que se pinta cada sección, si hoy cae dentro del viaje,
  // se abre directamente ese día en vez de «Todos». Después el usuario manda.
  let itinDayInit = false;

  // YMD de hoy si el viaje está en curso hoy; null en caso contrario.
  function diaHoyYMD() {
    const { fechaInicio, fechaFin } = state.meta;
    if (!fechaInicio || !fechaFin) return null;
    const hoy = hoyYMD();
    return (hoy >= fechaInicio && hoy <= fechaFin) ? hoy : null;
  }

  function itinChip(key, label) {
    const b = el('button', 'chip');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(selectedItinDay === key));
    b.addEventListener('click', () => {
      if (selectedItinDay === key) return;
      selectedItinDay = key;
      renderItinerario();
    });
    return b;
  }

  function guiaChip(key, label) {
    const b = el('button', 'chip');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(selectedGuiaTopic === key));
    b.addEventListener('click', () => {
      if (selectedGuiaTopic === key) return;
      selectedGuiaTopic = key;
      renderTransporte();
    });
    return b;
  }

  function renderItinerario() {
    const body = $('#itin-body');
    const sub = $('#itin-sub');
    destroyRutaMap();
    body.innerHTML = '';
    _odCache = {};   // cache de outdoorFor válido solo dentro de este render

    if (!state.meta.fechaInicio || !state.meta.fechaFin) {
      sub.textContent = '';
      body.appendChild(notice('Añade las fechas de inicio y fin en «Datos del viaje» para generar el itinerario por días.'));
      return;
    }

    const it = buildItinerary();
    sub.textContent = `${fmtFecha(state.meta.fechaInicio, true)} – ${fmtFecha(state.meta.fechaFin, true)} · ${it.count} día${it.count !== 1 ? 's' : ''}`;

    if (!itinDayInit) {
      itinDayInit = true;
      const hoy = diaHoyYMD();
      if (hoy && it.days.some(d => d.date === hoy)) selectedItinDay = hoy;
    }

    if (selectedItinDay !== 'all' && !it.days.some(d => d.date === selectedItinDay)) selectedItinDay = 'all';

    const hb = hoyBlock(it);
    if (hb) body.appendChild(hb);
    if (selectedItinDay === 'all') {
      const rb = rutaBlock();
      if (rb) body.appendChild(rb);
    }
    body.appendChild(outdoorRankBlock(it));

    const chips = el('div', 'chips chips--itin');
    chips.appendChild(itinChip('all', 'Todos'));
    it.days.forEach(d => chips.appendChild(itinChip(d.date, 'Día ' + d.idx)));
    body.appendChild(chips);

    const dias = selectedItinDay === 'all' ? it.days : it.days.filter(d => d.date === selectedItinDay);
    dias.forEach(day => body.appendChild(dayBlock(day)));

    if (selectedItinDay === 'all' && it.unassigned.length) body.appendChild(unassignedBlock(it.unassigned));
    ensureRutaMap();
  }

  // Tarjeta condensada del día en curso, arriba de todo en Itinerario.
  // No calcula nada nuevo: ensambla dayPlan/rainFor/outdoorFor, ya
  // verificados abajo. null si hoy no cae dentro del viaje.
  function hoyBlock(it) {
    const hoy = diaHoyYMD();
    if (!hoy) return null;
    const day = it.days.find(d => d.date === hoy);
    if (!day) return null;

    const plan = dayPlan(day);
    const r = rainFor(day);
    const od = outdoorFor(day);

    const box = el('section', 'hoy-card');
    const head = el('p', 'hoy-card__head');
    head.innerHTML = `Hoy, ${esc(fmtDiaSemana(hoy))} ${esc(fmtFecha(hoy))} (día ${day.idx})`;
    box.appendChild(head);

    if (plan.veredicto) {
      const label = verdictLabel(plan);
      const bits = [];
      if (plan.salirMin != null && plan.salirMin >= plan.inicioMin - 120) {
        bits.push('Sal sobre las <span class="mono">' + hhmmFromMin(plan.salirMin) + '</span>');
      }
      if (plan.drivingMin > 0 && plan.volante === 'ok') bits.push(fmtDur(plan.drivingMin) + ' de trayecto');
      const kmTxt = day.km >= 1 ? ' · ' + Math.round(day.km) + ' km' : '';
      const p = el('p', 'hoy-card__plan');
      p.innerHTML = `<span class="day-verdict day-verdict--${plan.veredicto}">${esc(label)}</span>${kmTxt}` +
        (bits.length ? '<br>' + bits.join(' · ') : '');
      box.appendChild(p);
    }

    if (r) {
      const pr = el('p', 'hoy-card__rain' + (r.level === 'fuerte' ? ' hoy-card__rain--fuerte' : ''));
      pr.innerHTML = `🌧️ ${esc(r.txt)}`;
      box.appendChild(pr);
    }
    if (od && od.level !== 'bueno') {
      const po = el('p', 'hoy-card__out');
      po.innerHTML = `${od.level === 'malo' ? '🌧️' : '⛅'} ${esc(od.txt)}`;
      box.appendChild(po);
    }

    return box;
  }

  // Nudge de la cabecera del Itinerario: solo cuando hay días flojos Y días
  // buenos (o sea, algo que mover y a dónde). No reordena nada — lo decide
  // el usuario.
  function outdoorRankBlock(it) {
    const box = el('section', 'itin-outlook');
    const rated = it.days.map(d => ({ d, o: outdoorFor(d) })).filter(x => x.o);
    const flojos = rated.filter(x => x.o.level !== 'bueno').sort((a, b) => b.o.score - a.o.score);
    const buenos = rated.filter(x => x.o.level === 'bueno').sort((a, b) => a.o.score - b.o.score);
    if (!flojos.length || !buenos.length) { box.hidden = true; return box; }
    const tag = x => `Día ${x.d.idx} (${fmtFecha(x.d.date)})`;
    const peores = flojos.slice(0, 2).map(tag);
    const mejores = buenos.slice(0, 3).map(tag);
    box.innerHTML =
      `<p>Días flojos por lluvia: <b>${esc(peores.join(' · '))}</b> · mejor pinta: ${esc(mejores.join(' · '))}.</p>` +
      `<p class="itin-outlook__nudge">Si puedes mover una visita al aire libre o una excursión movible, llévala a un día con mejor previsión.</p>`;
    return box;
  }

  // Aviso de lluvia fuerte (Open-Meteo) para todo el día, en la zona de la
  // pernocta. Total de mm sobre 24 h porque en temporada de monzón lo que
  // importa es si va a caer un chaparrón fuerte en algún momento del día
  // (puede afectar a un ferri de tarde igual que a un plan de mañana), no
  // solo una franja horaria como el aviso de viento del hermano de Islandia.
  function rainFor(day) {
    const P = (state.meteo && state.meteo.precip) || {};
    const keys = Object.keys(P);
    if (!keys.length) return null;
    const loc = locForDate(day.date);
    if (isFallbackCenter(loc)) return null;   // día sin alojamiento: no inventar lluvia
    let best = null, bestD = Infinity;
    keys.forEach(k => {
      const [la, lo] = k.split(',').map(Number);
      const d = haversine({ lat: la, lng: lo }, loc);
      if (d < bestD) { bestD = d; best = k; }
    });
    if (bestD > 40) return null;

    const ini = Date.parse(day.date + 'T00:00:00+07:00');
    const fin = Date.parse(day.date + 'T23:59:59+07:00');
    let mm = 0, maxProb = null;
    (P[best] || []).forEach(x => {
      const ms = Date.parse(x.t);
      if (ms < ini || ms > fin) return;
      if (typeof x.mm === 'number') mm += x.mm;
      if (typeof x.prob === 'number' && (maxProb == null || x.prob > maxProb)) maxProb = x.prob;
    });
    if (!(mm > 0) && maxProb == null) return null;

    const mmR = Math.round(mm);
    if (mmR < 8 && (maxProb == null || maxProb < 60)) return null;

    let level, txt;
    if (mmR >= 40) {
      level = 'fuerte';
      txt = `lluvia fuerte prevista (~${mmR} mm) — lleva poncho y bolsa estanca; posibles cancelaciones de ferri y calles anegadas`;
    } else if (mmR >= 15 || (maxProb != null && maxProb >= 75)) {
      level = 'aviso';
      txt = `lluvia probable (~${mmR} mm${maxProb != null ? ', ' + maxProb + '%' : ''}) — lleva poncho por si acaso`;
    } else {
      level = 'info';
      txt = `posible chubasco (~${mmR} mm${maxProb != null ? ', ' + maxProb + '%' : ''})`;
    }
    const stale = !!(state.meteo && state.meteo.fetched) && (Date.now() - Date.parse(state.meteo.fetched)) > 18 * 3600e3;
    if (stale) {
      const h = Math.round((Date.now() - Date.parse(state.meteo.fetched)) / 3600e3);
      txt += ` (hace ${h} h)`;
    }
    return { txt, level, stale };
  }

  // Condiciones para planes al aire libre ese día (nubes + lluvia del tramo
  // diurno). Devuelve null si no hay dato; el nivel 'bueno' no se pinta.
  // Memoizado por (fecha + fetch): renderItinerario lo llama 2× por día.
  let _odCache = {};
  function outdoorFor(day) {
    const M = state.meteo || {};
    const ck = day.date + '|' + (M.fetched || '');
    if (ck in _odCache) return _odCache[ck];
    const done = r => { _odCache[ck] = r; return r; };

    const loc = locForDate(day.date);
    if (isFallbackCenter(loc)) return done(null);
    const allKeys = [...new Set([].concat(Object.keys(M.clouds || {}), Object.keys(M.precip || {})))];
    let key = null, bestD = Infinity;
    allKeys.forEach(k => {
      const [la, lo] = k.split(',').map(Number);
      const d = haversine({ lat: la, lng: lo }, loc);
      if (d < bestD) { bestD = d; key = k; }
    });
    if (key == null || bestD > 40) return done(null);

    const ini = Date.parse(day.date + 'T08:00:00+07:00');
    const fin = Date.parse(day.date + 'T20:00:00+07:00');
    const inWin = t => { const ms = Date.parse(t); return ms >= ini && ms <= fin; };

    let cSum = 0, cN = 0;
    ((M.clouds && M.clouds[key]) || []).forEach(x => { if (inWin(x.t) && typeof x.pct === 'number') { cSum += x.pct; cN++; } });
    let pSum = 0, pN = 0, hoursRain = 0;
    ((M.precip && M.precip[key]) || []).forEach(x => { if (inWin(x.t) && typeof x.mm === 'number') { pSum += x.mm; pN++; if (x.mm >= 0.5) hoursRain++; } });
    if (!cN && !pN) return done(null);

    const avgCloud = cN ? cSum / cN : null;
    const score = (avgCloud != null && avgCloud >= 85 ? 0.4 : 0)
      + Math.min(pSum, 10) / 3
      + (hoursRain >= 4 ? 0.9 : hoursRain >= 2 ? 0.4 : 0);
    const level = score < 1.1 ? 'bueno' : score < 2.4 ? 'regular' : 'malo';

    const fac = [];
    if (avgCloud != null && avgCloud >= 60) fac.push(`nubes ${Math.round(avgCloud)}%`);
    if (pSum >= 1) fac.push(`${pSum.toLocaleString('es-ES', { maximumFractionDigits: pSum < 10 ? 1 : 0 })} mm`);
    const cola = fac.length ? ': ' + fac.join(' · ') : '';
    let txt = level === 'malo' ? 'día de plan B' + cola + ' — alternativas en Transporte y guías'
      : level === 'regular' ? 'día irregular' + cola
      : '';

    const stale = !!M.fetched && (Date.now() - Date.parse(M.fetched)) > 18 * 3600e3;
    if (stale && txt) txt += ` (hace ${Math.round((Date.now() - Date.parse(M.fetched)) / 3600e3)} h)`;
    return done({ level, txt, stale, score });
  }

  // Zona del alojamiento de esa noche (o, si es el día de salida, la de la
  // noche anterior) — solo para marcar en turquesa los días de mar en el
  // itinerario (Gili Air y Uluwatu), como pide la estética del viaje.
  function nocheZonaFor(dateStr) {
    let d = dateStr;
    for (let i = 0; i < 3; i++) {
      const a = state.alojamientos.find(x => x.checkin && x.checkout && x.checkin <= d && d < x.checkout);
      if (a) return a.zona || '';
      const dt = parseDate(d);
      if (!dt) break;
      dt.setDate(dt.getDate() - 1);
      d = ymd(dt);
    }
    return '';
  }

  function dayBlock(day) {
    const wrap = el('section', 'day');
    const esHoy = day.date === hoyYMD();
    if (esHoy) wrap.classList.add('day--hoy');
    if (/gili|uluwatu/i.test(nocheZonaFor(day.date))) wrap.classList.add('day--mar');
    const plan = dayPlan(day);

    const head = el('div', 'day__head');
    head.innerHTML =
      `<span class="day__badge"><small>Día</small>${day.idx}</span>` +
      `<div class="day__titles"><h3 class="day__date">${fmtFecha(day.date)}</h3><p class="day__wd">${esc(fmtDiaSemana(day.date))}</p>${esHoy ? '<b class="day__now">En curso</b>' : ''}</div>`;
    wrap.appendChild(head);

    if (plan.veredicto) {
      const label = verdictLabel(plan);
      const bits = [];
      if (plan.salirMin != null && plan.salirMin >= plan.inicioMin - 120) {
        bits.push('Sal sobre las <span class="mono">' + hhmmFromMin(plan.salirMin) + '</span>');
      }
      if (plan.endMin != null && plan.endMin !== plan.inicioMin) {
        bits.push('fin ~<span class="mono">' + hhmmFromMin(plan.endMin) + '</span>');
      }
      if (plan.drivingMin > 0 && plan.volante === 'ok') bits.push(fmtDur(plan.drivingMin) + ' de trayecto');
      const aria = label || (plan.veredicto === 'verde' ? 'Día holgado' : 'Día ' + plan.veredicto);
      const verdict = `<span class="day-verdict day-verdict--${plan.veredicto}" role="img" aria-label="${esc(aria)}"${plan.veredicto === 'verde' ? ' title="Día holgado"' : ''}>${esc(label)}</span>`;
      const p = el('p', 'day-plan');
      p.innerHTML = verdict + (bits.length ? ' ' + bits.join(' · ') : '');
      wrap.appendChild(p);
    }

    const od = outdoorFor(day);
    if (od && od.level !== 'bueno') {
      const po = el('p', 'day-out day-out--' + od.level);
      po.innerHTML = `${od.level === 'malo' ? '🌧️' : '⛅'} ${esc(od.txt)}`;
      wrap.appendChild(po);
    }

    const r = rainFor(day);
    if (r) {
      const pr = el('p', 'day-rain' + (r.level ? ' day-rain--' + r.level : ''));
      pr.title = 'Precipitación de Open-Meteo en la celda de la pernocta, total del día';
      pr.innerHTML = `🌧️ ${esc(r.txt)}`;
      wrap.appendChild(pr);
    }

    if (!day.items.length) {
      wrap.appendChild(notice('Día libre — sin actividades planificadas.'));
      wrap.appendChild(diarioBlock(day));
      return wrap;
    }

    const tl = el('div', 'timeline');
    let prevLoc = null;
    day.items.forEach(it => {
      if (it.loc && it.loc.lat != null && prevLoc) {
        if (haversine(prevLoc, it.loc) >= MIN_LEG_KM) tl.appendChild(legRow(prevLoc, it.loc));
      }
      if (it.loc && it.loc.lat != null) prevLoc = it.loc;
      tl.appendChild(slotRow(it));
    });
    wrap.appendChild(tl);

    const pts = day.items.filter(i => i.loc && i.loc.lat != null).map(i => i.loc);
    if (pts.length) {
      const row = el('div', 'day__actions');
      const g = mapsLink('g', pts); g.textContent = 'Google Maps';
      const a = mapsLink('a', pts); a.textContent = 'Apple Maps';
      const w = mapsLink('w', pts); w.textContent = 'Waze';
      row.append(g, a, w);
      wrap.appendChild(row);
    }

    wrap.appendChild(diarioBlock(day));
    return wrap;
  }

  // Diario de viaje: solo texto. Sin re-render al escribir: nada más en la
  // tarjeta depende de este texto, así que el handler solo actualiza el
  // state y guarda.
  function diarioBlock(day) {
    const wrap = el('div', 'day-diario');
    const label = el('p', 'day-diario__label');
    label.textContent = '📝 Diario del día';
    const ta = el('textarea', 'day-diario__text');
    ta.placeholder = 'Escribe algo sobre este día…';
    ta.value = state.diario[day.date] || '';
    ta.rows = 3;
    ta.addEventListener('input', () => {
      const v = ta.value;
      if (v) state.diario[day.date] = v; else delete state.diario[day.date];
      save();
    });
    wrap.append(label, ta);
    return wrap;
  }

  // <figure> con foto + una explicación debajo de qué es (no solo el
  // nombre, que ya sale en el título de arriba). onerror quita la figura
  // entera si la URL de Commons deja de servir el archivo (public page,
  // sin control sobre terceros).
  function fotoBlock(foto, alt, caption, wrapCls, imgCls, capCls) {
    if (!foto) return '';
    return `<figure class="${wrapCls}">` +
      `<img class="${imgCls}" src="${esc(foto)}" alt="${esc(alt || '')}" loading="lazy" onerror="this.parentElement.remove()">` +
      (caption ? `<figcaption class="${capCls}">${esc(caption)}</figcaption>` : '') +
      `</figure>`;
  }

  function opcionesHtml(opciones) {
    if (!opciones || !opciones.length) return '';
    return `<div class="slot__opciones"><p class="slot__opciones-label">Elige una opción</p>` +
      opciones.map(o =>
        `<div class="slot__opcion">` +
        `<div class="slot__opcion-nombre">${esc(o.nombre || '')}</div>` +
        (o.notas ? `<div class="slot__opcion-notas">${esc(o.notas)}</div>` : '') +
        fotoBlock(o.foto, o.nombre, o.desc, 'slot__opcion-foto-wrap', 'slot__opcion-foto', 'slot__opcion-foto-caption') +
        `</div>`
      ).join('') +
      `</div>`;
  }

  function slotRow(it) {
    const r = el('div', 'slot slot--' + it.t + (it.quiet ? ' slot--quiet' : ''));
    const time = el('div', 'slot__time');
    time.textContent = it.hora || '';
    const body = el('div', 'slot__body');
    body.innerHTML =
      `<div class="slot__tag">${esc(it.tag)}${it.nota ? ' · ' + esc(it.nota) : ''}</div>` +
      `<div class="slot__title">${esc(it.titulo)}</div>` +
      (it.sub ? `<div class="slot__sub">${esc(it.sub)}</div>` : '') +
      (it.notas ? `<details class="slot__notes"><summary>Info importante</summary><p>${esc(it.notas)}</p></details>` : '') +
      fotoBlock(it.foto, it.titulo, it.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption') +
      opcionesHtml(it.opciones);
    if (it.loc && it.loc.lat != null) {
      const nav = el('div', 'slot__nav');
      const g = mapsLink('g', [it.loc]); g.className = 'slot__go'; g.textContent = 'Google Maps ›';
      const a = mapsLink('a', [it.loc]); a.className = 'slot__go'; a.textContent = 'Apple Maps ›';
      const w = mapsLink('w', [it.loc]); w.className = 'slot__go'; w.textContent = 'Waze ›';
      nav.append(g, a, w);
      body.appendChild(nav);
    }
    r.append(time, body);
    return r;
  }

  function legRow(a, b) {
    const { km, min } = driveByRoad(a, b);
    const r = el('div', 'leg');
    r.innerHTML = `<span class="leg__ico">🚗</span><span>≈ ${fmtDur(min)} · ${km.toFixed(km < 10 ? 1 : 0)} km de trayecto</span>`;
    return r;
  }

  function unassignedBlock(items) {
    const w = el('section', 'day');
    w.innerHTML =
      `<div class="day__head"><span class="day__badge"><small>Sin día</small>${items.length}</span><div class="day__titles"><h3 class="day__date">Por planificar</h3></div></div>`;
    w.appendChild(notice('Sin día asignado. Edita cada elemento y ponle una fecha dentro del viaje para colocarlo en el itinerario.'));
    const tl = el('div', 'timeline');
    items.forEach(it => tl.appendChild(slotRow(Object.assign({}, it, { hora: '' }))));
    w.appendChild(tl);
    return w;
  }

  function notice(txt) {
    const d = el('div', 'notice');
    d.textContent = txt;
    return d;
  }

  /* ==========================================================
     Enlaces a Google Maps / Apple Maps / Waze
     provider: 'g' = Google · 'a' = Apple · 'w' = Waze
     ========================================================== */
  function gmapsHref(pts) {
    const P = (pts || []).filter(p => p && p.lat != null);
    if (P.length <= 1) {
      const p = P[0];
      return p ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : '#';
    }
    const o = P[0], d = P[P.length - 1];
    const w = P.slice(1, -1).slice(0, 9).map(p => `${p.lat},${p.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}` +
      (w ? `&waypoints=${encodeURIComponent(w)}` : '');
  }

  function mapsLink(provider, pts) {
    const a = el('a', 'btn btn--ghost btn--sm');
    a.target = '_blank';
    a.rel = 'noopener';
    const P = (pts || []).filter(p => p && p.lat != null);

    if (provider === 'w') {
      // Waze no admite rutas con varias paradas: navega al destino final.
      const d = P[P.length - 1] || P[0];
      a.href = d ? `https://waze.com/ul?ll=${d.lat},${d.lng}&navigate=yes` : '#';
      return a;
    }

    if (provider === 'g') {
      a.href = gmapsHref(P);
    } else {
      if (P.length <= 1) {
        const p = P[0];
        a.href = p ? `https://maps.apple.com/?ll=${p.lat},${p.lng}&q=${encodeURIComponent('Punto')}` : '#';
      } else {
        const o = P[0], d = P[P.length - 1];
        a.href = `https://maps.apple.com/?dirflg=d&saddr=${o.lat},${o.lng}&daddr=${d.lat},${d.lng}`;
      }
    }
    return a;
  }

  /* ==========================================================
     Pantalla: DÓNDE COMER — estrellas Michelin y recomendados
     cerca de cada alojamiento
     ========================================================== */
  // Indonesia (y Bali) no está cubierta por la Guía Michelin: no hay
  // estrellas ni Bib Gourmand que citar aquí. En su lugar, sitios bien
  // valorados cerca de cada alojamiento, investigados en septiembre de 2026.
  // Sin cifras de precio inventadas: solo una valoración cualitativa.
  const COMER_SEED = [
    { zona: 'Ubud (Kemenuh)', fechas: '28 sep – 2 oct (4 noches)',
      intro: 'Bali no está cubierta por la Guía Michelin. Esta es una selección de sitios bien valorados en Ubud, desde el warung de arrozal hasta la mesa de degustación.',
      estrellas: [],
      recomendados: [
        { nombre: 'Sweet Orange Warung', tipo: 'Warung con vistas a los arrozales, precio de warung', precio: 'Económico', q: 'Sweet Orange Warung Ubud', loc: { lat: -8.4995, lng: 115.2660 } },
        { nombre: "Murni's Warung", tipo: 'Cocina indonesia tradicional, junto a la entrada de Campuhan Ridge Walk', precio: 'Económico-moderado', q: "Murni's Warung Ubud", loc: { lat: -8.5057, lng: 115.2580 } },
        { nombre: 'Locavore NXT', tipo: 'Alta cocina de temporada y km 0 — nº 44 de Asia\'s 50 Best Restaurants 2026, hay que reservar', precio: 'Alto (menú degustación)', q: 'Locavore NXT Ubud', loc: { lat: -8.5057, lng: 115.2631 } }
      ] },
    { zona: 'Gili Air', fechas: '2 – 4 oct (2 noches)',
      intro: 'Gili Air tampoco está en la Guía Michelin — la isla se recorre a pie o en bici, así que todo está cerca del alojamiento.',
      estrellas: [], recomendados: [
        { nombre: 'Warung Sunny', tipo: 'Cocina indonesia (balinesa, sumatra y javanesa)', precio: 'Económico-moderado', q: 'Warung Sunny Gili Air', loc: { lat: -8.3565, lng: 116.0850 } },
        { nombre: 'Gili Coffee Roasters', tipo: 'Café de especialidad y almuerzos ligeros, con huerto propio', precio: 'Económico', q: 'Gili Coffee Roasters Gili Air', loc: { lat: -8.3550, lng: 116.0820 } },
        { nombre: 'KAI – The Spice Table', tipo: 'Alta cocina, fusión mediterránea e indonesia', precio: 'Alto', q: 'KAI The Spice Table Gili Air', loc: { lat: -8.3540, lng: 116.0810 } }
      ] },
    { zona: 'Uluwatu (Pecatu)', fechas: '4 – 6 oct (2 noches)',
      intro: 'Tampoco hay Michelin en el Bukit — la fama aquí es de la cocina de acantilado y el ambiente surfero de Bingin.',
      estrellas: [], recomendados: [
        { nombre: 'The Bowl', tipo: 'Café y all-day dining en Bingin, ambiente surfero/skate', precio: 'Moderado', q: 'The Bowl Bingin Bali', loc: { lat: -8.8034, lng: 115.1189 } },
        { nombre: 'Alchemy Uluwatu', tipo: 'Cocina vegana, ingredientes naturales y ecológicos, en Bingin', precio: 'Moderado', q: 'Alchemy Uluwatu Bingin', loc: { lat: -8.8040, lng: 115.1195 } },
        { nombre: 'Rockfish', tipo: 'Alta cocina con vistas al acantilado, muy popular al atardecer', precio: 'Alto', q: 'Rockfish Uluwatu Bali', loc: { lat: -8.8100, lng: 115.1100 } }
      ] }
  ];

  const gmapsSearchHref = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const appleMapsSearchHref = q => `https://maps.apple.com/?q=${encodeURIComponent(q)}`;

  // Distancia en línea recta desde el alojamiento de esa zona (mismo cálculo
  // que usa el Itinerario para los trayectos entre paradas).
  function comerDistTxt(aloj, v) {
    if (!aloj || !aloj.loc || aloj.loc.lat == null || !v.loc) return '';
    const km = haversine(aloj.loc, v.loc);
    return km < 0.5 ? 'A pie desde el alojamiento' : `~${km.toFixed(1)} km del alojamiento`;
  }

  // Añade el equivalente en € (tipo del BCE del día, el mismo que usa
  // Gastos) al precio en IDR cuando hay una cifra concreta.
  function comerPrecioTxt(v) {
    if (!v.precioThb) return v.precio || '';
    const [thbMin, thbMax] = v.precioThb;
    const eMin = Math.round(toEUR(thbMin, 'IDR'));
    const eMax = Math.round(toEUR(thbMax, 'IDR'));
    const eurTxt = eMax > eMin ? `~${eMin}–${eMax} €` : `~${eMin} €`;
    return `${v.precio} (${eurTxt})`;
  }

  const fact = (cls, ico, txt) => `<span class="fact fact--${cls}">${ico}${esc(txt)}</span>`;

  // Ficha de un sitio (restaurante o estadio). El número es el mismo que
  // lleva su chapa en el mapa; tocar cualquiera de los dos los enlaza.
  function venueCard(kind, v, aloj, n, key) {
    const w = el('div', 'venue' + (kind === 'mt' ? ' venue--mt' : v.estrellas ? ' venue--star' : ''));
    w.dataset.map = key;
    w.dataset.n = n;
    const dist = comerDistTxt(aloj, v);
    const facts = [];
    if (v.precio) facts.push(fact('price', ICON.coin, comerPrecioTxt(v)));
    if (dist) facts.push(fact('dist', ICON.pin, dist));
    const estrellas = v.estrellas
      ? `<span class="venue__stars" role="img" aria-label="${v.estrellas} estrella${v.estrellas > 1 ? 's' : ''} Michelin">${'★'.repeat(v.estrellas)}</span>`
      : '';
    const q = v.q || v.nombre;
    w.innerHTML =
      `<button class="venue__n" type="button" aria-label="Ver ${esc(v.nombre)} en el mapa">${n}</button>` +
      `<div class="venue__body">` +
      `<div class="venue__nombre">${estrellas}${esc(v.nombre)}</div>` +
      (v.tipo ? `<div class="venue__meta">${esc(v.tipo)}</div>` : '') +
      (v.dias ? `<div class="venue__dias">${esc(v.dias)}</div>` : '') +
      (v.horario ? `<div class="venue__meta">${esc(v.horario)}</div>` : '') +
      (facts.length ? `<div class="venue__facts">${facts.join('')}</div>` : '') +
      (v.nota ? `<div class="venue__meta">${esc(v.nota)}</div>` : '') +
      fotoBlock(v.foto, v.nombre, v.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption') +
      `<div class="venue__go">` +
      (v.loc ? `<button class="reco-link reco-link--map" type="button" data-pin>${ICON.locate} Ver en el mapa</button>` : '') +
      `<a class="reco-link" href="${esc(gmapsSearchHref(q))}" target="_blank" rel="noopener">Google Maps</a>` +
      `<a class="reco-link" href="${esc(appleMapsSearchHref(q))}" target="_blank" rel="noopener">Apple Maps</a>` +
      (v.web ? `<a class="reco-link" href="${esc(v.web)}" target="_blank" rel="noopener">Más información</a>` : '') +
      `</div></div>`;
    w.querySelectorAll('.venue__n, [data-pin]').forEach(b => b.addEventListener('click', () => selectVenue(key, n)));
    return w;
  }

  // Tarjeta de ciudad compartida por Comer y Muay Thai: nombre, fechas y mapa.
  function zonaCard(zona, key) {
    const c = el('section', 'zona');
    c.innerHTML =
      `<div class="zona__head"><h3 class="zona__nombre">${esc(zona.zona)}</h3><span class="zona__fechas">${esc(zona.fechas)}</span></div>` +
      `<div class="zmap" id="zmap-${key}"></div>`;
    return c;
  }

  function comerCard(zona, idx, aloj) {
    const key = 'comer-' + idx;
    const c = zonaCard(zona, key);
    if (zona.intro) {
      const p = el('p', 'zona__intro');
      p.textContent = zona.intro;
      c.appendChild(p);
    }
    let n = 0;
    if (zona.estrellas.length) {
      const lab = el('p', 'sub-label sub-label--star');
      lab.textContent = 'Estrellas Michelin';
      c.appendChild(lab);
      zona.estrellas.forEach(v => c.appendChild(venueCard('comer', v, aloj, ++n, key)));
    }
    if (zona.recomendados.length) {
      const lab = el('p', 'sub-label');
      lab.textContent = 'También recomendados';
      c.appendChild(lab);
      zona.recomendados.forEach(v => c.appendChild(venueCard('comer', v, aloj, ++n, key)));
    }
    return c;
  }

  function renderComer() {
    const body = $('#comer-body');
    if (!body) return;
    destroyZoneMaps('comer-');
    body.innerHTML = '';
    body.appendChild(notice('Bali no está cubierta por la Guía Michelin: recomendaciones locales bien valoradas, revisadas en septiembre de 2026 — confirma disponibilidad y reserva con tiempo. Distancias en línea recta desde el alojamiento, no ruta real.'));
    COMER_SEED.forEach((zona, idx) => {
      const aloj = state.alojamientos.find(a => a.zona === zona.zona);
      body.appendChild(comerCard(zona, idx, aloj));
    });
    refreshMaps();
  }

  /* ==========================================================
     Mapas (Leaflet): Comer, Muay Thai y la ruta del Itinerario
     ========================================================== */
  const OPTS_MAPA = {
    zoomControl: true, scrollWheelZoom: false, maxZoom: 18,
    // Sin animaciones: las de zoom/pan dejaban el pane de tiles mal colocado
    // al llamar a invalidateSize()/fitBounds() varias veces al abrir la pestaña.
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false
  };
  // El popup se ajusta para no quedar tapado por los botones de zoom
  const POPUP_MAPA = { maxWidth: 210, autoPanPaddingTopLeft: [52, 12] };
  const ATTR_MAPA = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Tiles claros de CARTO (el CSS los tiñe de lavanda). CARTO es un servicio
  // gratuito compartido y a veces da 503: tras varios fallos cambia a OSM.
  function addBaseTiles(map) {
    const carto = L.tileLayer('https://{s}.basemap.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19, crossOrigin: 'anonymous', attribution: ATTR_MAPA
    });
    let errs = 0, fallenBack = false;
    carto.on('tileerror', () => {
      if (fallenBack || ++errs < 4) return;
      fallenBack = true;
      map.removeLayer(carto);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, crossOrigin: 'anonymous',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
    });
    carto.addTo(map);
  }

  // Chapa numerada. El estilo va en un div interior para poder animarlo sin
  // pelearse con el transform que Leaflet aplica al marcador.
  function chapa(cls, inner, i, size) {
    return L.divIcon({
      className: '',
      html: `<div class="mpin ${cls}" style="--i:${i}">${inner}</div>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2]
    });
  }

  const zoneMaps = {};   // clave ('comer-0', 'mt-1'…) -> { map, bounds, markers, home, line, active }

  function destroyZoneMaps(prefix) {
    Object.keys(zoneMaps).forEach(k => {
      if (k.indexOf(prefix) !== 0) return;
      zoneMaps[k].map.remove();
      delete zoneMaps[k];
    });
  }

  // No se puede crear un mapa de Leaflet en un contenedor oculto (tamaño 0),
  // así que se reintenta cuando la pestaña se hace visible.
  function ensureZoneMap(key, aloj, items, kind) {
    if (zoneMaps[key] || typeof L === 'undefined') return;
    const box = document.getElementById('zmap-' + key);
    if (!box || !box.clientHeight) return;

    const home = aloj && aloj.loc && aloj.loc.lat != null ? aloj.loc : null;
    const sitios = [];
    items.forEach((v, i) => { if (v.loc) sitios.push({ v, n: i + 1 }); });
    if (!home && !sitios.length) { box.remove(); return; }

    const first = home || sitios[0].v.loc;
    const map = L.map(box, OPTS_MAPA).setView([first.lat, first.lng], 14);
    addBaseTiles(map);
    const entry = { map, markers: {}, home, line: null, active: null, bounds: null };
    const pts = [];
    let i = 0;

    if (home) {
      // Círculos de 500 m y 1 km: cuánto se puede hacer a pie desde el alojamiento
      [1000, 500].forEach(r => L.circle([home.lat, home.lng], {
        radius: r, weight: 1.5, dashArray: '4 6', className: r === 500 ? 'map-ring map-ring--in' : 'map-ring map-ring--out', interactive: false
      }).addTo(map));
      L.marker([home.lat, home.lng], { icon: chapa('mpin--home', ICON.house, i++, 32), keyboard: false, zIndexOffset: 500 })
        .addTo(map).bindPopup(`<b>${esc(aloj.nombre || 'Alojamiento')}</b><small>Tu alojamiento</small>`);
      pts.push([home.lat, home.lng]);
      const leyenda = L.control({ position: 'bottomleft' });
      leyenda.onAdd = () => { const d = L.DomUtil.create('div', 'ring-key'); d.textContent = '500 m y 1 km'; return d; };
      leyenda.addTo(map);
    }

    sitios.forEach(({ v, n }) => {
      const cls = kind === 'mt' ? 'mpin--mt' : (v.estrellas ? 'mpin--star' : '');
      const m = L.marker([v.loc.lat, v.loc.lng], { icon: chapa(cls, n, i++, 32), keyboard: false }).addTo(map);
      m.bindPopup(`<b>${esc(v.nombre)}</b>${v.tipo || v.dias ? `<small>${esc(v.tipo || v.dias)}</small>` : ''}`, POPUP_MAPA);
      m.on('click', () => selectVenue(key, n, true));
      entry.markers[n] = m;
      pts.push([v.loc.lat, v.loc.lng]);
    });

    entry.bounds = L.latLngBounds(pts);
    map.fitBounds(entry.bounds, { padding: [40, 40], maxZoom: 16, animate: false });
    zoneMaps[key] = entry;
  }

  // Marca un sitio en la lista y en el mapa (chapa ampliada, línea discontinua
  // desde el alojamiento y popup). Si viene del mapa, desplaza la lista a su ficha.
  function selectVenue(key, n, fromMap) {
    const entry = zoneMaps[key];
    const m = entry && entry.markers[n];
    if (!m) return;

    document.querySelectorAll(`.venue.is-active[data-map="${key}"]`).forEach(c => c.classList.remove('is-active'));
    if (entry.active) { const old = entry.active.getElement(); if (old) old.firstChild.classList.remove('is-active'); }
    if (entry.line) { entry.map.removeLayer(entry.line); entry.line = null; }

    const card = document.querySelector(`.venue[data-map="${key}"][data-n="${n}"]`);
    if (card) card.classList.add('is-active');
    const icon = m.getElement();
    if (icon) icon.firstChild.classList.add('is-active');
    entry.active = m;

    if (entry.home) {
      entry.line = L.polyline([[entry.home.lat, entry.home.lng], m.getLatLng()], {
        weight: 3, dashArray: '6 8', lineCap: 'round', className: 'route-line', interactive: false
      }).addTo(entry.map);
    }
    entry.map.panTo(m.getLatLng(), { animate: false });
    m.openPopup();
    if (fromMap && card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function refreshZoneMaps() {
    COMER_SEED.forEach((zona, idx) => {
      const aloj = state.alojamientos.find(a => a.zona === zona.zona);
      ensureZoneMap('comer-' + idx, aloj, zona.estrellas.concat(zona.recomendados), 'comer');
    });
    BALI_SHOWS_SEED.forEach((zona, idx) => {
      const aloj = state.alojamientos.find(a => a.zona === zona.zona);
      ensureZoneMap('mt-' + idx, aloj, zona.lugares, 'mt');
    });
    Object.keys(zoneMaps).forEach(k => {
      const e = zoneMaps[k];
      // invalidateSize() solo no siempre recoloca el pane de tiles tras
      // reflujos del layout: reencuadrar es idempotente y lo deja alineado.
      e.map.invalidateSize(false);
      e.map.fitBounds(e.bounds, { padding: [40, 40], maxZoom: 16, animate: false });
    });
  }

  // Ruta del viaje: un alojamiento tras otro, por fecha de entrada.
  let rutaMap = null;
  const rutaStops = () => state.alojamientos
    .filter(a => a.loc && a.loc.lat != null)
    .sort((a, b) => (a.checkin || '').localeCompare(b.checkin || ''));

  function rutaBlock() {
    const stops = rutaStops();
    if (!stops.length) return null;
    const km = stops.slice(1).reduce((s, a, i) => s + haversine(stops[i].loc, a.loc), 0);
    const box = el('section', 'ruta');
    box.innerHTML =
      `<div class="ruta__head"><h3>Tu ruta</h3><div class="ruta__stats">` +
      `<span class="stat"><b>${stops.length}</b> ${stops.length === 1 ? 'parada' : 'paradas'}</span>` +
      (km >= 1 ? `<span class="stat"><b>${Math.round(km)}</b> km en línea recta</span>` : '') +
      `</div></div><div class="zmap zmap--flat" id="ruta-mapa"></div>`;
    return box;
  }

  function destroyRutaMap() {
    if (rutaMap) { rutaMap.map.remove(); rutaMap = null; }
  }

  function ensureRutaMap() {
    if (rutaMap || typeof L === 'undefined') return;
    const box = document.getElementById('ruta-mapa');
    if (!box || !box.clientHeight) return;
    const stops = rutaStops();
    if (!stops.length) return;

    const map = L.map(box, OPTS_MAPA).setView([stops[0].loc.lat, stops[0].loc.lng], 6);
    addBaseTiles(map);
    const ll = stops.map(a => [a.loc.lat, a.loc.lng]);
    // Carretera: asfalto de tinta con su línea central, como en el itinerario
    L.polyline(ll, { weight: 7, lineCap: 'round', lineJoin: 'round', className: 'map-road', interactive: false }).addTo(map);
    L.polyline(ll, { color: '#ccf62f', weight: 2, dashArray: '2 9', lineCap: 'round', interactive: false }).addTo(map);
    // Etiquetas hacia fuera (las de más al oeste a la izquierda) y solo una
    // fija por grupo de paradas cercanas: las demás salen al tocar la chapa.
    const lngMedia = stops.reduce((s, a) => s + a.loc.lng, 0) / stops.length;
    const rotuladas = [];
    stops.forEach((a, i) => {
      const noches = Math.max(0, eachDay(a.checkin, a.checkout).length - 1);
      const izq = a.loc.lng < lngMedia;
      const fija = !rotuladas.some(l => haversine(l, a.loc) < 90);
      if (fija) rotuladas.push(a.loc);
      L.marker([a.loc.lat, a.loc.lng], { icon: chapa('mpin--stop', i + 1, i, 36), keyboard: false })
        .addTo(map)
        .bindTooltip(esc(a.zona || a.nombre || ''), { permanent: fija, direction: izq ? 'left' : 'right', offset: [izq ? -14 : 14, 0], className: 'city-tip' })
        .bindPopup(`<b>${esc(a.nombre || 'Alojamiento')}</b><small>${a.checkin ? esc(fmtFecha(a.checkin)) : ''}${noches ? ' · ' + noches + ' noche' + (noches !== 1 ? 's' : '') : ''}</small>`);
    });
    rutaMap = { map, bounds: L.latLngBounds(ll) };
    map.fitBounds(rutaMap.bounds, { padding: [56, 56], maxZoom: 12, animate: false });
  }

  function refreshRutaMap() {
    ensureRutaMap();
    if (!rutaMap) return;
    rutaMap.map.invalidateSize(false);
    rutaMap.map.fitBounds(rutaMap.bounds, { padding: [56, 56], maxZoom: 12, animate: false });
  }

  function refreshMaps() {
    refreshZoneMaps();
    refreshRutaMap();
  }

  /* ==========================================================
     Pantalla: TRANSPORTE Y GUÍAS
     ========================================================== */
  const TRANSPORTE_LOCAL = [
    { ico: '🛺', cat: 'Grab / Gojek y taxi',
      items: [
        'Grab y Gojek (como Uber): precio fijo mostrado antes de aceptar — mejor que negociar. En Ubud y otras zonas turísticas los cooperativas de transporte local presionan para que no recojan en la calle: pide que el conductor te espere en un punto un poco apartado si el pin no lo deja parar.',
        'Sin Grab/Gojek (Gili Air, algunos tramos): negocia el precio ANTES de subir a un ojek (moto-taxi) o cidomo (carro de caballos).',
        'En Gili Air no hay coches ni motos: todo se mueve a pie, en bici o en cidomo.'
      ] },
    { ico: '🚗', cat: 'Conductor privado / coche con chófer',
      items: [
        'Para rutas de un día con varias paradas (como Tegallalang · Besakih · Sidemen), lo habitual es contratar un conductor privado por el día completo en vez de conducir tú mismo.',
        'Confirma el punto de recogida exacto cuando el alojamiento no está en el centro del pueblo (p. ej. Kemenuh respecto a Ubud).'
      ] },
    { ico: '🛵', cat: 'Alquiler de scooter',
      items: [
        'Lleva el carné de conducir internacional: hay controles policiales habituales que lo piden.',
        'Casco obligatorio, también para el pasajero.',
        'Revisa el vehículo y fotografía los daños previos antes de irte con él.',
        'El seguro del alquiler no suele cubrir todo — conviene tener un seguro de viaje con cobertura de moto.',
        'El tráfico en Ubud y el sur de Bali es denso y errático a según qué horas — si no tienes experiencia con moto, valora un conductor privado en su lugar.'
      ] },
    { ico: '⛴️', cat: 'Fast boat a Gili Air',
      items: [
        'Padang Bai es el embarcadero habitual para el fast boat a Gili Air (también hay salidas desde Sanur o Amed, más al este).',
        'Reserva con traslado incluido desde el alojamiento cuando puedas: simplifica el día de viaje y evita depender de otro transporte para llegar al puerto.',
        'Lleva algo para el mareo si el mar está movido — el trayecto es en barco rápido y puede haber oleaje.'
      ] }
  ];

  const COMIDA_CALLEJERA = {
    intro: 'La comida callejera y los warungs (pequeños restaurantes familiares) son de lo mejor del viaje, y también seguros si eliges bien el sitio.',
    items: [
      'Elige warungs con mucha rotación y clientela local, con la comida recién hecha.',
      'Los primeros días, si tienes el estómago sensible, ten cuidado con el hielo y el agua del grifo — bebe siempre agua embotellada o filtrada.',
      'Lleva gel hidroalcohólico y algo de antidiarreico por si acaso.',
      'Platos imprescindibles: nasi campur (arroz con varios acompañamientos), mie goreng, sate lilit (satay balinés), lawar, babi guling (cochinillo balinés) y pisang goreng (plátano frito) de postre.'
    ]
  };

  const TEMPLOS_ETIQUETA = {
    intro: 'Los templos balineses (pura) son lugares de culto activos, no un photocall — el respeto se nota y se agradece.',
    items: [
      'Sarong y sash (faja) en la cintura para entrar — muchos templos los prestan o alquilan en la puerta, pero conviene llevar uno propio ligero por si acaso.',
      'Hombros cubiertos, y ropa que no sea de playa o gimnasio.',
      'Tradicionalmente se pide a las mujeres que estén menstruando que no entren al recinto interior del templo — es una norma real de la cultura balinesa, no una anécdota.',
      'No te sitúes más alto que un sacerdote o una ofrenda durante una ceremonia, y no interrumpas una procesión.',
      'Cuidado al pisar las ofrendas de flores y hojas de palma (canang sari) que hay por el suelo en templos, tiendas y aceras: son ofrendas diarias, no basura.',
      'Comportamiento silencioso y respetuoso durante las ceremonias, aunque no participes en ellas.'
    ]
  };

  const TEMPORADA_BALI = {
    intro: 'Bali tiene dos estaciones: seca (abril-octubre) y lluviosa (noviembre-marzo). El viaje cae en plena temporada seca, pero el patrón de lluvia varía según la zona de la isla — por eso el aviso de lluvia de Itinerario es por día y por ubicación, no un cartel único para todo el viaje.',
    items: [
      'Patrón general: seca abril-octubre, lluviosa noviembre-marzo, con chubascos de tarde posibles incluso en temporada seca.',
      'Sur de Bali (Uluwatu, Seminyak, Nusa Dua): la zona más seca de las turísticas — cuando llueve, suelen ser chubascos cortos de tarde y las mañanas son fiables.',
      'Centro (Ubud): algo más de lluvia que el sur, por la altitud y la cercanía a la selva.',
      'Este (Sidemen, zona de Besakih): una de las zonas más secas de la isla gracias al efecto de sombra de lluvia del monte Agung.',
      'Norte y montaña (Kintamani, Munduk, Bedugul): la zona más lluviosa de Bali durante todo el año.',
      'Gili Air (Lombok): patrón similar al sur de Bali, temporada seca abril-octubre.'
    ]
  };

  const PLAN_B_BALI = {
    intro: 'Si el aviso de lluvia del día pinta feo, cambia planes al aire libre por interior sin salir de la zona donde duermes esa noche.',
    items: [
      'Masaje o spa balinés: un clásico de día de lluvia, y muy asequible.',
      'Cafés y coworkings con wifi para hacer una pausa larga y replanear el resto del día — Ubud está lleno de ellos.',
      'Museos y galerías de arte en Ubud (hay varios centrados en pintura balinesa e indonesia).',
      'Un fast boat cancelado por mar de fondo obliga a mover el traslado a Gili Air o la vuelta a Bali: consulta el pronóstico de la naviera con un día de margen y ten un plan alternativo de fecha.'
    ]
  };

  const DINERO_BALI = {
    intro: 'Algunos trucos para estirar el presupuesto en Rupias (IDR) — los números tienen muchos ceros, así que conviene tener claro el tipo de cambio de un vistazo (lo calcula la propia app en Gastos).',
    items: [
      'Cajeros: casi todos cobran una comisión fija por operación, sea cual sea tu banco. Retira cantidades grandes pocas veces en vez de muchas pequeñas; revisa si tu propio banco te reembolsa las comisiones en el extranjero.',
      'Cambio de moneda: usa solo casas de cambio autorizadas (con el logo oficial "KUPVA BB" o "PVA BERIZIN" visible) — hay muchas casas de cambio con comisiones ocultas o cambio manipulado, sobre todo en zonas turísticas.',
      'Regateo: normal en mercados y con transporte no oficial; no en tiendas con precio marcado ni en supermercados (Alfamart, Indomaret).',
      'Propinas: no son obligatorias. Redondear o dejar el cambio suelto está bien visto; en restaurantes de gama alta a veces ya incluyen un cargo de servicio.',
      'Alfamart / Indomaret: hay uno en casi cada esquina — útiles para agua, tarjetas SIM y algún imprevisto.'
    ]
  };

  const EMERGENCIAS_BALI = [
    { ico: '🚨', cat: 'Emergencias',
      items: [
        { l: 'Emergencia general', tel: '112', d: 'Número de emergencia unificado en Indonesia.' },
        { l: 'Policía', tel: '110', d: 'Emergencia policial general.' },
        { l: 'Ambulancia', tel: '118', d: 'También puede probarse el 119 según la zona.' },
        { l: 'Bomberos', tel: '113', d: '' },
        { l: 'Policía turística de Denpasar', tel: '+62 361 224456', d: 'Atienden consultas relacionadas con turistas.' }
      ] },
    { ico: '🛂', cat: 'Consulado',
      items: [
        { l: 'Consulado Honorario de España en Bali (Seminyak)', tel: '+62 811 389 8880', d: 'Horario de mañana, de lunes a viernes. Confirma el número antes de viajar por si ha cambiado.' }
      ] }
  ];

  const GUIA_TOPICS = [
    { key: 'transporte', label: '🛺 Transporte', heads: ['Grab / Gojek y taxi', 'Conductor privado / coche con chófer', 'Alquiler de scooter', 'Fast boat a Gili Air'] },
    { key: 'comida', label: '🍜 Comida callejera', heads: ['Comida callejera'] },
    { key: 'templos', label: '🙏 Templos', heads: ['Templos: etiqueta básica'] },
    { key: 'temporada', label: '🌧️ Temporada', heads: ['Temporada por región'] },
    { key: 'planb', label: '☔ Plan B', heads: ['Plan B para días de lluvia fuerte'] },
    { key: 'dinero', label: '💸 Dinero', heads: ['Dinero: trucos en IDR'] },
    { key: 'tuyas', label: '✍️ Tuyas', heads: ['Tus recomendaciones'] },
    { key: 'telefonos', label: '📞 Teléfonos', heads: ['Teléfonos importantes en Bali', 'Emergencias', 'Consulado'] }
  ];
  const HEAD_TO_GUIA_TOPIC = {};
  GUIA_TOPICS.forEach(t => t.heads.forEach(h => { HEAD_TO_GUIA_TOPIC[h] = t.key; }));

  function guiaSection(ico, cat, items) {
    const sec = el('section', 'reco-cat');
    sec.innerHTML =
      `<div class="reco-cat__head">` +
      `<span class="reco-cat__badge">${esc(ico)}</span>` +
      `<h3>${esc(cat)}</h3>` +
      `</div>` +
      `<div class="reco-cat__list">` +
      items.map(t => `<div class="reco-card">${esc(t)}</div>`).join('') +
      `</div>`;
    return sec;
  }

  function renderEmergenciasBali(body) {
    const lead = el('section', 'reco-cat emerg-lead');
    lead.innerHTML =
      `<div class="reco-cat__head">` +
      `<span class="reco-cat__badge">📞</span>` +
      `<h3>Teléfonos importantes en Bali</h3>` +
      `</div>` +
      `<p class="emerg-intro">Pulsa un número para llamar.</p>`;
    body.appendChild(lead);

    EMERGENCIAS_BALI.forEach(g => {
      const sec = el('section', 'reco-cat emerg-cat');
      sec.innerHTML =
        `<div class="reco-cat__head">` +
        `<span class="reco-cat__badge">${esc(g.ico || '•')}</span>` +
        `<h3>${esc(g.cat)}</h3>` +
        `</div>` +
        `<div class="reco-cat__list">` +
        g.items.map(it => {
          const num = it.tel
            ? `<a class="emerg-num" href="tel:${esc(it.tel.replace(/\s+/g, ''))}">${esc(it.tel)}</a>`
            : '';
          return `<div class="reco-card emerg-card">` +
            `<div class="emerg-row"><span class="emerg-label">${esc(it.l)}</span>${num}</div>` +
            (it.d ? `<p class="emerg-note">${esc(it.d)}</p>` : '') +
            `</div>`;
        }).join('') +
        `</div>`;
      body.appendChild(sec);
    });
  }

  const RECO_CAT_ICO = { Ver: '👁️', Hacer: '🎯', Comer: '🍴', Comprar: '🛍️', Consejo: '💬', Otro: '📌' };

  function recoSummary(it) {
    const chip = it.categoria
      ? `<span class="reco-chip">${esc(RECO_CAT_ICO[it.categoria] || '')} ${esc(it.categoria)}</span>`
      : '';
    const link = it.link
      ? `<a class="reco-link" href="${esc(it.link)}" target="_blank" rel="noopener">Abrir enlace ›</a>`
      : '';
    return `<div class="item__title">${esc(it.texto || '')}</div>` +
      ((chip || link) ? `<div class="reco-foot">${chip}${link}</div>` : '');
  }

  function renderTransporte() {
    const body = $('#transporte-body');
    if (!body) return;
    body.innerHTML = '';

    const chips = el('div', 'chips chips--itin');
    chips.appendChild(guiaChip('all', 'Todo'));
    GUIA_TOPICS.forEach(t => chips.appendChild(guiaChip(t.key, t.label)));
    body.appendChild(chips);

    TRANSPORTE_LOCAL.forEach(g => body.appendChild(guiaSection(g.ico, g.cat, g.items)));
    body.appendChild(guiaSection('🍜', 'Comida callejera', COMIDA_CALLEJERA.items));
    body.appendChild(guiaSection('🙏', 'Templos: etiqueta básica', TEMPLOS_ETIQUETA.items));
    body.appendChild(guiaSection('🌧️', 'Temporada por región', TEMPORADA_BALI.items));
    body.appendChild(guiaSection('☔', 'Plan B para días de lluvia fuerte', PLAN_B_BALI.items));
    body.appendChild(guiaSection('💸', 'Dinero: trucos en IDR', DINERO_BALI.items));

    const mine = el('section', 'reco-cat reco-cat--mine');
    mine.innerHTML =
      `<div class="reco-cat__head">` +
      `<span class="reco-cat__badge">✍️</span>` +
      `<h3>Tus recomendaciones</h3>` +
      `</div>`;

    const list = el('div', 'reco-cat__list');
    if (!state.recomendaciones.length) {
      const e = el('p', 'reco-empty');
      e.textContent = 'Apunta aquí cosas que te recomienden o que quieras hacer durante el viaje.';
      list.appendChild(e);
    } else {
      state.recomendaciones.forEach(it => {
        const c = itemCard('recomendacion', it, recoSummary(it), true);
        c.classList.add('reco-usercard');
        list.appendChild(c);
      });
    }
    mine.appendChild(list);

    const add = el('button', 'btn btn--accent btn--block');
    add.type = 'button';
    add.innerHTML = ICON.plus + ' Añadir recomendación';
    add.style.marginTop = 'var(--space-12)';
    add.addEventListener('click', () => openSheet('recomendacion'));
    mine.appendChild(add);

    body.appendChild(mine);

    renderEmergenciasBali(body);

    [...body.querySelectorAll('.reco-cat')].forEach(sec => {
      const h3 = sec.querySelector('h3');
      const key = h3 && HEAD_TO_GUIA_TOPIC[h3.textContent];
      sec.hidden = selectedGuiaTopic !== 'all' && selectedGuiaTopic !== key;
    });
  }

  /* ==========================================================
     Navegación por pestañas
     ========================================================== */
  const SCREENS = ['datos', 'itinerario', 'comer', 'transporte', 'espectaculos'];

  function showScreen(name) {
    if (!SCREENS.includes(name)) name = 'datos';
    SCREENS.forEach(s => {
      const scr = $('#screen-' + s);
      if (scr) scr.hidden = (s !== name);
      const tab = $(`.tab[data-tab="${s}"]`);
      if (tab) tab.setAttribute('aria-current', s === name ? 'page' : 'false');
    });
    if (name === 'comer' || name === 'espectaculos' || name === 'itinerario') {
      // La sección ya es visible: crea/redimensiona tras el reflujo.
      // Doble pasada (60 ms y 300 ms) para que Leaflet mida bien los contenedores.
      refreshMaps();
      setTimeout(refreshMaps, 60);
      setTimeout(refreshMaps, 300);
    }
    window.scrollTo(0, 0);
    if (name === 'itinerario') refreshMeteo();
    if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  }

  $$('.tab').forEach(t => t.addEventListener('click', () => showScreen(t.dataset.tab)));
  window.addEventListener('hashchange', () => showScreen(location.hash.slice(1)));

  /* ==========================================================
     Bottom sheet
     ========================================================== */
  function showSheet() {
    const s = $('#sheet');
    s.hidden = false;
    s.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => {
      s.classList.add('is-open');
      const f = s.querySelector('input, select, textarea, button');
      if (f) f.focus();
    });
  }
  function hideSheet() {
    const s = $('#sheet');
    s.classList.remove('is-open');
    s.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { s.hidden = true; $('#sheet-form').innerHTML = ''; }, 220);
    editing = null;
  }
  $$('#sheet [data-close]').forEach(b => b.addEventListener('click', hideSheet));

  /* ==========================================================
     Diálogo de confirmación
     ========================================================== */
  let confirmResolve = null;
  function confirmAsk(msg) {
    return new Promise(resolve => {
      confirmResolve = value => {
        $('#confirm').hidden = true;
        if ($('#sheet').hidden) document.body.classList.remove('no-scroll');
        confirmResolve = null;
        resolve(value);
      };
      $('#confirm-msg').textContent = msg;
      $('#confirm').hidden = false;
      document.body.classList.add('no-scroll');
      requestAnimationFrame(() => $('#confirm [data-ok]').focus());
    });
  }
  $$('#confirm [data-cancel]').forEach(b => b.addEventListener('click', () => confirmResolve && confirmResolve(false)));
  on('#confirm [data-ok]', 'click', () => confirmResolve && confirmResolve(true));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#sheet').hidden) hideSheet();
    else if (!$('#confirm').hidden && confirmResolve) confirmResolve(false);
  });

  /* ==========================================================
     Toast
     ========================================================== */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('is-on');
      setTimeout(() => { t.hidden = true; }, 220);
    }, 2600);
  }

  /* ==========================================================
     Cuenta atrás hasta la salida del avión
     ========================================================== */
  function firstDeparture() {
    let best = null;
    state.vuelos.forEach(v => (v.tramos || []).forEach(t => {
      if (t.salida && (!best || t.salida < best)) best = t.salida;
    }));
    return best; // 'YYYY-MM-DDTHH:MM' o null
  }

  function countdownStr(depStr) {
    if (!depStr) return '';
    const dep = new Date(depStr).getTime();
    if (isNaN(dep)) return '';
    const ms = dep - Date.now();
    if (ms <= 0) return '';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (d >= 2) return d + ' días';
    if (d === 1) return '1 día ' + h + ' h';
    if (h >= 1) return h + ' h ' + m + ' min';
    return m + ' min';
  }

  // 'antes' | 'curso' | 'fin'
  function tripStatus() {
    const { fechaInicio, fechaFin } = state.meta;
    if (!fechaInicio) return 'antes';
    const hoy = hoyYMD();
    if (fechaFin && hoy > fechaFin) return 'fin';
    if (hoy >= fechaInicio) return 'curso';
    return 'antes';
  }

  function diaActual() {
    const { fechaInicio, fechaFin } = state.meta;
    if (!fechaInicio) return 0;
    const total = fechaFin ? eachDay(fechaInicio, fechaFin).length : 99;
    return Math.min(total, eachDay(fechaInicio, hoyYMD()).length || 1);
  }

  function updateCountdown() {
    const box = $('#appbar-count');
    if (!box) return;
    const st = tripStatus();

    if (st === 'fin') { box.hidden = true; box.classList.remove('is-live'); return; }

    if (st === 'curso') {
      box.textContent = 'En curso · día ' + diaActual();
      box.title = 'El viaje está en marcha';
      box.classList.add('is-live');
      box.hidden = false;
      return;
    }

    box.classList.remove('is-live');
    const s = countdownStr(firstDeparture());
    if (!s) { box.hidden = true; return; }
    box.innerHTML = ICON.plane + '<span>' + esc(s) + '</span>';
    const dp = dtParts(firstDeparture());
    box.title = dp.date ? `Salida del vuelo: ${fmtFecha(dp.date, true)}, ${dp.time}` : 'Cuenta atrás para el viaje';
    box.hidden = false;
  }

  /* ==========================================================
     Arranque
     ========================================================== */
  function paintAppbar() {
    $('#appbar-title').textContent = state.meta.titulo || 'Viaje a Bali';
    const m = state.meta;
    $('#appbar-sub').textContent = (m.fechaInicio && m.fechaFin)
      ? `${fmtFecha(m.fechaInicio)} – ${fmtFecha(m.fechaFin, true)}`
      : 'Sin fechas · añádelas en Datos';
    updateCountdown();
  }
  setInterval(updateCountdown, 60000);

  /* ==========================================================
     Tema claro / oscuro
     El script de <head> ya fijó data-theme antes de pintar. Aquí solo se
     dibuja el botón, se guarda la elección y, mientras no haya elección
     propia, se sigue el tema del sistema.
     ========================================================== */
  const TEMA_COLOR = { light: '#161a3c', dark: '#070920' };
  const temaActual = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const temaGuardado = () => { try { return localStorage.getItem('tema'); } catch (e) { return null; } };

  function paintTheme() {
    const dark = temaActual() === 'dark';
    const btn = $('#theme-btn');
    btn.innerHTML = dark ? ICON.sun : ICON.moon;
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
    $('meta[name="theme-color"]').content = TEMA_COLOR[temaActual()];
  }

  function setTheme(t, guardar) {
    document.documentElement.dataset.theme = t;
    if (guardar) { try { localStorage.setItem('tema', t === 'dark' ? 'oscuro' : 'claro'); } catch (e) { /* sin almacenamiento */ } }
    paintTheme();
  }

  on('#theme-btn', 'click', () => setTheme(temaActual() === 'dark' ? 'light' : 'dark', true));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ev => {
    if (!temaGuardado()) setTheme(ev.matches ? 'dark' : 'light', false);
  });
  paintTheme();

  function renderAll() {
    paintAppbar();
    renderDatos();
    renderItinerario();
    renderComer();
    renderTransporte();
    renderEspectaculos();
  }

  /* ==========================================================
     Clima — Luz y luna (cálculo local con SunCalc)
     ========================================================== */
  const BALI_CENTER = { lat: -8.4095, lng: 115.1889, label: 'Bali (centro)' };
  const isDate = d => d instanceof Date && !isNaN(d.getTime());

  // Ubicación de un día = alojamiento donde se duerme esa noche; si no, la
  // noche anterior; si nada, el centro de Bali como referencia por defecto.
  function locForDate(dateStr) {
    let d = dateStr;
    for (let i = 0; i < 40; i++) {
      const a = state.alojamientos.find(x =>
        x.checkin && x.checkout && x.checkin <= d && d < x.checkout &&
        x.loc && x.loc.lat != null && x.loc.lng != null);
      if (a) return { lat: a.loc.lat, lng: a.loc.lng, label: a.nombre || 'Alojamiento' };
      const dt = parseDate(d);
      if (!dt) break;
      dt.setDate(dt.getDate() - 1);
      d = ymd(dt);
      if (state.meta.fechaInicio && d < state.meta.fechaInicio) break;
    }
    return { lat: BALI_CENTER.lat, lng: BALI_CENTER.lng, label: BALI_CENTER.label };
  }
  const isFallbackCenter = l => l && l.lat === BALI_CENTER.lat && l.lng === BALI_CENTER.lng;

  function moonPhaseName(p) {
    if (p < 0.02 || p >= 0.98) return 'Luna nueva';
    if (p < 0.24) return 'Creciente';
    if (p < 0.26) return 'Cuarto creciente';
    if (p < 0.48) return 'Gibosa creciente';
    if (p < 0.52) return 'Luna llena';
    if (p < 0.74) return 'Gibosa menguante';
    if (p < 0.76) return 'Cuarto menguante';
    return 'Menguante';
  }

  function dayLenMin(dateNoon, loc) {
    const t = SunCalc.getTimes(dateNoon, loc.lat, loc.lng);
    if (!isDate(t.sunrise) || !isDate(t.sunset)) return null;
    return Math.round((t.sunset - t.sunrise) / 60000);
  }

  function moonInDarkWindow(win, loc) {
    if (!win) return null;
    const pts = [win.start.getTime(), (win.start.getTime() + win.end.getTime()) / 2, win.end.getTime()];
    const up = pts.filter(ms =>
      SunCalc.getMoonPosition(new Date(ms), loc.lat, loc.lng).altitude > 0).length;
    return up === 3 ? 'sí' : up === 0 ? 'no' : 'a medias';
  }

  function sky(dateStr) {
    const loc = locForDate(dateStr);
    // Mediodía en hora de Bali (WITA, UTC+8) del día: así SunCalc resuelve
    // siempre los eventos solares del día correcto sea cual sea la zona
    // horaria del dispositivo.
    const [Y, Mo, Da] = dateStr.split('-').map(Number);
    const localNoon = off => new Date(Date.UTC(Y, Mo - 1, Da + off, 12, 0, 0) - BALI_TZ_OFFSET_MS);
    const noon = localNoon(0), prev = localNoon(-1), next = localNoon(1);

    const t = SunCalc.getTimes(noon, loc.lat, loc.lng);
    const tNext = SunCalc.getTimes(next, loc.lat, loc.lng);

    const todayLen = dayLenMin(noon, loc);
    const prevLen = dayLenMin(prev, loc);

    const darkWindow = (isDate(t.night) && isDate(tNext.nightEnd))
      ? { start: t.night, end: tNext.nightEnd } : null;

    const mi = SunCalc.getMoonIllumination(noon);
    const mt = SunCalc.getMoonTimes(noon, loc.lat, loc.lng);

    return {
      date: dateStr,
      locLabel: loc.label,
      loc: { lat: loc.lat, lng: loc.lng },
      sunrise: isDate(t.sunrise) ? t.sunrise : null,
      sunset: isDate(t.sunset) ? t.sunset : null,
      dayLengthMin: todayLen,
      deltaVsPrevMin: (todayLen != null && prevLen != null) ? todayLen - prevLen : null,
      goldenAM: { start: isDate(t.sunrise) ? t.sunrise : null, end: isDate(t.goldenHourEnd) ? t.goldenHourEnd : null },
      goldenPM: { start: isDate(t.goldenHour) ? t.goldenHour : null, end: isDate(t.sunset) ? t.sunset : null },
      civilDawn: isDate(t.dawn) ? t.dawn : null,
      civilDusk: isDate(t.dusk) ? t.dusk : null,
      darkWindow,
      moon: {
        phaseName: moonPhaseName(mi.phase),
        illumPct: Math.round(mi.fraction * 100),
        rise: isDate(mt.rise) ? mt.rise : null,
        set: isDate(mt.set) ? mt.set : null,
        alwaysUp: !!mt.alwaysUp,
        alwaysDown: !!mt.alwaysDown,
        inDarkWindow: moonInDarkWindow(darkWindow, loc)
      }
    };
  }

  /* ==========================================================
     Viabilidad del día — tiempos de trayecto y luz disponible
     ========================================================== */

  // Todo el cálculo va en minutos **continuos** desde la medianoche de
  // day.date en hora de Bali (WITA, UTC+8 fijo, sin horario de verano).
  // Los eventos (it.hora) están escritos en hora local de Bali; los
  // tiempos de SunCalc son instantes absolutos y se convierten a minutos
  // desde esa medianoche (puede pasar de 1440, o ser negativo — a propósito,
  // no se envuelve). Así el veredicto es correcto sea cual sea la zona
  // horaria del dispositivo.
  const COSTE_POR_TIPO = { excursion: EXCURSION_MIN, lugar: LUGAR_MIN, comida: COMIDA_MIN };

  function anchorMin(it) {
    // Los vuelos no anclan: no se depende de ellos para "salir", y su hora
    // puede estar en la zona del aeropuerto de origen.
    if (!['excursion', 'coche'].includes(it.t)) return null;
    const m = String(it.hora || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }

  function itemCost(it) {
    const c = +it.costMin;
    if (Number.isFinite(c)) return c;
    const d = COSTE_POR_TIPO[it.t];
    return typeof d === 'number' ? d : 0;
  }

  // Determinista dado el estado (lee state.meta, state.alojamientos vía sky(), y SunCalc).
  function dayPlan(day) {
    const sk = (typeof SunCalc !== 'undefined' && state.meta.fechaInicio) ? sky(day.date) : null;
    // minutos continuos desde la medianoche de day.date en hora de Bali
    const midnight = Date.UTC(+day.date.slice(0, 4), +day.date.slice(5, 7) - 1, +day.date.slice(8, 10)) - BALI_TZ_OFFSET_MS;
    const minOn = d => (isDate(d) ? Math.round((d.getTime() - midnight) / 60000) : null);

    const dawnMin = sk ? minOn(sk.civilDawn) : null;
    // Si el primer plan del día tiene una hora fija (p.ej. una excursión que
    // recoge a las 06:00), esa hora define el inicio real del día: no tiene
    // sentido marcarla como "no llegas" solo por no llegar a un suelo genérico.
    const earliestAnchorMin = day.items.reduce((min, it) => {
      const a = anchorMin(it);
      return a != null && (min == null || a < min) ? a : min;
    }, null);
    const inicio = earliestAnchorMin != null
      ? earliestAnchorMin
      : ((dawnMin != null && dawnMin > SALIDA_FLOOR_MIN) ? dawnMin : SALIDA_FLOOR_MIN);

    let reloj = inicio;
    let prev = null, drivingMin = 0;
    const legs = [];
    let firstAnchor = null, tHastaAncla = 0, missedAnchor = null;

    for (const it of day.items) {
      if (it.loc && it.loc.lat != null && prev && haversine(prev, it.loc) >= MIN_LEG_KM) {
        const leg = driveByRoad(prev, it.loc);
        drivingMin += leg.min;
        reloj += leg.min;
        legs.push(leg);
      }
      const a = anchorMin(it);
      if (a != null) {
        if (firstAnchor == null) { firstAnchor = a; tHastaAncla = reloj - inicio; }
        if (reloj > a + MARGEN_ANCLA_MIN) missedAnchor = missedAnchor || (it.titulo || 'un evento');
        reloj = Math.max(reloj, a);
      }
      reloj += itemCost(it);
      if (it.loc && it.loc.lat != null) prev = it.loc;
    }

    const endMin = reloj;
    const salirMin = firstAnchor != null ? firstAnchor - tHastaAncla : null;

    let luz = null;
    const sunsetMin = sk ? minOn(sk.sunset) : null;
    const duskMin = sk ? minOn(sk.civilDusk) : null;
    if (sunsetMin != null) {
      if (missedAnchor) luz = 'pasa';
      else if (endMin <= sunsetMin - MARGEN_ATARDECER_MIN) luz = 'ok';
      else if (duskMin != null && endMin <= duskMin) luz = 'justo';
      else if (duskMin == null) luz = 'ok';
      else luz = 'pasa';
    }

    const h = drivingMin / 60;
    const volante = h <= VOLANTE_LARGO_H ? 'ok' : h <= VOLANTE_MAX_H ? 'largo' : 'excesivo';

    const rank = { ok: 0, justo: 1, largo: 1, pasa: 2, excesivo: 2 };
    let veredicto = ['verde', 'ambar', 'rojo'][Math.max(rank[luz || 'ok'], rank[volante])];

    if (missedAnchor) veredicto = 'rojo';                       // siempre rojo, aunque no haya sky
    else if (!sk && volante === 'ok') veredicto = null;         // nada que decir sin luz ni trayecto
    if (day.items.some(x => x.t === 'vuelo')) veredicto = null; // día de vuelo: no se juzga
    if (!legs.length && firstAnchor == null && endMin === inicio) veredicto = null; // día sin nada

    return { drivingMin, legs, salirMin, endMin, inicioMin: inicio, missedAnchor, luz, volante, veredicto };
  }

  // Minutos continuos desde medianoche → 'HH:MM' (con ' (+1 d)' si pasa de medianoche).
  function hhmmFromMin(m) {
    if (m == null) return '';
    const t = Math.round(m);
    const hm = `${pad2(Math.floor((t % 1440 + 1440) % 1440 / 60))}:${pad2(((t % 60) + 60) % 60)}`;
    return t >= 1440 ? hm + ' (+1 d)' : hm;
  }

  function verdictLabel(p) {
    if (p.veredicto === 'rojo') {
      if (p.missedAnchor) return 'No llegas a: ' + p.missedAnchor;
      if (p.volante === 'excesivo') return fmtDur(p.drivingMin) + ' de trayecto';
      if (p.luz === 'pasa') return 'Terminas de noche';
      return '';
    }
    if (p.veredicto === 'ambar') {
      if (p.luz === 'justo') return 'Justo de luz';
      if (p.volante === 'largo') return fmtDur(p.drivingMin) + ' de trayecto';
      return '';
    }
    return ''; // verde: solo el punto
  }

  // Sitios cercanos a cada alojamiento para ver combates de Muay Thai, con
  // los días de la semana en los que suelen tener cartel y qué noche de la
  // estancia encaja. Investigado y verificado en septiembre de 2026 —
  // los estadios cambian de cartel a menudo: confirma horario y entradas
  // más cerca de la fecha.
  const BALI_SHOWS_SEED = [
    { zona: 'Ubud (Kemenuh)', fechas: '28 sep – 2 oct (4 noches)',
      intro: 'Ubud Palace (Puri Saren Agung) programa danza tradicional casi cada noche, con un espectáculo distinto según el día de la semana.',
      lugares: [
        { nombre: 'Ubud Palace — danza tradicional', nota: 'Programa semanal: domingo Legong of Mahabharata · lunes Legong Dance · martes Bina Remaja Ramayana Ballet · miércoles Legong & Barong Dance · jueves Legong Trance Paradise · viernes Barong Dance Ubud · sábado Legong Dance.',
          dias: 'Cualquier noche de la estancia (28 sep – 1 oct) — mira qué programa cae cada día.', horario: '19:30.',
          precio: 'Entrada ~100.000 IDR', loc: { lat: -8.5069, lng: 115.2625 }, desc: 'El escenario del propio Ubud Palace, en el centro de Ubud, con danza balinesa tradicional casi cada noche.' }
      ] },
    { zona: 'Gili Air', fechas: '2 – 4 oct (2 noches)',
      intro: 'Gili Air no tiene escenarios formales de danza o teatro — las noches de la isla giran en torno a la puesta de sol en la playa y la cena, no a un espectáculo programado.',
      lugares: [] },
    { zona: 'Uluwatu (Pecatu)', fechas: '4 – 6 oct (2 noches)',
      intro: 'El espectáculo de referencia del Bukit es el Kecak al atardecer, en el propio templo de Uluwatu — ya está en el itinerario del día 7.',
      lugares: [
        { nombre: 'Kecak Fire & Trance Dance — Uluwatu Temple', nota: 'Dos pases cada tarde. La entrada de la danza es aparte de la del templo.',
          dias: 'Noche del día 7 (5 oct), que es cuando ya está en el itinerario.', horario: '18:00 y 19:00.',
          precio: 'Entrada ~150.000 IDR adultos', loc: { lat: -8.8291, lng: 115.0849 }, desc: 'El Kecak con puesta de sol sobre el mar, en el anfiteatro del templo de Uluwatu — el espectáculo más icónico del sur de Bali.' }
      ] }
  ];

  function escenarioCard(zona, idx, aloj) {
    const key = 'mt-' + idx;
    const c = zonaCard(zona, key);
    if (zona.intro) {
      const p = el('p', 'zona__intro');
      p.textContent = zona.intro;
      c.appendChild(p);
    }
    if (!zona.lugares.length) {
      c.appendChild(notice('Nada programado en esta zona: disfruta de la noche sin escenario fijo.'));
    }
    zona.lugares.forEach((l, i) => c.appendChild(venueCard('mt', l, aloj, i + 1, key)));
    return c;
  }

  function renderEspectaculos() {
    const body = $('#espectaculos-body');
    if (!body) return;
    destroyZoneMaps('mt-');
    body.innerHTML = '';
    body.appendChild(notice('Cartel, entradas y horarios orientativos (revisados en septiembre de 2026) — los programas y precios cambian a menudo, confirma fecha y entradas más cerca del viaje. Distancias en línea recta desde el alojamiento, no ruta real.'));
    BALI_SHOWS_SEED.forEach((zona, idx) => {
      const aloj = state.alojamientos.find(a => a.zona === zona.zona);
      body.appendChild(escenarioCard(zona, idx, aloj));
    });
    refreshMaps();
  }

  /* ==========================================================
     Meteo — nubes y lluvia (Open-Meteo)
     ========================================================== */
  function meteoLocs() {
    const seen = new Set(), out = [];
    eachDay(state.meta.fechaInicio, state.meta.fechaFin).forEach(d => {
      const l = locForDate(d);
      if (isFallbackCenter(l)) return;   // día sin alojamiento: no pedir meteo del centro por defecto
      const key = l.lat.toFixed(2) + ',' + l.lng.toFixed(2);
      if (!seen.has(key)) { seen.add(key); out.push({ key, lat: l.lat, lng: l.lng }); }
    });
    return out;
  }

  // Nubes, lluvia y probabilidad de lluvia de Open-Meteo (~16 días) por
  // ubicación de pernocta. Cacheado en state.meteo; refresco máx. cada 2 h.
  // Fallo silencioso (solo red/HTTP/parseo; si el re-render peta, que se vea
  // en consola).
  let meteoFetching = false;
  function refreshMeteo() {
    if (meteoFetching) return;                        // ya hay una petición en curso (init + showScreen)
    if (!navigator.onLine) return;
    if (!state.meta.fechaInicio || !state.meta.fechaFin) return;
    const f = state.meteo && state.meteo.fetched;
    if (f && Date.now() - Date.parse(f) < 2 * 3600e3) return;

    const locs = meteoLocs();
    if (!locs.length) return;
    const om = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + locs.map(l => l.lat).join(',')
      + '&longitude=' + locs.map(l => l.lng).join(',')
      + '&hourly=cloud_cover,precipitation,precipitation_probability&forecast_days=16&timezone=UTC';

    meteoFetching = true;
    fetch(om).then(r => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null)
      .then(omRaw => {
        meteoFetching = false;
        if (!omRaw) return;
        // Recorta las series a la ventana del viaje (± margen): evita guardar
        // 16 días de datos horarios por ubicación y re-parsearlos en cada render.
        const t0 = Date.parse(state.meta.fechaInicio + 'T00:00:00Z') - 12 * 3600e3;
        const t1 = Date.parse(state.meta.fechaFin + 'T00:00:00Z') + 36 * 3600e3;
        const inTrip = iso => { const ms = Date.parse(iso); return ms >= t0 && ms <= t1; };

        const results = Array.isArray(omRaw) ? omRaw : [omRaw];
        // Parten de lo cacheado: si Open-Meteo no devuelve una ubicación, no se pierde su serie previa.
        const clouds = Object.assign({}, (state.meteo && state.meteo.clouds) || {});
        const precip = Object.assign({}, (state.meteo && state.meteo.precip) || {});
        results.forEach((res, i) => {
          if (!locs[i] || !res || !res.hourly || !Array.isArray(res.hourly.time)) return;
          const H = res.hourly;
          if (Array.isArray(H.cloud_cover)) {
            clouds[locs[i].key] = H.time
              .map((t, j) => ({ t: t + 'Z', pct: H.cloud_cover[j] }))
              .filter(x => typeof x.pct === 'number' && inTrip(x.t));
          }
          if (Array.isArray(H.precipitation)) {
            precip[locs[i].key] = H.time
              .map((t, j) => ({
                t: t + 'Z',
                mm: H.precipitation[j],
                prob: Array.isArray(H.precipitation_probability) ? H.precipitation_probability[j] : undefined
              }))
              .filter(x => typeof x.mm === 'number' && inTrip(x.t));
          }
        });
        // Poda las claves de ubicaciones que ya no están en el viaje (alojamiento
        // cambiado/borrado): evita crecer sin límite y que una clave vieja gane
        // el match de "más cercana".
        const cur = new Set(locs.map(l => l.key));
        [clouds, precip].forEach(m => Object.keys(m).forEach(k => { if (!cur.has(k)) delete m[k]; }));

        state.meteo = { clouds, precip, fetched: new Date().toISOString() };
        save();
        const hayDatos = Object.keys(clouds).some(k => clouds[k].length) || Object.keys(precip).some(k => precip[k].length);
        if (hayDatos) {
          const ae = document.activeElement;
          const itin = $('#itin-body');
          if (!(ae && itin && itin.contains(ae))) renderItinerario();
        }
      });
  }

  function initGazList() {
    const dl = $('#gaz-list');
    if (!dl) return;
    GAZ.forEach(g => { const o = el('option'); o.value = g.n; dl.appendChild(o); });
  }

  try {
    initGazList();
    renderAll();
    showScreen(location.hash.slice(1) || 'datos');
    refreshFx();
    refreshMeteo();
  } catch (err) {
    console.error('Error al iniciar:', err);
    const b = document.getElementById('datos-body');
    if (b) b.innerHTML = '<div class="notice">Ha ocurrido un error al cargar. Cierra la app del todo y vuelve a abrirla; si persiste, borra los datos del sitio en el navegador.</div>';
  }

})();

/* ==========================================================
   Service worker: registro y actualización automática
   ========================================================== */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var LOOP_KEY = 'sw-reload-at';
  var reloaded = false;
  var retryTimer = null;
  // Solo recargamos en el controllerchange que provoca una actualización que
  // hemos iniciado nosotros. El controllerchange de la primera instalación
  // (por el clients.claim() del SW) no debe recargar nada.
  var updating = false;

  function readMark() {
    try { return +sessionStorage.getItem(LOOP_KEY) || 0; } catch (e) { return 0; }
  }
  function writeMark() {
    try { sessionStorage.setItem(LOOP_KEY, String(Date.now())); } catch (e) {}
  }

  // Solo es seguro recargar si no hay ningún panel modal abierto.
  function safeToReload() {
    var sheet = document.getElementById('sheet');
    var conf = document.getElementById('confirm');
    return (!sheet || sheet.hidden) && (!conf || conf.hidden);
  }

  // Pide al worker en espera que tome el control; si hay un modal abierto,
  // reintenta en 2 s (una sola cadena de reintento).
  function applyUpdate(reg) {
    if (!reg.waiting) return;
    if (!safeToReload()) {
      if (retryTimer) return;
      retryTimer = setTimeout(function () {
        retryTimer = null;
        applyUpdate(reg);
      }, 2000);
      return;
    }
    updating = true;
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Sigue a un worker entrante: si llega a 'installed' con un controller activo
  // es una actualización (no la primera instalación) y se aplica.
  function track(reg, sw) {
    if (!sw) return;
    sw.addEventListener('statechange', function () {
      if (sw.state === 'installed' && navigator.serviceWorker.controller) {
        applyUpdate(reg);
      }
    });
  }

  // El worker nuevo ha tomado el control: recargar una vez, salvo bucle.
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!updating || reloaded) return;
    if (Date.now() - readMark() < 10000) {
      console.warn('[sw] recarga omitida: posible bucle de actualización.');
      writeMark();   // reinicia la ventana para no encadenar recargas
      return;
    }
    reloaded = true;
    writeMark();
    location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.update().catch(function () {});

      // Versión nueva ya esperando de una carga anterior.
      if (reg.waiting && navigator.serviceWorker.controller) applyUpdate(reg);
      // Worker que ya estaba instalándose en el momento de registrar.
      track(reg, reg.installing);
      // Versión nueva que aparece mientras la app está abierta.
      reg.addEventListener('updatefound', function () {
        track(reg, reg.installing);
      });

      // Al volver a primer plano tras un rato, buscar versión nueva.
      var lastCheck = Date.now();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible') return;
        if (Date.now() - lastCheck < 15 * 60 * 1000) return;
        lastCheck = Date.now();
        reg.update().catch(function () {});
      });
    }).catch(function (e) {
      console.warn('[sw] registro fallido:', e);
    });
  });
})();
