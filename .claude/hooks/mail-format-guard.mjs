// PreToolUse guard (matcher: mcp__works-mcp__mail_send)
// 세션이 API 로 보내는 메일이 공통 지침(CLAUDE.md "메일 사명·서명")의 서식을 지키는지 발송 직전에 검사한다.
// 어기면 발송을 막고(deny) 무엇을 고칠지 알려 준다. 지키면 그대로 통과 — 발송 확인 프롬프트는 원래대로 뜬다.
//
// 검사 항목
//   1. contentType 이 html 인가 (text 로 보내면 서명·서식이 다 빠진다)
//   2. 웍스 저장 서명 HTML(로고 이미지 sign.mail.worksmobile.com/signature/logo)이 붙었나
//   3. 문단이 2개 이상이면 문단 사이 빈 줄 <p><br></p> 가 있나 (웍스는 <p> 여백이 0)
//   4. 과거 사명 Goldenhind 를 본문에 쓰지 않았나 (계약서 당사자명 인용이면 승인으로 넘길 수 있게 ask)
//
// 경위: 2026-10-30 캐나다 Kris 회신(271475)이 텍스트 서명·빈 줄 없이 나갔다.
//   규칙은 main 에 있었지만 세션의 작업 브랜치가 그 이전 판이라 읽히지 않았다 —
//   규칙을 "읽고 지키기"에만 맡기지 않고 발송 단계에서 기계적으로 막는다.
let s = ''
process.stdin.on('data', d => (s += d)).on('end', () => {
  try {
    const ti = (JSON.parse(s).tool_input) || {}
    const body = String(ti.body || '')
    const ct = String(ti.contentType || 'html').toLowerCase()
    const problems = []
    if (ct !== 'html') problems.push('contentType 이 "html" 이 아니다 — html 로 보내야 서명·서식이 산다')
    if (!/sign\.mail\.worksmobile\.com\/signature\/logo/.test(body))
      problems.push('저장 서명 HTML 이 없다 — CLAUDE.md "메일 사명·서명" 절의 서명 블록을 본문 끝에 그대로 붙일 것(텍스트 서명 금지)')
    const sig = body.search(/sign\.mail\.worksmobile\.com\/signature\/logo/)
    const main = sig > 0 ? body.slice(0, sig) : body
    const paras = (main.match(/<p[\s>]/gi) || []).length
    if (paras >= 2 && !/<p>\s*<br\s*\/?>\s*<\/p>/i.test(main))
      problems.push('문단 사이 빈 줄 <p><br></p> 이 없다 — 웍스는 <p> 여백이 0 이라 문단이 붙어 보인다')
    if (problems.length) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: '메일 서식 점검 실패 — 고친 뒤 다시 보낼 것:\n- ' + problems.join('\n- '),
        },
      }))
      return
    }
    if (/goldenhind/i.test(body)) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason:
            '본문에 과거 사명 "Goldenhind" 가 있습니다. 보내는 글의 사명은 EGGDROP Corp. 입니다. ' +
            '계약서 당사자명을 그대로 인용한 경우에만 승인하세요.',
        },
      }))
    }
  } catch {}
})
