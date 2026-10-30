# Unfold

[![check](https://github.com/jaythealpha/unfold/actions/workflows/check.yml/badge.svg)](https://github.com/jaythealpha/unfold/actions/workflows/check.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-ff5a36)](https://jaythealpha.github.io/unfold/)

**폰 모델명 하나로, 분해와 조립을 보여 주는 HTML 페이지 한 장.**

Unfold는 [Claude Code](https://claude.com/claude-code)용 스킬이에요. "갤럭시 Z 폴드8이 어떻게 조립되는지 보여줘"라고 하면 Claude가 공개된 분해·수리 자료를 조사해요. 그 자료로 부품과 조립 순서를 정리한 다음, 오프라인에서 열리는 페이지 한 장을 만들어요.

페이지의 0–100 바를 끌면 이렇게 움직여요.

1. 완성된 폰이 뒤집혀요.
2. 부품이 흩어져요.
3. 실제 순서대로 하나씩 다시 조립돼요.

**▶ 설치 없이 예제 보기: https://jaythealpha.github.io/unfold/**

![갤럭시 Z 폴드8이 펼쳐지고, 부품으로 흩어졌다가 다시 조립되기 시작하는 장면](docs/assets/demo.gif)

| [갤럭시 S24](https://jaythealpha.github.io/unfold/examples/galaxy-s24.html) | [갤럭시 Z 폴드8](https://jaythealpha.github.io/unfold/examples/galaxy-z-fold8.html) | [갤럭시 Z 플립8](https://jaythealpha.github.io/unfold/examples/galaxy-z-flip8.html) | [아이폰 17 Pro](https://jaythealpha.github.io/unfold/examples/iphone-17-pro.html) | [아이폰 듀오](https://jaythealpha.github.io/unfold/examples/iphone-duo.html) |
|---|---|---|---|---|
| 바 형태, 뒤로 열기 | 책처럼 접기 | 위아래로 접기 | 앞으로 열기 | 책처럼 접기 |

## 무엇을 볼 수 있나

- **배치 두 가지:** 층층이 떠 있는 분해도, 또는 매트 위에 가지런히 늘어놓은 부품
- **그림 두 가지:** 컬러 일러스트, 또는 번호 풍선과 조립 가이드가 있는 도면
- **보기 세 가지:**
  - 간단히: 핵심 부품과 하는 일
  - 자세히: 모든 부품에 이름표
  - 매뉴얼: 단계 카드, 공구, 주의 사항, 부품표, 인쇄용 매뉴얼
- **폴더블:** 접히고 펼쳐지는 장면이 있고, 직접 접어 볼 수도 있어요.
- **재생 속도:** 1×(가장 느림, 전체 60초), 2×(기본), 3×, 5×
- **저장:** 이미지, 영상, 인쇄용 매뉴얼
- **언어:** 한국어가 기본이고, 버튼 하나로 영어로 바꿀 수 있어요.

## 정직하게 표시하는 것

- **부품 근거:** 부품마다 *자료 확인*인지 *추정*인지 표시해요. 페이지 위쪽에는 그 비율이 나와요. 확인된 부품이 절반이 안 되면 경고도 보여 줘요.
- **위치와 크기:** 내부 부품의 위치와 크기는 대부분 추정이에요. 공식 치수와 공개 분해 자료에는 부품 순서와 개수는 나오지만, 정확한 좌표는 거의 없어요.
- **자료 원칙:** 출처에서는 사실(치수, 개수, 순서, 이름, 고정 방식)만 가져와요. 문장은 새로 쓰고, 사진과 도면은 쓰지 않아요. 출처는 링크로만 남겨요.
- **비공식:** 제조사와 관계없는 비공식 일러스트예요. 자세한 내용은 [NOTICE.md](NOTICE.md)에 있어요.
- **검증 기록:** 공개하기 전에 어떻게 검증했고 무엇을 고쳤는지는 [VALIDATION.md](VALIDATION.md)에 있어요.

## 설치

Claude Code에서 다음 두 명령을 입력하세요.

```
/plugin marketplace add jaythealpha/unfold
```

```
/plugin install unfold@unfold
```

플러그인을 쓰지 않는다면 스킬 폴더만 복사해도 돼요.

```bash
git clone https://github.com/jaythealpha/unfold && cp -R unfold/plugins/unfold/skills/unfold ~/.claude/skills/unfold
```

그다음 Claude Code에 이렇게 말해 보세요.

- "갤럭시 S25 울트라가 어떻게 조립되는지 보여줘"
- "아이폰 16 분해도 만들어줘, 매뉴얼까지"
- 폰 사진을 붙이고 "이 폰 안에 뭐가 들었는지 보여줘"

**필요한 것:**
- 데이터 검사와 빌드에는 Node 18 이상이 필요해요(20 이상 권장).
- 화면 검사에는 Node 22 이상과 Chrome 또는 Chromium이 필요해요.
- npm 패키지는 필요 없어요.
- 브라우저가 없으면 화면 검사를 건너뛰고, 페이지에 그 사실을 적어요.

공개 전 시험에서는 한 번 만드는 데 8–17분 걸렸어요. 조사, 모델 작성, 검사 두 단계를 Claude가 사람의 개입 없이 끝까지 진행해요.

## 어떻게 동작하나

1. **조사:** 공식 치수와 공개 분해·수리 자료를 찾아요.
2. **모델 작성:** 부품, 형태, 고정 방식, 조립 순서를 JSON 한 개로 정리해요.
3. **1차 관문, 데이터:**
   - 치수가 공식 값의 ±0.5 mm 안에 있는지
   - 부품끼리 겹치지 않는지
   - 조립하면서 다른 부품을 뚫고 지나가지 않는지
   - 폴더블이면 접은 크기가 맞는지
4. **2차 관문, 화면:**
   - 헤드리스 Chrome으로 장면 40여 개를 찍어요.
   - 빈 화면, 스크립트 오류, 넘치는 글자가 없는지 봐요.
   - 처음과 끝에 화면이 켜져 있는지 봐요.
   - 재생 속도와 인쇄 매뉴얼을 확인해요.
   - Claude가 찍은 사진을 직접 보고 고쳐요.
5. **전달:** 두 관문을 통과하면 페이지와 모델을 전달해요. 끝내 못 고친 문제는 페이지의 "알려진 한계"에 적어요.

## 피드백

공개 버전은 지금부터 쓰는 분들의 피드백으로 다듬어 가요.

- **부품이 실제와 다르면:** [부품이 틀렸어요](https://github.com/jaythealpha/unfold/issues/new?template=1-wrong-part.yml)
- **직접 만들어 봤다면:** [이걸로 만들어 봤어요](https://github.com/jaythealpha/unfold/issues/new?template=2-my-model.yml). 잘 됐는지, 어디서 멈췄는지 알려 주세요.

이슈는 일주일에 한 번 모아서 확인해요. 고친 내역은 [CHANGELOG.md](CHANGELOG.md)에 남겨요. 코드나 데이터를 직접 고치고 싶다면 [CONTRIBUTING.md](CONTRIBUTING.md)를 봐 주세요. 보안 문제는 [SECURITY.md](SECURITY.md)의 방법으로 비공개로 알려 주세요.

## 저장소 구조

| 경로 | 내용 |
|---|---|
| `plugins/unfold/skills/unfold/SKILL.md` | Claude가 따르는 작업 순서와 규칙 |
| `plugins/unfold/skills/unfold/engine/` | 페이지 엔진 (three.js) |
| `plugins/unfold/skills/unfold/scripts/` | `check_model.mjs` (1차 관문), `build.mjs`, `shoot.mjs` (2차 관문) |
| `plugins/unfold/skills/unfold/references/` | 모델 형식과 조사 규칙 |
| `plugins/unfold/skills/unfold/examples/` | 예제 다섯 개의 모델 JSON |
| `plugins/unfold/skills/unfold/research/` | 예제를 만들 때의 조사 노트 (확인한 것, 충돌한 것, 못 찾은 것) |
| `docs/` | 데모 사이트 (GitHub Pages) |

```bash
cd plugins/unfold/skills/unfold && npm test
```

```bash
node plugins/unfold/skills/unfold/scripts/build.mjs plugins/unfold/skills/unfold/examples/galaxy-s24.json out.html
```

---

## English

**One phone model name in, one HTML page out that takes the phone apart and puts it back together.**

Unfold is a [Claude Code](https://claude.com/claude-code) skill. Ask "show me how the Galaxy Z Fold8 goes together". Claude researches public teardown and repair data, writes an assembly model, checks it with two automatic gates (data and screenshots) and delivers one offline HTML page.

Drag the 0–100 bar and the finished phone:
1. turns over
2. bursts into its parts
3. assembles itself again in the real order

- **Demo:** https://jaythealpha.github.io/unfold/
- **Install:**
  1. `/plugin marketplace add jaythealpha/unfold`
  2. `/plugin install unfold@unfold`
- **Honesty:**
  - Every part is marked sourced or estimated, and most internal positions are estimates.
  - Facts are taken from sources, never text or images, and sources appear as links.
  - It is an unofficial illustration, not affiliated with any manufacturer (see [NOTICE.md](NOTICE.md)).
- **How it was checked:** [VALIDATION.md](VALIDATION.md)
- **Feedback:** use the issue forms for wrong parts and field reports; see [CONTRIBUTING.md](CONTRIBUTING.md) for pull requests and [SECURITY.md](SECURITY.md) for private reports.

MIT licence. Bundles three.js (MIT).
