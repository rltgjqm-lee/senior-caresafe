/**
 * @file step1AgencyView.js
 * @description 1단계 기관 및 활동 세션 설정 뷰 (전국 주소엔진 + [-] 버튼 규격) (ESM)
 */

import { notifier } from '../utils/notifier.js';
import { DISTRICT_MAP, INCHEON_SGG_CODES } from '../config/districts.js';
import { sessionManager, ADMIN_PRESETS } from '../session/sessionManager.js';
import { ValidationService } from '../services/validationService.js';

export class Step1AgencyView {
  constructor(mediator) {
    this.mediator = mediator;
    this.participants = ['김철수', '이영희'];
  }

  async render(container) {
    if (!container) return;

    const session = await sessionManager.loadSession();
    this.participants = [...(session.participants || ['김철수', '이영희'])];

    const currentSido = session.sido || '인천광역시';
    const currentSigungu = session.mUid === 'M-28-260' ? '서구' : (session.sigungu || '부평구');
    const currentOrgCode = session.oUid || 'O-28-237-01';

    const isSgdsReady = localStorage.getItem('CARESHAFE_SGDS_READY') === 'true';
    const isWrkReady = localStorage.getItem('CARESHAFE_WRK_READY') === 'true';
    const isAllAppsReady = isSgdsReady && isWrkReady;

    container.innerHTML = `
      <div class="card-box" style="margin-top: 4px;">
        <div class="card-title">
          <span>기관 및 활동 세션 설정</span>
          <span class="uid-badge" id="step1OrgBadge">${currentOrgCode}</span>
        </div>

        <div class="form-group">
          <label class="form-label">기관명</label>
          <input type="text" id="agencyInput" class="form-input" placeholder="(예) 부평노인인력개발센터" value="${session.oName || '부평노인인력개발센터'}">
        </div>

        <div class="form-group">
          <label class="form-label">기관 소재지 (소속 지자체)</label>
          <div style="display: flex; gap: 8px;">
            <select id="sidoSelect" class="form-input" style="flex: 1; cursor: pointer;"></select>
            <select id="sigunguSelect" class="form-input" style="flex: 1; cursor: pointer;"></select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">담당 사업단</label>
          <select id="buSelect" class="form-input" style="cursor: pointer;"></select>
        </div>

        <div class="form-group">
          <label class="form-label">활동 일자</label>
          <input type="date" id="activityDateInput" class="form-input" value="${session.activityDate}">
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="margin-bottom: 0;">현장 참여자 (조사원 2인 1조)</label>
            <button type="button" id="btnAddParticipant" class="btn-secondary" style="width: auto; padding: 0 12px; height: 32px; font-size: 12px; font-weight: 600;">+ 추가</button>
          </div>
          <div id="participantsContainer" style="display: flex; flex-direction: column; gap: 6px;"></div>
        </div>

        <!-- 현장 필수 연계 앱 설치/준비 상태 점검 아코디언 카드 -->
        <div style="margin-top: 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; overflow: hidden;">
          <div id="btnToggleAppSetup" style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; background: #f1f5f9;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">현장 필수 연계 앱 준비 점검</span>
              <span id="appSetupBadge" class="badge ${isAllAppsReady ? 'badge-success' : 'badge-primary'}" style="font-size: 11px;">
                ${isAllAppsReady ? '준비 완료' : '설치 점검 필요'}
              </span>
            </div>
            <span id="appSetupArrow" style="font-size: 11.5px; font-weight: 700; color: #64748b;">
              ${isAllAppsReady ? '펼치기 ▼' : '접기 ▲'}
            </span>
          </div>

          <div id="appSetupBody" style="display: ${isAllAppsReady ? 'none' : 'block'}; padding: 12px 14px;">
            <p style="font-size: 11.5px; color: #64748b; margin-bottom: 10px; line-height: 1.45;">
              통신 음영지역(지하, 엘리베이터 등)에서도 원활한 조사를 위해 아래 2개 연계 앱을 기기에 1회 이상 열어 설치(캐시) 상태를 완료해 주세요.
            </p>

            <!-- 1. S-GDS -->
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
              <div>
                <div style="font-size: 12.5px; font-weight: 700; color: #0f172a;">1. 노인우울 선별검사 (S-GDS)</div>
                <div id="sgdsInstallStatusText" style="font-size: 11px; color: ${isSgdsReady ? '#047857' : '#e11d48'}; font-weight: 600; margin-top: 2px;">
                  ${isSgdsReady ? '✔ 설치/준비 완료' : '● 미확인 (설치 필요)'}
                </div>
              </div>
              <button type="button" class="btn-secondary" id="btnCheckSgdsInstall" style="width: auto; height: 32px; padding: 0 10px; font-size: 11.5px; font-weight: 600;">
                ${isSgdsReady ? '다시 열기' : '앱 열기 및 설치'}
              </button>
            </div>

            <!-- 2. 게이트키퍼 -->
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
              <div>
                <div style="font-size: 12.5px; font-weight: 700; color: #0f172a;">2. 고독사 예방 게이트키퍼</div>
                <div id="wrkInstallStatusText" style="font-size: 11px; color: ${isWrkReady ? '#047857' : '#e11d48'}; font-weight: 600; margin-top: 2px;">
                  ${isWrkReady ? '✔ 설치/준비 완료' : '● 미확인 (설치 필요)'}
                </div>
              </div>
              <button type="button" class="btn-secondary" id="btnCheckWrkInstall" style="width: auto; height: 32px; padding: 0 10px; font-size: 11.5px; font-weight: 600;">
                ${isWrkReady ? '다시 열기' : '앱 열기 및 설치'}
              </button>
            </div>
          </div>
        </div>

        <div class="btn-action-row" style="margin-top: 20px;">
          <button type="button" class="btn-secondary" id="btnSaveAgency">설정 저장</button>
          <button type="button" class="btn-primary" id="btnNextToStep2">다음 (대상자 확인)</button>
        </div>
      </div>
    `;

    this.initDistrictDropdowns(container, currentSido, currentSigungu);
    this.updateBuDropdown(container, currentSigungu, session.bUid);
    this.renderParticipants(container);
    this.bindEvents(container);
  }

