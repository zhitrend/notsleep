import { spawn } from 'child_process';

class MacPreventSleep {
    constructor() {
        this.caffeinateProcess = null;
        this.isRunning = false;
    }

    /**
     * 启动防止睡眠
     * @param {Object} options 配置选项
     * @param {boolean} options.preventDisplaySleep 是否阻止显示器睡眠
     * @param {boolean} options.preventDiskSleep 是否阻止磁盘睡眠
     * @returns {Promise<void>}
     */
    async start(options = {}) {
        if (this.isRunning) {
            console.log('防止睡眠已经在运行中');
            return;
        }

        try {
            // 构建 caffeinate 命令的参数
            const args = [];
            
            // -i 防止系统闲置睡眠
            args.push('-i');
            
            // -d 防止显示器睡眠
            if (options.preventDisplaySleep) {
                args.push('-d');
            }
            
            // -m 防止磁盘睡眠
            if (options.preventDiskSleep) {
                args.push('-m');
            }

            // 启动 caffeinate 进程
            this.caffeinateProcess = spawn('caffeinate', args);
            this.isRunning = true;

            console.log('防止睡眠已启动');

            // 监听进程事件
            this.caffeinateProcess.on('error', (error) => {
                console.error('启动 caffeinate 失败:', error);
                this.isRunning = false;
            });

            this.caffeinateProcess.on('exit', (code) => {
                console.log(`caffeinate 进程已退出，退出码: ${code}`);
                this.isRunning = false;
            });

        } catch (error) {
            console.error('启动防止睡眠失败:', error);
            throw error;
        }
    }

    /**
     * 停止防止睡眠
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.isRunning || !this.caffeinateProcess) {
            console.log('防止睡眠未在运行');
            return;
        }

        try {
            // 结束 caffeinate 进程
            this.caffeinateProcess.kill();
            this.caffeinateProcess = null;
            this.isRunning = false;
            console.log('防止睡眠已停止');
        } catch (error) {
            console.error('停止防止睡眠失败:', error);
            throw error;
        }
    }

    /**
     * 获取当前状态
     * @returns {boolean} 是否正在运行
     */
    isActive() {
        return this.isRunning;
    }
}

export default MacPreventSleep;