// PreToolUse guard (matcher: Write, Edit)
// 홈 루트에 "직접" 파일을 만들/고치려 하면 확인을 요구한다.
// 하위 폴더(projects/…, .claude/…, 레포 안 등 2단계 이상)는 통과.
//
// 2026-10-02: 클라우드 세션 경로를 추가했다. 종전에는 Windows 경로(/users/wooji/)만
//   봐서 클라우드(/home/user/)에서는 아무 일도 하지 않았다 — 바닥이 없는 상태였다.
let s = ''
process.stdin.on('data', d => (s += d)).on('end', () => {
  try {
    const ti = (JSON.parse(s).tool_input) || {}
    const fp = ti.file_path || ti.path || ''
    const n = String(fp).replace(/\\/g, '/').toLowerCase()
    // 홈 바로 아래 1단계 = 홈 루트 직접 생성.
    //   Windows 로컬: /users/wooji/<파일>     클라우드: /home/user/<파일>
    //   레포 안(/home/user/eggdrop-x/파일)은 2단계라 걸리지 않는다.
    const HOME_ROOT = /(\/users\/wooji|\/home\/user)\/[^/]+\/?$/
    if (HOME_ROOT.test(n)) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason:
            '홈 폴더 루트에 파일을 직접 만들려 합니다. 권장: GitHub 레포 안에서 작업하세요. ' +
            '임시 파일은 스크래치패드를 쓰세요. 정말 여기에 만들 거면 승인하세요.',
        },
      }))
    }
  } catch {}
})
