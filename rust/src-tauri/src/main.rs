#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use tauri::State;

use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SleepPreventionMethods {
    pub display: bool,
    pub system: bool,
    pub screensaver: bool,
    pub activity: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SleepPreventionState {
    pub is_active: bool,
    pub methods: SleepPreventionMethods,
    pub start_time: Option<u64>,
    pub duration_minutes: Option<u32>,
}

pub struct AppState {
    pub prevention_state: Arc<Mutex<SleepPreventionState>>,
    pub activity_timer: Arc<Mutex<Option<Instant>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResponse {
    pub success: bool,
    pub message: String,
}

// 模拟用户活动
fn simulate_user_activity() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // 使用AppleScript模拟鼠标移动
        let output = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to set frontmost of process \"SystemUIServer\" to true")
            .output();
        
        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to simulate activity on macOS: {}", e)),
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows上使用SendKeys模拟按键
        let output = Command::new("powershell")
            .arg("-Command")
            .arg("$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys('{SCROLLLOCK}')")
            .output();
        
        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to simulate activity on Windows: {}", e)),
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux上使用xdotool模拟鼠标移动
        let output = Command::new("xdotool")
            .arg("mousemove")
            .arg("--")
            .arg("1")
            .arg("1")
            .output();
        
        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to simulate activity on Linux: {}", e)),
        }
    }
}

// 禁用屏幕保护程序
fn disable_screensaver() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("defaults")
            .args(&["write", "com.apple.screensaver", "idleTime", "0"])
            .output();
        
        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to disable screensaver on macOS: {}", e)),
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        let output1 = Command::new("powercfg")
            .args(&["/change", "standby-timeout-ac", "0"])
            .output();
        let output2 = Command::new("powercfg")
            .args(&["/change", "standby-timeout-dc", "0"])
            .output();
        
        match (output1, output2) {
            (Ok(_), Ok(_)) => Ok(()),
            (Err(e), _) | (_, Err(e)) => Err(format!("Failed to disable screensaver on Windows: {}", e)),
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux上尝试禁用屏幕保护
        let output = Command::new("xset")
            .args(&["s", "off"])
            .output();
        
        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to disable screensaver on Linux: {}", e)),
        }
    }
}

// 恢复屏幕保护程序
fn enable_screensaver() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("defaults")
            .args(&["delete", "com.apple.screensaver", "idleTime"])
            .output();
        
        match output {
            Ok(_) => Ok(()),
            Err(_) => Ok(()), // 删除失败可能是因为设置不存在，这是正常的
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        let output1 = Command::new("powercfg")
            .args(&["/change", "standby-timeout-ac", "30"])
            .output();
        let output2 = Command::new("powercfg")
            .args(&["/change", "standby-timeout-dc", "15"])
            .output();
        
        match (output1, output2) {
            (Ok(_), Ok(_)) => Ok(()),
            (Err(e), _) | (_, Err(e)) => Err(format!("Failed to enable screensaver on Windows: {}", e)),
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let output = Command::new("xset")
            .args(&["s", "on"])
            .output();
        
        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to enable screensaver on Linux: {}", e)),
        }
    }
}

// 开始阻止睡眠
#[tauri::command]
async fn start_sleep_prevention(
    methods: SleepPreventionMethods,
    duration_minutes: Option<u32>,
    state: State<'_, AppState>,
) -> Result<CommandResponse, String> {
    let mut prevention_state = state.prevention_state.lock().unwrap();
    
    if prevention_state.is_active {
        return Ok(CommandResponse {
            success: false,
            message: "睡眠阻止已经在运行中".to_string(),
        });
    }
    
    // 执行各种阻止方法
    let mut errors = Vec::new();
    
    if methods.screensaver {
        if let Err(e) = disable_screensaver() {
            errors.push(format!("禁用屏幕保护失败: {}", e));
        }
    }
    
    // 设置状态
    prevention_state.is_active = true;
    prevention_state.methods = methods.clone();
    prevention_state.start_time = Some(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    );
    prevention_state.duration_minutes = duration_minutes;
    
    // 如果需要模拟用户活动，启动定时器
    if methods.activity {
        let activity_timer = state.activity_timer.clone();
        let _prevention_methods = methods.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));
            loop {
                interval.tick().await;
                
                // 检查是否还在活动状态
                let state_guard = activity_timer.lock().unwrap();
                if state_guard.is_none() {
                    break;
                }
                drop(state_guard);
                
                if let Err(e) = simulate_user_activity() {
                    eprintln!("模拟用户活动失败: {}", e);
                }
            }
        });
        
        *state.activity_timer.lock().unwrap() = Some(Instant::now());
    }
    
    // 如果设置了持续时间，启动自动停止定时器
    if let Some(duration) = duration_minutes {
        let prevention_state_clone = state.prevention_state.clone();
        let activity_timer_clone = state.activity_timer.clone();
        
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_secs(duration as u64 * 60)).await;
            
            let mut state_guard = prevention_state_clone.lock().unwrap();
            if state_guard.is_active {
                state_guard.is_active = false;
                
                // 恢复屏幕保护
                if state_guard.methods.screensaver {
                    if let Err(e) = enable_screensaver() {
                        eprintln!("恢复屏幕保护失败: {}", e);
                    }
                }
                
                // 停止活动模拟
                *activity_timer_clone.lock().unwrap() = None;
            }
        });
    }
    
    let message = if errors.is_empty() {
        "睡眠阻止已启动".to_string()
    } else {
        format!("睡眠阻止已启动，但部分功能失败: {}", errors.join(", "))
    };
    
    Ok(CommandResponse {
        success: true,
        message,
    })
}

// 停止阻止睡眠
#[tauri::command]
async fn stop_sleep_prevention(state: State<'_, AppState>) -> Result<CommandResponse, String> {
    let mut prevention_state = state.prevention_state.lock().unwrap();
    
    if !prevention_state.is_active {
        return Ok(CommandResponse {
            success: false,
            message: "睡眠阻止未在运行".to_string(),
        });
    }
    
    // 恢复屏幕保护
    if prevention_state.methods.screensaver {
        if let Err(e) = enable_screensaver() {
            eprintln!("恢复屏幕保护失败: {}", e);
        }
    }
    
    // 停止活动模拟
    *state.activity_timer.lock().unwrap() = None;
    
    // 重置状态
    prevention_state.is_active = false;
    prevention_state.methods = SleepPreventionMethods {
        display: false,
        system: false,
        screensaver: false,
        activity: false,
    };
    prevention_state.start_time = None;
    prevention_state.duration_minutes = None;
    
    Ok(CommandResponse {
        success: true,
        message: "睡眠阻止已停止".to_string(),
    })
}

// 获取当前状态
#[tauri::command]
async fn get_prevention_state(state: State<'_, AppState>) -> Result<SleepPreventionState, String> {
    let prevention_state = state.prevention_state.lock().unwrap();
    Ok(SleepPreventionState { is_active: prevention_state.is_active, methods: prevention_state.methods.clone(), start_time: prevention_state.start_time, duration_minutes: prevention_state.duration_minutes })
}

fn main() {
    env_logger::init();
    
    let app_state = AppState {
        prevention_state: Arc::new(Mutex::new(SleepPreventionState {
            is_active: false,
            methods: SleepPreventionMethods {
                display: false,
                system: false,
                screensaver: false,
                activity: false,
            },
            start_time: None,
            duration_minutes: None,
        })),
        activity_timer: Arc::new(Mutex::new(None)),
    };
    
    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            start_sleep_prevention,
            stop_sleep_prevention,
            get_prevention_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
