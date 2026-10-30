# 기여 안내 / Contributing

Unfold를 더 정확하게 만드는 데 도움을 주셔서 고마워요. 이 프로젝트는 한 사람이 운영해요. 이슈는 일주일에 한 번 모아서 확인해요.

## 가장 도움이 되는 것

1. **틀린 부품 알려 주기:** [부품이 틀렸어요](https://github.com/jaythealpha/unfold/issues/new?template=1-wrong-part.yml) 양식을 써 주세요.
   - 근거는 링크로만 남겨 주세요.
   - 다른 사이트의 사진, 도면, 문장을 그대로 붙이지 말아 주세요. 이 프로젝트는 출처에서 사실만 가져와요.
2. **직접 만들어 본 결과 공유하기:** [이걸로 만들어 봤어요](https://github.com/jaythealpha/unfold/issues/new?template=2-my-model.yml) 양식을 써 주세요. 마지막에 출력된 `GATE1`, `GATE2` 줄을 꼭 같이 붙여 주세요.

## 코드나 데이터를 고치는 풀 리퀘스트

- **작은 수정:** 바로 PR을 보내 주세요. 예제의 나사 수, 오탈자, 문서가 여기에 해당해요.
- **큰 변경:** 먼저 이슈로 이야기해 주세요. 엔진 동작, 새 제품군이 여기에 해당해요.
- **PR을 보내기 전에** 아래가 모두 통과해야 해요. CI도 같은 검사를 해요.

```bash
cd plugins/unfold/skills/unfold && npm test
```

```bash
node plugins/unfold/skills/unfold/scripts/check_model.mjs plugins/unfold/skills/unfold/examples/<모델>.json --official W,L,T
```

- **예제 모델을 고쳤다면:** `docs/examples/<모델>.html`도 다시 빌드해서 같이 올려 주세요.

```bash
node plugins/unfold/skills/unfold/scripts/build.mjs plugins/unfold/skills/unfold/examples/<모델>.json docs/examples/<모델>.html --gate2 pass
```

### 데이터 원칙 (지켜 주세요)

- **"자료 확인"의 조건:** 출처에 그 부품이 있다는 것과 어떻게 고정되는지가 *둘 다* 적혀 있어야 해요. 자세한 기준은 `plugins/unfold/skills/unfold/references/research.md`의 "When a part counts as verified"에 있어요.
- **스펙 페이지, 보도자료, 포럼 글, 판매 페이지:** 고정 방식의 근거가 되지 않아요.
- **글:** 문장은 새로 써 주세요. 출처 문장을 옮기지 말아 주세요.

## 이 저장소의 구조에 대해

이 저장소는 만든 사람의 작업 저장소에서 내보낸 결과예요. 받아들인 PR은 작업 저장소에 옮겨 반영한 다음 다시 내보내요. 그래서 커밋 기록이 PR과 똑같이 남지는 않아요. 기여해 주신 분은 CHANGELOG에 이름을 남겨요.

---

**English.** Thank you for helping make Unfold more accurate.

**The most useful contributions:**
- Wrong-part reports, through the issue form. Link to evidence instead of pasting photos or text.
- Field reports from your own runs, with the `GATE1` and `GATE2` lines.

**Pull requests:**
- They must pass `npm test` and Gate 1, as above. CI runs the same checks.
- If you change an example model, rebuild its page in `docs/examples/`.
- Follow the data rule: a part is "verified" only when a cited source states both that the part is there and how it is held. Write every sentence fresh.

**How changes land:** this repository is exported from the author's working repository. Accepted changes are ported there and exported again, so the commit history won't match your PR exactly. Contributors are credited in the CHANGELOG.
