# WORKLOG

### 2026-07-30

| Hora | Cambio |
|------|--------|
| 14:32 | feat(dashboard): MVP modular del panel de conducción en vivo |
| 14:32 | feat(state): estados centralizados, avance seguro, autosave y deshacer |
| 14:32 | feat(ui): cola editable, búsqueda, reproductor, soundboard y responsive |
| 14:32 | docs: instrucciones, arquitectura y alcance pendiente |
| 14:32 | test: `npm run build` y `npm run lint` OK |
| 15:09 | deploy: configuración de OpenAI Sites agregada |
| 15:12 | fix(deploy): permitir instalación limpia del builder sin lockfile incompatible |
| 15:15 | build(hosting): migración de entrada Vite SPA a vinext App Router |
| 15:18 | deploy: artefacto vinext validado para publicación en Sites |
| 15:24 | ci(pages): build estático y workflow de publicación en GitHub Pages |
| 15:27 | fix(ci): compatibilidad npm 11 y habilitación automática de Pages |
| 15:35 | feat(audio): efectos CC0/dominio público, reproducción local y atajos F1/F2/F4 |
| 15:43 | feat(locutor): locuciones offline WAV para presentación, próxima y felicitaciones |
| 16:05 | feat(admin): reinicio, botones funcionales, administración de evento, etapa, club organizador, participantes, clubes y audios |
| 16:05 | feat(queue): mover, marcar ausente y reactivar desde listado |
| 16:05 | test: builds Sites/Pages y lint OK |
| 16:12 | style(queue): ausentes tachadas, atenuadas y diferenciadas en rojo |
| 16:25 | feat(search): sugerencias instantáneas por nombre, club y número |
| 16:25 | feat(stage): cierre de primera etapa, inicio de segunda y resultado por patinadora |
| 16:34 | feat(soundboard): personalización real con carga, nombre, reproducción y eliminación |
| 16:47 | feat(stage): configuración de 1/2/3 etapas, cierre por pasada e historial completo |
| 16:55 | feat(export): descarga CSV con orden por etapa, patinadora, club y coreografía |
| 2026-07-31 | feat: etapas separadas, clima/ubicación, mover por etapa, QR y vista pública |
| 2026-07-31 | feat(realtime): sincronización SSE temporal entre operador y espectadores |
| 2026-07-31 | brand: firma Desarrollado por PLVM Soft en panel y vista pública |
| 2026-07-31 | fix(flow): bloqueo pre-etapa, controles por etapa y polling QR automático |
| 2026-07-31 | fix(public): club organizador destacado y cuenta regresiva HH:MM:SS en ambas pantallas |
| 2026-07-31 | feat(receso): intervalo configurable entre etapas con cuenta regresiva pública y del operador |
| 2026-07-31 | feat(seños): relación clubes-patinadoras-seños y presentación en operador/QR |
| 2026-07-31 | feat(clubes): escudos opcionales, iniciales de respaldo y sección Clubes invitados al pie |
| 2026-07-31 | fix(clubes): organizador separado de invitados con escudo y tarjeta destacada |
| 2026-07-31 | brand: firma PLVM Soft incorporada a la marca del encabezado |
| 2026-07-31 | feat(public): fichas navegables de clubes y menú de bufet administrable |
| 2026-07-31 | fix(public): números de participante ocultos en las fichas QR de clubes |
| 2026-07-31 | feat(reset): borrado total, bufet visible y escudo del club en participante activa |
| 2026-07-31 | fix(realtime): QR tolerante a estados anteriores y lectura exclusiva del último mensaje |
| 2026-07-31 | fix(bufet): sincronización pública separada para evitar límites de tamaño |
| 2026-07-31 | chore(public): actualización automática del QR cada 5 segundos |
| 2026-07-31 | fix(realtime): migración de instancia por cuota agotada y publicación solo ante cambios |
| 2026-07-31 | style(operator): escudo junto al nombre y bloque EN PISTA centrado en QR |
| 2026-07-31 | style(operator): controles de etapas y receso en disposición horizontal compacta |
| 2026-07-31 | style(operator): barra de estadísticas ubicada inmediatamente sobre el panel activo |
| 2026-07-31 | style(public): botón del bufet ampliado y destacado |
| 2026-07-31 | style(public): métricas Ya pasaron y Restantes centradas |
| 2026-07-31 | fix(public): contraste y legibilidad de la seño en ficha de club |
| 2026-07-31 | feat(storage): persistencia multi-equipo y tiempo real preparada con Supabase |
| 2026-07-31 | fix(storage): QR solo lectura, estado visible de Supabase y botón de escudo legible |
| 2026-07-31 | fix(storage): escritura directa a Supabase en cada acción del operador |
| 2026-07-31 | ux(bufet): foco automático en Producto después de cada alta |
| 2026-07-31 | fix(bufet): borrado persistente y precio positivo obligatorio |
| 2026-07-31 | fix(storage): cola serial de escrituras y polling exclusivo de la vista QR |
| 2026-07-31 | fix(media): compresión WebP de escudos para evitar estados Supabase de varios MB |
| 2026-07-31 | feat(public): marco/fondo personalizable y optimizado para la web del QR |
| 2026-07-31 | feat(eventos): copias completas guardadas y restaurables desde Supabase |
| 2026-07-31 | feat(sorteo): precio, premios, ganadores y consulta desde la web QR |
| 2026-07-31 | fix(public): escudo organizador en pista, tarjeta móvil ordenada y reanudación al desbloquear |
| 2026-07-31 | fix(admin): contraste y visibilidad del botón para cargar/cambiar marco QR |
| 2026-07-31 | ux(admin): solapas visibles de Sorteo y Copias con restauración desde Supabase |
| 2026-07-31 | feat(admin): eliminación de patinadoras y promociones múltiples para sorteo |
| 2026-07-31 | feat(sorteo): número de orden configurable para cada premio |
| 2026-07-31 | feat(public): visibilidad configurable de los botones Bufet y Sorteo |
| 2026-07-31 | fix(sorteo): orden de premio editable y número ganador destacado en QR |
| 2026-07-31 | feat(backups): eliminación individual confirmada de copias en Supabase |
| 2026-07-31 | feat(public): marco QR opcional e independiente en Bufet y Sorteo |
| 2026-07-31 | feat(offline): modo local opcional con caché, continuidad y resincronización automática |

