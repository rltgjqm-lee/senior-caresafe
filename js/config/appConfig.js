/**
 * @file appConfig.js
 * @description 환경별(로컬 개발 vs 클라우드플레어 실서비스) 앱 연동 URL 설정 (ESM)
 */

const isProduction = typeof window !== 'undefined' && (
  window.location.protocol === 'https:' ||
  window.location.hostname.includes('pages.dev') ||
  window.location.hostname.includes('workers.dev')
);

export const APP_CONFIG = {
  isProduction,
  urls: {
    // 1. 시니어안심살핌 (허브 앱)
    seniorCareSafe: isProduction
      ? 'https://senior-caresafe.pages.dev'
      : 'http://localhost:8989',

    // 2. 노인우울 선별검사 (S-GDS PWA)
    sgds: isProduction
      ? 'https://sgds.autoplus7.workers.dev'
      : 'http://localhost:8787',

    // 3. 노인환경살핌 (현장조사 PWA)
    gatekeeper: isProduction
      ? 'https://wellriskkeeper.pages.dev/pages/pwa-survey.html'
      : 'http://localhost:8888/pages/pwa-survey.html'
  }
};
