# 项目记忆

## 外星人跳跃 - 微信小游戏版

### 关键：DevTools 项目根目录
微信开发者工具导入的项目路径是 **`E:\Github Project\miss_again`**（根目录），不是 `assets/iron_goose` 子目录。游戏文件必须放在根目录：
```
E:\Github Project\miss_again\
├── game.js                  ← 微信小游戏主入口（外星人跳跃完整逻辑）
├── game.json                ← 小游戏配置（竖屏/无状态栏）
├── project.config.json      ← 微信开发者工具项目配置（appid: wx04299a134172ec7a）
├── project.private.config.json  ← DevTools 私有配置（projectname: alien_jump）
├── sprites/                 ← AI 生成的外星人跳跃精灵图
│   ├── character_0.png      主角1 Zorg（绿色外星人）
│   ├── character_1.png      主角2 Bloop（蓝色外星人）
│   ├── character_2.png      主角3 Zix（紫色外星人）
│   ├── character_3.png      主角4 Blaze（橙色外星人）
│   ├── platform_green.png   普通平台
│   ├── platform_brown.png   碎裂平台
│   ├── platform_blue.png    移动平台
│   ├── spring.png           弹簧
│   ├── monster.png          怪物
│   └── jetpack.png          飞行背包道具
└── assets/iron_goose/.workbuddy/  ← 项目记忆（仅 .workbuddy 目录）
```

### 微信小游戏 API 适配
- Canvas：`wx.createCanvas()` + `canvas.requestAnimationFrame()`（优先全局 RAF，回退 setTimeout）
- 触控：`wx.onTouchStart/Move/End()` — 屏幕左半区=左移，右半区=右移，中间=射击；菜单画面左右箭头切换角色
- 重力感应：`wx.startAccelerometer({interval:'game'})` + `wx.onAccelerometerChange()` — x 轴倾斜控制左右，sqrt 非线性曲线+死区0.02
- 存储：`wx.setStorageSync/getStorageSync('alienJumpHighScore')` 存最高分，`alienJumpCharacter` 存选中角色
- 音效：`wx.createWebAudioContext()` — 合成音效
- 生命周期：`wx.onShow()` 恢复计时 + 启动加速度计，`wx.onHide()` 保存最高分

### 重力感应跟手优化
- 放大系数 3.0x，~20°倾斜达最大速度，有比例控制
- **无任何平滑层**：直接 `player.vx = moveInput * PLAYER_BASE_SPEED`，零附加延迟
- 之前试过加输入平滑(0.55 lerp)+速度缓动(0.55 lerp)，反而叠加~66ms延迟让操作更不跟手，已全部移除
- PLAYER_BASE_SPEED = 7.0（原5.5），提升27%移动速度
- **非线性 sqrt 曲线**：`moveInput = sign * sqrt(abs(rawTilt))`，小倾斜时给予更大速度比例
- 死区 0.02（极低），几乎任何倾斜都立刻响应
- Polyfill 优先使用全局 `requestAnimationFrame`（vsync 同步），仅回退 setTimeout
- 变量：`rawTilt`（回调直接存原始值）+ `hasTilt`（一旦检测到倾斜就锁定为true）

### 角色系统
- 4个外星人：Zorg(绿#4ade80)、Bloop(蓝#60a5fa)、Zix(紫#c084fc)、Blaze(橙#fb923c)
- 精灵图：character_0~3.png，尺寸 ~51×76
- 菜单左右箭头切换，存储 `alienJumpCharacter`，fallback 绘制用角色颜色

### 开发启动
- 微信开发者工具已导入项目，路径 `E:\Github Project\miss_again`
- AppID: `wx04299a134172ec7a`（测试号）
- 基础库版本 3.16.2
- 修改游戏代码时，根目录和 assets/iron_goose/ 两处都要同步

### 游戏特性
- 游戏名：外星人跳跃 (Alien Jump) v1.1.0
- 四种平台：绿色普通、棕色碎裂（踩一次即碎）、蓝色移动、弹簧（高弹跳）
- 紫色怪物在普通平台上（4%概率，score>500后才出现），跳踩或射击消灭
- 带飞行背包道具的平台（踩到后5秒飞行+射击子弹），道具用 jetpack 精灵图显示，飞行时角色背上画背包
- 4个可切换外星人角色：Zorg(绿/square波)、Bloop(蓝/sine波)、Zix(紫/triangle波)、Blaze(橙/sawtooth波)
- 每个角色有差异化：独立音效频率/波形、5级背景色调、彩蛋粒子(落叶/气泡/星碎/火焰)、弹跳粒子色
- 5 种背景主题按高度自动切换（白天→黄昏→夜晚→暗夜→太空），每角色色调不同
- 排行榜：本地存储最近10条记录(alienJumpScores)，从菜单/暂停/死亡均可查看
- 暂停/恢复：右上角暂停按钮、暂停时可看排行榜、回首页需确认
- 主菜单5入口：开始游戏/排行榜/制作人员/分享游戏 + 角色选择
- 分享：wx.showShareMenu + 保存战绩截图到相册
- 8种游戏状态：menu|playing|paused|gameover|leaderboard|credits|share|confirmHome
- 屏幕震动 + 粒子特效 + WebAudio 合成音效
- 最高分本地持久化存储（alienJumpHighScore）

### DevTools 缓存清理
- 缓存路径：`C:\Users\pmcmc\AppData\Local\微信开发者工具\User Data\97c2c3ed9e9b4a343745d4ac3603eef1\WeappCache\`
- 关键缓存目录：WeappCompileCache、dirCache、requireCache、WeappCode、WeappSimulator
- 如果改了代码 DevTools 还显示旧的，清这些目录后重新编译
