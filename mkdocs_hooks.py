"""MkDocs hooks：让 GitHub 上的 Markdown 与 Pages 站点共用同一份源文件。

- 用根目录的 README.md、OUTLINE.md、REFERENCES.md 生成站点的首页、大纲、参考资料页；
- 把指向站点之外的相对链接（code/、LICENSE 等）改写为 GitHub 上的绝对链接。
"""

from __future__ import annotations

import re
from pathlib import Path

from mkdocs.structure.files import File

REPO = "https://github.com/geekchow/bank-ai-connector-auth"
ROOT = Path(__file__).parent

# 根目录文件 → 站点页面
GENERATED = {"README.md": "index.md", "OUTLINE.md": "outline.md", "REFERENCES.md": "references.md"}

LINK = re.compile(r"\]\((?!https?://|mailto:|#)([^)\s]+)\)")


def _to_github(repo_path: str) -> str:
    kind = "tree" if repo_path.endswith("/") or (ROOT / repo_path).is_dir() else "blob"
    return f"{REPO}/{kind}/main/{repo_path.rstrip('/')}"


def _rewrite_root_links(markdown: str) -> str:
    """根目录文件中的链接：articles/x.md → x.md；根目录 .md → 生成页；其余 → GitHub。"""

    def repl(m: re.Match) -> str:
        target = m.group(1)
        path, _, anchor = target.partition("#")
        anchor = f"#{anchor}" if anchor else ""
        if path.startswith("articles/") and path.endswith(".md"):
            return f"]({path.removeprefix('articles/')}{anchor})"
        if path in GENERATED:
            return f"]({GENERATED[path]}{anchor})"
        return f"]({_to_github(path)}{anchor})"

    return LINK.sub(repl, markdown)


def on_files(files, config):
    for src, dest in GENERATED.items():
        content = _rewrite_root_links((ROOT / src).read_text(encoding="utf-8"))
        files.append(File.generated(config, dest, content=content))
    return files


def on_page_markdown(markdown, page, config, files):
    """文章中的 ../code/… 等站点外链接改写为 GitHub 链接。"""

    def repl(m: re.Match) -> str:
        target = m.group(1)
        if not target.startswith("../"):
            return m.group(0)
        path, _, anchor = target.partition("#")
        anchor = f"#{anchor}" if anchor else ""
        return f"]({_to_github(path.removeprefix('../'))}{anchor})"

    return LINK.sub(repl, markdown)
