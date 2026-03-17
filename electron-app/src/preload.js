import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('careerlog', {
  // 추적 제어
  getStatus: () => ipcRenderer.invoke('get-status'),
  startTracking: (project) => ipcRenderer.invoke('start-tracking', project),
  stopTracking: () => ipcRenderer.invoke('stop-tracking'),

  // 데이터
  getTimeline: (sessionId) => ipcRenderer.invoke('get-timeline', sessionId),
  getLastSession: () => ipcRenderer.invoke('get-last-session'),
  getSession: (sessionId) => ipcRenderer.invoke('get-session', sessionId),
  saveMemo: (activityId, memo) => ipcRenderer.invoke('save-memo', activityId, memo),
  generateCareerRecord: (sessionId) => ipcRenderer.invoke('generate-career-record', sessionId),
  getCareerRecords: () => ipcRenderer.invoke('get-career-records'),
  updateCareerRecord: (recordId, newContent) => ipcRenderer.invoke('update-career-record', recordId, newContent),

  // 설정
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  hasApiKey: () => ipcRenderer.invoke('has-api-key'),
  getApiKeyMasked: () => ipcRenderer.invoke('get-api-key-masked'),
  validateApiKey: (key) => ipcRenderer.invoke('validate-api-key', key),
  deleteAllData: () => ipcRenderer.invoke('delete-all-data'),

  // 메인 프로세스 → 렌더러 이벤트
  onNavigate: (cb) => ipcRenderer.on('navigate', (_, view) => cb(view)),
  onTrackingStatus: (cb) => ipcRenderer.on('tracking-status', (_, data) => cb(data)),
});
