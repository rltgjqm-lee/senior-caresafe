/**
 * 시니어안심살핌 (senior-caresafe) - 애플리케이션 메인 오케스트레이터 (app.js)
 * 
 * 거버넌스 및 아키텍처 원칙:
 * 1. ESM 모듈 구조 완벽 준수 (전역 window 오염 금지)
 * 2. API 계층(client.js)을 통한 데이터 처리 일원화
 * 3. S-GDS ➔ 시니어안심살핌 앱2앱 딥링크 수신 및 자동 프리필
 * 4. 오프라인 보안 에어갭(.wrk/.json) 파일 연계 (암호 123456)
 * 5. 미래 일자 차단 가드 및 참여자 2인 1조 명부 관리
 */

import { UidEngine } from './core/uid.js';
import { notifier } from './utils/notifier.js';
import { apiClient } from './api/client.js';
import { sessionManager, ADMIN_PRESETS } from './session/sessionManager.js';

class AppController {
  constructor() {
    this.currentTab = 'session';
    this.currentPage = 1;
    this.pageSize = 10;
    this.cachedRecords = [];
  }

  async init() {
    this.initServiceWorker();
    this.initTabs();
    this.initSessionUI();
    this.initRecordFormUI();
    this.initBackupUI();

    // 세션 로드 및 UI 반영
    await this.loadSession();

    // 대장 레코드 로드
    await this.refreshRecordsTable();

    // 앱2앱 딥링크 수신 검사
    this.handleAppToAppDeepLink();
  }

