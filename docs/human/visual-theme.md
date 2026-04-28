# InsightUp 視覺主題說明

這份文件記錄目前網站採用的主色盤、設計語意，以及為什麼視覺方向會往「洞見 + 向上 + 未來感」去調整。

## 設計目標

- `Insight`：需要有觀察、辨識、資訊清晰的感覺，所以核心底色使用冷靜的深海軍藍。
- `Up`：需要有往上、流動、成長的動能，所以用霧面 mint 當成上升軌跡與動態高光。
- `Future`：避免厚重、土色、過度擬物，改用霧面玻璃、冷白底、薄層漸層與細線網格來營造未來感。

## 核心色碼

目前色彩系統分成兩層：

- `Brand palette`
  負責品牌辨識，不直接對應特定 UI 元件用途。

- `Semantic tokens`
  負責介面用途，例如背景、卡片、邊框、CTA、警示、圖表色。實作時應優先使用 semantic token，而不是在元件裡直接寫 brand hex。

### 品牌主色

- `Deep Vision Navy`：`#1F4373`
  含意：來自 logo 圓形主底色，是整個品牌最穩定的辨識核心，代表洞見、專注、可信度。

- `Night Core`：`#0B1C34`
  含意：比主海軍藍再更深一層，用於正文與高對比文字，讓介面有高級感而不是純黑壓迫感。

- `Up Mint`：`#2BC2AC`
  含意：直接取自 logo 上升箭頭，是品牌裡最有生命力與方向感的顏色，用於 CTA、亮點與正向動態。

- `Mint Mist`：`#AEEDE5`
  含意：作為柔和的擴散光與霧面漸層，避免整體只剩硬色塊，讓畫面更透氣。

### 背景與結構色

- `Cloud White`：`#FAFCFF`
  含意：主要卡片底色，乾淨但不死白，保留科技產品該有的輕盈感。

- `Atmosphere`：`#F1F6FC`
  含意：整體背景主底色，讓頁面像在霧面空氣層裡，而不是貼在平面紙張上。

- `Frost Grid`：`#E1EAF5`
  含意：用於次級區塊與背景網格，使資訊區塊有層次但不互相搶戲。

- `Glass Border`：`#A9BCD1`
  含意：用於邊框與輪廓，取代傳統米色或灰色邊線，讓 UI 更冷靜、更現代。

### 文字與輔助色

- `Slate Signal`：`#4E6580`
  含意：次要文字與輔助說明，保持閱讀穩定，不讓畫面只剩品牌深藍與白。

- `Signal Rose`：`#BD546F`
  含意：錯誤、警示與負向變動。刻意不用過度鮮紅，而用偏成熟的莓果玫瑰色，維持整體質感。

## Semantic Tokens

這一層是現在前端實作的優先入口。Tailwind 與全站 UI primitives 應先使用這些 token：

- `background`：`#F1F6FC`
  頁面主背景。

- `foreground`：`#0B1C34`
  主要文字與高對比內容。

- `card`：`#FFFFFF`
  主卡片背景，用來取代過度透明的白色面板。

- `surface`：`#FAFCFF`
  次層淺底，可用於 panel 或較大區塊。

- `surface-alt`：`#E1EAF5`
  區塊分層底色。

- `border` / `input`：`#A9BCD1`
  邊框、表單輪廓、資料表分隔。

- `primary`：`#133054`
  主 CTA、active navigation、重要狀態。

- `primary-strong`：`#1F4373`
  主按鈕漸層終點與較重的品牌面。

- `accent`：`#2BC2AC`
  正向高光、highlight、可互動強調。

- `accent-strong`：`#189B8C`
  更聚焦的正向狀態與 chart 強調。

- `muted`：`#C6D4E5`
  次要底色、柔和區塊。

- `muted-foreground`：`#4E6580`
  次要文字與說明資訊。

- `warning`：`#E89C2C`
  保留給主要 CTA 或需要立即注意的提示，不建議大面積使用。

- `danger`：`#BD546F`
  刪除、錯誤、負向 delta。

## Token 使用原則

- 元件內優先用 `primary`、`card`、`border`、`muted-foreground` 這類 semantic token。
- `brand-*` 顏色只保留在全域 theme 定義、少量品牌插畫與特殊漸層。
- 若需要透明度，優先使用 Tailwind 的 `/` alpha 語法，而不是重寫新的 rgba 值。
- 新圖表顏色先從 chart token 擴充，不要直接拿 CTA 或 danger 色硬塞進資料序列。

## 圖表色盤

Dashboard 需要多個 metric 同時存在，因此圖表色不能只靠 logo 的兩個顏色，否則辨識度不夠。現在的圖表色盤是從品牌海軍藍與 mint 延伸出的高級冷色系：

- `Weight`：`#133054`
- `Muscle`：`#3F6DAA`
- `Fat`：`#BD546F`
- `Fat %`：`#8068B0`
- `InBody Score`：`#189B8C`
- `Visceral Fat`：`#5F81A7`
- `BMR`：`#6F85A0`
- `Calories`：`#E89C2C`

這樣做的原因：

- 保留品牌一致性：全部都落在冷藍、青綠、霧紫、灰藍這個家族裡。
- 維持資訊辨識：每條線仍然足夠分開，不會只剩兩種色。
- 符合高級感：避免過亮的紅橙黃綠，改用較霧面的成熟色相。

## 造型語言

目前主題不只換顏色，也同時定義了幾個造型方向：

- `霧面玻璃卡片`
  用半透明白與柔和陰影，讓內容像浮在背景上。

- `細線網格`
  代表分析、資料、洞見，讓頁面有結構感但不會很吵。

- `流動斜向線條`
  對應 logo 的上升箭頭，讓畫面有「往上」的運動感。

- `柔和動畫`
  只保留微小漂浮、進場 reveal、背景光束漂移，不做浮誇的炫技式 motion。

## 使用原則

- CTA 優先使用 `Deep Vision Navy` 或其漸層版本，確保品牌穩定。
- 正向提示、重點高光、拖曳排序的強調，用 `Up Mint`。
- 區塊背景以 `Cloud White`、`Atmosphere`、`Frost Grid` 為主，不再回到偏暖米色。
- 錯誤與風險提示只用 `Signal Rose`，避免把 warning 顏色做得過亮破壞質感。

## 一句話總結

InsightUp 的視覺語言應該是：

`冷靜洞察的深藍底，帶著向上動能的 mint 線條，包在輕霧玻璃與未來感網格之中。`
