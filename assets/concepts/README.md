# 概念素材目录

这些图片用于把小游戏的美术方向整理成 Figma 设计稿。当前素材是风格板、界面板和切图参考板，还不是最终透明 PNG 或 Sprite Atlas。

## 素材清单

| 文件 | 用途 |
| --- | --- |
| `theme-map-board.png` | 主题地图方向与关卡氛围 |
| `gameplay-backgrounds-board.png` | 套圈玩法的游戏内背景参考 |
| `ui-kit-board.png` | 初版 UI Kit 风格板 |
| `ux-feedback-board.png` | 命中、未命中、奖励、提示等 UX 反馈 |
| `targets-effects-sprites-board.png` | 水果蔬菜目标物、套圈、特效风格板 |
| `icons-rewards-board.png` | 奖励、货币、装饰图标参考 |
| `overworld-map-background.png` | 关卡地图背景方向 |
| `level-map-components-board.png` | 关卡节点、路径、标识牌等地图组件 |
| `loading-menu-screens-board.png` | 载入、主菜单、游戏列表等流程屏 |
| `gameplay-hud-result-screens-board.png` | 套圈 HUD、结算、奖励屏 |
| `ui-components-slice-board.png` | 可切片 UI 组件参考 |
| `icons-controls-slice-board.png` | 控制、状态、模式图标切片参考 |
| `targets-effects-slice-board.png` | 目标物、套圈、阴影、特效切片参考 |

## Figma 使用说明

- 游戏内文字建议由 Canvas 渲染，不建议烘焙在图片素材里。
- 确认风格后，再把切图板拆成透明 PNG 或 Sprite Atlas。
- 拆图时建议按 `ui/`、`sprites/`、`maps/`、`effects/` 四类输出。
- 第二关需要隐藏滑动距离 UI，目标物尺寸也要小于第一关，可在 HUD 与目标物切图阶段单独做变体。
