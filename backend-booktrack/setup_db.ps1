# ─────────────────────────────────────────────────────────────────
# Setup Base de Datos BookTrack - Windows PowerShell
# ─────────────────────────────────────────────────────────────────
# Uso: .\setup_db.ps1

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       Iniciando setup de Base de Datos BookTrack          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Variables
$DB_USER = "root"
$SCRIPT_PATH = Join-Path -Path $PSScriptRoot -ChildPath "setup_db.sql"

# Verificar que MySQL esté instalado
Write-Host "`n[1/3] Verificando MySQL..." -ForegroundColor Yellow
try {
    $version = mysql --version
    Write-Host "✓ MySQL encontrado: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: MySQL no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "  Instala MySQL o agrégalo al PATH" -ForegroundColor Gray
    exit 1
}

# Crear base de datos
Write-Host "`n[2/3] Creando base de datos..." -ForegroundColor Yellow
try {
    mysql -u $DB_USER < $SCRIPT_PATH
    Write-Host "✓ Base de datos creada" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al crear la BD: $_" -ForegroundColor Red
    exit 1
}

# Completar
Write-Host "`n[3/3] Completando setup..." -ForegroundColor Yellow
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✓ Setup completado exitosamente              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nProximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Crea un archivo .env (copia .env.example)" -ForegroundColor Gray
Write-Host "  2. Ejecuta las migraciones: python manage.py migrate" -ForegroundColor Gray
Write-Host "  3. Inicia el servidor: python manage.py runserver" -ForegroundColor Gray

Write-Host ""
