/**
 * @file step3WorkSelectView.js
 * @description 3단계 현장 업무 선택 뷰 (1. S-GDS PWA 연동 / 2. 고독사예방게이트키퍼 PWA 연동) (ESM)
 */

import { notifier } from '../utils/notifier.js';
import { maskName, maskPhone, maskAddress } from '../utils/masking.js';
import { sessionManager } from '../session/sessionManager.js';
import { APP_CONFIG } from '../config/appConfig.js';

export class Step3WorkSelectView {
  constructor(mediator) {
    this.mediator = mediator;
    this.isAgencyCollapsed = true;
    this.isTargetCollapsed = true;
    this.plannedTasks = ['sgds', 'wrk'];
  }

  render(container) {
    if (!container) return;

    const rawTarget = this.mediator.step2View.rawTarget;
    const session = sessionManager.getCurrentSession();
    const orgCode = session.oUid || 'O-28-237-01';
    const inspectorsStr = (session.participants || []).join(', ');

    // 전사 v05 표준 PII 마스킹
    const maskedTargetName = maskName(rawTarget.name);
    const maskedPhone = maskPhone(rawTarget.phone);
    const fullAddress = `${rawTarget.address || ''}`.trim();
    const maskedAddr = maskAddress(fullAddress);

    const hasSgdsTask = this.plannedTasks.includes('sgds');
    const hasWrkTask = this.plannedTasks.includes('wrk');
    const isSgdsDone = Boolean(rawTarget.gdsCompleted || rawTarget.gdsScore !== null);
    const isWrkDone = Boolean(rawTarget.wrkCompleted);
    const isAllPlannedDone = (!hasSgdsTask || isSgdsDone) && (!hasWrkTask || isWrkDone);

    container.innerHTML = `
      <!-- 1순위: 참여자(기관 및 조사원) 요약 바 -->
      <div class="card-box" style="padding: 10px 14px; margin-top: 4px; margin-bottom: 6px;">
        <div id="btnToggleStep3Agency" style="cursor: pointer; user-select: none;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a;">
              <span>${session.oName || '기관설정'}</span>
              <span style="font-size: 12px; font-weight: 600; color: #475569; margin-left: 6px;">(조사원: ${inspectorsStr || '미등록'})</span>
            </div>
            <span id="step3AgencyIndicator" style="font-size: 11.5px; font-weight: 700; color: #475569; white-space: nowrap;">
              ${this.isAgencyCollapsed ? '펼치기 ▼' : '접기 ▲'}
            </span>
          </div>
        </div>

        <div id="step3AgencyBody" style="display: ${this.isAgencyCollapsed ? 'none' : 'block'}; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #475569;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div>소속 지자체: <strong style="color: #0f172a;">${session.mName || session.sigungu || ''}</strong></div>
            <div>기관 코드: <strong style="color: #0f172a; font-family: monospace;">${orgCode}</strong></div>
            <div>담당 사업단: <strong style="color: #0f172a;">${session.bName || session.bUid || ''}</strong></div>
            <div>활동 일자: <strong style="color: #0f172a;">${session.activityDate}</strong></div>
          </div>
        </div>
      </div>

      <!-- 2순위: 대상자 어르신 요약 바 (마스킹 적용) -->
      <div class="card-box" style="padding: 10px 14px; margin-bottom: 12px; background: #ffffff; border-left: 4px solid #2563eb;">
        <div id="btnToggleStep3Target" style="cursor: pointer; user-select: none;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px;">
              <span>${maskedTargetName || '어르신'} 어르신</span>
              <span style="font-size: 12px; font-weight: 600; color: #64748b;">(${rawTarget.seq || '001'})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="uid-badge" style="font-size: 11px;">${rawTarget.caseUid || ''}</span>
              <span id="step3TargetIndicator" style="font-size: 11.5px; font-weight: 700; color: #475569; white-space: nowrap;">
                ${this.isTargetCollapsed ? '펼치기 ▼' : '접기 ▲'}
              </span>
            </div>
          </div>

          <div style="margin-top: 4px; font-size: 12.5px; color: #475569;">
            <span>${rawTarget.age || 0}세 / ${rawTarget.gender || '미지정'}</span>
            <span style="margin: 0 4px; color: #cbd5e1;">|</span>
            <span>${maskedPhone || '연락처 없음'}</span>
          </div>
        </div>

        <div id="step3TargetBody" style="display: ${this.isTargetCollapsed ? 'none' : 'block'}; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
          <div>거주지 주소: <strong style="color: #334155;">${maskedAddr || '주소 미입력'}</strong></div>
          ${(rawTarget.gdsCompleted || rawTarget.gdsScore !== null) ? `
            <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
              <span style="color: #1e40af; font-weight: 700;">S-GDS 검사:</span>
              <span class="badge badge-success">검사 완료</span>
            </div>
          ` : ''}
          ${rawTarget.wrkCompleted ? `
            <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
              <span style="color: #047857; font-weight: 700;">노인환경살핌:</span>
              <span class="badge badge-success">조사 완료</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 3. 현장 업무 선택 카드 -->
      <div class="card-box">
        <div class="card-title" style="margin-bottom: 10px;">
          <span>현장 업무 선택</span>
        </div>

        <!-- 당일 방문 업무 범위 선택 체크박스 -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 8px;">당일 방문 업무 범위 선택</div>
          <div style="display: flex; gap: 18px; font-size: 13px; font-weight: 600; color: #0f172a;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="chkTaskSgds" ${hasSgdsTask ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
              <span>1. 노인우울검사</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="chkTaskWrk" ${hasWrkTask ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
              <span>2. 노인환경살핌</span>
            </label>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <!-- 1번: 노인우울 선별검사 (S-GDS) -->
          <div id="cardTaskSgds" style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px; background: #ffffff; opacity: ${hasSgdsTask ? '1' : '0.45'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 15px; font-weight: 700; color: #0f172a;">1. 노인우울 선별검사 (S-GDS)</span>
              ${!hasSgdsTask ? `
                <span class="badge" style="background: #f1f5f9; color: #64748b;">당일 제외</span>
              ` : (isSgdsDone ? `
                <span class="badge badge-success">검사 완료</span>
              ` : `
                <span class="badge badge-primary">선별검사</span>
              `)}
            </div>
            <button type="button" id="btnRunSgds" class="btn-primary" style="width: 100%; height: 44px; font-size: 14px; font-weight: 700;" ${!hasSgdsTask ? 'disabled' : ''}>
              노인우울 선별검사 (S-GDS) 시작
            </button>
          </div>

          <!-- 2번: 노인환경살핌 -->
          <div id="cardTaskWrk" style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px; background: #ffffff; opacity: ${hasWrkTask ? '1' : '0.45'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 15px; font-weight: 700; color: #0f172a;">2. 노인환경살핌</span>
              ${!hasWrkTask ? `
                <span class="badge" style="background: #f1f5f9; color: #64748b;">당일 제외</span>
              ` : (isWrkDone ? `
                <span class="badge badge-success">조사 완료</span>
              ` : `
                <span class="badge badge-primary">현장조사 PWA</span>
              `)}
            </div>
            <button type="button" id="btnRunGatekeeper" class="btn-secondary" style="width: 100%; height: 44px; font-size: 14px; font-weight: 700;" ${!hasWrkTask ? 'disabled' : ''}>
              노인환경살핌 현장조사 시작
            </button>
          </div>
        </div>

        ${isAllPlannedDone ? `
          <div style="margin-top: 14px; padding: 12px; background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 8px; text-align: center;">
            <div style="font-size: 13.5px; font-weight: 700; color: #065f46; margin-bottom: 4px;">✔ 당일 계획된 방문 업무 완료</div>
            <div style="font-size: 12px; color: #047857; margin-bottom: 10px;">이 어르신에 대한 조사가 모두 끝났습니다.</div>
            <button type="button" id="btnNextTargetFromStep3" class="btn-primary" style="width: 100%; height: 40px; font-size: 13px; font-weight: 700; background: #065f46; border-color: #065f46;">
              다음 대상자 진행 (대상자 목록)
            </button>
          </div>
        ` : ''}
      </div>
    `;

    this.bindEvents(container, rawTarget, session);
  }

  bindEvents(container, rawTarget, session) {
    const btnToggleAgency = container.querySelector('#btnToggleStep3Agency');
    const agencyBody = container.querySelector('#step3AgencyBody');
    const agencyIndicator = container.querySelector('#step3AgencyIndicator');

    const btnToggleTarget = container.querySelector('#btnToggleStep3Target');
    const targetBody = container.querySelector('#step3TargetBody');
    const targetIndicator = container.querySelector('#step3TargetIndicator');

    const chkTaskSgds = container.querySelector('#chkTaskSgds');
    const chkTaskWrk = container.querySelector('#chkTaskWrk');

    const btnRunSgds = container.querySelector('#btnRunSgds');
    const btnRunGatekeeper = container.querySelector('#btnRunGatekeeper');
    const btnNextTarget = container.querySelector('#btnNextTargetFromStep3');

    // 과업 선택 체크박스 변경 이벤트
    const handleTaskChange = () => {
      const sgdsChecked = chkTaskSgds.checked;
      const wrkChecked = chkTaskWrk.checked;

      if (!sgdsChecked && !wrkChecked) {
        notifier.toast('최소 1개 이상의 현장 업무를 선택해야 합니다.', 'warning', 2000);
        chkTaskSgds.checked = true;
        this.plannedTasks = ['sgds'];
        this.render(container);
        return;
      }

      this.plannedTasks = [];
      if (sgdsChecked) this.plannedTasks.push('sgds');
      if (wrkChecked) this.plannedTasks.push('wrk');
      this.render(container);
    };

    chkTaskSgds?.addEventListener('change', handleTaskChange);
    chkTaskWrk?.addEventListener('change', handleTaskChange);

    // 다음 대상자 진행 버튼
    btnNextTarget?.addEventListener('click', () => {
      this.mediator.goToStep(2);
    });

    // 참여자 토글
    btnToggleAgency?.addEventListener('click', () => {
      this.isAgencyCollapsed = !this.isAgencyCollapsed;
      agencyBody.style.display = this.isAgencyCollapsed ? 'none' : 'block';
      agencyIndicator.textContent = this.isAgencyCollapsed ? '펼치기 ▼' : '접기 ▲';
    });

    // 대상자 토글
    btnToggleTarget?.addEventListener('click', () => {
      this.isTargetCollapsed = !this.isTargetCollapsed;
      targetBody.style.display = this.isTargetCollapsed ? 'none' : 'block';
      targetIndicator.textContent = this.isTargetCollapsed ? '펼치기 ▼' : '접기 ▲';
    });

    const createPayload = () => {
      // 소속 지자체(mName) 기반 시도/시군구 추출
      let sido = '인천광역시';
      let sigungu = '부평구';
      if (session.mName) {
        const parts = session.mName.trim().split(/\s+/);
        if (parts.length >= 2) {
          sido = parts[0];
          sigungu = parts[1];
        } else if (parts.length === 1) {
          sigungu = parts[0];
        }
      }

      const payloadObj = {
        version: '1.0',
        // 1. 기관 정본 데이터
        orgCode: session.oUid || orgCode,
        orgName: session.oName || '부평노인인력개발센터',
        mUid: session.mUid,
        mName: session.mName,
        sido: sido,
        sigungu: sigungu,

        // 2. 사업단 데이터
        bUid: session.bUid,
        buName: session.bName,

        // 3. 참여자 (조사원) 데이터
        participants: session.participants || [],
        inspector: (session.participants || []).join(', '),
        surveyDate: session.activityDate,

        // 4. 대상자 정본 데이터
        caseUid: rawTarget.caseUid,
        targetName: rawTarget.name,
        birth: rawTarget.birth,
        gender: rawTarget.gender,
        phone: rawTarget.phone,
        address: rawTarget.address,

        returnUrl: `${window.location.origin}${window.location.pathname}`
      };
      const jsonStr = JSON.stringify(payloadObj);
      return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
    };

    // 1. S-GDS 검사 시작 (환경별 URL 자동 라우팅)
    btnRunSgds?.addEventListener('click', () => {
      this.mediator.isAppToAppNavigating = true;
      const payloadBase64 = createPayload();
      const baseUrl = APP_CONFIG.urls.sgds;
      const sgdsUrl = `${baseUrl}/?action=import_target&payload=${encodeURIComponent(payloadBase64)}`;

      notifier.toast('노인우울 선별검사(S-GDS)로 이동합니다...', 'info', 1500);
      setTimeout(() => {
        window.location.href = sgdsUrl;
      }, 300);
    });

    // 2. 노인환경살핌 현장조사 시작 (환경별 URL 자동 라우팅)
    btnRunGatekeeper?.addEventListener('click', () => {
      this.mediator.isAppToAppNavigating = true;
      const payloadBase64 = createPayload();
      const baseUrl = APP_CONFIG.urls.gatekeeper;
      const gatekeeperUrl = `${baseUrl}?action=import_target&payload=${encodeURIComponent(payloadBase64)}`;

      notifier.toast('노인환경살핌 현장조사로 이동합니다...', 'info', 1500);
      setTimeout(() => {
        window.location.href = gatekeeperUrl;
      }, 300);
    });
  }
}
