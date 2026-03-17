"""
공통 설정
"""
import os
from pathlib import Path

# .env 파일 자동 로드
_env_file = Path(__file__).parent.parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

PROJECT_ROOT = Path(__file__).parent.parent
PLANNING_DOC = PROJECT_ROOT / "기획서.md"
OUTPUTS_DIR = Path(__file__).parent / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

MODEL = "claude-opus-4-6"
MAX_TOKENS = 8192

def get_client():
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY 환경변수를 설정해주세요.")
    return anthropic.Anthropic(api_key=api_key)

def read_planning_doc() -> str:
    with open(PLANNING_DOC, encoding="utf-8") as f:
        return f.read()

def write_planning_doc(content: str):
    with open(PLANNING_DOC, "w", encoding="utf-8") as f:
        f.write(content)

def save_output(filename: str, content: str):
    path = OUTPUTS_DIR / filename
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"\n[저장 완료] {path}")
    return path
