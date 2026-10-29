/**
 * @file uid.js
 * @description 데이터 정합성 사수를 위한 전사 7대 계층 UID 생성, 검증, 파싱 엔진 (게이트키퍼 표준 규격 100% 동일) (ESM)
 * 
 * 전사 표준 7대 UID 체계 규칙:
 * 1. 수행기관 코드 (Org): O-{시도2}-{시군구3}-{일련2} (예: O-28-710-01)
 * 2. 기관담당자 코드 (Staff): A-{시도2}-{시군구3}-{일련2}-{순번3} (예: A-28-710-01-001)
 * 3. 전담사업단 코드 (BU): B-{시도2}-{시군구3}-{일련2}-{BU코드} (예: B-28-710-01-GD, B-28-710-01-WR)
 * 4. 현장참여자 코드 (User): U-{시도2}-{시군구3}-{일련2}-{BU코드}-{참여자순번3} (예: U-28-710-01-GD-001)
 * 5. 수혜대상자 코드 (Case): C-{시도2}-{시군구3}-{일련2}-{가구순번3 또는 난수3} (예: C-28-710-01-001, C-28-710-01-M60)
 * 6. 조사원장 코드 (Survey): S-{시도2}-{시군구3}-{일련2}-{가구순번3}-{BU코드}-R{차수} (예: S-28-710-01-001-GD-R1, S-28-710-01-001-WR-R1)
 * 7. 감사추적 코드 (Audit): L-{16진수타임스탬프}-{16진수난수} (예: L-6718E29A-1F4A)
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
   * 수혜자 케이스 관리번호 생성 (정규 일련번호)
   * @param {string} orgUid 
   * @param {number|string} seqNumber (1 ~ 999)
   * @returns {string}
   */
  static generateCaseUid(orgUid, seqNumber) {
    const cleanOrg = this.isValidOrgUid(orgUid) ? orgUid : 'O-28-260-01';
    const seqPadded = String(seqNumber).padStart(3, '0');
    return `C-${cleanOrg.slice(2)}-${seqPadded}`;
  }

  /**
   * 현장 직접 발굴용 수혜자 케이스 관리번호 생성 (영문+숫자 3자리 난수, 46,656가지 경우의 수)
   * @param {string} orgUid 
   * @returns {string} 예: C-28-260-01-A7K
   */
  static generateFieldCaseUid(orgUid) {
    const cleanOrg = this.isValidOrgUid(orgUid) ? orgUid : 'O-28-260-01';
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // 순수 숫자로만 3자리 생성된 경우 마지막 자리를 영문자로 변경하여 기존 001~099 정규 배정 번호와 분리
    if (/^\d{3}$/.test(code)) {
      const alphaChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      code = code.slice(0, 2) + alphaChars.charAt(Math.floor(Math.random() * alphaChars.length));
    }
    return `C-${cleanOrg.slice(2)}-${code}`;
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
