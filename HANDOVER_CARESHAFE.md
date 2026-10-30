# 📋 시니어안심살핌(senior-caresafe) & 삼각 편대 연계 인수인계서 (HANDOVER)

- **작성 일시**: 2026-10-29 17:15 (KST)
- **작성 목적**: 오늘까지의 진행 내역 정리 및 내일 즉시 차질 없이 착수할 수 있도록 1단계/2단계 데이터 연계 결함 원인 분석 및 정밀 타격 계획 명시

---

## 1. 🚀 오늘(10/29) 완료된 핵심 내역 및 Git 상태

### 1) 3개 프로젝트 최신 커밋 상태
1. **`senior-caresafe` (허브 PWA, 포트 8989)**:
   - 커밋: `eb3e5e8` (`feat: PWA 인프라 구축, 3단계 허브 UI 개편, 딥링크 연동, 하드웨어 뒤로가기 및 1단계 앱설치 점검 추가`)
   - 조치: 4, 5번 탭 제거 및 3단계 완결형 구조 축소, 1단계 필수 앱 설치 점검 아코디언 추가, 3단계 당일 수행 업무 선택(체크박스) 적용.
2. **`sgds` (노인우울 선별검사 PWA, 포트 8787)**:
   - 커밋: `cfeda20` (`feat: 안심살핌 앱투앱 연동, 복귀 버튼 및 전사 v05 PII 마스킹 모듈 적용`)
   - 조치: `import_target` 수신 2단계 자동 진입, 5단계 `[‹ 안심살핌 복귀]` 조건부 버튼, 전사 v05 PII 마스킹 모듈(`masking.js`) 신설 및 2단계 마스킹 표출/데이터 보존 가드 장착.
3. **`wellriskkeeper` (고독사 게이트키퍼 PWA, 포트 8888)**:
   - 커밋: `ab7285d` (`feat: 안심살핌 앱투앱 딥링크 수신 및 복귀 연동`)
   - 조치: `import_target` 파라미터 수신 및 2단계 자동 채우기, 7단계 `[‹ 안심살핌 복귀]` 연동.

---

## 2. 🚨 긴급 해결 과제: 오늘 발견된 '결정적 삑사리' 3가지 원인 규명

사용자 업로드 캡처 2장 분석 결과 확인된 치명적 결함 내역:

