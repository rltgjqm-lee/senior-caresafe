/**
 * 시니어안심살핌 (senior-caresafe) - 활동 세션 관리자 (sessionManager.js)
 * 
 * 거버넌스 준수:
 * 1. [지자체(M) -> 수행기관(O) -> 사업단(B) -> 참여자(U)] 정통 행정 계층 바인딩.
 * 2. 활동 일자 미래 날짜 원천 차단 (가드 1: max 속성, 가드 2: JS 이벤트 검증 및 자동 원복).
 * 3. 참여자 명부 PII 최소화 (휴대폰 번호 일체 입력 금지, 오직 성명만 입력, 2인 1조 기본, 동적 추가/삭제).
 */

import { apiClient } from '../api/client.js';

export const ADMIN_PRESETS = {
  BUPYEONG: {
    mUid: 'M-28-237',
    mName: '인천광역시 부평구',
    oUid: 'O-28-237-01',
    oName: '부평노인인력개발센터',
    businessUnits: [
      { bUid: 'B-28-237-01-MA', bName: '[MA] 마음안심사업단' }
    ]
  },
  SEO_GU: {
    mUid: 'M-28-260',
    mName: '인천광역시 서구',
    oUid: 'O-28-260-01',
    oName: '인천서구노인복지관',
    businessUnits: [
      { bUid: 'B-28-260-01-EM', bName: '[EM] 이웃안부사업단' },
      { bUid: 'B-28-260-01-ME', bName: '[ME] 식사지원사업단' },
      { bUid: 'B-28-260-01-HE', bName: '[HE] 건강음료사업단' },
      { bUid: 'B-28-260-01-CL', bName: '[CL] 주거환경개선사업단' }
    ]
  }
};

export class SessionManager {
  constructor() {
    this.currentSession = {
      mUid: ADMIN_PRESETS.BUPYEONG.mUid,
      mName: ADMIN_PRESETS.BUPYEONG.mName,
      oUid: ADMIN_PRESETS.BUPYEONG.oUid,
      oName: ADMIN_PRESETS.BUPYEONG.oName,
      bUid: ADMIN_PRESETS.BUPYEONG.businessUnits[0].bUid,
      bName: ADMIN_PRESETS.BUPYEONG.businessUnits[0].bName,
      activityDate: this.getTodayDateString(),
      participants: ['김철수', '이영희'] // 2인 1조 기본
    };
  }

  // 오늘 날짜(YYYY-MM-DD) 반환
  getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 미래 일자 검증 가드 (Guard Condition)
  validateActivityDate(selectedDate) {
    const today = this.getTodayDateString();
    if (!selectedDate || selectedDate > today) {
      return {
        isValid: false,
        message: '활동 일자는 미래 날짜를 선택할 수 없습니다. 오늘 날짜로 자동 원복됩니다.',
        fallbackDate: today
      };
    }
    return { isValid: true };
  }

  // 참여자 명부 검증 (최소 1인 성명 필수, 공백 제외)
  validateParticipants(participants) {
    const validList = (participants || [])
      .map(name => (typeof name === 'string' ? name.trim() : ''))
      .filter(name => name.length > 0);

    if (validList.length === 0) {
      return {
        isValid: false,
        message: '최소 1인 이상의 참여자 성명을 입력해야 합니다.'
      };
    }
    return { isValid: true, sanitized: validList };
  }

  // 세션 로드
  async loadSession() {
    const saved = await apiClient.getSession();
    if (saved) {
      // 날짜 가드 재검증
      const dateCheck = this.validateActivityDate(saved.activityDate);
      if (!dateCheck.isValid) {
        saved.activityDate = dateCheck.fallbackDate;
      }
      this.currentSession = { ...this.currentSession, ...saved };
    }
    return this.currentSession;
  }

  // 세션 저장
  async saveSession(newSessionData) {
    // 1. 날짜 가드
    const dateCheck = this.validateActivityDate(newSessionData.activityDate);
    if (!dateCheck.isValid) {
      throw new Error(dateCheck.message);
    }

    // 2. 참여자 명부 가드
    const partCheck = this.validateParticipants(newSessionData.participants);
    if (!partCheck.isValid) {
      throw new Error(partCheck.message);
    }

    this.currentSession = {
      ...this.currentSession,
      ...newSessionData,
      activityDate: newSessionData.activityDate,
      participants: partCheck.sanitized
    };

    await apiClient.saveSession(this.currentSession);
    return this.currentSession;
  }

  getCurrentSession() {
    return { ...this.currentSession };
  }
}

export const sessionManager = new SessionManager();
