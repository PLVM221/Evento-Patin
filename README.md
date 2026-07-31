# Pista

Panel seguro, online/offline, para conducción de festivales de patín artístico.

## Estado

MVP web ejecutable con:

- panel de participante actual, próxima y espera;
- inicio seguro del festival;
- reproductor y control de volumen;
- finalización confirmada y avance sin autoplay;
- búsqueda y reordenamiento protegido;
- estados ausente y pospuesta;
- soundboard visual;
- historial con deshacer;
- guardado automático local;
- acceso autenticado y datos aislados por operador;
- sincronización con detección y resolución de conflictos;
- canciones persistentes en IndexedDB y control previo de audios;
- estimación dinámica del horario de finalización;
- bloqueo de suspensión de pantalla durante la competencia;
- importación CSV, backups JSON y auditoría operativa;
- diseño responsive.

Los audios se conservan solamente en el navegador donde se seleccionaron. Para operar desde otro equipo hay que volver a asociarlos y completar el control previo.

## Desarrollo

```bash
npm install
npm run dev
```

Abrir la URL indicada por Vite, normalmente `http://localhost:5173`.

## Verificación

```bash
npm run build
npm run lint
npm test
```

## Arquitectura

```text
src/
  components/  UI operativa reutilizable
  data/        datos iniciales temporales
  hooks/       estado, autosave, historial y reglas
  models.ts    tipos del dominio
```

## Configuración segura

1. Copiar `.env.example` como `.env.local` y completar las variables de Supabase.
2. Aplicar, en orden, las migraciones de `supabase/migrations`.
3. Crear las cuentas de los operadores desde Supabase Authentication.
4. No publicar el panel antes de aplicar `20260731_secure_event_ownership.sql`: esa migración elimina el acceso anónimo a los datos privados.

La clave publicable de Supabase puede estar en el frontend; la protección real está en Authentication y las políticas RLS. No usar nunca una `service_role` en variables `VITE_*`.

## Importación de participantes

Desde `Administrar → Patinadoras → Importar CSV`. El archivo usa `;` y esta cabecera:

```text
numero;nombre;apellido;club;categoria;etapa;cancion;duracion_segundos;tanda
```

## Recuperación

- Las copias de Supabase están aisladas por cuenta.
- Las copias JSON permiten trasladar el evento manualmente.
- `backups/evento-patin-pre-mejoras-20260731.zip` contiene el estado anterior a esta actualización y está ignorado por Git.
- Ante un conflicto entre equipos, el pie del panel permite conservar la versión local o recuperar la de la nube.