  // 전국 17개 시도/시군구 주소 엔진 동적 초기화
  initDistrictDropdowns(container, defaultSido, defaultSigungu) {
    const sidoSel = container.querySelector('#sidoSelect');
    const sigunguSel = container.querySelector('#sigunguSelect');
    if (!sidoSel || !sigunguSel) return;

    // 시도 옵션 렌더링
    sidoSel.innerHTML = '<option value="">시/도 선택</option>';
    Object.keys(DISTRICT_MAP).forEach((sido) => {
      const opt = document.createElement('option');
      opt.value = sido;
      opt.textContent = sido;
      if (sido === defaultSido) opt.selected = true;
      sidoSel.appendChild(opt);
    });

    // 시군구 렌더링 함수
    const updateSigungu = (sido, selectedSgg = '') => {
      sigunguSel.innerHTML = '<option value="">시/군/구 선택</option>';
      const list = DISTRICT_MAP[sido] || [];
      list.forEach((sgg) => {
        const opt = document.createElement('option');
        opt.value = sgg;
        opt.textContent = sgg;
        if (sgg === selectedSgg) opt.selected = true;
        sigunguSel.appendChild(opt);
      });

      const currentChosenSgg = sigunguSel.value || selectedSgg;
      this.updateOrgCodeAndPreset(container, sido, currentChosenSgg);
    };

    updateSigungu(sidoSel.value || defaultSido, defaultSigungu);

    sidoSel.addEventListener('change', (e) => {
      updateSigungu(e.target.value);
    });

    sigunguSel.addEventListener('change', (e) => {
      this.updateOrgCodeAndPreset(container, sidoSel.value, e.target.value);
    });
  }

