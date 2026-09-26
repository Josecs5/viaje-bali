# Viaje a Bali — Planificador

PWA con modo offline para planificar el viaje a Bali (28 sep – 6 oct 2026):
vuelos con escalas, alojamientos, excursiones, sitios para comer y lugares
que ver — **todo editable desde el móvil**. Genera un **itinerario diario**
automático que ordena cada elemento por hora y marca la **viabilidad de cada
día** (luz disponible y tiempo de trayecto entre paradas) con la hora
recomendada de salida, y genera sola el enlace de la **ruta completa en
Google Maps** a partir de las paradas con ubicación que vayas añadiendo.
Incluye un **registro de gastos** en IDR (Rupia indonesia) y € con el tipo
de cambio del día (BCE vía frankfurter.dev, cacheado, con ajuste manual) y
un resumen por categoría. La pestaña **Transporte y guías** reúne cómo
moverte (Grab/Gojek, conductor privado, scooter, fast boat a Gili Air),
comida callejera, etiqueta en los templos balineses, un calendario de
**temporada por región** de la isla, un plan B para días de lluvia fuerte,
trucos de dinero en IDR y tus propias notas. El Itinerario avisa de
**lluvia fuerte** por día (Open-Meteo) y de la **viabilidad de cada día**
con salida/puesta de sol (cálculo local con SunCalc, hora de Bali/WITA,
UTC+8), con la acción concreta. La pestaña **Dónde comer** reúne sitios
bien valorados cerca de cada alojamiento (Bali no está cubierta por la Guía
Michelin), con la distancia en línea recta desde el alojamiento, el precio
orientativo, un mapa por zona (Leaflet) y enlace directo a Google Maps y
Apple Maps. La pestaña **Espectáculos** reúne la danza tradicional de Ubud
Palace y el Kecak de Uluwatu Temple, cerca de cada alojamiento, con qué
noche de la estancia encaja. Datos incluye una checklist de **tareas antes
de viajar** (e-VOA, Bali Tourist Levy, All Indonesia Arrival Card, validez
del pasaporte, facturar los vuelos con su fecha límite calculada en cuanto
los añadas...) y una **lista de equipaje** curada para el clima tropical y
los templos, con checklist, ítems propios y borrado. Cada día del
Itinerario tiene un campo de **diario de viaje** para anotar cómo fue esa
jornada.

Todo se guarda en `localStorage` del navegador: los datos no salen del dispositivo.

## Uso

Abre `index.html` servido por HTTP(S) (no vale `file://`):

```bash
python -m http.server 8000
# luego abre http://localhost:8000
```

Para instalarla como app en el móvil: ábrela en el navegador → menú de
compartir → **Añadir a pantalla de inicio**. Se abre en modo standalone.

La app arranca con los vuelos, alojamientos y el itinerario día a día ya
cargados a partir de los datos reales del viaje (28 sep - 6 oct 2026); todo
sigue siendo editable desde la pestaña Datos, y el resto (itinerario, dónde
comer, espectáculos) se recalcula solo.

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura y meta tags PWA/iOS |
| `style.css` | Tema "atardecer en Bali" (marfil, laguna, coral hibisco, caléndula, arrozal y turquesa), con modo claro y oscuro; responsive y autónomo |
| `app.js` | Lógica: CRUD, motor de itinerario, dónde comer, espectáculos, transporte y guías |
| `sw.js` | Service worker: precache del shell |
| `vendor/` | Leaflet 1.9.4, SunCalc 1.9.0 y fuentes web (Instrument Serif y Plus Jakarta Sans) servidos desde el repo |
| `manifest.json` | Manifiesto PWA |
| `icons/` | Iconos 192 / 512 / maskable + apple-touch-icon + SVG |

Solo HTML, CSS y JavaScript. Sin frameworks. Service worker para uso sin
conexión; Leaflet, SunCalc y las fuentes van incluidos en el repo.

El shell (HTML/CSS/JS, Leaflet, SunCalc, fuentes) se guarda en la primera
visita con conexión, así que la app arranca sin cobertura. Los mapas de
"Dónde comer" y "Espectáculos" necesitan conexión para cargar los tiles la
primera vez que se ven (no se precachean, a diferencia del shell).

La app se actualiza sola: al detectar una versión nueva se recarga cuando no
hay ningún formulario abierto. Si la tienes abierta en varias pestañas, se
recarga la activa; las demás se actualizan al navegar. Si algo se queda raro,
cierra la app del todo y vuelve a abrirla, o borra los datos del sitio en el
navegador (se borran caché y datos).

## Aviso

App personal sin ánimo de lucro. No está afiliada a ninguna aerolínea,
alojamiento ni operador turístico. Los tiempos de trayecto son estimaciones
aproximadas (línea recta + un factor de rodeo genérico), no rutas calculadas
ni tarifas reales de transporte. Bali (e Indonesia) no está cubierta por la
Guía Michelin: los sitios de "Dónde comer" son recomendaciones locales, no
estrellas.