  // 서비스 워커 등록
  initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('서비스 워커 등록 실패:', err);
        });
      });
    }
  }

  // 탭 전환 초기화
  initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });

    if (tabName === 'records') {
      this.refreshRecordsTable();
    }
  }

  // --- 1. 활동 세션 UI 관리 ---
  initSessionUI() {
    const presetSelect = document.getElementById('session-preset');
    const dateInput = document.getElementById('session-date');
    const participantsContainer = document.getElementById('participants-container');
    const addParticipantBtn = document.getElementById('btn-add-participant');
    const saveSessionBtn = document.getElementById('btn-save-session');

    // 활동 일자 미래 일자 차단 가드 1: max 속성
    const today = sessionManager.getTodayDateString();
    dateInput.max = today;
    dateInput.value = today;

    // 활동 일자 변경 시 가드 2: JS 이벤트 검증
    dateInput.addEventListener('change', () => {
      const check = sessionManager.validateActivityDate(dateInput.value);
      if (!check.isValid) {
        notifier.alert(check.message, '활동 일자 입력 제한');
        dateInput.value = check.fallbackDate;
      }
    });

    // 프리셋 변경 핸들러
    presetSelect.addEventListener('change', () => {
      this.applyPreset(presetSelect.value);
    });

    // 참여자 추가 버튼
    addParticipantBtn.addEventListener('click', () => {
      this.addParticipantRow('');
    });

    // 세션 저장 버튼
    saveSessionBtn.addEventListener('click', async () => {
      await this.saveCurrentSession();
    });
  }

  applyPreset(presetKey) {
    const preset = ADMIN_PRESETS[presetKey];
    if (!preset) return;

    document.getElementById('session-m-name').value = `${preset.mName} (${preset.mUid})`;
    document.getElementById('session-o-name').value = `${preset.oName} (${preset.oUid})`;

    const buSelect = document.getElementById('session-b-uid');
    buSelect.innerHTML = '';
    preset.businessUnits.forEach((bu) => {
      const opt = document.createElement('option');
      opt.value = bu.bUid;
      opt.textContent = `${bu.bName} (${bu.bUid})`;
      buSelect.appendChild(opt);
    });
  }

  addParticipantRow(name = '') {
    const container = document.getElementById('participants-container');
    const index = container.children.length + 1;

    const row = document.createElement('div');
    row.className = 'participant-row';
    row.innerHTML = `
      <input type="text" class="form-input participant-input" placeholder="참여자 ${index} 성명" value="${name}">
      <button type="button" class="btn btn-danger-subtle btn-remove-participant" style="min-width: 44px; height: 42px;">삭제</button>
    `;

    row.querySelector('.btn-remove-participant').addEventListener('click', () => {
      if (container.children.length <= 1) {
        notifier.toast('최소 1인의 참여자는 유지되어야 합니다.', 'warning');
        return;
      }
      row.remove();
      this.reindexParticipantRows();
    });

    container.appendChild(row);
  }

  reindexParticipantRows() {
    const rows = document.querySelectorAll('.participant-row');
    rows.forEach((row, idx) => {
      const input = row.querySelector('.participant-input');
      input.placeholder = `참여자 ${idx + 1} 성명`;
    });
  }

  async loadSession() {
    const session = await sessionManager.loadSession();
    
    // UI 반영
    const presetKey = session.mUid === 'M-28-260' ? 'SEO_GU' : 'BUPYEONG';
    document.getElementById('session-preset').value = presetKey;
    this.applyPreset(presetKey);

    document.getElementById('session-b-uid').value = session.bUid;
    document.getElementById('session-date').value = session.activityDate;

    // 참여자 목록 렌더링
    const container = document.getElementById('participants-container');
    container.innerHTML = '';
    (session.participants || []).forEach((name) => {
      this.addParticipantRow(name);
    });

    this.updateHeaderSessionBadge(session);
  }

  async saveCurrentSession() {
    const presetKey = document.getElementById('session-preset').value;
    const preset = ADMIN_PRESETS[presetKey];
    const buSelect = document.getElementById('session-b-uid');
    const selectedBuOption = buSelect.options[buSelect.selectedIndex];

    const participantInputs = document.querySelectorAll('.participant-input');
    const participants = Array.from(participantInputs).map((input) => input.value.trim());

    try {
      const saved = await sessionManager.saveSession({
        mUid: preset.mUid,
        mName: preset.mName,
        oUid: preset.oUid,
        oName: preset.oName,
        bUid: buSelect.value,
        bName: selectedBuOption ? selectedBuOption.textContent : buSelect.value,
        activityDate: document.getElementById('session-date').value,
        participants
      });

      this.updateHeaderSessionBadge(saved);
      notifier.toast('활동 세션 정보가 안전하게 저장되었습니다.', 'success');
    } catch (err) {
      notifier.alert(err.message, '세션 저장 오류');
    }
  }

  updateHeaderSessionBadge(session) {
    const badge = document.getElementById('header-session-badge');
    if (!badge) return;
    const partNames = (session.participants || []).join(', ');
    badge.textContent = `${session.mName} | ${partNames || '미등록'} (${session.activityDate})`;
  }

  // --- 2. 현장 상담/조사 작성 UI 및 앱2앱 연계 ---
  initRecordFormUI() {
    const saveBtn = document.getElementById('btn-save-record');
    const resetBtn = document.getElementById('btn-reset-record');

    saveBtn.addEventListener('click', async () => {
      await this.handleSaveRecord();
    });

    resetBtn.addEventListener('click', () => {
      this.resetRecordForm();
    });
  }

  // S-GDS -> 시니어안심살핌 앱2앱 딥링크 수신 처리
  handleAppToAppDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const payload = urlParams.get('payload');

    if (action === 'import_sgds' && payload) {
      try {
        const decodedJson = decodeURIComponent(escape(atob(payload)));
        const data = JSON.parse(decodedJson);

        // Case UID 검증 (없을 경우 신규 발급 지원)
        let caseUid = data.caseUid;
        if (!caseUid || !UidEngine.isValidCaseUid(caseUid)) {
          const orgCode = data.orgCode || 'O-28-260-01';
          caseUid = UidEngine.generateCaseUid(orgCode);
        }

        // 서식 필드에 자동 프리필(Auto-fill)
        document.getElementById('record-case-uid').value = caseUid;
        document.getElementById('record-name').value = data.targetName || '';
        document.getElementById('record-birth').value = data.birth || '';
        document.getElementById('record-gender').value = data.gender || '남';
        document.getElementById('record-phone').value = data.phone || '';
        document.getElementById('record-address').value = data.address || '';
        document.getElementById('record-gds-score').value = data.gdsScore !== undefined ? `${data.gdsScore}점` : '';
        document.getElementById('record-risk-level').value = data.riskLevel || '정상';
        document.getElementById('record-notes').value = `[S-GDS 연계 조사일: ${data.surveyDate || '오늘'}, 조사자: ${data.inspector || '현장활동가'}]\n특이사항: 노인우울 선별조사 결과 ${data.riskLevel || '정상'}(${data.gdsScore || 0}점)으로 연계 수신됨.`;

        // 상담 작성 탭으로 자동 전환
        this.switchTab('form');

        // 성공 토스트 알림
        notifier.toast(`S-GDS 검사 결과(${data.targetName || '어르신'}, ${data.gdsScore || 0}점)가 성공적으로 연계되었습니다.`, 'success');

        // URL 파라미터 정돈 (중복 유입 방지)
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        console.error('S-GDS 딥링크 파싱 실패:', err);
        notifier.alert('연계 데이터를 해석하지 못했습니다. 규격을 확인해 주십시오.', '데이터 연계 오류');
      }
    }
  }

  async handleSaveRecord() {
    const name = document.getElementById('record-name').value.trim();
    if (!name) {
      notifier.toast('어르신 성명을 입력해 주십시오.', 'warning');
      document.getElementById('record-name').focus();
      return;
    }

    let caseUid = document.getElementById('record-case-uid').value.trim();
    const session = sessionManager.getCurrentSession();

    if (!caseUid || !UidEngine.isValidCaseUid(caseUid)) {
      caseUid = UidEngine.generateCaseUid(session.oUid);
    }

    const record = {
      caseUid,
      targetName: name,
      birth: document.getElementById('record-birth').value.trim(),
      gender: document.getElementById('record-gender').value,
      phone: document.getElementById('record-phone').value.trim(),
      address: document.getElementById('record-address').value.trim(),
      livingType: document.getElementById('record-living-type').value,
      gdsScore: document.getElementById('record-gds-score').value.trim(),
      riskLevel: document.getElementById('record-risk-level').value,
      notes: document.getElementById('record-notes').value.trim(),
      mUid: session.mUid,
      mName: session.mName,
      oUid: session.oUid,
      oName: session.oName,
      bUid: session.bUid,
      bName: session.bName,
      activityDate: session.activityDate,
      inspectors: session.participants
    };

    const result = await apiClient.saveRecord(record);
    if (result.success) {
      notifier.toast(`[${name}] 어르신 상담 기록이 안전하게 저장되었습니다.`, 'success');
      this.resetRecordForm();
      this.switchTab('records');
    } else {
      notifier.alert(`기록 저장 실패: ${result.error}`, '저장 실패');
    }
  }

  resetRecordForm() {
    document.getElementById('record-case-uid').value = '';
    document.getElementById('record-name').value = '';
    document.getElementById('record-birth').value = '';
    document.getElementById('record-gender').value = '남';
    document.getElementById('record-phone').value = '';
    document.getElementById('record-address').value = '';
    document.getElementById('record-living-type').value = '독거';
    document.getElementById('record-gds-score').value = '';
    document.getElementById('record-risk-level').value = '정상';
    document.getElementById('record-notes').value = '';
  }

  // --- 3. 대장 목록 및 중앙 정렬 페이지네이션 ---
  async refreshRecordsTable() {
    this.cachedRecords = await apiClient.getRecords();
    this.renderRecordsTable();
  }

  renderRecordsTable() {
    const tbody = document.getElementById('records-tbody');
    const totalCountEl = document.getElementById('pagination-total');
    const navEl = document.getElementById('pagination-nav');

    if (!tbody) return;
    tbody.innerHTML = '';

    const total = this.cachedRecords.length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));

    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, total);
    const pageRecords = this.cachedRecords.slice(startIndex, endIndex);

    // 총 건수 표출
    totalCountEl.textContent = `총 ${total}건 (${total > 0 ? startIndex + 1 : 0}~${endIndex} 표시)`;

    if (pageRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">등록된 현장 상담 기록이 없습니다.</td></tr>`;
      navEl.innerHTML = `<button type="button" class="page-btn active" disabled>1</button>`;
      return;
    }

    pageRecords.forEach((rec, idx) => {
      const tr = document.createElement('tr');
      const rowNum = startIndex + idx + 1;
      const riskBadgeClass = rec.riskLevel === '고위험군' ? 'badge-danger' : (rec.riskLevel === '중위험군' ? 'badge-warning' : 'badge-success');
      const inspectorsStr = (rec.inspectors || []).join(', ');

      tr.innerHTML = `
        <td>${rowNum}</td>
        <td><code>${rec.caseUid}</code></td>
        <td><strong>${rec.targetName}</strong></td>
        <td>${rec.activityDate || '-'}</td>
        <td><span class="badge ${riskBadgeClass}">${rec.riskLevel || '정상'}</span></td>
        <td>${inspectorsStr || '-'}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-detail" style="height: 32px; padding: 0 10px; font-size: 12.5px;">상세</button>
          <button type="button" class="btn btn-danger-subtle btn-delete" style="height: 32px; padding: 0 10px; font-size: 12.5px; margin-left: 4px;">삭제</button>
        </td>
      `;

      tr.querySelector('.btn-detail').addEventListener('click', () => {
        this.loadRecordIntoForm(rec);
      });

      tr.querySelector('.btn-delete').addEventListener('click', async () => {
        const confirmed = await notifier.confirm(`[${rec.targetName}] 어르신의 상담 기록을 삭제하시겠습니까?`, '기록 삭제 확인');
        if (confirmed) {
          await apiClient.deleteRecord(rec.caseUid);
          notifier.toast('상담 기록이 삭제되었습니다.', 'info');
          await this.refreshRecordsTable();
        }
      });

      tbody.appendChild(tr);
    });

    // 중앙 정렬 페이지네이션 렌더링
    this.renderPaginationNav(totalPages);
  }

  renderPaginationNav(totalPages) {
    const navEl = document.getElementById('pagination-nav');
    navEl.innerHTML = '';

    if (totalPages <= 1) {
      navEl.innerHTML = `<button type="button" class="page-btn active" disabled>1</button>`;
      return;
    }

    // 처음 버튼
    const firstBtn = document.createElement('button');
    firstBtn.type = 'button';
    firstBtn.className = 'page-btn';
    firstBtn.textContent = '<<';
    firstBtn.disabled = this.currentPage === 1;
    firstBtn.addEventListener('click', () => { this.currentPage = 1; this.renderRecordsTable(); });
    navEl.appendChild(firstBtn);

    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '<';
    prevBtn.disabled = this.currentPage === 1;
    prevBtn.addEventListener('click', () => { this.currentPage--; this.renderRecordsTable(); });
    navEl.appendChild(prevBtn);

    // 숫자 버튼
    for (let p = 1; p <= totalPages; p++) {
      const numBtn = document.createElement('button');
      numBtn.type = 'button';
      numBtn.className = `page-btn ${p === this.currentPage ? 'active' : ''}`;
      numBtn.textContent = p;
      numBtn.addEventListener('click', () => { this.currentPage = p; this.renderRecordsTable(); });
      navEl.appendChild(numBtn);
    }

    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '>';
    nextBtn.disabled = this.currentPage === totalPages;
    nextBtn.addEventListener('click', () => { this.currentPage++; this.renderRecordsTable(); });
    navEl.appendChild(nextBtn);

    // 마지막 버튼
    const lastBtn = document.createElement('button');
    lastBtn.type = 'button';
    lastBtn.className = 'page-btn';
    lastBtn.textContent = '>>';
    lastBtn.disabled = this.currentPage === totalPages;
    lastBtn.addEventListener('click', () => { this.currentPage = totalPages; this.renderRecordsTable(); });
    navEl.appendChild(lastBtn);
  }

  loadRecordIntoForm(rec) {
    document.getElementById('record-case-uid').value = rec.caseUid || '';
    document.getElementById('record-name').value = rec.targetName || '';
    document.getElementById('record-birth').value = rec.birth || '';
    document.getElementById('record-gender').value = rec.gender || '남';
    document.getElementById('record-phone').value = rec.phone || '';
    document.getElementById('record-address').value = rec.address || '';
    document.getElementById('record-living-type').value = rec.livingType || '독거';
    document.getElementById('record-gds-score').value = rec.gdsScore || '';
    document.getElementById('record-risk-level').value = rec.riskLevel || '정상';
    document.getElementById('record-notes').value = rec.notes || '';

    this.switchTab('form');
    notifier.toast(`[${rec.targetName}] 어르신 정보를 상담 서식에 불러왔습니다.`, 'info');
  }

  // --- 4. 오프라인 보안 에어갭 파일 연계 (.wrk / .json) ---
  initBackupUI() {
    const exportBtn = document.getElementById('btn-export-backup');
    const importFileInput = document.getElementById('backup-file-input');
    const triggerImportBtn = document.getElementById('btn-trigger-import');

    // 내보내기 (.wrk / 암호화 규격 파일)
    exportBtn.addEventListener('click', async () => {
      const data = await apiClient.exportBackupData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const todayStr = sessionManager.getTodayDateString().replace(/-/g, '');
      const a = document.createElement('a');
      a.href = url;
      a.download = `senior_caresafe_backup_${todayStr}.wrk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notifier.toast('오프라인 보안 백업 파일(.wrk)이 생성되었습니다.', 'success');
    });

    // 파일 선택 트리거
    triggerImportBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    // 파일 가져오기 시 암호 검증 (공통 표준 암호 123456)
    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const inputPassword = prompt('오프라인 보안 파일 열기 암호를 입력해 주십시오:');
      if (inputPassword !== '123456') {
        notifier.alert('보안 암호가 일치하지 않습니다. 복원을 중단합니다.', '암호 불일치');
        importFileInput.value = '';
        return;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const result = await apiClient.importBackupData(parsed);

        notifier.toast(`백업 파일에서 ${result.count}건의 상담 기록을 성공적으로 복원했습니다.`, 'success');
        await this.loadSession();
        await this.refreshRecordsTable();
      } catch (err) {
        console.error('백업 파일 파싱 실패:', err);
        notifier.alert('파일 형식이 올바르지 않거나 훼손된 데이터입니다.', '복원 실패');
      } finally {
        importFileInput.value = '';
      }
    });
  }
}

// 애플리케이션 기동
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
