// PreToolUse guard (matcher: mcp__works-mcp__mail_send)
// 세션이 API 로 보내는 메일이 공통 지침(CLAUDE.md "메일 사명·서명")의 서식을 지키는지 발송 직전에 검사한다.
// 어기면 발송을 막고(deny) 무엇을 고칠지 알려 준다. 지키면 그대로 통과 — 발송 확인 프롬프트는 원래대로 뜬다.
//
// 검사 항목
//   1. contentType 이 html 인가 (text 로 보내면 서명·서식이 다 빠진다)
//   2. 웍스 저장 서명 HTML(로고 이미지 sign.mail.worksmobile.com/signature/logo)이 붙었나
//   3. 문단이 2개 이상이면 문단 사이 빈 줄 <p><br></p> 가 있나 (웍스는 <p> 여백이 0)
//   4. 과거 사명 Goldenhind 를 본문에 쓰지 않았나 (계약서 당사자명 인용이면 승인으로 넘길 수 있게 ask)
//   5. 제목이 Re: 로 시작하면 막는다(deny) — 답장은 우디 워커 mcp__telegram-rooms__mail_reply 로 보낸다(2026-11-19 다순 지시
//      "어떤 세션·레포라도 답장은 알아서 지금 만든 걸 쓰게", 결정 문서 4-5). deny 사유는 세션에게 가므로 세션이 스스로 갈아탄다
//      (ask 는 다순에게만 보여 세션이 배우지 못한다). Fw: 는 전달 도구가 없어 확인(ask) 그대로.
//   6. 위를 모두 통과하고 받는 사람이 다순 본인(keel@eggdrop.com) 한 명뿐이며 참조·숨은참조가 비어 있으면 승인 없이 보낸다(allow).
//      초안을 다순 메일함으로 보내는 일에 매번 승인을 묻지 않기 위해서다(다순 지시 2026-11-18). 외부·다른 수신자가 하나라도 있으면 지금처럼 묻는다.
//
// 경위: 2026-10-30 캐나다 Kris 회신(271475)이 텍스트 서명·빈 줄 없이 나갔다.
//   규칙은 main 에 있었지만 세션의 작업 브랜치가 그 이전 판이라 읽히지 않았다 —
//   규칙을 "읽고 지키기"에만 맡기지 않고 발송 단계에서 기계적으로 막는다.
//   2026-11-12 이탈리아 Giuseppe 안부 메일(272672)이 또 텍스트 서명·빈 줄 없이, 답장이 아닌 새 메일로 나갔다 —
//   레포 여러 개를 붙인 세션(작업 폴더가 레포 밖)이라 레포의 이 훅이 걸리지 않았다. 그래서 클라우드 설정 스크립트가
//   이 파일을 사용자 범위(~/.claude/settings.json)에도 설치한다(tools/ecosystem-sync/sync_user_hooks.py). 5번도 이때 추가.
let s = ''
process.stdin.on('data', d => (s += d)).on('end', () => {
  try {
    const ti = (JSON.parse(s).tool_input) || {}
    const body = String(ti.body || '')
    const subject = String(ti.subject || '')
    const ct = String(ti.contentType || 'html').toLowerCase()
    // 5. 답장은 mail_reply 로 — 서식보다 먼저 본다(서식을 고쳐 다시 보내도 결국 새 메일이라)
    if (/^\s*re\s*:/i.test(subject)) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            '제목이 RE: 인 메일은 mail_send 로 보내지 않는다 — 공식 API 발송은 답장이 아니라 새 메일이라 상대 메일함에서 원문과 묶이지 않고 원문 인용도 없다. ' +
            '받은 메일에 대한 답장은 mcp__telegram-rooms__mail_reply 로 보낸다(다순 지시 2026-11-19, 어느 세션·레포든): ' +
            'works-mcp mail_search 로 원문 mailId·folderId 를 찾고 → body 에 지금 본문(같은 서식·저장 서명, 제목·원문 인용은 도구가 붙인다) → ' +
            'confirm 없이 불러 받은 미리보기를 다순에게 보여 주고 → 다순이 보내라고 하면 confirm:true. 전체답장은 reply_all:true. ' +
            '도구가 안 보이면 ToolSearch 로 telegram-rooms 를 불러오고, 그래도 없으면 초안만 써서 다순에게 웍스 웹 「답장」을 부탁한다(관제탑 결정 문서 2026-11-10 4-5).',
        },
      }))
      return
    }
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
    const asks = []
    if (/goldenhind/i.test(body))
      asks.push(
        '본문에 과거 사명 "Goldenhind" 가 있습니다. 보내는 글의 사명은 EGGDROP Corp. 입니다. ' +
          '계약서 당사자명을 그대로 인용한 경우에만 승인하세요.',
      )
    if (/^\s*(fw|fwd)\s*:/i.test(subject))
      asks.push(
        '제목이 Fw: 로 시작합니다. API 발송은 전달이 아니라 새 메일로 나갑니다(대화로 묶이지 않고 원문 첨부도 없음). ' +
          '전달 도구는 아직 없어 웍스 웹 「전달」이 원칙입니다. 다순이 API 발송을 직접 지시한 경우에만 승인하세요.',
      )
    if (asks.length) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: asks.join('\n'),
        },
      }))
      return
    }
    const SELF = 'keel@eggdrop.com'
    const addrs = v => String(v || '').split(/[;,]/).map(x => x.trim().toLowerCase()).filter(Boolean)
    const to = addrs(ti.to)
    if (to.length === 1 && to[0] === SELF && !addrs(ti.cc).length && !addrs(ti.bcc).length) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          permissionDecisionReason: '다순 본인(keel@eggdrop.com)에게만 보내는 메일 — 승인 생략',
        },
      }))
    }
  } catch {}
})
