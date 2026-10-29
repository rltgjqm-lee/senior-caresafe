/**
 * @file validationService.js
 * @description 시니어안심살핌 단계별 1:1 정밀 필드 밸리데이션 및 위반 요소 자동 포커스 서비스 (ESM)
 */

import { notifier } from '../utils/notifier.js';

export class ValidationService {
  /**
   * 오늘 날짜 문자열 반환 (YYYY-MM-DD, 로컬 KST 기준)
   * @returns {string}
   */
  static getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 1단계 기관 및 활동 세션 설정 정밀 1:1 검증
   * @param {Object} data 
   * @param {HTMLElement} [container] 
   * @returns {boolean}
   */
  static validateStep1(data, container) {
    const root = container || document.getElementById('step1Container') || document;

    // 1. 참여기관명 검증
    const agencyInput = root.querySelector('#agencyInput');
    const agencyName = (data.oName !== undefined ? data.oName : (agencyInput?.value || '')).trim();
    if (!agencyName) {
      notifier.alert({ title: '기관명 필수 입력', message: '소속 참여기관명을 입력해 주십시오.' });
      agencyInput?.focus();
      return false;
    }

    // 2. 소재지 시/도 검증
    const sidoSelect = root.querySelector('#sidoSelect');
    const sido = data.sido !== undefined ? data.sido : (sidoSelect?.value || '');
    if (!sido) {
      notifier.alert({ title: '시/도 필수 선택', message: '기관 소재지 시/도를 선택해 주십시오.' });
      sidoSelect?.focus();
      return false;
    }

    // 3. 소재지 시/군/구 검증
    const sigunguSelect = root.querySelector('#sigunguSelect');
    const sigungu = data.sigungu !== undefined ? data.sigungu : (sigunguSelect?.value || '');
    if (!sigungu) {
      notifier.alert({ title: '시/군/구 필수 선택', message: '기관 소재지 시/군/구를 선택해 주십시오.' });
      sigunguSelect?.focus();
      return false;
    }

    // 4. 담당 사업단 검증
    const buSelect = root.querySelector('#buSelect');
    const buVal = data.bUid !== undefined ? data.bUid : (buSelect?.value || '');
    if (!buVal) {
      notifier.alert({ title: '사업단 필수 선택', message: '담당 사업단을 선택해 주십시오.' });
      buSelect?.focus();
      return false;
    }

    // 5. 활동 일자 검증 (필수 입력 + 미래 날짜 차단)
    const dateInput = root.querySelector('#activityDateInput');
    const activityDate = data.activityDate !== undefined ? data.activityDate : (dateInput?.value || '');
    if (!activityDate) {
      notifier.alert({ title: '활동일자 확인 필요', message: '활동 일자를 올바르게 입력해 주십시오.' });
      dateInput?.focus();
      return false;
    }

    const todayStr = this.getTodayString();
    if (activityDate > todayStr) {
      notifier.alert({ title: '활동일자 확인 필요', message: '활동 일자는 오늘 또는 과거 날짜만 지정할 수 있습니다. 미래 일자는 등록할 수 없습니다.' });
      dateInput?.focus();
      return false;
    }

    // 6. 현장 참여자 명부 검증 (최소 1인, 공란 배제, 최소 2자 이상)
    const partInputs = root.querySelectorAll('.participant-input');
    const participants = data.participants !== undefined ? data.participants : Array.from(partInputs).map(inp => inp.value.trim());

    if (!participants || participants.length === 0) {
      notifier.alert({ title: '참여자 등록 필요', message: '현장 참여자(조사원)를 최소 1명 이상 등록해 주십시오.' });
      partInputs[0]?.focus();
      return false;
    }

    for (let i = 0; i < participants.length; i++) {
      const name = (participants[i] || '').trim();
      const targetInput = partInputs[i];

      if (!name) {
        notifier.alert({ title: '참여자 성명 누락', message: '조사원 성명이 입력되지 않은 빈 칸이 있습니다. 이름을 입력하거나 [-] 버튼으로 삭제해 주십시오.' });
        targetInput?.focus();
        return false;
      }

      if (name.length < 2) {
        notifier.alert({ title: '참여자 성명 확인 필요', message: '조사원 성명은 최소 2자 이상 입력해 주십시오.' });
        targetInput?.focus();
        return false;
      }
    }

    return true;
  }

  /**
   * 2단계 대상자 인적사항 정밀 1:1 검증
   * @param {Object} rawTarget 
   * @param {HTMLElement} [container] 
   * @returns {boolean}
   */
  static validateStep2(rawTarget, container) {
    const root = container || document.getElementById('step2Container') || document;

    // 1. 관리번호 검증
    const seqInput = root.querySelector('#targetSeqInput');
    const seq = (rawTarget.seq || seqInput?.value || '').trim();
    if (!seq || seq.length < 3) {
      notifier.alert({ title: '관리번호 확인 필요', message: '대상자 관리번호(순번)를 3자리 이상 입력해 주십시오. (예: 001)' });
      seqInput?.focus();
      return false;
    }

    // 2. 어르신 성명 검증
    const nameInput = root.querySelector('#targetNameInput');
    const nameVal = (rawTarget.name || nameInput?.value || '').trim().replace(/\*/g, '');
    if (!nameVal || nameVal.length < 1) {
      notifier.alert({ title: '어르신 성명 필수', message: '어르신 성함을 입력하거나 상단 (S) 버튼으로 대상을 조회해 주십시오.' });
      nameInput?.focus();
      return false;
    }

    // 3. 생년월일 검증 (6자리 숫자)
    const birthInput = root.querySelector('#targetBirthInput');
    const rawBirth = (rawTarget.birth || birthInput?.value || '').trim().replace(/\D/g, '');
    if (!rawBirth || rawBirth.length < 6) {
      notifier.alert({ title: '생년월일 확인 필요', message: '어르신 생년월일 6자리를 올바르게 입력해 주십시오. (예: 480315)' });
      birthInput?.focus();
      return false;
    }

    // 4. 성별 검증
    const gender = rawTarget.gender;
    if (!gender || (gender !== '남' && gender !== '여')) {
      notifier.alert({ title: '성별 필수 선택', message: '어르신 성별(남성/여성)을 선택해 주십시오.' });
      return false;
    }

    // 5. 연락처 검증
    const phoneInput = root.querySelector('#targetPhoneInput');
    const phoneVal = (rawTarget.phone || phoneInput?.value || '').trim();
    if (!phoneVal) {
      notifier.alert({ title: '연락처 확인 필요', message: '어르신 연락처를 입력해 주십시오. (전화가 없는 경우 \'없음\' 입력)' });
      phoneInput?.focus();
      return false;
    }

    // 6. 거주지 도로명 주소 검증
    const addressInput = root.querySelector('#targetAddressInput');
    const addressVal = (rawTarget.address || addressInput?.value || '').trim();
    if (!addressVal) {
      notifier.alert({ title: '거주지 주소 필수', message: '어르신 거주지 도로명 주소를 입력해 주십시오.' });
      addressInput?.focus();
      return false;
    }

    return true;
  }
}