  updateOrgCodeAndPreset(container, sido, sigungu) {
    const agencyInput = container.querySelector('#agencyInput');
    const badgeEl = container.querySelector('#step1OrgBadge');

    let orgCode = 'O-28-237-01';
    if (sido === '인천광역시') {
      const sggCode = INCHEON_SGG_CODES[sigungu] || '237';
      orgCode = `O-28-${sggCode}-01`;

      if (sigungu === '서구') {
        agencyInput.value = ADMIN_PRESETS.SEO_GU.oName;
      } else if (sigungu === '부평구') {
        agencyInput.value = ADMIN_PRESETS.BUPYEONG.oName;
      }
    }

    if (badgeEl) badgeEl.textContent = orgCode;
    this.updateBuDropdown(container, sigungu);
  }

  updateBuDropdown(container, sigungu, selectedBu = '') {
    const buSelect = container.querySelector('#buSelect');
    if (!buSelect) return;

    buSelect.innerHTML = '';
    const preset = sigungu === '서구' ? ADMIN_PRESETS.SEO_GU : ADMIN_PRESETS.BUPYEONG;

    preset.businessUnits.forEach((bu) => {
      const opt = document.createElement('option');
      opt.value = bu.bUid;
      opt.textContent = `${bu.bName} (${bu.bUid})`;
      if (bu.bUid === selectedBu) opt.selected = true;
      buSelect.appendChild(opt);
    });
  }

