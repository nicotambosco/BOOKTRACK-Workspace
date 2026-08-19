# 🚀 Cómo Encender el Backend BookTrack

## ⚡ ESTADO: LISTO PARA USAR

✅ Base de datos MySQL creada  
✅ 15 tablas creadas  
✅ Dependencias instaladas  
✅ Migraciones aplicadas  

**Credenciales MySQL:**
```
Usuario: root
Contraseña: admin1234
BD: booktrack_db
Host: localhost:3306
```

## Requisitos
- Python 3.10+
- MySQL ejecutándose en `localhost:3306`
- pip (gestor de paquetes de Python)

## ⚡ Iniciar Ahora (2 comandos)

```bash
# 1. Crear admin (superusuario)
python manage.py createsuperuser

# 2. Iniciar servidor
python manage.py runserver
```

✅ Servidor disponible en: **http://localhost:8000**  
✅ Panel Admin: **http://localhost:8000/admin/**

---

## Setup Paso a Paso

### 1. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 2. Configurar Base de Datos

**Opción A: Script automático (recomendado)**
```bash
# Windows
.\setup_db.ps1

# Linux/Mac
chmod +x setup_db.sh && ./setup_db.sh
```

**Opción B: Manual**
```bash
mysql -u root < setup_db.sql
```

### 3. Configurar `.env`
```bash
cp .env.example .env
```

Editar `.env`:
```
SECRET_KEY=tu-secret-key-generada
DEBUG=True
DB_PASSWORD=tu-password-mysql  (si lo tienes)
```

### 4. Ejecutar migraciones
```bash
python manage.py migrate
```

### 5. Crear superusuario (admin)
```bash
python manage.py createsuperuser
```

Ingresa:
- Usuario: `admin` // 12473
- Email: `tu@email.com` // tambosconicolas123@gmail.com
- Contraseña: `(la que desees)` // Campana1


### 6. Iniciar servidor
```bash
python manage.py runserver
```

El backend estará disponible en `http://localhost:8000`

Admin: `http://localhost:8000/admin/`

---

## Comandos rápidos

| Comando | Qué hace |
|---------|----------|
| `python manage.py runserver` | Inicia el servidor de desarrollo |
| `python manage.py migrate` | Aplica migraciones a BD |
| `python manage.py makemigrations` | Crea migraciones nuevas |
| `python manage.py createsuperuser` | Crea admin |
| `python manage.py shell` | Abre shell interactivo Django |

---

## Troubleshooting

**Error: `No module named 'django'`**
→ Ejecutar: `pip install -r requirements.txt`

**Error: `Can't connect to MySQL`**
→ Verificar que MySQL está corriendo: `mysql -u root -p`

**Error: `ALLOWED_HOSTS`**
→ Agregar el host a `.env` en `ALLOWED_HOSTS`

---

## API

Base: `http://localhost:8000/api/`

Apps disponibles:
- `/books/` - Libros
- `/users/` - Usuarios
- `/loans/` - Préstamos
- `/categories/` - Categorías
- `/comments/` - Comentarios
