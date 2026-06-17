#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Iniciando Configuración del Servidor TimesFM GUI ==="

# 1. Check Python version
python3 --version

# 2. Check or create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creando entorno virtual (.venv)..."
    python3 -m venv .venv
else
    echo "Entorno virtual existente detectado (.venv)."
fi

# 3. Activate virtual environment
echo "Activando entorno virtual..."
source .venv/bin/activate

# 4. Install dependencies
echo "Instalando dependencias de Python (requirements.txt)..."
pip install --upgrade pip
pip install -r requirements.txt

# 5. Inform user and start server
echo ""
echo "================================================================"
echo " El servidor se está iniciando en: http://localhost:8000"
echo " Abre esta dirección en tu navegador para interactuar con la GUI."
echo "================================================================"
echo ""

python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
