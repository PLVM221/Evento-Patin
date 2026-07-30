# Pista

Panel local para conducción de festivales de patín artístico.

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
- diseño responsive.

La integración Tauri, SQLite y audio nativo todavía no está implementada. El reproductor actual modela el flujo operativo, pero requiere conectar archivos reales.

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
```

## Arquitectura

```text
src/
  components/  UI operativa reutilizable
  data/        datos iniciales temporales
  hooks/       estado, autosave, historial y reglas
  models.ts    tipos del dominio
```

Próxima fase: capa Tauri + migraciones SQLite + repositorios locales, reemplazando `data/demo.ts` y `localStorage`.
