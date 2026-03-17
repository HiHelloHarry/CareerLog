"""
에이전트 01 — 기획서 구체화 에이전트
────────────────────────────────────
역할: 대화를 통해 기획서의 빈 곳을 채우고 약한 섹션을 강화한다.
      정부과제 신청에 필요한 항목(창업 배경, 팀 구성, 기술 차별성, 시장 규모 등)을
      자동으로 파악하고 질문을 통해 수집한다.

실행: python agents/01_planner.py
"""
import json
import sys
from datetime import datetime
from config import get_client, read_planning_doc, write_planning_doc, save_output, MODEL, MAX_TOKENS

SYSTEM_PROMPT = """당신은 스타트업 사업 기획 전문가입니다.
사용자와 대화하면서 사업 기획서를 구체화하는 것이 목표입니다.

현재 기획서를 분석하고, 정부 지원사업 심사에 필요하지만 빠진 정보를 파악하세요.
정부과제 심사에서 자주 요구되는 항목:
- 창업자/팀 배경 및 역량 (창업자 이력, 팀 구성)
- 기술 개발 계획 (구체적 기술 스펙, 개발 방법론)
- 시장 규모 정량화 (TAM/SAM/SOM, 출처 포함)
- 경쟁사 대비 기술 차별성 (특허, 독점 기술 여부)
- 사업화 전략 (유통 채널, 파트너십, 고객 획득 비용)
- 재무 계획 (3년 매출 추정, 근거 포함)
- 사회적 가치 (고용 창출, 사회 문제 해결)

규칙:
1. 한 번에 하나의 주제에 대해서만 질문한다.
2. 사용자 답변을 기획서 언어로 정제해서 확인시킨다.
3. 충분히 구체화되면 /저장 명령을 안내한다.
4. /분석 명령 시 현재 기획서의 부족한 섹션을 리스트로 출력한다.
5. /저장 명령 시 업데이트된 기획서 전문을 출력한다.

항상 한국어로 대화한다."""

TOOLS = [
    {
        "name": "analyze_document",
        "description": "현재 기획서를 분석하여 보완이 필요한 섹션을 파악합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "document": {"type": "string", "description": "분석할 기획서 전문"},
            },
            "required": ["document"]
        }
    },
    {
        "name": "update_section",
        "description": "기획서의 특정 섹션을 업데이트합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "section_name": {"type": "string", "description": "업데이트할 섹션명"},
                "new_content": {"type": "string", "description": "새로운 섹션 내용 (마크다운)"},
            },
            "required": ["section_name", "new_content"]
        }
    }
]

def analyze_document(document: str) -> dict:
    """기획서 분석 — 빠진 항목 파악"""
    required_sections = [
        "창업자/팀 소개 및 역량",
        "시장 규모 (TAM/SAM/SOM)",
        "기술 개발 상세 계획",
        "재무 계획 (3년 추정)",
        "사업화 전략 및 채널",
        "사회적 가치 및 고용 효과",
        "지식재산권/기술 차별성 근거",
    ]

    missing = []
    for section in required_sections:
        keywords = section.lower()
        if not any(kw in document.lower() for kw in keywords.split()):
            missing.append(section)

    return {
        "missing_sections": missing,
        "total_required": len(required_sections),
        "missing_count": len(missing)
    }

def update_section(section_name: str, new_content: str, document: str) -> str:
    """기획서 섹션 업데이트"""
    timestamp = datetime.now().strftime("%Y.%m.%d")
    header = f"\n\n## {section_name}\n\n> 추가일: {timestamp}\n\n"
    return document + header + new_content

def run_planner():
    client = get_client()
    planning_doc = read_planning_doc()
    conversation_history = []
    updated_doc = planning_doc

    print("=" * 60)
    print("기획서 구체화 에이전트 시작")
    print("명령어: /분석 | /저장 | /종료")
    print("=" * 60)

    # 초기 분석 자동 실행
    analysis = analyze_document(planning_doc)
    init_message = f"""현재 기획서를 분석했습니다.

보완이 필요한 항목 ({analysis['missing_count']}/{analysis['total_required']}개):
{chr(10).join(f"  - {s}" for s in analysis['missing_sections'])}

가장 먼저 **{analysis['missing_sections'][0]}** 부터 시작할까요?
구체적인 내용을 대화로 채워드리겠습니다."""

    print(f"\n[에이전트]: {init_message}\n")

    while True:
        try:
            user_input = input("[나]: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n종료합니다.")
            break

        if not user_input:
            continue

        if user_input == "/종료":
            print("종료합니다.")
            break

        if user_input == "/분석":
            analysis = analyze_document(updated_doc)
            print(f"\n[에이전트]: 현재 보완 필요 항목:\n" +
                  "\n".join(f"  - {s}" for s in analysis['missing_sections']) + "\n")
            continue

        if user_input == "/저장":
            filename = f"기획서_v{datetime.now().strftime('%Y%m%d_%H%M')}.md"
            save_output(filename, updated_doc)
            write_planning_doc(updated_doc)
            print(f"[에이전트]: 기획서가 업데이트되었습니다. ({filename})\n")
            continue

        conversation_history.append({"role": "user", "content": user_input})

        messages_with_context = [
            {
                "role": "user",
                "content": f"[현재 기획서]\n{updated_doc}\n\n[대화 시작]"
            },
            {"role": "assistant", "content": init_message}
        ] + conversation_history

        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages_with_context
        )

        # 툴 호출 처리
        while response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    if block.name == "analyze_document":
                        result = analyze_document(block.input["document"])
                    elif block.name == "update_section":
                        updated_doc = update_section(
                            block.input["section_name"],
                            block.input["new_content"],
                            updated_doc
                        )
                        result = {"status": "success", "section": block.input["section_name"]}
                    else:
                        result = {"error": "unknown tool"}

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False)
                    })

            messages_with_context.append({"role": "assistant", "content": response.content})
            messages_with_context.append({"role": "user", "content": tool_results})

            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages_with_context
            )

        # 텍스트 응답 추출
        reply = ""
        for block in response.content:
            if hasattr(block, "text"):
                reply += block.text

        conversation_history.append({"role": "assistant", "content": reply})
        print(f"\n[에이전트]: {reply}\n")

if __name__ == "__main__":
    run_planner()
