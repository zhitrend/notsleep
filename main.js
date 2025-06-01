const { app, BrowserWindow, powerSaveBlocker, ipcMain } = require('electron');
const { execSync } = require('child_process');
let mainWindow;
let blockerIds = {
  display: null,  // 阻止显示器睡眠
  system: null,   // 阻止系统睡眠
  screensaver: null // 阻止屏幕保护
};
let activityInterval = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// 模拟用户活动，移动鼠标1像素
function simulateUserActivity() {
  try {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y } = screen.getCursorScreenPoint();
    
    // 在当前位置周围小范围移动，避免影响用户
    const newX = (x + 1) % primaryDisplay.size.width;
    const newY = (y + 1) % primaryDisplay.size.height;
    
    // 使用robotjs模拟鼠标移动
    try {
      const robot = require('robotjs');
      robot.moveMouse(newX, newY);
    } catch (err) {
      console.log('robotjs not available, using alternative method');
      // 如果robotjs不可用，使用其他方法保持活动状态
    }
  } catch (err) {
    console.error('Error simulating user activity:', err);
  }
}

// 禁用屏幕保护程序
function disableScreensaver() {
  try {
    if (process.platform === 'darwin') {
      // macOS
      execSync('defaults write com.apple.screensaver idleTime 0');
    } else if (process.platform === 'win32') {
      // Windows
      execSync('powercfg /change standby-timeout-ac 0');
      execSync('powercfg /change standby-timeout-dc 0');
    }
  } catch (err) {
    console.error('Error disabling screensaver:', err);
  }
}

// 恢复屏幕保护程序默认设置
function enableScreensaver() {
  try {
    if (process.platform === 'darwin') {
      // macOS
      execSync('defaults delete com.apple.screensaver idleTime');
    } else if (process.platform === 'win32') {
      // Windows
      execSync('powercfg /change standby-timeout-ac 30');
      execSync('powercfg /change standby-timeout-dc 15');
    }
  } catch (err) {
    console.error('Error enabling screensaver:', err);
  }
}

ipcMain.on('start-blocker', (event, methods = {}) => {
  // 1. 阻止显示器睡眠
  if (methods.display && !blockerIds.display) {
    blockerIds.display = powerSaveBlocker.start('prevent-display-sleep');
    console.log('Display sleep prevention enabled');
  }
  
  // 2. 阻止系统睡眠
  if (methods.system && !blockerIds.system) {
    blockerIds.system = powerSaveBlocker.start('prevent-app-suspension');
    console.log('System sleep prevention enabled');
  }
  
  // 3. 禁用屏幕保护程序
  if (methods.screensaver && !blockerIds.screensaver) {
    disableScreensaver();
    blockerIds.screensaver = true;
    console.log('Screensaver disabled');
  }
  
  // 4. 启动定期模拟用户活动
  if (methods.activity && !activityInterval) {
    activityInterval = setInterval(simulateUserActivity, 60000); // 每分钟模拟一次活动
    console.log('User activity simulation enabled');
  }
  
  // 如果没有选择任何方法，默认启用显示器睡眠阻止
  if (!methods.display && !methods.system && !methods.screensaver && !methods.activity) {
    if (!blockerIds.display) {
      blockerIds.display = powerSaveBlocker.start('prevent-display-sleep');
      console.log('Default display sleep prevention enabled');
    }
  }
});

ipcMain.on('stop-blocker', () => {
  // 1. 停止显示器睡眠阻止
  if (blockerIds.display) {
    powerSaveBlocker.stop(blockerIds.display);
    blockerIds.display = null;
  }
  
  // 2. 停止系统睡眠阻止
  if (blockerIds.system) {
    powerSaveBlocker.stop(blockerIds.system);
    blockerIds.system = null;
  }
  
  // 3. 恢复屏幕保护程序
  if (blockerIds.screensaver) {
    enableScreensaver();
    blockerIds.screensaver = null;
  }
  
  // 4. 停止模拟用户活动
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
});

// 确保应用退出时清理所有阻止器
app.on('will-quit', () => {
  // 停止所有阻止器
  Object.keys(blockerIds).forEach(key => {
    if (blockerIds[key]) {
      if (key === 'screensaver') {
        enableScreensaver();
      } else {
        powerSaveBlocker.stop(blockerIds[key]);
      }
      blockerIds[key] = null;
    }
  });
  
  // 清除活动模拟器
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
});