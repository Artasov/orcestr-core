from __future__ import annotations

import ast
from pathlib import Path

PACKAGE = Path(__file__).parents[1] / "src" / "orcestr_core"


def imported_modules(path: Path) -> list[tuple[int, str]]:
    modules: list[tuple[int, str]] = []
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.extend((node.lineno, alias.name) for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            modules.append((node.lineno, node.module))
    return modules


def test_framework_imports_stay_in_the_fastapi_adapter() -> None:
    violations: list[str] = []
    for path in PACKAGE.rglob("*.py"):
        relative = path.relative_to(PACKAGE)
        if relative.parts[0] == "fastapi":
            continue
        for line, module in imported_modules(path):
            if module == "fastapi" or module.startswith(("fastapi.", "starlette.")):
                violations.append(f"{relative}:{line}: {module}")
    assert violations == []


def test_core_has_no_auth_or_application_dependencies() -> None:
    violations: list[str] = []
    for path in PACKAGE.rglob("*.py"):
        relative = path.relative_to(PACKAGE)
        for line, module in imported_modules(path):
            if module == "orcestr_auth" or module.startswith(
                ("orcestr_auth.", "src.")
            ):
                violations.append(f"{relative}:{line}: {module}")
    assert violations == []