### 1) [삑사리 1] S-GDS 1단계 기관 정보 자체 불일치 및 예전 찌꺼기 잔류
- **현상**: 기관명은 `남동구시니어클럽`인데 소재지는 `서구`, 코드는 `O-28-260-01`(서구 코드), 담당자는 `김장원`으로 뒤죽박죽.
- **원인 코드**: [sgds/js/app.js:38-56](file:///C:/Users/user/Desktop/sgds/js/app.js#L38-L56)
  - 과거 브라우저에 저장된 `localStorage.getItem('SGDS_AGENCY_CONFIG')`의 더미 데이터가 우선 로드되면서, 지역 코드와 기관명이 엉킨 상태로 잔류함.

### 2) [삑사리 2] 안심살핌 ➔ S-GDS 연계 시 '기관 정보' 전송 및 수신 누락
- **현상**: 안심살핌 1단계에서 기관명(예: 부평노인인력개발센터)과 조사원을 등록하고 넘겼음에도 S-GDS 1단계/2단계에는 전혀 반영되지 않고 예전 남동구 데이터가 노출됨.
- **원인 코드**:
  - **전송부 누락 ([senior-caresafe/js/views/step3WorkSelectView.js:165-180](file:///c:/Users/user/Desktop/senior-caresafe/js/views/step3WorkSelectView.js#L165-L180))**:
    `createPayload()`에서 `session.oName`(기관명), `session.sido`(시도), `session.sigungu`(시군구)를 페이로드에 넣지 않고 누락시킴.
  - **수신부 누락 ([sgds/js/app.js:164-169](file:///C:/Users/user/Desktop/sgds/js/app.js#L164-L169))**:
    S-GDS가 연계 데이터를 받을 때 `store.agency.orgCode`만 받고 `store.agency.orgName`, `sido`, `sigungu`, `selectedArea`, `areas`를 세팅하지 않아 기존 더미가 덮어씌워지지 않음.

### 3) [삑사리 3] S-GDS 2단계에서 대상자 백지화 및 엉뚱한 난수(`G9A`) 채번
- **현상**: 직전 캡처 화면에서 2단계 인적사항 입력 필드가 전부 빈칸(공란)으로 비워지고, 관리번호에 엉뚱한 난수(`G9A`)가 들어감.
- **원인 코드**: [sgds/js/views/step2TargetView.js:23-28](file:///C:/Users/user/Desktop/sgds/js/views/step2TargetView.js#L23-L28)
  - `target.caseUid`가 없거나 연계 데이터가 없는 상태에서 2단계가 렌더링되면 `UidEngine.generateFieldCaseUid()`가 돌면서 현장 발굴용 난수(`G9A`)를 강제 채번해버림.
  - 연계 직후 URL 파라미터를 `replaceState`로 지워버려 새로고침이나 단계 이동 시 연계 데이터가 세션에 영구 보존되지 않고 날아가는 취약점 존재.

---

## 3. 🎯 내일(10/30) 즉시 실행할 정밀 타격 조치 순서

내일 출근 직후 아래 순서대로 1:1 정밀 타격을 진행합니다.

### 1단계: 안심살핌 연계 페이로드에 '기관 정본 데이터' 100% 탑재
- **수정 파일**: [senior-caresafe/js/views/step3WorkSelectView.js](file:///c:/Users/user/Desktop/senior-caresafe/js/views/step3WorkSelectView.js) (L165-L181)
- **수정 내용**:
  ```javascript
  const createPayload = () => {
    const payloadObj = {
      version: '1.0',
      // 1. 기관 및 세션 완전 동기화
      orgName: session.oName,
      orgCode: session.oUid,
      sido: session.sido,
      sigungu: session.sigungu,
      buName: session.bName,
      bUid: session.bUid,
      surveyDate: session.activityDate,
      inspector: (session.participants || []).join(', '),
      // 2. 대상자 정합성 데이터
      caseUid: rawTarget.caseUid,
      targetName: rawTarget.name,
      birth: rawTarget.birth,
      gender: rawTarget.gender,
      phone: rawTarget.phone,
      address: rawTarget.address,
      returnUrl: `${window.location.origin}${window.location.pathname}`
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj))));
  };
  ```

### 2단계: S-GDS 연계 수신부에서 기관 및 대상자 데이터 세션 영구 보존
- **수정 파일**: [sgds/js/app.js](file:///C:/Users/user/Desktop/sgds/js/app.js) (L145-L175)
- **수정 내용**:
  ```javascript
  if (data.orgName) store.agency.orgName = data.orgName;
  if (data.sido) store.agency.sido = data.sido;
  if (data.sigungu) {
    store.agency.sigungu = data.sigungu;
    store.agency.selectedArea = data.sigungu;
    store.agency.areas = [data.sigungu];
  }
  if (data.orgCode) store.agency.orgCode = data.orgCode;
  if (data.inspector) store.agency.manager = data.inspector;

  // 기관 설정 로컬스토리지 즉시 동기화 저장 (1단계 화면 및 새로고침 보호)
  localStorage.setItem('SGDS_AGENCY_CONFIG', JSON.stringify(store.agency));
  ```

### 3단계: S-GDS 1단계 기관설정 뷰의 소속 지자체-기관코드 연동 정합성 검증
- **수정 파일**: [sgds/js/views/step1AgencyView.js](file:///C:/Users/user/Desktop/sgds/js/views/step1AgencyView.js)
- **조치**: 남동구(200) 선택 시 `O-28-200-01`, 서구(260) 선택 시 `O-28-260-01`로 기관명-지자체-코드가 삼위일체로 자동 매칭되도록 가드 강화.

### 4단계: 게이트키퍼(WellRiskKeeper) 페이로드 수신부 동일 동기화 점검
- **수정 파일**: [wellriskkeeper/js/views/pwaSurveyView.js](file:///c:/Users/user/Desktop/wellriskkeeper/js/views/pwaSurveyView.js)
- **조치**: 게이트키퍼 쪽도 기관명/조사원 정보가 100% 완전하게 반영되는지 점검.

---

## 4. 💻 로컬 테스트 환경 안내

- `시니어안심살핌`: `http://localhost:8989` (포트 가동 중)
- `S-GDS`: `http://localhost:8787` (포트 가동 중)
- `WellRiskKeeper`: `http://localhost:8888/pages/pwa-survey.html` (포트 가동 중)

---

## 5. 🛡️ D+1 개인정보 파기 및 난수 3자리 유일성 보존 거버넌스

1. **익일(D+1) 로컬 개인정보 자동 완전 파기(Purge)**:
   - 당일 조사 완료 후 익일(D+1)에 단말기 로컬 저장소 및 메모리에 잔류하는 민감 개인정보(성명, 생년월일, 연락처, 상세주소)는 전량 자동 삭제/파기한다.
2. **난수 3자리 Suffix 영구 보존 및 중복 방지**:
   - 개인정보 파기 후에도 통계 집계 및 사후 이력 추적을 위해 **관리번호 끝자리 난수 3자리(영문 채번 Suffix, 예: `QXY`, `MQZ`)는 절대 중복되지 않도록 유일성(Uniqueness)을 엄격히 사수하며 보존**한다.
3. **1차 발굴 vs 2차 이후 '기 대상자' 마스킹 전환**:
   - 1차 현장 발굴 조사 시에만 암호화된 PDF 내부 표에 100% 원본 인적사항이 기록되며,
   - 2차 이후 방문(조사/검사)부터는 이미 등록된 '기 대상자'로 전환되어 PDF에서도 마스킹(`68****`, `010-****-0037`, `서곶로 ***`)이 필수로 적용된다.