  // 참여자 명부: [-] 콤팩트 버튼 적용
  renderParticipants(container) {
    const listContainer = container.querySelector('#participantsContainer');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    this.participants.forEach((name, idx) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      row.innerHTML = `
        <input type="text" class="form-input participant-input" placeholder="참여자 ${idx + 1} 성명" value="${name}" style="flex: 1;">
        ${this.participants.length > 1 ? `<button type="button" class="btn-secondary btn-minus-part" data-idx="${idx}" style="min-width: 42px; width: 42px; height: 42px; padding: 0; font-size: 18px; font-weight: 700; color: #475569; display: flex; align-items: center; justify-content: center; border-radius: 6px;" title="참여자 삭제">-</button>` : ''}
      `;

      row.querySelector('.btn-minus-part')?.addEventListener('click', () => {
        this.participants.splice(idx, 1);
        this.renderParticipants(container);
      });

      listContainer.appendChild(row);
    });
  }

  bindEvents(container) {
    const dateInput = container.querySelector('#activityDateInput');
    const btnAddPart = container.querySelector('#btnAddParticipant');
    const btnSave = container.querySelector('#btnSaveAgency');
    const btnNext = container.querySelector('#btnNextToStep2');

    // 활동 일자 미래 일자 차단 가드 1: max 속성
    const today = sessionManager.getTodayDateString();
    dateInput.max = today;

    // 활동 일자 변경 시 가드 2: JS 이벤트 검증
    dateInput.addEventListener('change', () => {
      const check = sessionManager.validateActivityDate(dateInput.value);
      if (!check.isValid) {
        notifier.alert(check.message, '활동 일자 입력 제한');
        dateInput.value = check.fallbackDate;
      }
    });

    // 참여자 추가 버튼
    btnAddPart.addEventListener('click', () => {
      this.syncInputs(container);
      this.participants.push('');
      this.renderParticipants(container);
    });

    // 설정 저장
    btnSave.addEventListener('click', async () => {
      if (await this.saveData(container)) {
        notifier.toast('활동 세션 설정이 정상적으로 저장되었습니다.', 'success');
      }
    });

    // 다음 (대상자 확인)
    btnNext.addEventListener('click', async () => {
      if (await this.saveData(container)) {
        this.mediator.goToStep(2);
      }
    });

    // 현장 필수 앱 설치 점검 토글 및 동작 바인딩
    const btnToggleAppSetup = container.querySelector('#btnToggleAppSetup');
    const appSetupBody = container.querySelector('#appSetupBody');
    const appSetupArrow = container.querySelector('#appSetupArrow');
    const appSetupBadge = container.querySelector('#appSetupBadge');

    btnToggleAppSetup?.addEventListener('click', () => {
      const isHidden = appSetupBody.style.display === 'none';
      appSetupBody.style.display = isHidden ? 'block' : 'none';
      appSetupArrow.textContent = isHidden ? '접기 ▲' : '펼치기 ▼';
    });

    const updateAppSetupBadge = () => {
      const isSgdsReady = localStorage.getItem('CARESHAFE_SGDS_READY') === 'true';
      const isWrkReady = localStorage.getItem('CARESHAFE_WRK_READY') === 'true';
      const isAll = isSgdsReady && isWrkReady;
      if (appSetupBadge) {
        appSetupBadge.className = `badge ${isAll ? 'badge-success' : 'badge-primary'}`;
        appSetupBadge.textContent = isAll ? '준비 완료' : '설치 점검 필요';
      }
    };

    // 1. S-GDS 열기 및 설치 확인
    const btnCheckSgds = container.querySelector('#btnCheckSgdsInstall');
    const sgdsStatusText = container.querySelector('#sgdsInstallStatusText');
    btnCheckSgds?.addEventListener('click', () => {
      window.open('http://localhost:8787', '_blank');
      localStorage.setItem('CARESHAFE_SGDS_READY', 'true');
      if (sgdsStatusText) {
        sgdsStatusText.style.color = '#047857';
        sgdsStatusText.textContent = '✔ 설치/준비 완료';
      }
      btnCheckSgds.textContent = '다시 열기';
      updateAppSetupBadge();
      notifier.toast('노인우울(S-GDS) 앱 준비 상태가 확인되었습니다.', 'success', 2000);
    });

    // 2. 게이트키퍼 열기 및 설치 확인
    const btnCheckWrk = container.querySelector('#btnCheckWrkInstall');
    const wrkStatusText = container.querySelector('#wrkInstallStatusText');
    btnCheckWrk?.addEventListener('click', () => {
      window.open('http://localhost:8888/pages/pwa-survey.html', '_blank');
      localStorage.setItem('CARESHAFE_WRK_READY', 'true');
      if (wrkStatusText) {
        wrkStatusText.style.color = '#047857';
        wrkStatusText.textContent = '✔ 설치/준비 완료';
      }
      btnCheckWrk.textContent = '다시 열기';
      updateAppSetupBadge();
      notifier.toast('고독사 게이트키퍼 앱 준비 상태가 확인되었습니다.', 'success', 2000);
    });
  }

  syncInputs(container) {
    const inputs = container.querySelectorAll('.participant-input');
    this.participants = Array.from(inputs).map(inp => inp.value.trim());
  }

  async saveData(container) {
    this.syncInputs(container);
    const agencyName = container.querySelector('#agencyInput').value.trim();
    const sido = container.querySelector('#sidoSelect').value;
    const sigungu = container.querySelector('#sigunguSelect').value;
    const buSelect = container.querySelector('#buSelect');
    const activityDate = container.querySelector('#activityDateInput').value;

    const dataToValidate = {
      oName: agencyName,
      sido,
      sigungu,
      bUid: buSelect.value,
      activityDate,
      participants: this.participants
    };

    if (!ValidationService.validateStep1(dataToValidate, container)) {
      return false;
    }

    const sggCode = INCHEON_SGG_CODES[sigungu] || '237';
    const mUid = `M-28-${sggCode}`;
    const oUid = `O-28-${sggCode}-01`;

    try {
      await sessionManager.saveSession({
        sido,
        sigungu,
        mUid,
        mName: `${sido} ${sigungu}`,
        oUid,
        oName: agencyName,
        bUid: buSelect.value,
        bName: buSelect.options[buSelect.selectedIndex]?.textContent || buSelect.value,
        activityDate,
        participants: this.participants
      });
      return true;
    } catch (err) {
      notifier.alert(err.message, '세션 저장 오류');
      return false;
    }
  }
}
