# 跟随官方 LX Music Mobile 更新

本仓库以 `https://github.com/lyswhut/lx-music-mobile.git` 为唯一上游，增强功能按独立提交叠加：

1. 官方版本基线；
2. 用户自定义源、订阅自动更新与多源切换；
3. 二维码及临时局域网导入；
4. 车机固定横屏布局；
5. 文档和下载链接调整。

不要再把官方源码复制成新的无父提交。保持上述提交边界，后续升级时才能逐项定位冲突。

## 首次配置

```bash
git remote add upstream https://github.com/lyswhut/lx-music-mobile.git
git fetch upstream --tags
```

若已存在 `upstream`，只需执行 `git fetch upstream --tags`。

## 更新流程

```bash
git switch maintainable-v1.9.2
git fetch upstream --tags
git branch backup/before-upstream-update
git rebase upstream/master
```

发生冲突时，优先保留官方的新业务逻辑，再把当前增强提交的目的重新接入。重点检查：

- `src/core/music/utils.ts`：播放失败和换源入口；
- `src/core/init/userApi/`：自定义源加载；
- `src/screens/Home/Views/Setting/settings/Basic/`：订阅与车机设置界面；
- `src/components/SizeView.tsx`、`src/utils/hooks/useHorizontalMode.ts`：横竖屏判断；
- `android/app/build.gradle`：版本号、签名和 APK 架构。

完成冲突处理后继续：

```bash
git add <已解决的文件>
git rebase --continue
```

如需撤销本轮升级：

```bash
git rebase --abort
```

## 验证

```bash
npm ci
npm run test:custom-sources
npm run check:custom-sources
cd android
gradlew.bat assembleRelease
```

至少在旧增强版上覆盖安装一次，确认设置、收藏和已导入音源仍保留；再验证订阅更新、多源切换、二维码/局域网导入，以及车机从倒车影像或分屏返回后的横屏布局。

## APK 签名

正式发布必须持续使用同一份 keystore。不要把 keystore 或密码提交到 Git；在 GitHub Actions 中使用 Secrets 注入。签名变化会导致 Android 拒绝覆盖安装旧增强版。

## 发布原则

- 上游修复与增强功能不要混在同一个提交；
- 车机横屏保持为单独提交，默认关闭；
- 每次发布提高 `versionCode`；
- 推送重写过的维护分支前先保留备份分支或标签；
- 未完成 APK 覆盖安装验证时，不替换稳定版 Release。
