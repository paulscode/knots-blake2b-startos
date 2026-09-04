#!/usr/bin/env python3
"""Keep a package's i18n default dictionary in step with the strings it uses.

The dictionary maps every literal passed to `i18n(...)` to an index, and it is
type-checked: a string used in the source but missing from the dictionary is a
compile error. Keeping it by hand across a large change is how stale entries and
missing ones both accumulate.

APPEND-ONLY, AND THAT IS THE WHOLE DESIGN. The indices are the join key for
`translations.ts`, which holds real translations keyed by number. Renumbering
would not fail loudly; it would silently attach Spanish text to different English
strings. So existing entries keep their indices, new strings are appended after
the highest one in use, and strings no longer referenced are reported but left
alone.

Usage: gen-i18n-dict.py <package-dir> [--prune]

`--prune` removes unreferenced entries. It renumbers nothing, so the indices
stay valid, but it does leave holes; only worth running on a package whose
translations are empty.
"""

import re
import sys
from pathlib import Path

CALL = re.compile(r"(?<![A-Za-z0-9_$])i18n\s*\(\s*(['\"])((?:\\.|(?!\1).)*)\1", re.S)
ENTRY = re.compile(r"^\s*(?:'((?:\\.|[^'])*)'|\"((?:\\.|[^\"])*)\"|([A-Za-z_$][\w$]*))\s*:\s*(\d+)\s*,\s*$")


def unescape(raw: str) -> str:
    out, i = [], 0
    while i < len(raw):
        c = raw[i]
        if c == "\\" and i + 1 < len(raw):
            nxt = raw[i + 1]
            out.append({"n": "\n", "t": "\t", "r": "\r"}.get(nxt, nxt))
            i += 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def literal(value: str) -> str:
    """Render a dictionary key, quoting only when it has to be quoted."""
    if re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", value):
        return value
    body = value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{body}'"


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    prune = "--prune" in sys.argv[1:]
    pkg = Path(args[0]).resolve()
    src = pkg / "startos"
    if not src.is_dir():
        print(f"no startos/ under {pkg}", file=sys.stderr)
        return 1

    dict_path = src / "i18n" / "dictionaries" / "default.ts"
    text = dict_path.read_text(encoding="utf-8")

    # Parse the existing dictionary, preserving order and indices.
    existing: dict[str, int] = {}
    for line in text.splitlines():
        m = ENTRY.match(line)
        if m:
            key = m.group(3) if m.group(3) is not None else unescape(m.group(1) or m.group(2))
            existing[key] = int(m.group(4))

    # Every string the source actually uses, in a stable order.
    used: list[str] = []
    seen: set[str] = set()
    for path in sorted(src.rglob("*.ts")):
        if path == dict_path:
            continue
        for m in CALL.finditer(path.read_text(encoding="utf-8")):
            value = unescape(m.group(2))
            if value not in seen:
                seen.add(value)
                used.append(value)

    added = [v for v in used if v not in existing]
    unused = [k for k in existing if k not in seen]

    next_index = max(existing.values(), default=-1) + 1
    for value in added:
        existing[value] = next_index
        next_index += 1

    if prune:
        for k in unused:
            del existing[k]

    lines = ["export const DEFAULT_LANG = 'en_US'", "", "const dict = {"]
    for key, idx in sorted(existing.items(), key=lambda kv: kv[1]):
        lines.append(f"  {literal(key)}: {idx},")
    lines += [
        "} as const",
        "",
        "/**",
        " * Plumbing. DO NOT EDIT.",
        " *",
        " * Maintained by scripts/gen-i18n-dict.py, which only ever appends: the",
        " * indices are the join key for translations.ts and renumbering them would",
        " * silently mistranslate rather than fail.",
        " */",
        "export type I18nKey = keyof typeof dict",
        "export type LangDict = Record<(typeof dict)[I18nKey], string>",
        "export default dict",
        "",
    ]
    dict_path.write_text("\n".join(lines), encoding="utf-8")

    print(f"{dict_path.relative_to(pkg)}: {len(existing)} entries, {len(added)} added")
    for v in added:
        print(f"  + {existing[v]}: {v[:70]}")
    if unused:
        verb = "removed" if prune else "unreferenced (left in place)"
        print(f"  {len(unused)} {verb}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
