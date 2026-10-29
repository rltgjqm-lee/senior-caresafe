/**
 * 시니어안심살핌 (senior-caresafe) - 메인 애플리케이션 진입점 (app.js)
 * 게이트키퍼 / S-GDS 정통 프로그레시브 스텝 아키텍처 승계 (ESM)
 */

import { Step1AgencyView } from './views/step1AgencyView.js';
import { Step2TargetView } from './views/step2TargetView.js';
import { Step3WorkSelectView } from './views/step3WorkSelectView.js';
import { UidEngine } from './core/uid.js';
import { notifier } from './utils/notifier.js';
import { apiClient } from './api/client.js';
import { sessionManager } from './session/sessionManager.js';
import { ValidationService } from './services/validationService.js';

class AppMediator {
  constructor() {
    this.currentStep = 1;
    this.lastBackPressTime = 0;
    this.isAppToAppNavigating = false;
    this.step1View = new Step1AgencyView(this);
    this.step2View = new Step2TargetView(this);
    this.step3View = new Step3WorkSelectView(this);
  }

  async init() {
    this.bindTabEvents();
    this.initHistoryAndBackButtonProtection();
    
    // 1단계 렌더링
    const step1Box = document.getElementById('step1Container');
    if (step1Box) {
      await this.step1View.render(step1Box);
    }

    // 앱2앱 딥링크 수신 검사
    this.handleAppToAppDeepLink();
  }

