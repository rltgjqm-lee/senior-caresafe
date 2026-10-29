/**
 * @file masking.js
 * @description 전사 v05 표준 제로트러스트 PII 개인정보 동적 마스킹 유틸리티 (wellriskkeeper 정통 규격) (ESM)
 */

export function maskName(name) {
  if (!name) return '';
  const clean = name.trim();
  if (clean.length <= 1) return clean;
  if (clean.length === 2) return clean[0] + '*';
  return clean[0] + '*'.repeat(clean.length - 2) + clean[clean.length - 1];
}

export function maskBirth(birth) {
  if (!birth) return '';
  const clean = birth.trim().replace(/\D/g, '');
  if (clean.length === 6) {
    return `${clean.slice(0, 2)}****`;
  }
  return clean.length >= 4 ? `${clean.slice(0, 4)}-**-**` : clean;
}

export function maskPhone(phone) {
  if (!phone || phone === '없음') return phone || '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
  } else if (clean.length === 10) {
    return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');
  }
  return phone;
}

// 읍면동/도로명까지만 남기고 이후 건물번호, 번지, 동·호수 일체 완벽 마스킹
export function maskAddress(addr) {
  if (!addr) return '';
  const clean = addr.trim();
  const match = clean.match(/^(.+?([가-힣0-9]+[동로길읍면]))(\s+.*)?$/);
  if (match) {
    return `${match[1]} ***`;
  }
  const parts = clean.split(/\s+/);
  if (parts.length >= 3) {
    return `${parts.slice(0, 3).join(' ')} ***`;
  }
  return clean.endsWith('***') ? clean : `${clean} ***`;
}

export function maskUid(uid) {
  if (!uid) return '';
  const parts = uid.split('-');
  if (parts.length >= 5) {
    return `${parts[0]}-${parts[1]}-***-${parts[3]}-${parts[4]}`;
  } else if (parts.length === 4) {
    return `${parts[0]}-${parts[1]}-***-${parts[3]}`;
  }
  return uid;
}
