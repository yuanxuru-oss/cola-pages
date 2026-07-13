# animal-island-ui 设计系统参考

> 来源: https://github.com/guokaigdg/animal-island-ui
> 用途: 阿鱼网站 UI 参考，后续加项目/改样式时查阅

## 色板速查
- 主文字: #794f27 / #725d42
- 背景: #f8f8f0 / rgb(247,243,223)
- 主色调: #19c8b9 (薄荷)
- 边框: #c4b89e
- 焦点: #ffcc00 (黄，不用蓝)
- 卡片圆角: 20px
- 按钮圆角: 50px pill
- 禁止: 纯黑文字、冷灰背景、直角矩形、蓝色焦点

## 当前网站使用的 icon
icons/ 目录下 10 个 SVG:
- icon-miles → 护照/身份
- icon-diy → 项目/工坊
- icon-camera → 作品/画廊
- icon-variant → 竞赛/挑战
- icon-chat → 留言/联系
- icon-helicopter → 航空
- icon-map → 地图/广场
- icon-design → 设计
- icon-critterpedia → 图鉴
- icon-shopping → 商店

## NookPhone 13 色
default/app-pink/purple/app-blue/app-yellow/app-orange/app-teal/app-green/app-red/lime-green/yellow-green/brown/warm-peach-pink

## 素材获取
本地 skill 只有 SKILL.md 规范文档，不含 SVG/图片素材。
所有官方素材从 npm 包 CDN 获取：
```
https://unpkg.com/animal-island-ui@1.2.2/dist/files/
```
常用素材直链：
- footer-sea.svg: https://unpkg.com/animal-island-ui@1.2.2/dist/files/footer-sea.42da0dab.svg
- footer-tree.webp: https://unpkg.com/animal-island-ui@1.2.2/dist/files/footer-tree.00819557.webp
- cursor-icon.png: https://unpkg.com/animal-island-ui@1.2.2/dist/files/cursor-icon.1ea93a65.png
- divider-line-brown.svg / teal / yellow
- wave-yellow.svg
- 10 个 icon SVG (icon-miles/diy/camera/variant/chat/helicopter/map/design/critterpedia/shopping)
- Wallet item-022.png (Nook 钱袋)
- NookPhone 相关: wifi.svg / location.svg / page.svg / select-cursor.svg
