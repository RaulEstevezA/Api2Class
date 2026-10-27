# Api2Class · Escritorio

Versión de escritorio de Api2Class: Python + PySide6.

Hace lo mismo que la versión web, en tu equipo y sin navegador: pasa los mismos casos de prueba de [`shared/test-cases/`](../shared/README.md) y genera exactamente el mismo código para cada lenguaje, estilo y opción.

Qué hace la herramienta y su filosofía están en el [README principal](../README_es.md).

## Descargar

| Sistema | Archivo |
|---|---|
| macOS (Apple Silicon) | [Api2Class-macOS.dmg](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-macOS.dmg) |
| Windows (x64) | [Api2Class-Windows.zip](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-Windows.zip) |
| Windows (ARM64) | [Api2Class-Windows-ARM64.zip](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-Windows-ARM64.zip) |
| Linux (x64) | [Api2Class-Linux.tar.gz](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-Linux.tar.gz) |
| Linux (ARM64, Ubuntu 24.04 o más nueva) | [Api2Class-Linux-ARM64.tar.gz](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-Linux-ARM64.tar.gz) |

Todas las versiones están en [Releases](https://github.com/RaulEstevezA/Api2Class/releases).

> [!NOTE]
> La aplicación empaquetada se ha compilado y comprobado en **macOS** (Apple Silicon). Las versiones de Windows y Linux las compila GitHub Actions y pasan los tests y una prueba de arranque automática, pero nadie las ha usado todavía en un equipo real. Si encuentras algún problema, escríbeme a [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

- **macOS:** abre el `.dmg` y arrastra Api2Class a Aplicaciones.
- **Windows:** descomprime el `.zip` y ejecuta `Api2Class.exe` dentro de la carpeta `Api2Class`.
- **Linux:** descomprime con `tar -xzf Api2Class-Linux.tar.gz` (o `Api2Class-Linux-ARM64.tar.gz`) y ejecuta `Api2Class/Api2Class`. En algunas distribuciones hace falta instalar `libxcb-cursor0`. La versión ARM64 necesita una distribución de 2024 o más nueva (glibc 2.39, como Ubuntu 24.04).

### Abrirla la primera vez

La aplicación no está firmada (firmarla requiere cuentas de pago de Apple y Microsoft), así que el sistema avisa la primera vez que se abre:

- **macOS** dice que no ha podido verificar que la app esté libre de software malicioso. Pulsa **Hecho**, ve a **Ajustes del Sistema → Privacidad y seguridad**, baja hasta **Seguridad** y pulsa **Abrir igualmente**. Solo hay que hacerlo una vez.
- **Windows** muestra "Windows protegió su PC". Pulsa **Más información** y después **Ejecutar de todas formas**.

El código es el de este repositorio y los archivos los compila GitHub Actions ([workflow](../.github/workflows/release-desktop.yml)).

## Ejecutar en local

Requisitos: Python 3.11 o superior.

```bash
cd desktop
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
python -m pytest                   # tests (casos compartidos de shared/test-cases/)
ruff check .                       # análisis estático
python -m api2class                # ejecutar la aplicación
```

## Crear el ejecutable

```bash
pip install -e ".[build]"
pyinstaller packaging/api2class.spec
dist/Api2Class.app/Contents/MacOS/Api2Class --smoke-test   # macOS; dist/Api2Class/Api2Class en el resto
```

El resultado queda en `dist/`: `Api2Class.app` en macOS y una carpeta `Api2Class` con el ejecutable en Windows y Linux. PyInstaller no compila para otros sistemas: cada uno se crea en su propio sistema operativo. `--smoke-test` abre la ventana, genera todos los lenguajes y guarda un `.zip`, para comprobar que no falta nada en el paquete.

## Estructura

```
api2class/
  core/            Lógica sin interfaz: cada módulo equivale a uno de web/src/core/
    generators/    Un módulo por lenguaje
  ui/              Interfaz con PySide6
  assets/          Icono y marca de las casillas
packaging/         Configuración de PyInstaller, iconos de la aplicación y prueba de arranque
tests/             Tests con pytest, leyendo los casos de shared/test-cases/
pyproject.toml     Dependencias y configuración
```

## Tests

Unos 290 tests. La mayoría leen sus casos de [`shared/test-cases/`](../shared/README.md), los mismos que la versión web, incluido el código exacto esperado para cada lenguaje y estilo. Además, los generadores se han comparado con la salida de la web para todas las combinaciones de opciones, nombres de propiedades y archivos con las entradas compartidas (más de 2.000 salidas): todas idénticas. Los tests de la interfaz se ejecutan sin abrir ventanas (`QT_QPA_PLATFORM=offscreen`).

## Privacidad

No hay llamadas a la red: los archivos se leen y el código se genera en el equipo. Solo se guardan preferencias (idioma, lenguaje de programación, opciones, nombres), en la configuración del sistema; ni el JSON ni las ediciones se guardan en ningún sitio.

[Volver al README principal](../README_es.md)
