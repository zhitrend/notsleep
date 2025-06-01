const { ipcRenderer } = require('electron');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const durationSelect = document.getElementById('duration');
const statusDiv = document.getElementById('status');
const methodDisplay = document.getElementById('method-display');
const methodSystem = document.getElementById('method-system');
const methodScreensaver = document.getElementById('method-screensaver');
const methodActivity = document.getElementById('method-activity');
let timer = null;

startBtn.onclick = () => {
  const minutes = parseInt(durationSelect.value, 10);
  
  // 获取选择的阻止方式
  const methods = {
    display: methodDisplay.checked,
    system: methodSystem.checked,
    screensaver: methodScreensaver.checked,
    activity: methodActivity.checked
  };
  
  // 发送阻止方式到主进程
  ipcRenderer.send('start-blocker', methods);
  
  const lang = window.getCurrentLang ? window.getCurrentLang() : 'zh';
  const dict = window.getLangDict ? window.getLangDict(lang) : { statusBlock: '已阻止电脑睡眠' };
  statusDiv.textContent = dict.statusBlock;
  
  if (timer) clearTimeout(timer);
  if (minutes > 0) {
    timer = setTimeout(() => {
      ipcRenderer.send('stop-blocker');
      const lang = window.getCurrentLang ? window.getCurrentLang() : 'zh';
      const dict = window.getLangDict ? window.getLangDict(lang) : { statusRestore: '已恢复电脑可睡眠' };
      statusDiv.textContent = dict.statusRestore;
    }, minutes * 60 * 1000);
  }
};

stopBtn.onclick = () => {
  ipcRenderer.send('stop-blocker');
  const lang = window.getCurrentLang ? window.getCurrentLang() : 'zh';
  const dict = window.getLangDict ? window.getLangDict(lang) : { statusRestore: '已恢复电脑可睡眠' };
  statusDiv.textContent = dict.statusRestore;
  if (timer) clearTimeout(timer);
};