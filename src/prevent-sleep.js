import { platform } from 'os';
import MacPreventSleep from './mac-prevent-sleep.js';

class PreventSleep {
    constructor() {
        this.platform = platform();
        this.preventSleep = this.createPlatformHandler();
    }

    /**
     * 创建对应平台的处理器
     * @returns {MacPreventSleep|null}
     * @private
     */
    createPlatformHandler() {
        switch (this.platform) {
            case 'darwin':
                return new MacPreventSleep();
            case 'win32':
                // TODO: 添加 Windows 支持
                console.warn('Windows 支持正在开发中');
                return null;
            case 'linux':
                // TODO: 添加 Linux 支持
                console.warn('Linux 支持正在开发中');
                return null;
            default:
                console.error('不支持的操作系统:', this.platform);
                return null;
        }
    }

    /**
     * 启动防止睡眠
     * @param {Object} options 配置选项
     * @param {boolean} options.preventDisplaySleep 是否阻止显示器睡眠
     * @param {boolean} options.preventDiskSleep 是否阻止磁盘睡眠
     * @returns {Promise<void>}
     */
    async start(options = {}) {
        if (!this.preventSleep) {
            throw new Error(`当前平台 ${this.platform} 暂不支持`);
        }

        await this.preventSleep.start(options);
    }

    /**
     * 停止防止睡眠
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.preventSleep) {
            throw new Error(`当前平台 ${this.platform} 暂不支持`);
        }

        await this.preventSleep.stop();
    }

    /**
     * 获取当前状态
     * @returns {boolean} 是否正在运行
     */
    isActive() {
        if (!this.preventSleep) {
            return false;
        }

        return this.preventSleep.isActive();
    }

    /**
     * 获取当前平台
     * @returns {string} 平台名称
     */
    getPlatform() {
        return this.platform;
    }

    /**
     * 检查平台是否支持
     * @returns {boolean} 是否支持
     */
    isPlatformSupported() {
        return this.preventSleep !== null;
    }
}

export default PreventSleep;