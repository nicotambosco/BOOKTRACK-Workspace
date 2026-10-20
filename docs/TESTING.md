# Pruebas y CI

## Backend

Con el entorno virtual activo, desde `backend-booktrack`:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

Se usa la conexión configurada. Django crea una base de prueba independiente; en MySQL la cuenta necesita permiso para crear/eliminar esa base de prueba. Con SQLite se utiliza la configuración local del README.

`loans/tests.py` cubre reserva activa sin descuento de stock, espera sin disponibilidad, libros inactivos, validación de fechas, duplicados, permisos, prioridad/FIFO, retiro idempotente, devolución efectiva, devolución de vencidos, renovación, filtros, exportaciones y cierre de accesos CRUD que permitirían saltarse el ciclo.

`loans/test_migrations.py` crea una base SQLite temporal, aplica el esquema anterior, inserta solicitudes y préstamos antiguos, ejecuta la actualización y verifica la conservación de datos, fechas, identificadores y stock. También comprueba que un rollback no cambie parcialmente el esquema. No usa la base del operador.

`ConcurrentPickupTests` usa dos conexiones simultáneas sobre una misma reserva. Requiere MySQL y se omite explícitamente en SQLite: una prueba de contratos con SQLite no demuestra los bloqueos de filas de MySQL.

## Frontend

Desde `BookTrack`:

```bash
npm ci
npm test
npm run build
```

El script de pruebas ejecuta los contratos de autenticación, acciones de préstamos y reservas. Los specs generados originalmente por Angular que aún son esqueletos no forman parte de esa selección. Compilar verifica también los tipos y las plantillas de las pantallas.

La compilación de producción selecciona `environment.prod.ts`, con API relativa `/api`; `npm start` usa `environment.ts` y Django en 8000.

## Recorrido manual

1. Iniciar sesión como usuario y reservar un libro activo con fechas vigentes. Confirmar que aparece activa y el stock no cambia.
2. Cancelar una reserva activa; comprobar que el stock sigue igual.
3. Crear dos reservas del mismo libro con usuarios distintos y una sola copia disponible.
4. Como bibliotecario, cambiar la prioridad y verificar que se entrega primero según la cola.
5. Registrar retiro: la reserva debe finalizar y aparecer un solo préstamo vigente. Repetir la llamada no descuenta otra copia.
6. Como usuario, pedir renovación. Como bibliotecario, aprobarla y verificar siete días más, sin tocar la fecha de inicio.
7. Registrar devolución: guardar la fecha efectiva, conservar vencimiento y reponer una copia una sola vez.
8. Consultar archivo y exportaciones: estados y ambas fechas deben coincidir.
9. Inactivar el libro: no debe admitir nuevas reservas ni retiros, pero sí devoluciones de préstamos abiertos.
10. Con una base de prueba, comprobar los vencimientos al día siguiente del límite y ejecutar `actualizar_estados`.

## GitHub Actions

`.github/workflows/ci-cd.yml` se ejecuta en pull requests y pushes a `master`:

- Backend con Python 3.12 y MySQL 8.4: control de migraciones y pruebas, incluyendo concurrencia.
- Frontend con Node.js 24: `npm ci`, pruebas y compilación.
- Construcción de contenedores; en un push a `master` publica imágenes en GHCR con etiquetas `latest` y el SHA.

La validación de Docker Compose puede hacerse sin iniciar contenedores con `docker compose --env-file .env.example config --quiet`. Construir/ejecutar contenedores y validar los bloqueos MySQL requiere acceso al servicio Docker o una instancia MySQL disponible.