  bindTabEvents() {
    const tabs = document.querySelectorAll('.pwa-tab-item');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetStep = parseInt(tab.getAttribute('data-tab'), 10);
        this.handleTabNavigation(targetStep);
      });
    });
  }

  handleTabNavigation(targetStep) {
    // 1. 역방향 이동은 언제나 자유롭게 허용 (3 ➔ 2 ➔ 1)
    if (targetStep <= this.currentStep) {
      this.goToStep(targetStep);
      return;
    }

    // 2. 1단계 정밀 1:1 검증 (2단계 이상 전진 시)
    const session = sessionManager.getCurrentSession();
    if (!ValidationService.validateStep1(session, document.getElementById('step1Container'))) {
      this.goToStep(1);
      return;
    }

    // 3. 2단계 정밀 1:1 검증 (3단계 전진 시)
    if (targetStep > 2) {
      if (!ValidationService.validateStep2(this.step2View.rawTarget, document.getElementById('step2Container'))) {
        this.goToStep(2);
        return;
      }
    }

    this.goToStep(targetStep);
  }

  async goToStep(stepNumber, pushHistory = true) {
    this.currentStep = stepNumber;

    if (pushHistory) {
      try {
        window.history.pushState({ step: stepNumber }, `Step ${stepNumber}`, `#step${stepNumber}`);
      } catch (err) {}
    }

    // 탭 스타일 전환 (completed, active, upcoming)
    const tabs = document.querySelectorAll('.pwa-tab-item');
    tabs.forEach((tab) => {
      const tabNum = parseInt(tab.getAttribute('data-tab'), 10);
      tab.classList.remove('completed', 'active', 'upcoming');

      if (tabNum < stepNumber) {
        tab.classList.add('completed');
      } else if (tabNum === stepNumber) {
        tab.classList.add('active');
      } else {
        tab.classList.add('upcoming');
      }
    });

    // 컨테이너 표시/숨김 및 뷰 렌더링
    for (let i = 1; i <= 3; i++) {
      const container = document.getElementById(`step${i}Container`);
      if (container) {
        const isActive = i === stepNumber;
        container.classList.toggle('active', isActive);
        if (isActive) {
          if (i === 1) await this.step1View.render(container);
          if (i === 2) this.step2View.render(container);
          if (i === 3) this.step3View.render(container);
        }
      }
    }
  }

  initHistoryAndBackButtonProtection() {
    try {
      window.history.pushState({ step: this.currentStep }, '', window.location.href);

      // 1. 키보드 백스페이스(Backspace) 오동작 이탈 차단
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.keyCode === 8) {
          const t = e.target;
          const isInput = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
          if (!isInput) {
            e.preventDefault();
            return false;
          }
        }
      });

      // 2. 브라우저 탭 닫기/새로고침 시 데이터 유실 경고 (Step 2 인적사항 작성 중에만 한정)
      window.addEventListener('beforeunload', (e) => {
        if (this.isAppToAppNavigating) return;
        if (this.currentStep === 2) {
          e.preventDefault();
          e.returnValue = '작성 중인 대상자 인적사항이 있습니다. 정말 나가시겠습니까?';
          return e.returnValue;
        }
      });

      // 3. 스마트폰 물리/제스처 뒤로가기 가드 (S-GDS 표준 규격 동일)
      window.addEventListener('popstate', () => {
        // 뒤로 가버린 히스토리를 현재 단계로 즉각 복원하여 화면 고정
        try {
          window.history.pushState({ step: this.currentStep }, '', window.location.href);
        } catch (err) {}

        // 3-1. 인앱 모달(알림/확인창) 열려있으면 화면 이동 대신 모달만 닫기
        const wrkModal = document.getElementById('wrkModalContainer');
        if (wrkModal && wrkModal.classList.contains('active')) {
          wrkModal.classList.remove('active');
          setTimeout(() => {
            wrkModal.style.display = 'none';
            wrkModal.innerHTML = '';
          }, 200);
          return;
        }

        // 3-2. 2단계 배정 모달 열려있으면 모달만 먼저 닫기
        const targetModal = document.getElementById('targetSearchModal');
        if (targetModal && targetModal.style.display === 'flex') {
          targetModal.style.display = 'none';
          return;
        }

        // 3-3. 1단계(첫 화면)에서 뒤로가기 시 2초 내 2회 터치 종료 가드
        if (this.currentStep === 1) {
          const now = Date.now();
          if (now - this.lastBackPressTime < 2000) {
            try { window.close(); } catch (err) {}
            history.back();
            return;
          }

          this.lastBackPressTime = now;
          notifier.toast('뒤로가기 버튼을 한 번 더 누르면 종료됩니다.', 'warning', 2000);
          return;
        }

        // 3-4. 2~3단계 진행 중 하드웨어 뒤로가기 확인창
        if (this.currentStep === 2) {
          notifier.confirm({
            title: '이전 단계 이동 확인',
            message: '입력 중인 대상자 인적사항이 있습니다.\n이전 단계(기관설정)로 이동하시겠습니까?',
            confirmText: '이전 단계로',
            cancelText: '계속 진행',
            onConfirm: () => {
              this.goToStep(1, false);
            }
          });
          return;
        }

        if (this.currentStep === 3) {
          notifier.confirm({
            title: '이전 단계 이동 확인',
            message: '현장 업무 선택 화면입니다.\n이전 단계(대상자 확인)로 이동하시겠습니까?',
            confirmText: '이전 단계로',
            cancelText: '계속 진행',
            onConfirm: () => {
              this.goToStep(2, false);
            }
          });
          return;
        }
      });
    } catch (err) {
      console.error('BackButton protection init error:', err);
    }
  }

  // S-GDS ➔ 시니어안심살핌 연계 수신 핸들러
  handleAppToAppDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const payload = urlParams.get('payload');

    if (action === 'import_sgds' && payload) {
      try {
        const decodedJson = decodeURIComponent(escape(atob(payload)));
        const data = JSON.parse(decodedJson);

        let caseUid = data.caseUid;
        if (!caseUid || !UidEngine.isValidCaseUid(caseUid)) {
          const orgCode = data.orgCode || 'O-28-260-01';
          caseUid = UidEngine.generateCaseUid(orgCode);
        }

        // 대상자 뷰에 연동 데이터 주입 (검사 완료 단일 표출)
        this.step2View.rawTarget = {
          ...this.step2View.rawTarget,
          caseUid,
          seq: caseUid.split('-').pop() || '001',
          name: data.targetName || this.step2View.rawTarget.name,
          birth: data.birth || this.step2View.rawTarget.birth,
          age: this.step2View.calcAge(data.birth || this.step2View.rawTarget.birth),
          gender: data.gender || this.step2View.rawTarget.gender,
          phone: data.phone || this.step2View.rawTarget.phone,
          address: data.address || this.step2View.rawTarget.address,
          gdsCompleted: true
        };

        // 3단계(업무 선택) 화면으로 이동하여 연계 확인
        this.goToStep(3);
        notifier.toast('S-GDS 우울선별검사가 완료되었습니다.', 'success');

        // URL 히스토리 정돈
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        console.error('연동 데이터 해석 실패:', err);
        notifier.alert('연계 데이터 디코딩에 실패했습니다.', '연계 오류');
      }
    }

    if (action === 'import_wrk' && payload) {
      try {
        const decodedJson = decodeURIComponent(escape(atob(payload)));
        const data = JSON.parse(decodedJson);

        let caseUid = data.caseUid;
        if (!caseUid || !UidEngine.isValidCaseUid(caseUid)) {
          const orgCode = data.orgCode || 'O-28-260-01';
          caseUid = UidEngine.generateCaseUid(orgCode);
        }

        // 대상자 뷰에 연동 데이터 주입 (게이트키퍼 조사 완료 단일 표출)
        this.step2View.rawTarget = {
          ...this.step2View.rawTarget,
          caseUid,
          seq: caseUid.split('-').pop() || '001',
          name: data.targetName || this.step2View.rawTarget.name,
          birth: data.birth || this.step2View.rawTarget.birth,
          age: this.step2View.calcAge(data.birth || this.step2View.rawTarget.birth),
          gender: data.gender || this.step2View.rawTarget.gender,
          phone: data.phone || this.step2View.rawTarget.phone,
          address: data.address || this.step2View.rawTarget.address,
          wrkCompleted: true
        };

        this.goToStep(3);
        notifier.toast('고독사예방게이트키퍼 현장조사가 완료되었습니다.', 'success');

        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        console.error('연동 데이터 해석 실패:', err);
        notifier.alert('게이트키퍼 연계 데이터 디코딩에 실패했습니다.', '연계 오류');
      }
    }
  }
}

// 애플리케이션 기동 및 PWA Service Worker 등록
document.addEventListener('DOMContentLoaded', () => {
  const mediator = new AppMediator();
  mediator.init();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker 등록 완료:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker 등록 실패:', err);
        });
    });
  }
});
