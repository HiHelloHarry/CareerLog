/**
 * CareerLog 고객 검증 설문 — Google Forms 자동 생성 스크립트
 *
 * 사용법:
 * 1. https://script.google.com 접속
 * 2. 새 프로젝트 만들기
 * 3. 이 코드 전체를 붙여넣기
 * 4. ▶ 실행 버튼 클릭 (함수: createCareerLogSurvey)
 * 5. Google 권한 승인
 * 6. 로그에 출력된 폼 URL 복사해서 사용
 */

function createCareerLogSurvey() {
  // ── 폼 생성 ──
  var form = FormApp.create('직장인 경력 관리 실태 조사 (1분 소요)')
  form.setDescription(
    '이직·연봉협상·인사평가를 준비할 때 "내가 뭘 했더라?" 고민해본 적 있으신가요?\n' +
    '직장인의 경력 기록 습관과 어려움을 알아보는 짧은 설문입니다.\n' +
    '응답은 익명이며, 약 1분 소요됩니다.'
  )
  form.setCollectEmail(false)
  form.setLimitOneResponsePerUser(false) // 구글 로그인 불필요
  form.setProgressBar(true)
  form.setConfirmationMessage('소중한 의견 감사합니다! 🙏')

  // ══════════════════════════════════════
  // 섹션 1: 기본 정보
  // ══════════════════════════════════════
  form.addSectionHeaderItem()
    .setTitle('기본 정보')

  // Q1. 현재 직군
  form.addMultipleChoiceItem()
    .setTitle('Q1. 현재 직군')
    .setChoiceValues(['기획/PM', '개발', '디자인', 'QA', '마케팅', '데이터/분석', '영업/사업개발'])
    .showOtherOption(true)
    .setRequired(true)

  // Q2. 총 경력 연차
  form.addMultipleChoiceItem()
    .setTitle('Q2. 총 경력 연차')
    .setChoiceValues(['1년 미만', '1~3년', '3~5년', '5~10년', '10년 이상'])
    .setRequired(true)

  // Q3. 이직 경험/계획
  form.addMultipleChoiceItem()
    .setTitle('Q3. 최근 2년 내 이직 경험 또는 계획이 있나요?')
    .setChoiceValues([
      '최근 이직했다',
      '현재 이직 준비 중이다',
      '1년 내 이직을 고려하고 있다',
      '이직은 하고싶지만 준비할 시간이 없다',
      '당분간 이직 계획 없다'
    ])
    .setRequired(true)

  // ══════════════════════════════════════
  // 섹션 2: 경력 기록 현황 (문제 검증)
  // ══════════════════════════════════════
  form.addSectionHeaderItem()
    .setTitle('경력 기록 현황')

  // Q4. 경력 정리 빈도
  form.addMultipleChoiceItem()
    .setTitle('Q4. 본인의 업무 성과나 경력을 얼마나 자주 정리하나요?')
    .setChoiceValues([
      '매일 또는 매주 기록한다',
      '한 달에 한 번 정도',
      '분기/반기에 한 번 정도',
      '이직할 때만 정리한다',
      '거의 정리하지 않는다'
    ])
    .setRequired(true)

  // Q5. 이력서 작성 시 어려운 점 (복수 선택)
  form.addCheckboxItem()
    .setTitle('Q5. 이력서나 경력기술서를 작성할 때 가장 어려운 점은? (복수 선택 가능)')
    .setChoiceValues([
      '과거에 뭘 했는지 기억이 안 난다',
      '성과를 수치로 표현하기 어렵다',
      '어떤 형식으로 써야 할지 모르겠다',
      '시간이 너무 오래 걸린다',
      '별로 어렵지 않다'
    ])
    .showOtherOption(true)
    .setRequired(true)

  // Q6. 현재 기록 방법 (복수 선택)
  form.addCheckboxItem()
    .setTitle('Q6. 현재 경력/업무 기록에 사용하는 방법은? (복수 선택 가능)')
    .setChoiceValues([
      '노션, 메모앱 등에 직접 기록',
      '엑셀/스프레드시트',
      '일정 관리 앱 (캘린더 등)',
      'Jira, Asana 등 프로젝트 툴의 기록을 참고',
      '특별히 기록하지 않는다 (기억에 의존)'
    ])
    .showOtherOption(true)
    .setRequired(true)

  // Q7. 경력 정리 소요 시간
  form.addMultipleChoiceItem()
    .setTitle('Q7. 이직 준비 시 경력 정리에 보통 얼마나 시간을 쓰나요?')
    .setChoiceValues([
      '1시간 이내',
      '반나절 (2~4시간)',
      '하루 이상',
      '며칠에 걸쳐 작성한다',
      '잘 모르겠다'
    ])
    .setRequired(true)

  // ══════════════════════════════════════
  // 섹션 3: 솔루션 반응 (사용 의향 검증)
  // ══════════════════════════════════════
  form.addSectionHeaderItem()
    .setTitle('솔루션 반응')
    .setHelpText(
      '아래 서비스 설명을 읽고 답해주세요.\n\n' +
      'CareerLog — 업무 중 사용하는 앱과 작업 내용을 자동으로 기록하고, ' +
      'AI가 이력서에 바로 쓸 수 있는 경력 기록(성과 요약·수치 포함)을 생성해주는 데스크톱 앱입니다. ' +
      '따로 기록할 필요 없이, 업무 시작/종료 버튼만 누르면 "오늘 뭘 했는지" 자동 정리됩니다. ' +
      '매일 쌓인 기록은 나만의 커리어 데이터가 되어, 이직·연봉협상·인사평가 때 ' +
      '정리된 경력을 언제든 꺼내 쓸 수 있고, 장기적으로 나의 성장 흐름과 스킬 변화까지 한눈에 파악할 수 있습니다.'
    )

  // Q8. 사용 의향
  form.addMultipleChoiceItem()
    .setTitle('Q8. 이런 서비스가 있다면 사용해보고 싶으신가요?')
    .setChoiceValues([
      '바로 써보고 싶다',
      '관심은 있지만 좀 더 알아보고 싶다',
      '글쎄, 잘 모르겠다',
      '필요 없을 것 같다'
    ])
    .setRequired(true)

  // Q9. 가장 끌리는 기능 (복수 선택)
  form.addCheckboxItem()
    .setTitle('Q9. 이 서비스에서 가장 끌리는 기능은? (복수 선택 가능)')
    .setChoiceValues([
      '업무 활동 자동 기록 (수동 입력 불필요)',
      'AI 경력 기록 생성 (이력서용 문장 자동 작성)',
      '성과 수치 자동 추출 (시간, 빈도 등)',
      '프로젝트별 업무 정리',
      '이직 시 경력기술서 한 번에 완성'
    ])
    .showOtherOption(true)
    .setRequired(true)

  // Q10. 가격 수용도
  form.addMultipleChoiceItem()
    .setTitle('Q10. 이 서비스에 월 얼마까지 낼 수 있으신가요?')
    .setChoiceValues([
      '무료만 쓸 것 같다',
      '월 3,000원 이하',
      '월 5,000원 이하',
      '월 10,000원 이하',
      '월 10,000원 이상도 괜찮다'
    ])
    .setRequired(true)

  // Q11. 자유 의견 (선택)
  form.addParagraphTextItem()
    .setTitle('Q11. (선택) 추가 의견이나 궁금한 점이 있다면 자유롭게 적어주세요.')
    .setRequired(false)

  // ── 완료 로그 ──
  Logger.log('✅ 폼 생성 완료!')
  Logger.log('📝 편집 URL: ' + form.getEditUrl())
  Logger.log('📤 배포 URL: ' + form.getPublishedUrl())
}
