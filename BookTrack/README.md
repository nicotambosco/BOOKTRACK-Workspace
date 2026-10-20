# Frontend BookTrack

Angular 21. Ver el [README del workspace](../README.md) para montar frontend, API y base de datos.

```bash
npm ci
npm start
npm test
npm run build
```

Desarrollo: http://localhost:4200. Producción: archivos de `dist/BookTrack/browser`, servidos por el Nginx del Dockerfile con proxy `/api/` hacia Django. Ver [arquitectura](../docs/ARQUITECTURA.md), [funcionalidades](../docs/FUNCIONALIDADES.md) y [pruebas](../docs/TESTING.md).
