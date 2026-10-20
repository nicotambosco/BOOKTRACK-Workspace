#!/usr/bin/env python3
"""Export encrypted BookTrack data, commit only that copy, and push the current branch."""
import argparse
from pathlib import Path
import subprocess
import sys

MAGIC = b'BOOKTRACK-SNAPSHOT\x00\x01'
SNAPSHOT = 'data/booktrack.btbak'


class PublishError(Exception):
    pass


def publish(root, *, docker=False, python=None, no_push=False, runner=subprocess.run):
    root = Path(root)

    def run(args, capture=False):
        result = runner(args, cwd=root, check=False, text=True, capture_output=capture)
        if result.returncode:
            raise PublishError('Falló la operación. La copia o el commit local se conservan; revisá el mensaje anterior antes de reintentar.')
        return (result.stdout or '').rstrip('\r\n')

    branch = run(['git', 'symbolic-ref', '--short', 'HEAD'], capture=True)
    status = run(['git', 'status', '--porcelain', '--untracked-files=all'], capture=True)
    if any(line[3:] != SNAPSHOT for line in status.splitlines()):
        raise PublishError('Hay cambios de código o archivos pendientes. Revisalos y commitealos antes de publicar datos.')
    if not no_push:
        run(['git', 'fetch', 'origin'])
        behind = run(['git', 'rev-list', '--count', f'HEAD..origin/{branch}'], capture=True)
        if behind != '0':
            raise PublishError('Hay commits remotos nuevos. Hacé pull, revisá las migraciones y recién después publicá los datos.')
    if docker:
        command = ['docker', 'compose', 'exec', '-T', 'backend', 'python', 'manage.py',
                   'exportar_datos', '--output', '/app/data/booktrack.btbak', '--no-input']
    else:
        virtualenv = root/'backend-booktrack'/'.venv'
        candidates = [virtualenv/'Scripts/python.exe', virtualenv/'bin/python']
        executable = python or next((str(path) for path in candidates if path.is_file()), sys.executable)
        command = [executable, str(root/'backend-booktrack/manage.py'), 'exportar_datos',
                   '--output', str(root/SNAPSHOT), '--no-input']
    run(command)
    snapshot = root/SNAPSHOT
    if not snapshot.is_file() or snapshot.is_symlink() or snapshot.stat().st_size > 90*1024*1024:
        raise PublishError('La copia no existe o supera el tamaño admitido. No se agregó nada a Git.')
    with snapshot.open('rb') as stream:
        if stream.read(len(MAGIC)) != MAGIC:
            raise PublishError('El archivo no es una copia cifrada. No se agregó nada a Git.')
    run(['git', 'add', '--', SNAPSHOT])
    run(['git', 'commit', '-m', 'data: actualizar copia cifrada de BookTrack', '--only', '--', SNAPSHOT])
    if not no_push:
        run(['git', 'push', 'origin', f'HEAD:{branch}'])
    print('Copia cifrada commiteada.' if no_push else 'Copia cifrada publicada junto con los commits pendientes de esta rama.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--docker', action='store_true', help='Exportar desde el backend de Docker Compose.')
    parser.add_argument('--python', help='Ejecutable Python del entorno virtual local.')
    parser.add_argument('--no-push', action='store_true', help='Crear copia y commit local sin acceder a GitHub.')
    args = parser.parse_args()
    try:
        publish(Path(__file__).resolve().parent.parent, docker=args.docker, python=args.python, no_push=args.no_push)
    except PublishError as exc:
        parser.exit(1, f'{exc}\n')


if __name__ == '__main__':
    main()
