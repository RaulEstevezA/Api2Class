# Api2Class · Desktop

Desktop version of Api2Class: Python + PySide6.

It does the same as the web version, on your computer and without a browser: it passes the same test cases from [`shared/test-cases/`](../shared/README.md) and generates exactly the same code for every language, style and option.

What the tool does and its philosophy are in the [main README](../README_en.md).

## Download

| System | File |
|---|---|
| macOS (Apple Silicon) | [Api2Class-macOS.dmg](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-macOS.dmg) |
| Windows (x64) | [Api2Class-Windows.zip](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-Windows.zip) |
| Windows (ARM64) | [Api2Class-Windows-ARM64.zip](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-Windows-ARM64.zip) |
| Linux (x64) | [Api2Class-Linux.tar.gz](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-Linux.tar.gz) |
| Linux (ARM64, Ubuntu 24.04 or newer) | [Api2Class-Linux-ARM64.tar.gz](https://github.com/RaulEstevezA/Api2Class/releases/latest/download/Api2Class-Linux-ARM64.tar.gz) |

Every version is in [Releases](https://github.com/RaulEstevezA/Api2Class/releases).

> [!NOTE]
> The packaged app has been built and checked on **macOS** (Apple Silicon). The Windows and Linux builds are compiled by GitHub Actions and pass the tests and an automatic start-up check, but nobody has used them on a real computer yet. If you find a problem, write to [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

- **macOS:** open the `.dmg` and drag Api2Class to Applications.
- **Windows:** unzip the `.zip` and run `Api2Class.exe` inside the `Api2Class` folder.
- **Linux:** extract with `tar -xzf Api2Class-Linux.tar.gz` (or `Api2Class-Linux-ARM64.tar.gz`) and run `Api2Class/Api2Class`. Some distributions need `libxcb-cursor0`. The ARM64 version needs a 2024 or newer distribution (glibc 2.39, like Ubuntu 24.04).

### Opening it the first time

The app is not signed (signing requires paid Apple and Microsoft accounts), so the system shows a warning the first time it is opened:

- **macOS** says it could not verify that the app is free of malware. Click **Done**, go to **System Settings → Privacy & Security**, scroll down to **Security** and click **Open Anyway**. This is only needed once.
- **Windows** shows "Windows protected your PC". Click **More info** and then **Run anyway**.

The code is the one in this repository, and the files are built by GitHub Actions ([workflow](../.github/workflows/release-desktop.yml)).

## Run locally

Requirements: Python 3.11 or newer.

```bash
cd desktop
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
python -m pytest                   # tests (shared cases from shared/test-cases/)
ruff check .                       # static analysis
python -m api2class                # run the application
```

## Build the executable

```bash
pip install -e ".[build]"
pyinstaller packaging/api2class.spec
dist/Api2Class.app/Contents/MacOS/Api2Class --smoke-test   # macOS; dist/Api2Class/Api2Class elsewhere
```

The result is in `dist/`: `Api2Class.app` on macOS and an `Api2Class` folder with the executable on Windows and Linux. PyInstaller does not cross-compile: each system is built on its own operating system. `--smoke-test` opens the window, generates every language and saves a `.zip`, to check that nothing was left out of the package.

## Structure

```
api2class/
  core/            Logic without UI: each module is the counterpart of one in web/src/core/
    generators/    One module per language
  ui/              Interface with PySide6
  assets/          Icon and check mark
packaging/         PyInstaller configuration, app icons and smoke test
tests/             Tests with pytest, reading the cases from shared/test-cases/
pyproject.toml     Dependencies and configuration
```

## Tests

Around 290 tests. Most read their cases from [`shared/test-cases/`](../shared/README.md), the same ones as the web version, including the exact code expected for each language and style. Besides, the generators were compared with the web's output for every combination of options, property naming and file layout on the shared inputs (more than 2,000 outputs): all identical. The interface tests run without opening windows (`QT_QPA_PLATFORM=offscreen`).

## Privacy

There are no network calls: files are read and the code is generated on the computer. Only preferences are saved (language, programming language, options, naming), in the system's settings; the JSON and the edits are not saved anywhere.

[Back to main README](../README_en.md)
