# BookTrack

## Descripción

BookTrack es una aplicación web construida con **Angular** que permite a los usuarios gestionar y seguir sus lecturas de libros. Ofrece funcionalidades para crear listas de libros, marcar progreso, añadir reseñas y buscar títulos en una base de datos externa.

## Arquitectura

- **Frontend**: Angular 21.2.11 con TypeScript, utiliza Angular Router para la navegación y Angular Material para la UI.
- **Estado**: Servicio `BookService` basado en RxJS que gestiona la lista de libros y el progreso del usuario.
- **Persistencia**: Los datos se almacenan en `localStorage` (para desarrollo) y pueden ser sincronizados con una API REST externa (opcional).
- **Testing**: Vitest para pruebas unitarias y Cypress (opcional) para pruebas de extremo a extremo.

## Requisitos previos

- Node.js (v20 o superior)
- npm (v10 o superior) o yarn
- Angular CLI (`npm install -g @angular/cli`)

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd BookTrack

# Instalar dependencias
npm install
```

## Servidor de desarrollo

```bash
ng serve
```

El proyecto estará disponible en `http://localhost:4202/`. Los cambios en los archivos fuente recargan automáticamente la aplicación.

## Generación de código

Angular CLI permite generar componentes, servicios, módulos y más:

```bash
# Crear un nuevo componente
ng generate component nombre-componente

# Crear un nuevo servicio
ng generate service nombre-servicio
```

Para ver todas las opciones de generación:

```bash
ng generate --help
```

## Compilación para producción

```bash
ng build --configuration production
```

Los artefactos compilados se guardan en el directorio `dist/` y están optimizados para rendimiento.

## Pruebas unitarias

```bash
ng test
```

Se ejecutan con Vitest y aparecen los resultados en la consola.

## Pruebas de extremo a extremo (E2E)

```bash
ng e2e
```

> Nota: Angular CLI no incluye un framework E2E por defecto; se recomienda Cypress o Playwright según las preferencias del equipo.

## Despliegue

1. Compila la aplicación con el comando de producción.
2. Sube el contenido de `dist/` a un servidor estático (Netlify, Vercel, GitHub Pages, etc.) o intégralo en un backend existente.

## Contribución

1. Forkea el repositorio.
2. Crea una rama para tu característica o corrección:
   ```bash
   git checkout -b feature/mi-nueva-funcionalidad
   ```
3. Realiza los cambios y ejecuta pruebas.
4. Haz commit siguiendo el estilo convencional y abre un Pull Request.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

## Recursos adicionales

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Material Design Components](https://material.angular.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Cypress Documentation](https://docs.cypress.io/)


