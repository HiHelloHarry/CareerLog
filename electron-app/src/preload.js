import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('careerlog', {
  // 추적 제어
  getStatus: () => ipcRenderer.invoke('get-status'),
  startTracking: () => ipcRenderer.invoke('start-tracking'),
  stopTracking: () => ipcRenderer.invoke('stop-tracking'),

  // 데이터
  getTimeline: (sessionId) => ipcRenderer.invoke('get-timeline', sessionId),
  getLastSession: () => ipcRenderer.invoke('get-last-session'),
  saveMemo: (activityId, memo) => ipcRenderer.invoke('save-memo', activityId, memo),
  generateCareerRecord: (sessionId) => ipcRenderer.invoke('generate-career-record', sessionId),
  getCareerRecords: () => ipcRenderer.invoke('get-career-records'),

  // 설정
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  hasApiKey: () => ipcRenderer.invoke('has-api-key'),

  // 메인 프로세스 → 렌더러 이벤트
  onNavigate: (cb) => ipcRenderer.on('navigate', (_, view) => cb(view)),
  onTrackingStatus: (cb) => ipcRenderer.on('tracking-status', (_, data) => cb(data)),
});
