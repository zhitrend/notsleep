import PreventSleep from './src/prevent-sleep.js';

async function test() {
    try {
        const preventSleep = new PreventSleep();
        
        // 检查平台支持
        console.log('当前平台:', preventSleep.getPlatform());
        console.log('是否支持该平台:', preventSleep.isPlatformSupported());

        if (!preventSleep.isPlatformSupported()) {
            console.error('当前平台不支持');
            process.exit(1);
        }

        // 启动防止睡眠（同时防止显示器和磁盘睡眠）
        console.log('正在启动防止睡眠...');
        await preventSleep.start({
            preventDisplaySleep: true,
            preventDiskSleep: true
        });

        console.log('防止睡眠已启动');
        console.log('运行状态:', preventSleep.isActive() ? '运行中' : '已停止');

        // 等待 30 秒后停止
        console.log('将在 30 秒后停止...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        // 停止防止睡眠
        console.log('正在停止防止睡眠...');
        await preventSleep.stop();

        console.log('防止睡眠已停止');
        console.log('运行状态:', preventSleep.isActive() ? '运行中' : '已停止');

    } catch (error) {
        console.error('测试过程中出错:', error);
    }
}

// 运行测试
test();