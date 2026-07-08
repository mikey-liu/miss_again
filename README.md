# miss_again

这是一个微信小游戏开发项目。

小游戏名字：《又没中？！》，英文名：Miss Again?!

## 当前 Demo

当前实现了一个像素风小游戏框架，并先完成“套圈”玩法主流程：

- 载入界面。
- 游戏列表：套圈可玩，射箭和射击先作为“开发中”入口。
- 套圈关卡地图。
- 套圈第 1 关和第 2 关。
- 每关 5 个圈，上滑蓄力，松手投掷。
- 第 1 关显示当前滑动距离；第 2 关隐藏距离并缩小目标。
- 地面轻微弹跳，瓜果蔬菜碰撞弹跳更明显。
- 套中后播放像素粒子特效、目标进入命中状态并计分。
- 碰到目标但未套中会有更明显的弹跳粒子反馈。
- 结算页展示得分、命中次数和评价文案。
- 已生成并接入原型音效与循环背景音乐。
- UI 已切换为基于确认素材裁出的运行时图片，目录为 `assets/runtime`。

详细方案见 [docs/game-design.md](docs/game-design.md)。

完整 PRD 见 [docs/prd.md](docs/prd.md)。

概念素材与 Figma 导入清单见 [assets/concepts/README.md](assets/concepts/README.md)。

游戏实际加载的运行时图片见 [assets/runtime/README.md](assets/runtime/README.md)。

## 运行方式

1. 打开微信开发者工具。
2. 选择“导入项目”，目录选择本仓库。
3. 编译类型选择“小游戏”，使用已有 `project.config.json`。
4. 点击编译后即可在模拟器中运行 demo。

## 本地验证

核心状态机、关卡规则、物理和命中逻辑可以在 Node.js 下验证：

```bash
node tests/run-core-tests.js
```

重新生成音效和背景音乐：

```bash
python scripts/generate_audio_assets.py
```

重新从概念板裁出游戏运行时图片：

```bash
python scripts/slice_runtime_assets.py
```

## 后续方向

- 接入更多关卡和解锁条件。
- 增加音效、震动、失败反馈和结算奖励。
- 补全射箭、射击等其他小游戏。
- 继续打磨 UI、排行榜和长期成长系统。
