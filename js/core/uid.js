/**
 * @file uid.js
 * @description 데이터 정합성 사수를 위한 전사 7대 계층 UID 생성, 검증, 파싱 엔진 (게이트키퍼 표준 규격 100% 동일) (ESM)
 * 
 * 전사 표준 7대 UID 체계 규칙:
 * 1. 수행기관 코드 (Org): O-{시도2}-{시군구3}-{일련2} (예: O-28-710-01)
 * 2. 기관담당자 코드 (Staff): A-{시도2}-{시군구3}-{일련2}-{순번3} (예: A-28-710-01-001)
 * 3. 전담사업단 코드 (BU): B-{시도2}-{시군구3}-{일련2}-{BU코드} (예: B-28-710-01-GD, B-28-710-01-WR)
 * 4. 현장참여자 코드 (User): U-{시도2}-{시군구3}-{일련2}-{BU코드}-{참여자순번3} (예: U-28-710-01-GD-001)
 * 5. 수혜대상자 코드 (Case): C-{시도2}-{시군구3}-{일련2}-{K1001~K9999(배정) 또는 N1001~N9999(발굴)} (예: C-28-710-01-K1001, C-28-710-01-N1001)
 * 6. 연계식별자 코드 (Link): LNK-{시도2}-{시군구3}-{일련2}-{가구코드5}-{연계순번2} (예: LNK-28-710-01-K1001-01)
 * 7. 조사원장 코드 (Survey): S-{시도2}-{시군구3}-{일련2}-{가구코드5}-{BU코드}-R{차수} (예: S-28-710-01-K1001-GD-R1)
 * 8. 감사추적 코드 (Audit): L-{16진수타임스탬프}-{16진수난수} (예: L-6718E29A-1F4A)
 */

export class UidEngine {
  /**
   * 기관 코드 유효성 검증
   * @param {string} orgUid 
   * @returns {boolean}
   */
  static isValidOrgUid(orgUid) {
    if (!orgUid) return false;
    return /^O-\d{2}-\d{3}-\d{2}$/.test(orgUid);
  }

  /**
   * 기관 소속 담당자/사회복지사 고유 식별자 생성 (전사 7대 계층 표준)
   * @param {string} orgUid (예: O-28-710-01)
   * @param {number|string} seqNumber (1 ~ 999)
   * @returns {string} 예: A-28-710-01-001
   */
  static generateStaffUid(orgUid, seqNumber = 1) {
    const cleanOrg = this.isValidOrgUid(orgUid) ? orgUid : 'O-28-710-01';
    const seqPadded = String(seqNumber).padStart(3, '0');
    return `A-${cleanOrg.slice(2)}-${seqPadded}`;
  }

  /**
   * 사업단 코드 생성
   * @param {string} orgUid 
   * @param {string} buCode (기본: GD)
   * @returns {string} 예: B-28-710-01-GD
   */
  static generateBuUid(orgUid, buCode = 'GD') {
    const cleanOrg = this.isValidOrgUid(orgUid) ? orgUid : 'O-28-710-01';
    const cleanBu = (buCode || 'GD').trim().toUpperCase();
    return `B-${cleanOrg.slice(2)}-${cleanBu}`;
  }

  /**
   * 현장 참여자/또래상담사 고유 식별자 생성 (전사 표준 v3.0: 3자리 999명 수용)
   * @param {string} orgUid 
   * @param {string} buCode (기본: GD)
   * @param {number|string} seqNumber (1 ~ 999)
   * @returns {string} 예: U-28-710-01-GD-001
   */
  static generateParticipantUid(orgUid, buCode = 'GD', seqNumber = 1) {
    const cleanOrg = this.isValidOrgUid(orgUid) ? orgUid : 'O-28-710-01';
    const cleanBu = (buCode || 'GD').trim().toUpperCase();
    const seqPadded = String(seqNumber).padStart(3, '0');
    return `U-${cleanOrg.slice(2)}-${cleanBu}-${seqPadded}`;
  }

  /**
   * 수혜대상자 케이스 관리번호 생성 (지자체 사전 배정 가구: K 접두사 + 4자리 숫자, 총 5자리)
   * @param {string} orgUid (예: O-28-260-01)
   * @param {number|string} seqNumber (1001 ~ 9999 또는 'K1001')
   * @returns {string} 예: C-28-260-01-K1001
   */
  static generateCaseUid(orgUid = 'O-28-260-01', seqNumber = 1001) {
    const cleanOrg = this.isValidOrgUid(orgUid) ? orgUid : 'O-28-260-01';
    let cleanSeq;
    if (typeof seqNumber === 'string') {
      const upper = seqNumber.trim().toUpperCase();
      cleanSeq = upper.startsWith('K') ? upper : `K${upper.padStart(4, '0')}`;
    } else {
      cleanSeq = `K${String(seqNumber).padStart(4, '0')}`;
    }
    return `C-${cleanOrg.slice(2)}-${cleanSeq}`;
  }

  /**
   * 현장 직접 발굴용 수혜자 케이스 관리번호 생성 (N 접두사 + 4자리, 총 5자리)
   * @param {string} orgUid (예: O-28-260-01)
   * @param {number|string} seqNumber
   * @returns {string} 예: C-28-260-01-N1001
   */
  static generateFieldCaseUid(orgUid = 'O-28-260-01', seqNumber = null) {
    const cleanOrg = this.isValidOrgUid(orgUid) ? orgUid : 'O-28-260-01';
    let code;
    if (seqNumber !== null && seqNumber !== undefined) {
      if (typeof seqNumber === 'string' && seqNumber.startsWith('N')) {
        code = seqNumber;
      } else {
        code = `N${String(seqNumber).padStart(4, '0')}`;
      }
    } else {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      code = `N${randNum}`;
    }
    return `C-${cleanOrg.slice(2)}-${code}`;
  }

  /**
   * 연계 서비스/공문 식별자 생성: LNK-{시도2}-{시군구3}-{기관2}-{가구코드5}-{연계순번2}
   * @param {string} caseUid (예: C-28-260-01-K1001, C-28-260-01-N1001)
   * @param {number} linkSeq (1, 2, 3...)
   * @returns {string} 예: LNK-28-260-01-K1001-01
   */
  static generateLinkUid(caseUid, linkSeq = 1) {
    if (!caseUid || !caseUid.startsWith('C-')) {
      throw new Error(`[UidEngine] 유효하지 않은 케이스 UID입니다: ${caseUid}`);
    }
    const seqPadded = String(linkSeq).padStart(2, '0');
    return `LNK-${caseUid.slice(2)}-${seqPadded}`;
  }

  /**
   * S-GDS 조사 이력 UID 생성 (단일 공식 규격: S- 접두사 + 사업단 GD + 차수 결합)
   * @param {string} caseUid (예: C-28-260-01-001)
   * @param {number} round (1, 2, ...)
   * @param {string} dateStr (예: 2026-10-22)
   * @returns {string} 예: S-28-260-01-001-GD-R1
   */
  static generateGdsSurveyUid(caseUid, round = 1, dateStr = '') {
    const cleanCase = (caseUid && caseUid.startsWith('C-')) ? caseUid : 'C-28-260-01-001';
    return `S-${cleanCase.slice(2)}-GD-R${round}`;
  }

  /**
   * 실시간 감사 추적 로그 UID 생성
   * @returns {string} 예: L-6718E29A-1F4A
   */
  static generateAuditLogUid() {
    const timeHex = Date.now().toString(16);
    const randHex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
    return `L-${timeHex}-${randHex}`.toUpperCase();
  }
}
