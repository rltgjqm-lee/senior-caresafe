/**
 * @file notifier.js
 * @description 브라우저 네이티브 alert()을 대체하는 인앱 토스트 및 모달 알림 모듈 (ESM)
 */

class Notifier {
  constructor() {
    this.toastContainer = null;
    this.modalOverlay = null;
    this.initContainers();
  }

  initContainers() {
    if (typeof document === 'undefined') return;
    // 1. Toast Container
    let toastBox = document.getElementById('wrkToastContainer');
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.id = 'wrkToastContainer';
      toastBox.className = 'wrk-toast-container';
      document.body.appendChild(toastBox);
    }
    this.toastContainer = toastBox;

    // 2. Modal Container
    let modalBox = document.getElementById('wrkModalContainer');
    if (!modalBox) {
      modalBox = document.createElement('div');
      modalBox.id = 'wrkModalContainer';
      modalBox.className = 'wrk-modal-container';
      document.body.appendChild(modalBox);
    }
    this.modalOverlay = modalBox;
  }

  /**
   * 하단 토스트 알림 표시
   * @param {string} message - 출력할 메시지
   * @param {'info'|'success'|'warning'|'error'} type - 알림 유형
   * @param {number} duration - 표시 시간 (ms, 기본 2500ms)
   */
  toast(message, type = 'info', duration = 2500) {
    if (!this.toastContainer) this.initContainers();

    const toastEl = document.createElement('div');
    toastEl.className = `wrk-toast wrk-toast-${type}`;
    
    // 배지 라벨
    const badgeMap = {
      info: '안내',
      success: '성공',
      warning: '주의',
      error: '확인'
    };
    const badgeText = badgeMap[type] || '알림';

    toastEl.innerHTML = `
      <span class="wrk-toast-badge wrk-toast-badge-${type}">${badgeText}</span>
      <span class="wrk-toast-text">${this.escapeHtml(message)}</span>
    `;

    this.toastContainer.appendChild(toastEl);

    // 애니메이션 트리거
    requestAnimationFrame(() => {
      toastEl.classList.add('show');
    });

    // 자동 제거
    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 300);
    }, duration);
  }

  /**
   * 커스텀 인앱 모달 알림 (기존 alert() 대체, 문자열/객체 인자 및 Promise 양방향 완전 지원)
   * @param {string|Object} titleOrOptions - 모달 제목 또는 옵션 객체
   * @param {string} [maybeMessage=''] - 모달 설명 본문 (문자열 호출 시)
   * @param {Array<{label: string, value: string}>} [details=[]] - 상세 요약
   * @param {string} [confirmText='확인'] - 확인 버튼 텍스트
   * @param {Function} [onConfirm=null] - 확인 콜백
   * @returns {Promise<boolean>}
   */
  alert(titleOrOptions = '알림', maybeMessage = '', details = [], confirmText = '확인', onConfirm = null) {
    let title = '알림';
    let message = '';
    let confirmBtnText = '확인';
    let callback = null;
    let detailsArr = [];

    if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
      title = titleOrOptions.title || '알림';
      message = titleOrOptions.message || '';
      detailsArr = titleOrOptions.details || [];
      confirmBtnText = titleOrOptions.confirmText || '확인';
      callback = titleOrOptions.onConfirm || null;
    } else {
      title = String(titleOrOptions || '알림');
      message = String(maybeMessage || '');
      detailsArr = Array.isArray(details) ? details : [];
      confirmBtnText = confirmText || '확인';
      callback = onConfirm;
    }

    return new Promise((resolve) => {
      if (!this.modalOverlay) this.initContainers();

      const detailsHtml = detailsArr.length > 0 ? `
        <div class="wrk-modal-details">
          ${detailsArr.map(d => `
            <div class="wrk-modal-detail-row">
              <span class="wrk-modal-detail-label">${this.escapeHtml(d.label)}</span>
              <strong class="wrk-modal-detail-val">${this.escapeHtml(String(d.value))}</strong>
            </div>
          `).join('')}
        </div>
      ` : '';

      this.modalOverlay.innerHTML = `
        <div class="wrk-modal-backdrop"></div>
        <div class="wrk-modal-card">
          <div class="wrk-modal-header">
            <h3 class="wrk-modal-title">${this.escapeHtml(title)}</h3>
          </div>
          <div class="wrk-modal-body">
            <p class="wrk-modal-desc">${this.escapeHtml(message).replace(/\n/g, '<br>')}</p>
            ${detailsHtml}
          </div>
          <div class="wrk-modal-footer">
            <button class="btn-primary-action wrk-modal-btn" id="wrkModalConfirmBtn">${this.escapeHtml(confirmBtnText)}</button>
          </div>
        </div>
      `;

      this.modalOverlay.style.display = 'flex';
      requestAnimationFrame(() => {
        this.modalOverlay.classList.add('active');
      });

      const confirmBtn = document.getElementById('wrkModalConfirmBtn');
      const backdrop = this.modalOverlay.querySelector('.wrk-modal-backdrop');
      const close = () => {
        this.modalOverlay.classList.remove('active');
        setTimeout(() => {
          this.modalOverlay.style.display = 'none';
          this.modalOverlay.innerHTML = '';
        }, 200);
        if (typeof callback === 'function') callback();
        resolve(true);
      };

      if (confirmBtn) {
        confirmBtn.addEventListener('click', close);
      }
      if (backdrop) {
        backdrop.addEventListener('click', close);
      }
    });
  }

  /**
   * 커스텀 인앱 모달 확인/취소창 (문자열/객체 인자 및 Promise 양방향 완전 지원)
   * @param {string|Object} titleOrOptions - 모달 제목 또는 옵션 객체
   * @param {string} [maybeMessage=''] - 모달 본문 (문자열 호출 시)
   * @param {string} [confirmText='확인'] - 확인 버튼 텍스트
   * @param {string} [cancelText='취소'] - 취소 버튼 텍스트
   * @param {Function} [onConfirm=null] - 확인 콜백
   * @param {Function} [onCancel=null] - 취소 콜백
   * @returns {Promise<boolean>}
   */
  confirm(titleOrOptions = '확인', maybeMessage = '', confirmText = '확인', cancelText = '취소', onConfirm = null, onCancel = null) {
    let title = '확인';
    let message = '';
    let cText = '확인';
    let canText = '취소';
    let cbConfirm = null;
    let cbCancel = null;

    if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
      title = titleOrOptions.title || '확인';
      message = titleOrOptions.message || '';
      cText = titleOrOptions.confirmText || '확인';
      canText = titleOrOptions.cancelText || '취소';
      cbConfirm = titleOrOptions.onConfirm || null;
      cbCancel = titleOrOptions.onCancel || null;
    } else {
      title = String(titleOrOptions || '확인');
      message = String(maybeMessage || '');
      cText = confirmText || '확인';
      canText = cancelText || '취소';
      cbConfirm = onConfirm;
      cbCancel = onCancel;
    }

    return new Promise((resolve) => {
      if (!this.modalOverlay) this.initContainers();

      this.modalOverlay.innerHTML = `
        <div class="wrk-modal-backdrop"></div>
        <div class="wrk-modal-card">
          <div class="wrk-modal-header">
            <h3 class="wrk-modal-title">${this.escapeHtml(title)}</h3>
          </div>
          <div class="wrk-modal-body">
            <p class="wrk-modal-desc">${this.escapeHtml(message).replace(/\n/g, '<br>')}</p>
          </div>
          <div class="wrk-modal-footer" style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn-secondary-action" id="wrkModalCancelBtn" style="min-width:80px; padding:8px 14px; font-size:12px;">${this.escapeHtml(canText)}</button>
            <button class="btn-primary-action" id="wrkModalConfirmBtn" style="min-width:80px; padding:8px 14px; font-size:12px; background:#1e293b; color:#fff;">${this.escapeHtml(cText)}</button>
          </div>
        </div>
      `;

      this.modalOverlay.style.display = 'flex';
      requestAnimationFrame(() => {
        this.modalOverlay.classList.add('active');
      });

      const confirmBtn = document.getElementById('wrkModalConfirmBtn');
      const cancelBtn = document.getElementById('wrkModalCancelBtn');
      const backdrop = this.modalOverlay.querySelector('.wrk-modal-backdrop');

      const closeModal = (callback, result) => {
        this.modalOverlay.classList.remove('active');
        setTimeout(() => {
          this.modalOverlay.style.display = 'none';
          this.modalOverlay.innerHTML = '';
        }, 200);
        if (typeof callback === 'function') callback();
        resolve(result);
      };

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => closeModal(cbConfirm, true));
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal(cbCancel, false));
      }
      if (backdrop) {
        backdrop.addEventListener('click', () => closeModal(cbCancel, false));
      }
    });
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const notifier = new Notifier();
