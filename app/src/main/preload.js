const { contextBridge, ipcRenderer } = require('electron')

// 렌더러에서 사용할 수 있는 안전한 API 노출
contextBridge.exposeInMainWorld('careerlog', {
  getTimeline: (sessionId) => ipcRenderer.invoke('get-timeline', sessionId),
  getLastSession: () => ipcRenderer.invoke('get-last-session'),
  saveMemo: (activityId, memo) => ipcRenderer.invoke('save-memo', activityId, memo),
  generateCareerRecord: (sessionId) => ipcRenderer.invoke('generate-career-record', sessionId),
  getCareerRecords: () => ipcRenderer.invoke('get-career-records'),
})
