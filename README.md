# SoulSync (소울싱크)

> 신앙과 마음, 그리고 일상의 리듬을 하나로 연결하는 AI 라이프 케어 앱
> — Pi Next 해커톤 출품용 1단계 MVP 웹 프로토타입

묵주기도와 신앙 루틴을 "해야 하는 일"이 아니라 "나를 돌보는 시간"으로 바꾸는 앱입니다.
오늘의 마음을 고르면 그 마음에 맞는 말씀과 1분 기도, 묵주기도의 신비를 제안하고,
10알(1단)을 마치면 조용히 기록으로 남겨 줍니다.

- **빌드 없음 · 의존성 없음**: 순수 HTML/CSS/JS. 파일을 열면 바로 동작합니다.
- **한국어 / English 실시간 전환**: 상단 `EN` 버튼 하나로 전체 화면·기도문·AI 답변이 함께 바뀝니다.
- **Pi 연동 레이어 내장**: Pi Browser에서는 실제 `Pi.authenticate` / `Pi.createPayment`,
  일반 브라우저에서는 안전한 데모 시뮬레이션으로 동일한 흐름을 체험할 수 있습니다.

---

## 1. 바로 실행하기

### 가장 간단한 방법
`index.html` 파일을 브라우저로 열면 끝입니다. (Chrome/Edge/Safari 최신 버전 권장)

### 로컬 서버로 확인 (권장 — localStorage·음성 동작이 더 안정적)
```bash
cd projects/soulsync
python3 -m http.server 4300
# 브라우저에서 http://localhost:4300
```

### 정적 호스팅
`projects/soulsync/` 폴더를 그대로 올리면 됩니다. 빌드 단계가 없습니다.

| 호스팅 | 방법 |
| --- | --- |
| GitHub Pages | 저장소에 폴더를 올리고 Settings → Pages → Branch/root 지정 |
| Vercel | 프로젝트 루트를 `projects/soulsync`로 설정, 프레임워크 "Other" |
| Netlify | 폴더 드래그 앤 드롭 |
| PiNet / Pi 앱 호스팅 | Pi 생태계용 정적 호스팅에 동일 폴더 업로드 (HTTPS 필수) |

> Pi Browser에서 실제 로그인·결제를 시험하려면 **공개 HTTPS 주소**가 필요합니다.
> `http://localhost`는 데모 모드로만 동작합니다.

---

## 2. 화면 구성 (하단 4개 탭)

### 🏠 홈
- 오늘의 감정 선택 칩 6종 (지침 · 불안 · 평온 · 감사 · 외로움 · 기쁨)
- 선택한 마음에 맞춘 AI의 한마디 + 오늘의 말씀
- 오늘의 작은 루틴 3개 체크: 짧은 기도 1회 · 묵주기도 1단 · 말씀 1개
- `▶ 기도 시작하기` → 1분 기도 시트 / `묵주기도로 이어가기` → 묵주기도 탭

### 🙏 묵주기도
- 5단 진행 표시(● ○ ○ ○ ○)와 10알 카운터
- 실제 가톨릭 기도문 수록: 성호경 · 사도신경 · 주님의 기도 · 성모송 · 영광송 · 구원의 기도 (KR/EN)
- 오늘의 마음에 맞춘 신비 추천 + 신비 5개 목록(현재 위치 강조)
- `한 알 바치기` 수동 진행 · `자동 진행/일시정지` · `음성 안내`(Web Speech API) · `🌙 집중 모드`(어두운 명상 UI)
- 10알을 마치면 오늘의 "묵주기도 1단"이 자동 기록됩니다. 5단 완료 시 마무리 카드.

### 🧠 AI 코치
- 고민 입력창 + 빠른 예시 칩 6개
- 키워드/감정을 읽어 **공감 → 오늘의 1분 행동 → 성경 구절 → 추천 신비**를 카드로 제시
- `추천 기도 시작` → 해당 신비로 묵주기도 화면 연결
- 답변은 언어를 바꾸면 함께 번역됩니다(테마 + 원문을 저장하고 다시 렌더링).

### 📊 루틴 · Pi
- 연속 달성 Streak, 최고 기록, 최근 7일 기록(기도·묵주·말씀 3색 점)
- 오늘 체크 상태 + 흐름 피드백(3일 이상 쉬면 "1분 기도부터" 제안)
- **Pi 연동 카드**: Pi 로그인(또는 데모), 감사 봉헌(0.1 / 1 / 3.14 π), 최근 봉헌 내역
- **글로벌 묵주기도 연대 카운터**: 오늘 함께 기도한 파이오니어 수(데모에서는 예시 숫자 + 내 기도 횟수)
- 내 기록 초기화

