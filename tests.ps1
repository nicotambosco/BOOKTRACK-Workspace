# Corre todas las pruebas del proyecto desde la raíz: frontend (Angular) y backend (Django + MySQL en Docker).
# Uso:  .\tests.ps1            -> frontend y backend
#       .\tests.ps1 -Solo front|back
param([ValidateSet('todo', 'front', 'back')][string]$Solo = 'todo')

$ErrorActionPreference = 'Continue'  # docker escribe progreso por stderr; se decide por $LASTEXITCODE
Set-Location $PSScriptRoot
$fallos = @()

if ($Solo -ne 'back') {
    Write-Host "`n=== Frontend (npm test) ===" -ForegroundColor Cyan
    npm --prefix BookTrack test
    if ($LASTEXITCODE -ne 0) { $fallos += 'frontend' }
}

if ($Solo -ne 'front') {
    Write-Host "`n=== Backend (manage.py test, MySQL en Docker) ===" -ForegroundColor Cyan
    # Reconstruye para que la imagen tenga el código y los tests actuales, y espera a que esté sano.
    docker compose up --build -d --wait backend
    if ($LASTEXITCODE -ne 0) { $fallos += 'backend (docker compose up)' }
    else {
        # backups/test_publish.py necesita tools/, que no está dentro de la imagen del backend.
        docker compose cp tools backend:/tools
        docker compose exec -T backend python manage.py test --noinput
        if ($LASTEXITCODE -ne 0) { $fallos += 'backend' }
    }
}

if ($fallos.Count) {
    Write-Host "`nFALLARON: $($fallos -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host "`nTodas las pruebas pasaron." -ForegroundColor Green
