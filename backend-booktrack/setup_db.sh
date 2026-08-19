#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Setup Base de Datos BookTrack - Linux/Mac
# ─────────────────────────────────────────────────────────────────
# Uso: chmod +x setup_db.sh && ./setup_db.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       Iniciando setup de Base de Datos BookTrack          ║"
echo "╚════════════════════════════════════════════════════════════╝"

DB_USER="${DB_USER:-root}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/setup_db.sql"

# Verificar que MySQL esté instalado
echo ""
echo "[1/3] Verificando MySQL..."
if ! command -v mysql &> /dev/null; then
    echo "✗ Error: MySQL no está instalado"
    exit 1
fi
echo "✓ MySQL encontrado: $(mysql --version)"

# Crear base de datos
echo ""
echo "[2/3] Creando base de datos..."
if mysql -u "$DB_USER" -p < "$SCRIPT_PATH" 2>/dev/null; then
    echo "✓ Base de datos creada"
else
    echo "✗ Error al crear la BD"
    echo "  Verifica tu usuario y contraseña de MySQL"
    exit 1
fi

# Completar
echo ""
echo "[3/3] Completando setup..."
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✓ Setup completado exitosamente              ║"
echo "╚════════════════════════════════════════════════════════════╝"

echo ""
echo "Proximos pasos:"
echo "  1. Crea un archivo .env (copia .env.example)"
echo "  2. Ejecuta las migraciones: python manage.py migrate"
echo "  3. Inicia el servidor: python manage.py runserver"
echo ""