---

## 3. Pi 연동 가이드

### 3.1 동작 방식
`pi-adapter.js` 하나로 두 환경을 모두 처리합니다.

| 환경 | 감지 | 동작 |
| --- | --- | --- |
| Pi Browser (`window.Pi` 존재) | `SS_PI.mode === "pi"` | `Pi.init` → `Pi.authenticate` → `Pi.createPayment` (서버 승인 필요) |
| 일반 브라우저 | `SS_PI.mode === "demo"` | 0.65초 지연 후 데모 로그인 / 0.9초 후 데모 봉헌 기록. 모든 결과에 `mode: "demo"` 표시 |

- Pi Browser인데 SDK가 주입되지 않은 경우, 어댑터가 `https://sdk.minepi.com/pi-sdk.js`를 한 번만 동적으로 불러옵니다.
- 데모 모드에서는 **실제 결제가 일어나지 않으며**, UI에도 "데모 모드 / 실제 결제 없음"이라고 표시됩니다.
- `Pi.init`의 `sandbox` 값은 `pi-adapter.js` 상단 `CONFIG.sandbox`에서 바꿉니다(테스트: `true`, 실결제: `false`).

### 3.2 Pi Developer Portal 등록
1. **Pi Browser**를 열고 Pi 계정으로 로그인합니다.
2. Pi 개발자 포털(`developers.minepi.com`)에 접속해 **Sign in with Pi**로 로그인합니다.
3. **New App** 생성 후 아래를 입력합니다.
   - App Name: `SoulSync`
   - Description: `Faith, heart and daily rhythm — a Catholic prayer & routine companion for Pioneers`
   - App URL: 배포한 HTTPS 주소 (예: `https://soulsync.example.com`)
   - Category: `Lifestyle` / `Health & Wellness`
   - Logo, 스크린샷 업로드
4. 앱 상세 화면에서 **API Key**(서버 승인용)를 발급받아 서버 환경변수에 넣습니다. 이 키는 절대 프론트엔드에 넣지 마세요.
5. Pi Browser 주소창에 등록한 App URL을 열어 실제 로그인/결제를 확인합니다.
6. 메인넷 노출을 원하면 포털의 체크리스트(작동하는 앱, 개인정보처리방침, 결제 완결성 등)를 채우고 심사를 요청합니다.

### 3.3 결제 승인 서버 (필수)
Pi 결제는 브라우저에서 끝나지 않습니다. 결제 ID를 서버에서 승인(approve)하고 완료(complete)해야 합니다.
`pi-adapter.js`는 아래 경로를 호출하도록 되어 있습니다.

```
POST /api/pi/approve     { paymentId }
POST /api/pi/complete    { paymentId, txid }
POST /api/pi/incomplete  { paymentId }     // 중단된 결제 정리
```

최소 예시 (Node 18+, Express):

```js
import express from "express";
const app = express();
app.use(express.json());

const PI_API = "https://api.minepi.com/v2";
const KEY = process.env.PI_API_KEY; // 개발자 포털에서 발급

app.post("/api/pi/approve", async (req, res) => {
  const r = await fetch(`${PI_API}/payments/${req.body.paymentId}/approve`, {
    method: "POST",
    headers: { Authorization: `Key ${KEY}` }
  });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok });
});

app.post("/api/pi/complete", async (req, res) => {
  const r = await fetch(`${PI_API}/payments/${req.body.paymentId}/complete`, {
    method: "POST",
    headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ txid: req.body.txid })
  });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok });
});

app.post("/api/pi/incomplete", (req, res) => {
  console.log("incomplete payment", req.body.paymentId);
  res.json({ ok: true });
});

app.listen(process.env.PORT || 8080);
```

프론트엔드에서 다른 도메인의 API를 쓴다면 `pi-adapter.js`의 `CONFIG.apiBase`에 주소를 넣고 CORS를 허용하세요.
(같은 도메인에 두는 구성이 가장 간단합니다.)

### 3.4 해커톤 관점의 Pi 활용 포인트
- **Pi 로그인 = 기도 기록의 연속성**: 기기 없이도 내 루틴이 이어집니다.
- **감사 봉헌(1 π 등)**: 감사의 크기를 작은 금액으로 표현하고, 내역을 투명하게 남깁니다. 향후 성당·자선단체로 확장.
- **글로벌 묵주기도 연대**: 전 세계 파이오니어가 같은 시각에 같은 신비를 기도하는 경험 → 매일 재방문 이유.
- **왜 Pi여야 하는가**: 국경 없는 결제 + 이미 형성된 글로벌 공동체(파이오니어) + 낮은 수수료로 소액 봉헌이 가능.

