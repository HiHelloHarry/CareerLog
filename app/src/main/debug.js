try {
  const r = require('electron/js2c/browser_init')
  console.log('browser_init type:', typeof r, r ? Object.keys(r).slice(0,5) : 'null')
} catch(e) { console.log('browser_init error:', e.message) }

// process 내부에 electron API가 있는지
console.log('process keys with app:', Object.keys(process).filter(k => k.toLowerCase().includes('electron') || k === 'app'))

// global에 있는지
console.log('global.app:', typeof global.app)
console.log('global.electron:', typeof global.electron)

process.exit(0)