### 2026-07-31

| Hora | Cambio |
|------|--------|
| 19:54 | backup: snapshot previo a mejoras guardado en `backups/evento-patin-pre-mejoras-20260731.zip` |
| 20:05 | feat(auth): acceso de operadores con Supabase Auth y aislamiento de estado por usuario |
| 20:05 | security(rls): políticas anónimas eliminadas, propiedad por `owner_id` y función de escritura protegida |
| 20:05 | feat(sync): revisiones optimistas, detección de conflictos y elección entre copia local o remota |
| 20:05 | feat(audio): canciones persistentes en IndexedDB, preflight, validación y duración automática |
| 20:05 | feat(player): parada de emergencia con fade y manejo de errores de reproducción |
| 20:05 | feat(operator): estimación dinámica de finalización y bloqueo de suspensión de pantalla |
| 20:05 | feat(import): alta masiva de patinadoras por CSV con validación de columnas y valores |
| 20:05 | feat(backups): exportación/importación JSON y auditoría de actividad reciente |
| 20:05 | refactor(config): variables de entorno para Supabase y relay público documentadas |
| 20:05 | test(domain): pruebas automáticas para estimación horaria y preflight de audios |
| 20:05 | chore(deps): lockfile reparado, Node LTS portable y auditoría npm con 0 vulnerabilidades |
| 20:24 | fix(lan): servidor dev expuesto en `0.0.0.0` para acceso desde celular por Wi-Fi |
| 20:32 | fix(compat): generador UUID compatible con navegadores sin contexto HTTPS seguro |
| 20:46 | auth(operator): usuario operador creado y confirmación de correo solicitada sin registrar credenciales |
| 21:05 | db(migrations): proyecto Supabase vinculado y migraciones normalizadas con timestamps únicos |
| 21:05 | db(deploy): tabla base, RLS y escritura conflict-aware aplicadas; remoto verificado al día |
| 21:10 | git: PR #1 fusionado con seguridad, offline, audios, imports, backups y tests |
| 21:10 | deploy(pages): publicación principal completada y URL productiva verificada con HTTP 200 |
| 21:35 | fix(ui): estadísticas, botones superiores y controles responsive alineados |
| 21:35 | feat(clubes): eliminación segura de clubes sin personas vinculadas |
| 21:40 | git: PR #2 fusionado y despliegue GitHub Pages verificado |
| 21:50 | fix(time): horario estimado en formato 24 horas, sin salto de línea y bloque compacto |
| 21:52 | git: PR #3 fusionado y despliegue GitHub Pages verificado |
| 21:58 | docs(agents): reglas persistentes para leer `Proyecto.md` y `WORKLOG.md` al iniciar |
| 21:59 | git: PR #4 fusionado con reglas persistentes de agentes; deploy verificado |
| 22:00 | test: `npm run lint`, `npm test`, `npm run build` y `git diff --check` OK en cambios funcionales |
| 22:14 | feat(admin): botÃ³n funcional `Guardar cambios` visible en todas las solapas, con confirmaciÃ³n de nube, modo offline y error |
| 22:14 | feat(sync): guardado manual crea una revisiÃ³n y entrada de auditorÃ­a sin desactivar el guardado automÃ¡tico |
| 22:14 | test: `npm run lint`, `npm test` y `npm run build` OK para el guardado manual |
