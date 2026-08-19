# 🗄️ Conexión a Base de Datos MySQL - BookTrack

## ✅ Estado Actual

- **Base de datos:** `booktrack_db` ✓ CREADA
- **Servidor:** `localhost` (127.0.0.1)
- **Puerto:** `3306`
- **Usuario:** `root`
- **Contraseña:** `admin1234`
- **Tablas:** 15 tablas creadas ✓

---

## 📊 Tablas en la BD

```
auth_group
auth_group_permissions
auth_permission
books                    ← Libros
categories               ← Categorías
comments                 ← Comentarios
django_admin_log
django_content_type
django_migrations
django_session
loans                    ← Préstamos
users                    ← Usuarios (modelo personalizado)
users_groups
users_user_permissions
```

---

## 🔌 Conectar desde MySQL Workbench

### 1. Crear Nueva Conexión
1. Click en **`+`** (Database → New Connection)
2. Rellenar:
   - **Connection Name:** `BookTrack Local`
   - **Hostname:** `localhost` o `127.0.0.1`
   - **Port:** `3306`
   - **Username:** `root`
   - **Password:** `admin1234`
3. Click en **"Test Connection"** → debe decir "Connection successful"
4. Click en **"OK"**

### 2. Conectarse
- Doble-click en la conexión
- En la sección izquierda, expandir y encontrar `booktrack_db`
- Click derecho → **"Set as Default Schema"**

### 3. Verificar Tablas
```sql
USE booktrack_db;
SHOW TABLES;
SHOW TABLE STATUS;
```

---

## 💻 Conectar desde Línea de Comandos

### Ver todas las tablas
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p"admin1234" -e "USE booktrack_db; SHOW TABLES;"
```

### Ver estructura de una tabla
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p"admin1234" -e "USE booktrack_db; DESCRIBE users;"
```

### Contar registros
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p"admin1234" -e "USE booktrack_db; SELECT COUNT(*) FROM users;"
```

---

## 🐍 Conectar desde Django (verificar)

```bash
cd C:\Users\User\Desktop\backend-booktrack
python manage.py dbshell
```

Esto abre una sesión MySQL interactiva. Prueba:
```sql
SELECT * FROM users LIMIT 5;
SHOW TABLES;
EXIT
```

---

## ⚙️ Configuración en `.env`

```env
DB_NAME=booktrack_db
DB_USER=root
DB_PASSWORD=admin1234
DB_HOST=localhost
DB_PORT=3306
```

---

## 🚀 Próximos Pasos

### 1. Crear Admin (superusuario)
```bash
cd C:\Users\User\Desktop\backend-booktrack
python manage.py createsuperuser
```

O crear automáticamente:
```bash
python create_admin.py
```

### 2. Iniciar Servidor
```bash
python manage.py runserver
```

### 3. Acceder al Admin
- URL: `http://localhost:8000/admin/`
- Usuario: `admin`
- Contraseña: `(la que configuraste)`

---

## 🔧 Troubleshooting

### "No aparece en MySQL Workbench"
✓ Solución: Debes **hacer refresh** en Workbench
- Click derecho en el nombre de la conexión → **"Refresh All"**
- O cierra y reabre Workbench

### "Access denied for user 'root'"
✓ Verifica la contraseña: debe ser `admin1234`
✓ Intenta conectar primero desde CLI para probar

### "Can't connect to MySQL server"
✓ Verifica que MySQL esté corriendo:
```bash
tasklist | findstr mysql
```

Si no está, inicia el servicio:
```bash
net start MySQL80
```

---

## 📋 Checklist

- [x] BD `booktrack_db` creada
- [x] 15 tablas creadas
- [x] Conexión MySQL configurada
- [ ] Superusuario creado
- [ ] Servidor Django iniciado
- [ ] Admin panel accesible

---

**Última actualización:** 2026-07-08
