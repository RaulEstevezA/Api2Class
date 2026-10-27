"""Entry point: python -m api2class or the api2class command."""

import sys


def main() -> None:
    from .ui.app import run

    sys.exit(run())


if __name__ == "__main__":
    main()
