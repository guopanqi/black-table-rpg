# 架构与内容扩展约定

\`\`\`text
index.html                  页面静态骨架（取自原始 HTML）
src/styles.css             原始 noir 桌面视觉
src/main.js                页面状态、交互、呈现、浏览器本地持久化
src/ui/board.js            城市 SVG、语义缩放、节点与时钟
src/data/legacy-content.js 旧原型数据，迁移时保留
src/data/content.js        正式作者数据适配及新增内容
src/engine/game.js         纯规则：createGame / inspect / play / endDay
tests/game.test.mjs        单元/回归/行为测试
legacy/noir-desk.html      原始单文件原型（只读）
\`\`\`

## 内容接口

\`content={nodes, clocks, cards, actions, initial}\`。采用可序列化数据而非引擎内的剧情特判。

- \`nodes\`：id、parent、kind、x/y、desc、clocks、actions、可选 daily。
- \`clocks\`：name、kind=p/r、size、v、res、on[]。满钟只触发一次，可产生新事实/解锁/压力/事件文本。
- \`cards\`：id、name、kind=item/person、suit=fist/mouth/hand/money、rank、once、可选 actor。
- \`actions\`：id、node、cost、suits[]、diff、可选 main/risk、results{s,n,f}、lines{s,n,f}、可选 automatic、when、memory。
- \`initial\`：初始行动力、钱、压力、手牌、人物的可用/占用行动力、体验天数。

\`inspect(state, content, id, cards, extra)\` 是 UI 的权威合法性判断与概率预览；\`play(..., rng)\` 即时执行，并写入事实；\`endDay(...)\` 推动世界所有可见的每夜效果。所有规则应先写可重复的自动测试。

## 当前迁移债务

原始行动和时钟仍由 \`legacy-content.js\` 适配到新结构。等第一轮可玩性验证通过，再将其逐条转为直接声明的数据文件并做字段校验；不要一边迁移内容一边重写所有文本导致测试失去可比性。

\`main.js\` 当前集成大部分交互与卡片呈现，待功能稳定后再拆为若干 UI 模块；不要提前创建空接口。因为服务于纯浏览器，默认不采用打包器，也不引入运行时框架。

## 本地与测试

\`\`\`bash
npm run dev     # localhost:4173
npm run check   # 静态语法检查 + 测试
\`\`\`

浏览器自动存档到 localStorage 键 \`black-table-rpg:v1\`；测试可以通过 \`createGame(content)\` 获得干净状态。
