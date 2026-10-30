/**
 * @file step2TargetView.js
 * @description 2단계 대상자 확인 뷰 (배정 명부 모달 조회 + 정규식 주소 마스킹) (ESM)
 */

import { notifier } from '../utils/notifier.js';
import { UidEngine } from '../core/uid.js';
import { apiClient } from '../api/client.js';
import { maskName, maskBirth, maskPhone, maskAddress } from '../utils/masking.js';
import { sessionManager } from '../session/sessionManager.js';
import { ValidationService } from '../services/validationService.js';

// 배정 대상자 마스터 목록 (wellriskkeeper AssignmentService 동기화)
const ASSIGNED_TARGET_CASES = [
  {
    caseUid: 'C-28-260-01-001',
    seq: '001',
    name: '김만석',
    birth: '480315',
    gender: '남',
    phone: '010-3849-2910',
    address: '인천 서구 서곶로 284 302호',
    status: '정기방문'
  },
  {
    caseUid: 'C-28-260-01-002',
    seq: '002',
    name: '이점순',
    birth: '521104',
    gender: '여',
    phone: '010-7712-4432',
    address: '인천 서구 봉오재3로 94 104동 502호',
    status: '신규배정'
  },
  {
    caseUid: 'C-28-260-01-003',
    seq: '003',
    name: '박성철',
    birth: '550720',
    gender: '남',
    phone: '010-5544-1122',
    address: '인천 서구 원적로 12 1층',
    status: '집중안부'
  }
];

export class Step2TargetView {
  constructor(mediator) {
    this.mediator = mediator;
    this.rawTarget = {
      caseUid: '',
      seq: '001',
      name: '',
      birth: '',
      age: 0,
      gender: '남',
      phone: '',
      address: '',
      baseAddress: '',
      detailAddress: '',
      gdsScore: null,
      riskLevel: null
    };
  }

