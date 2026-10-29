/**
 * 시니어안심살핌 (senior-caresafe) - 전용 API 서비스 모듈
 * 
 * 원칙:
 * 1. UI 컴포넌트 내 fetch 인라인 호출 절대 금지.
 * 2. 테스트 단계 서버 전송 차단 (오프라인 로컬 스토리지 완결성 사수).
 * 3. 추후 D1 백엔드 연동 시 본 모듈만 전환하여 100% 흡수.
 */

const STORAGE_KEYS = {
  SESSION: 'senior_caresafe_session',
  RECORDS: 'senior_caresafe_records',
  SETTINGS: 'senior_caresafe_settings'
};

class ApiClient {
  constructor() {
    this.baseUrl = '';
    this.isOfflineMode = true; // 테스트 단계 로컬 완결 격리 모드
  }

  // --- 세션 관련 API ---
  async getSession() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('세션 조회 오류:', error);
      return null;
    }
  }

  async saveSession(sessionData) {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
      return { success: true, data: sessionData };
    } catch (error) {
      console.error('세션 저장 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // --- 상담/사례 레코드 관련 API ---
  async getRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('기록 목록 조회 오류:', error);
      return [];
    }
  }

  async saveRecord(record) {
    try {
      const records = await this.getRecords();
      const existingIndex = records.findIndex(r => r.caseUid === record.caseUid);
      
      if (existingIndex >= 0) {
        records[existingIndex] = { ...records[existingIndex], ...record, updatedAt: new Date().toISOString() };
      } else {
        records.unshift({ ...record, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }

      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      return { success: true, record };
    } catch (error) {
      console.error('기록 저장 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteRecord(caseUid) {
    try {
      let records = await this.getRecords();
      records = records.filter(r => r.caseUid !== caseUid);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      return { success: true };
    } catch (error) {
      console.error('기록 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // --- 오프라인 보안 에어갭 (.wrk / .json) 가져오기/내보내기 ---
  async exportBackupData() {
    const session = await this.getSession();
    const records = await this.getRecords();
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      session,
      records
    };
  }

  async importBackupData(backupData) {
    if (!backupData || !Array.isArray(backupData.records)) {
      throw new Error('유효하지 않은 백업 데이터 규격입니다.');
    }
    if (backupData.session) {
      await this.saveSession(backupData.session);
    }
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(backupData.records));
    return { success: true, count: backupData.records.length };
  }
}

export const apiClient = new ApiClient();
