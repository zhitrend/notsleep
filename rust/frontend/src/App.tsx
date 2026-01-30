import { useState, useEffect } from "react";
import { Button, Card, Checkbox, Select, Typography, Space, message, Switch } from "antd";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";

const { Title, Text } = Typography;
const { Option } = Select;

interface SleepPreventionMethods {
  display: boolean;
  system: boolean;
  screensaver: boolean;
  activity: boolean;
}

interface SleepPreventionState {
  is_active: boolean;
  methods: SleepPreventionMethods;
  start_time?: number;
  duration_minutes?: number;
}

interface CommandResponse {
  success: boolean;
  message: string;
}

const translations = {
  zh: {
    title: "防止电脑睡眠",
    methodsLabel: "选择阻止方式：",
    methodDisplay: "阻止显示器睡眠",
    methodSystem: "阻止系统睡眠", 
    methodScreensaver: "禁用屏幕保护",
    methodActivity: "模拟用户活动",
    durationLabel: "选择阻止睡眠时长：",
    opt5: "5分钟",
    opt10: "10分钟",
    opt30: "30分钟",
    opt60: "1小时",
    opt0: "无限制",
    start: "开始阻止睡眠",
    stop: "恢复睡眠",
    statusActive: "睡眠阻止已激活",
    statusInactive: "睡眠阻止未激活",
    language: "语言",
    theme: "主题",
    light: "浅色",
    dark: "深色"
  },
  en: {
    title: "Prevent Computer Sleep",
    methodsLabel: "Select prevention methods:",
    methodDisplay: "Prevent display sleep",
    methodSystem: "Prevent system sleep",
    methodScreensaver: "Disable screensaver", 
    methodActivity: "Simulate user activity",
    durationLabel: "Select duration to prevent sleep:",
    opt5: "5 min",
    opt10: "10 min", 
    opt30: "30 min",
    opt60: "1 hour",
    opt0: "Unlimited",
    start: "Start Anti-Sleep",
    stop: "Restore Sleep",
    statusActive: "Sleep prevention is active",
    statusInactive: "Sleep prevention is inactive",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark"
  }
};

function App() {
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [preventionState, setPreventionState] = useState<SleepPreventionState>({
    is_active: false,
    methods: {
      display: true,
      system: true,
      screensaver: false,
      activity: false
    }
  });
  const [methods, setMethods] = useState<SleepPreventionMethods>({
    display: true,
    system: true,
    screensaver: false,
    activity: false
  });
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  useEffect(() => {
    const fetchState = async () => {
      try {
        const state = await invoke<SleepPreventionState>("get_preventionState");
        setPreventionState(state);
        setMethods(state.methods);
      } catch (error) {
        console.error("Failed to fetch state:", error);
      }
    };

    fetchState();
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await invoke<CommandResponse>("start_sleep_prevention", {
        methods: methods,
        durationMinutes: duration === 0 ? null : duration
      });
      
      if (response.success) {
        message.success(response.message);
        const newState = await invoke<SleepPreventionState>("get_preventionState");
        setPreventionState(newState);
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error("启动失败: " + error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await invoke<CommandResponse>("stop_sleep_prevention");
      
      if (response.success) {
        message.success(response.message);
        const newState = await invoke<SleepPreventionState>("get_preventionState");
        setPreventionState(newState);
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error("停止失败: " + error);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (method: keyof SleepPreventionMethods, checked: boolean) => {
    setMethods(prev => ({ ...prev, [method]: checked }));
  };

  return (
    <div className={`app ${isDarkMode ? "dark" : "light"}`}>
      <Card 
        className="main-card"
        title={
          <div className="header">
            <Title level={2} style={{ margin: 0, color: isDarkMode ? "#fff" : "#2c3e50" }}>
              {t.title}
            </Title>
            <Space className="controls">
              <Select 
                value={language} 
                onChange={setLanguage}
                style={{ width: 100 }}
                size="small"
              >
                <Option value="zh">中文</Option>
                <Option value="en">English</Option>
              </Select>
              <Space>
                <Text style={{ color: isDarkMode ? "#fff" : "#666" }}>{t.theme}:</Text>
                <Switch 
                  checked={isDarkMode}
                  onChange={setIsDarkMode}
                  size="small"
                />
                <Text style={{ color: isDarkMode ? "#fff" : "#666" }}>
                  {isDarkMode ? t.dark : t.light}
                </Text>
              </Space>
            </Space>
          </div>
        }
        style={{ 
          width: 420, 
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          background: isDarkMode ? "#1f1f1f" : "#fff"
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div className="methods-section">
            <Text strong style={{ color: isDarkMode ? "#fff" : "#2c3e50" }}>
              {t.methodsLabel}
            </Text>
            <div className="checkbox-group">
              <Checkbox 
                checked={methods.display}
                onChange={(e) => handleMethodChange("display", e.target.checked)}
                style={{ color: isDarkMode ? "#fff" : "#666" }}
              >
                {t.methodDisplay}
              </Checkbox>
              <Checkbox 
                checked={methods.system}
                onChange={(e) => handleMethodChange("system", e.target.checked)}
                style={{ color: isDarkMode ? "#fff" : "#666" }}
              >
                {t.methodSystem}
              </Checkbox>
              <Checkbox 
                checked={methods.screensaver}
                onChange={(e) => handleMethodChange("screensaver", e.target.checked)}
                style={{ color: isDarkMode ? "#fff" : "#666" }}
              >
                {t.methodScreensaver}
              </Checkbox>
              <Checkbox 
                checked={methods.activity}
                onChange={(e) => handleMethodChange("activity", e.target.checked)}
                style={{ color: isDarkMode ? "#fff" : "#666" }}
              >
                {t.methodActivity}
              </Checkbox>
            </div>
          </div>

          <div className="duration-section">
            <Text strong style={{ color: isDarkMode ? "#fff" : "#2c3e50" }}>
              {t.durationLabel}
            </Text>
            <Select 
              value={duration} 
              onChange={setDuration}
              style={{ width: "100%" }}
            >
              <Option value={5}>{t.opt5}</Option>
              <Option value={10}>{t.opt10}</Option>
              <Option value={30}>{t.opt30}</Option>
              <Option value={60}>{t.opt60}</Option>
              <Option value={0}>{t.opt0}</Option>
            </Select>
          </div>

          <div className="button-section">
            <Space>
              <Button 
                type="primary" 
                onClick={handleStart}
                loading={loading}
                disabled={preventionState.is_active}
                style={{ 
                  background: "#74ebd5", 
                  borderColor: "#74ebd5",
                  color: "#2c3e50"
                }}
              >
                {t.start}
              </Button>
              <Button 
                danger
                onClick={handleStop}
                loading={loading}
                disabled={!preventionState.is_active}
              >
                {t.stop}
              </Button>
            </Space>
          </div>

          <div className="status-section">
            <Card 
              size="small"
              style={{ 
                textAlign: "center",
                background: preventionState.is_active 
                  ? "rgba(116, 235, 213, 0.1)" 
                  : "rgba(255, 118, 117, 0.1)",
                borderColor: preventionState.is_active ? "#74ebd5" : "#ff7675"
              }}
            >
              <Text 
                style={{ 
                  color: preventionState.is_active ? "#74ebd5" : "#ff7675",
                  fontWeight: 500
                }}
              >
                {preventionState.is_active ? t.statusActive : t.statusInactive}
              </Text>
            </Card>
          </div>
        </Space>
      </Card>
    </div>
  );
}

export default App;