---

## 4. 데이터와 개인정보

- 모든 기록(감정, 루틴, 코치 대화, 봉헌 내역)은 **브라우저 localStorage**(키 `soulsync.v1`)에만 저장됩니다.
- 서버로 전송되는 개인정보는 없습니다. Pi 로그인 시 Pi SDK가 반환하는 `username`만 화면에 표시합니다.
- 앱 안의 `내 기록 초기화`로 언제든 전부 삭제할 수 있습니다.
- 프로토타입 단계에서는 실제 결제·정산이 발생하지 않습니다(데모 모드 명시).

---

## 5. 파일 구조

```
projects/soulsync/
├── index.html          # 4개 화면 + 1분 기도 시트 + 하단 탭
├── styles.css          # 모바일 430px 프레임, 데스크톱 폰 프레임, 집중 모드(다크)
├── app.js              # 렌더링·이벤트·localStorage·묵주 세션·음성/차임
├── data.js             # KR/EN UI 문구, 기도문, 신비, 성경 구절, 코치 테마
├── rosary.js           # 묵주기도 진행 엔진(순수 로직, Node로 단위 테스트 가능)
├── coach.js            # 키워드 기반 코치 엔진(추후 LLM으로 교체 가능한 응답 형태)
├── pi-adapter.js       # Pi Browser / 데모 모드 어댑터
├── tests/smoke.test.js # jsdom 기반 스모크 테스트 (선택)
├── README.md
└── SUBMISSION_EN.md    # Pi Next 제출용 영문 소개 + 개인정보처리방침 초안
```

---

## 6. 검증 결과 (2026-11-20 기준)

```bash
for f in data.js rosary.js coach.js pi-adapter.js app.js; do node --check "$f"; done   # 문법 검사
node tests/smoke.test.js                                                               # 31개 항목 통과
```

- `node --check`: 5개 JS 파일 모두 통과
- HTML 구조 검사: 미닫힘 태그 0, 중복 id 0 (72개 id)
- CSS: 중괄호 균형 통과, 외부 폰트·CDN 의존 없음(오프라인 동작)
- 스모크 테스트 31개 통과 항목: 묵주 엔진(기도 순서·10알·5단·진행 표시), 코치 분류(지침/불안/감사/외로움/미분류),
  홈 렌더링(감정 6종·루틴 3개·말씀), 1단 기록·연속 달성 표시, 집중 모드 토글, 신비 전환,
  KR↔EN 전환(기도문·동적 문구 포함), 코치 응답 렌더링·번역, Pi 데모 로그인·3.14 π 봉헌 기록,
  1분 기도 완료 기록, localStorage 저장/복원, 초기화

테스트는 앱 실행에 필요하지 않습니다. 돌려 보려면:

```bash
cd projects/soulsync
npm install --no-save jsdom
node tests/smoke.test.js
```

---

## 7. 알려진 한계와 다음 단계

| 항목 | 현재 | 다음 단계 |
| --- | --- | --- |
| AI 코치 | 기기 안에서 도는 키워드·감정 규칙 엔진 (네트워크 없음) | 서버 LLM 연결. `coach.js`의 응답 형태(공감/행동/구절/신비)를 그대로 유지 |
| Pi 결제 | 데모 시뮬레이션 / 실결제는 승인 서버 필요 | 승인·완료 서버 + 봉헌 내역 원장(공개 대시보드) |
| 연대 카운터 | 데모용 예시 숫자 + 내 기도 횟수 | 서버 집계(오늘 함께 기도한 파이오니어 수) |
| 음성 안내 | Web Speech API(기기 음성) | 녹음된 기도 음성 패키지(프리미엄) |
| 데이터 | localStorage | Pi 계정 기반 동기화, 성당/본당 연동 |
| 다국어 | KR / EN | 스페인어·포르투갈어·필리핀어 등 가톨릭 신자가 많은 지역으로 확장 |
| 2단계 | — | 개인화 통계, 성경/교리 해설, 기도 요청 커뮤니티 |

---

## 8. 만든 사람

재잘베니 — 기획 및 방향 · Pi Next Hackathon 2027
문의: 이 프로토타입을 전달받은 담당자를 통해 연락 주세요.
