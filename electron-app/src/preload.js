import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('careerlog', {
  // 추적 제어
  getStatus:      ()           => ipcRenderer.invoke('get-status'),
  startTracking:  (project)    => ipcRenderer.invoke('start-tracking', project),
  stopTracking:   ()           => ipcRenderer.invoke('stop-tracking'),

  // 데이터
  getTimeline:          (sessionId)              => ipcRenderer.invoke('get-timeline', sessionId),
  getLastSession:       ()                       => ipcRenderer.invoke('get-last-session'),
  getSession:           (sessionId)              => ipcRenderer.invoke('get-session', sessionId),
  getSessions:          ()                       => ipcRenderer.invoke('get-sessions'),
  saveMemo:             (activityId, memo)       => ipcRenderer.invoke('save-memo', activityId, memo),
  generateCareerRecord: (sessionId, template)    => ipcRenderer.invoke('generate-career-record', sessionId, template),
  getCareerRecords:     ()                       => ipcRenderer.invoke('get-career-records'),
  updateCareerRecord:   (id, content, starData)  => ipcRenderer.invoke('update-career-record', id, content, starData),
  getStreak:            ()                       => ipcRenderer.invoke('get-streak'),
  getCredits:           ()                       => ipcRenderer.invoke('get-credits'),

  // API 키 설정
  saveApiKey:     (key)  => ipcRenderer.invoke('save-api-key', key),
  hasApiKey:      ()     => ipcRenderer.invoke('has-api-key'),
  getApiKeyMasked:()     => ipcRenderer.invoke('get-api-key-masked'),
  validateApiKey: (key)  => ipcRenderer.invoke('validate-api-key', key),

  // 앱 설정
  getAppSettings:     ()       => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings:    (patch)  => ipcRenderer.invoke('save-app-settings', patch),
  completeOnboarding: ()       => ipcRenderer.invoke('complete-onboarding'),

  // Blacklist
  getBlacklist:         ()        => ipcRenderer.invoke('get-blacklist'),
  addToBlacklist:       (appName) => ipcRenderer.invoke('add-to-blacklist', appName),
  removeFromBlacklist:  (appName) => ipcRenderer.invoke('remove-from-blacklist', appName),

  // Export / Import
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),

  // 데이터 삭제
  deleteAllData: () => ipcRenderer.invoke('delete-all-data'),

  // 외부 링크
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // 샘플 데이터
  insertSampleData: () => ipcRenderer.invoke('insert-sample-data'),

  // 경력 기록 내보내기
  exportCareerRecord: (recordId, format) => ipcRenderer.invoke('export-career-record', recordId, format),

  // 태그 저장
  saveTag:          (activityId, tag) => ipcRenderer.invoke('save-tag', activityId, tag),
  restoreIdleTime:  (idleStart)       => ipcRenderer.invoke('restore-idle-time', idleStart),

  // 메인 프로세스 → 렌더러 이벤트
  onNavigate:       (cb) => ipcRenderer.on('navigate',        (_, view) => cb(view)),
  onTrackingStatus: (cb) => ipcRenderer.on('tracking-status', (_, data) => cb(data)),
  onIdleReturned:   (cb) => ipcRenderer.on('idle-returned',   (_, data) => cb(data)),
});