  render(container) {
    if (!container) return;

    const session = sessionManager.getCurrentSession();
    const orgCode = session.oUid || 'O-28-237-01';

    if (!this.rawTarget.caseUid) {
      this.rawTarget.caseUid = `${orgCode.replace(/^O-/, 'C-')}-${this.rawTarget.seq}`;
    }

    const currentSeq = this.rawTarget.caseUid.split('-').pop() || '001';
    this.rawTarget.seq = currentSeq;
    const inspectorsStr = (session.participants || []).join(', ');

    // 기본 주소 및 상세 주소 분리
    if (!this.rawTarget.baseAddress && this.rawTarget.address) {
      const fullAddr = this.rawTarget.address.trim();
      const addrMatch = fullAddr.match(/^(.+?[로|길|동|읍|면|가]\s*\d+(?:-\d+)?)(?:\s+(.*))?$/);
      if (addrMatch) {
        this.rawTarget.baseAddress = addrMatch[1].trim();
        this.rawTarget.detailAddress = (addrMatch[2] || '').trim();
      } else {
        this.rawTarget.baseAddress = fullAddr;
        this.rawTarget.detailAddress = '';
      }
    }

    // 전사 v05 정통 PII 마스킹 처리
    const displayName = maskName(this.rawTarget.name);
    const displayBirth = maskBirth(this.rawTarget.birth);
    const displayPhone = maskPhone(this.rawTarget.phone);
    const displayBaseAddress = maskAddress(this.rawTarget.baseAddress || this.rawTarget.address);

    container.innerHTML = `
      <!-- 1. 상단: 참여기관 및 활동 현황 요약 바 (고정 플랫형) -->
      <div class="card-box" style="padding: 10px 14px; margin-top: 4px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13.5px; font-weight: 700; color: #0f172a;">${session.oName || '기관설정'}</span>
          <span style="font-size: 11px; font-family: monospace; color: #94a3b8;">${orgCode}</span>
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
          <span>조사원: <strong style="color: #334155;">${inspectorsStr || '미등록'}</strong></span>
          <span style="margin: 0 4px; color: #cbd5e1;">|</span>
          <span>${session.bName || session.bUid || ''}</span>
        </div>
      </div>

      <!-- 2. 대상자 확인 카드 (마스킹 적용) -->
      <div class="card-box" style="margin-top: 4px;">
        <div class="card-title">
          <span>대상자 확인</span>
          <span class="uid-badge" id="displayTargetCaseUid">${this.rawTarget.caseUid}</span>
        </div>

        <!-- 🛡️ 게이트키퍼 표준 1줄 3자리 관리번호 툴바: [관리번호: 001] + (S) (N+) (R) -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px; margin-bottom: 14px; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 12.5px; color: #334155; font-weight: 700;">관리번호:</span>
            <input type="text" id="targetSeqInput" class="form-input" style="font-family: monospace; font-weight: 700; text-align: center; width: 62px; height: 30px; padding: 0 4px; font-size: 14px; border-radius: 15px; border: 1.5px solid #cbd5e1;" maxlength="4" placeholder="001" value="${currentSeq}">
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" id="btnSearchUid" style="width: 30px; height: 30px; border-radius: 50%; padding: 0; font-size: 11.5px; font-weight: 800; background: #ecfdf5; border: 1.5px solid #6ee7b7; color: #047857; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; user-select: none;" title="배정 대상자 목록 조회">S</button>
            <button type="button" id="btnGenFieldUid" style="width: 30px; height: 30px; border-radius: 50%; padding: 0; font-size: 11.5px; font-weight: 800; background: #fff7ed; border: 1.5px solid #fdba74; color: #c2410c; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; user-select: none;" title="현장 신규발굴 채번">N+</button>
            <button type="button" id="btnResetTargetForm" style="width: 30px; height: 30px; border-radius: 50%; padding: 0; font-size: 11.5px; font-weight: 800; background: #f1f5f9; border: 1.5px solid #cbd5e1; color: #475569; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; user-select: none;" title="관리번호 초기화">R</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">어르신 성명 <span style="color:#b45309;">*</span></label>
          <input type="text" id="targetNameInput" class="form-input" placeholder="어르신 성함 입력 (S 버튼으로 조회)" value="${displayName}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">생년월일 (마스킹)</label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="text" id="targetBirthInput" maxlength="6" placeholder="YYMMDD" class="form-input" value="${displayBirth}" style="flex: 1;">
              <span style="font-size: 12px; font-weight: 700; color: #475569; white-space: nowrap;">(<span id="targetAgeVal">${this.rawTarget.age || 0}</span>세)</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">성별</label>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="obs-btn-switch ${this.rawTarget.gender === '남' ? 'active' : ''}" id="btnGenderM" style="flex: 1;">남성</button>
              <button type="button" class="obs-btn-switch ${this.rawTarget.gender === '여' ? 'active' : ''}" id="btnGenderF" style="flex: 1;">여성</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">연락처 (마스킹)</label>
          <input type="tel" id="targetPhoneInput" class="form-input" placeholder="010-****-0000" value="${displayPhone}">
        </div>

        <div class="form-group">
          <label class="form-label">거주지 주소 <span style="color:#b45309;">*</span></label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="targetBaseAddressInput" class="form-input" placeholder="도로명/지번 기본 주소" readonly style="flex: 1; background: #f8fafc; cursor: pointer;" value="${displayBaseAddress}">
            <button type="button" class="btn-secondary" id="btnSearchAddress" style="height: 42px; padding: 0 14px; font-size: 13px; font-weight: 600; width: auto; flex: initial; white-space: nowrap;">주소 검색</button>
          </div>
          <div style="margin-top: 6px;">
            <input type="text" id="targetDetailAddressInput" class="form-input" placeholder="상세주소 입력 (예: 101동 202호, 반지하 등)" value="${this.rawTarget.detailAddress || ''}">
          </div>
        </div>

        ${(this.rawTarget.gdsCompleted || this.rawTarget.gdsScore !== null) ? `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12.5px; font-weight: 700; color: #1e40af;">S-GDS 우울 선별검사 연계</span>
            <span class="badge badge-success">검사 완료</span>
          </div>
        ` : ''}

        <div class="btn-action-row" style="margin-top: 20px;">
          <button type="button" class="btn-secondary" id="btnBackToStep1">이전 (기관설정)</button>
          <button type="button" class="btn-primary" id="btnNextToStep3">다음 (업무 선택)</button>
        </div>
      </div>

      <!-- 배정 대상자 조회 모달 팝업 -->
      <div id="targetSearchModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; padding: 16px;">
        <div style="background: #ffffff; border-radius: 8px; max-width: 480px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <div style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 15px; font-weight: 700; color: #0f172a;">배정 대상자 선택</span>
            <button type="button" id="btnCloseTargetModal" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
          </div>
          <div id="targetModalList" style="padding: 12px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
            <!-- 대상자 카드 목록 렌더링 -->
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container, session, orgCode);
  }

  calcAge(birth) {
    if (!birth || birth.length < 2) return 0;
    const rawDigits = birth.replace(/\D/g, '');
    const yy = rawDigits.slice(0, 2);
    if (!yy) return 0;
    const yearPrefix = parseInt(yy, 10) > 30 ? '19' : '20';
    const birthYear = parseInt(yearPrefix + yy, 10);
    const currentYear = new Date().getFullYear();
    return Math.max(0, currentYear - birthYear);
  }

  bindEvents(container, session, orgCode) {
    const seqInput = container.querySelector('#targetSeqInput');
    const caseUidBadge = container.querySelector('#displayTargetCaseUid');
    const btnSearchUid = container.querySelector('#btnSearchUid');
    const btnGenFieldUid = container.querySelector('#btnGenFieldUid');
    const btnResetTargetForm = container.querySelector('#btnResetTargetForm');

    const nameInput = container.querySelector('#targetNameInput');
    const birthInput = container.querySelector('#targetBirthInput');
    const ageVal = container.querySelector('#targetAgeVal');
    const btnGenderM = container.querySelector('#btnGenderM');
    const btnGenderF = container.querySelector('#btnGenderF');
    const phoneInput = container.querySelector('#targetPhoneInput');

    const baseAddrInput = container.querySelector('#targetBaseAddressInput');
    const detailAddrInput = container.querySelector('#targetDetailAddressInput');
    const btnSearchAddress = container.querySelector('#btnSearchAddress');

    const btnBackToStep1 = container.querySelector('#btnBackToStep1');
    const btnNextToStep3 = container.querySelector('#btnNextToStep3');

    const modal = container.querySelector('#targetSearchModal');
    const modalList = container.querySelector('#targetModalList');
    const btnCloseModal = container.querySelector('#btnCloseTargetModal');

    const prefix = orgCode.replace(/^O-/, 'C-');

    // 관리번호 입력
    seqInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim().toUpperCase();
      this.rawTarget.seq = val || '001';
      this.rawTarget.caseUid = `${prefix}-${this.rawTarget.seq}`;
      if (caseUidBadge) caseUidBadge.textContent = this.rawTarget.caseUid;
    });

    // 실시간 생년월일 입력 및 나이 자동 계산
    birthInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val.includes('*')) return;
      if (val.length === 6 && /^\d{6}$/.test(val)) {
        const age = this.calcAge(val);
        if (ageVal) ageVal.textContent = age;
        this.rawTarget.age = age;
        this.rawTarget.birth = val;
      }
    });

    // 연락처 실시간 오토하이픈
    phoneInput?.addEventListener('input', (e) => {
      if (e.target.value.includes('*')) return;
      const formatted = this.formatPhoneNumber(e.target.value);
      e.target.value = formatted;
      this.rawTarget.phone = formatted;
    });

    // 주소 결합 헬퍼
    const updateCombinedAddress = () => {
      const base = (this.rawTarget.baseAddress || '').trim();
      const detail = (this.rawTarget.detailAddress || '').trim();
      this.rawTarget.address = detail ? `${base} ${detail}` : base;
    };

    // 카카오 우편번호/도로명 주소 검색 팝업
    const openAddressSearch = () => {
      if (!window.daum || !window.daum.Postcode) {
        notifier.toast('카카오 주소 검색 서비스를 로드하는 중입니다. 잠시 후 다시 시도해 주세요.', 'info');
        return;
      }

      new window.daum.Postcode({
        oncomplete: (data) => {
          let fullAddr = data.roadAddress || data.jibunAddress;
          let extraAddr = '';
          if (data.userSelectedType === 'R') {
            if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
              extraAddr += data.bname;
            }
            if (data.buildingName !== '' && data.apartment === 'Y') {
              extraAddr += (extraAddr !== '' ? `, ${data.buildingName}` : data.buildingName);
            }
            if (extraAddr !== '') {
              fullAddr += ` (${extraAddr})`;
            }
          }

          this.rawTarget.baseAddress = fullAddr;
          if (baseAddrInput) baseAddrInput.value = fullAddr;
          updateCombinedAddress();
          if (detailAddrInput) detailAddrInput.focus();
        }
      }).open();
    };

    btnSearchAddress?.addEventListener('click', openAddressSearch);
    baseAddrInput?.addEventListener('click', openAddressSearch);

    detailAddrInput?.addEventListener('input', (e) => {
      this.rawTarget.detailAddress = e.target.value.trim();
      updateCombinedAddress();
    });

    // (S) 배정 대상자 모달 열기
    btnSearchUid?.addEventListener('click', () => {
      modalList.innerHTML = '';
      ASSIGNED_TARGET_CASES.forEach((c) => {
        const item = document.createElement('div');
        item.style.padding = '12px';
        item.style.border = '1px solid #cbd5e1';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.background = '#f8fafc';
        item.style.transition = 'background-color 0.15s';

        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #0f172a; font-size: 14px;">${maskName(c.name)} (${c.gender})</strong>
            <span class="uid-badge" style="font-size: 11px;">관리번호: ${c.seq}</span>
          </div>
          <div style="font-size: 12px; color: #475569;">${maskBirth(c.birth)} | ${maskPhone(c.phone)}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${maskAddress(c.address)}</div>
        `;

        item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#eff6ff'; });
        item.addEventListener('mouseleave', () => { item.style.backgroundColor = '#f8fafc'; });

        item.addEventListener('click', () => {
          this.rawTarget.name = c.name;
          this.rawTarget.birth = c.birth;
          this.rawTarget.age = this.calcAge(c.birth);
          this.rawTarget.gender = c.gender;
          this.rawTarget.phone = c.phone;
          this.rawTarget.address = c.address;
          this.rawTarget.baseAddress = '';
          this.rawTarget.detailAddress = '';
          this.rawTarget.seq = c.seq;
          this.rawTarget.caseUid = `${prefix}-${c.seq}`;

          modal.style.display = 'none';
          this.render(container);
          notifier.toast(`[${maskName(c.name)} 어르신 (${c.seq})] 배정 정보를 불러왔습니다.`, 'success');
        });

        modalList.appendChild(item);
      });

      modal.style.display = 'flex';
    });

    btnCloseModal?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // (N+) 현장 신규 발굴 3자리 자동 채번
    btnGenFieldUid?.addEventListener('click', () => {
      const fieldUid = UidEngine.generateFieldCaseUid(orgCode);
      const seqPart = fieldUid.split('-').pop();
      this.rawTarget.caseUid = fieldUid;
      this.rawTarget.seq = seqPart;
      this.rawTarget.name = '';
      this.rawTarget.birth = '';
      this.rawTarget.age = 0;
      this.rawTarget.phone = '';
      this.rawTarget.address = '';
      this.rawTarget.baseAddress = '';
      this.rawTarget.detailAddress = '';
      this.render(container);
      notifier.toast(`현장 신규 관리번호 [${seqPart}]가 채번되었습니다.`, 'success');
    });

    // (R) 관리번호 리셋
    btnResetTargetForm?.addEventListener('click', () => {
      this.rawTarget.seq = '001';
      this.rawTarget.caseUid = `${prefix}-001`;
      this.rawTarget.name = '';
      this.rawTarget.birth = '';
      this.rawTarget.age = 0;
      this.rawTarget.phone = '';
      this.rawTarget.address = '';
      this.rawTarget.baseAddress = '';
      this.rawTarget.detailAddress = '';
      this.render(container);
      notifier.toast('관리번호 및 인적사항이 초기화되었습니다.', 'info');
    });

    // 성별 토글
    btnGenderM?.addEventListener('click', () => {
      btnGenderM.classList.add('active');
      btnGenderF.classList.remove('active');
      this.rawTarget.gender = '남';
    });
    btnGenderF?.addEventListener('click', () => {
      btnGenderF.classList.add('active');
      btnGenderM.classList.remove('active');
      this.rawTarget.gender = '여';
    });

    // 이전 (기관설정)
    btnBackToStep1?.addEventListener('click', () => {
      this.mediator.goToStep(1);
    });

    // 다음 (업무 선택)
    btnNextToStep3?.addEventListener('click', () => {
      const rawNameInput = nameInput.value.trim();
      if (!rawNameInput.includes('*')) {
        this.rawTarget.name = rawNameInput;
      }
      const rawBirthInput = birthInput.value.trim();
      if (!rawBirthInput.includes('*')) {
        this.rawTarget.birth = rawBirthInput;
        this.rawTarget.age = this.calcAge(rawBirthInput);
      }
      const rawPhoneInput = phoneInput.value.trim();
      if (!rawPhoneInput.includes('*')) {
        this.rawTarget.phone = rawPhoneInput;
      }
      if (baseAddrInput && !baseAddrInput.value.includes('*')) {
        this.rawTarget.baseAddress = baseAddrInput.value.trim();
      }
      if (detailAddrInput) {
        this.rawTarget.detailAddress = detailAddrInput.value.trim();
      }
      updateCombinedAddress();

      // 1:1 필드 단위 정밀 밸리데이션 검증
      if (!ValidationService.validateStep2(this.rawTarget, container)) {
        return;
      }

      this.mediator.goToStep(3);
    });
  }

  formatPhoneNumber(value) {
    if (!value) return '';
    const num = value.replace(/[^0-9]/g, '');
    if (num.startsWith('02')) {
      if (num.length <= 2) return num;
      if (num.length <= 5) return `${num.slice(0, 2)}-${num.slice(2)}`;
      if (num.length <= 9) return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`;
      return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
    }
    if (num.length <= 3) return num;
    if (num.length <= 6) return `${num.slice(0, 3)}-${num.slice(3)}`;
    if (num.length <= 10) return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
    return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
  }
}
