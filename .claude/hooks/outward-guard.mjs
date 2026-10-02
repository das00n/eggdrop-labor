// PreToolUse guard (matcher: Bash, WebFetch)
// 정책: allow는 최대한 넓게 두되, "보안 바닥"만 이 훅이 지킨다.
//  - 파괴적/위험 명령(rm -rf /·~·*, 파이프→shell, mkfs, dd of=/dev, 포크밤) → 경고와 함께 질문
//  - curl/wget: 신뢰 호스트면 자동 허용, 낯선 호스트면 "어디로 나가는지" 질문
//  - git push / wrangler deploy / gh pr|release → 배포·게시라 질문
//  - WebFetch: 신뢰 도메인 자동 허용, 낯선 도메인 질문
//  - 그 외 → 아무 것도 출력 안 함(넓은 allow가 그대로 적용)
let s = ''
process.stdin.on('data', d => (s += d)).on('end', () => {
  try {
    const j = JSON.parse(s)
    const tool = j.tool_name || ''
    const ti = j.tool_input || {}
    const out = (decision, reason) =>
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason },
      }))

    // 신뢰 호스트/도메인 (curl·WebFetch 공통). 넉넉하게 — 내 인프라 + 자주 쓰는 공개 API/CDN.
    const KNOWN = /(localhost|127\.0\.0\.1|\.supabase\.co|\.workers\.dev|\.pages\.dev|github\.com|\.githubusercontent\.com|\.ntruss\.com|\.naver\.com|solapi\.com|wehago\.com|casenote\.kr|fcmedia\.co\.kr|\.anthropic\.com|claude\.ai|openstreetmap\.org|\.go\.kr|\.npmjs\.org|jsdelivr\.net|cdnjs\.cloudflare\.com|\.googleapis\.com|\.google\.com)/

    if (tool === 'WebFetch') {
      const url = ti.url || JSON.stringify(ti)
      if (KNOWN.test(url)) out('allow', '신뢰 도메인이라 자동 허용했습니다.')
      else out('ask', '낯선 외부 도메인을 가져옵니다. 대상 URL이 안전한지 확인하세요.')
      return
    }

    // 이하 Bash
    const cmd = ti.command || ''

    // 1) 파괴적/위험 → 경고 질문 (호스트 신뢰 여부와 무관하게 먼저 검사)
    const DANGER = /\brm\s+-\w*[rf]\w*\s+(\/|~|\*|\$HOME)|(curl|wget)[^\n]*\|\s*(sudo\s+)?(ba)?sh\b|:\s*\(\s*\)\s*\{|\bmkfs\b|\bdd\s[^|]*of=\/dev\//
    if (DANGER.test(cmd)) {
      out('ask', '⚠️ 위험할 수 있는 명령입니다(시스템/홈 삭제, 다운로드→셸 실행 등). 명령을 한 번 더 확인하세요.')
      return
    }

    // 2) 네트워크 전송
    if (/(^|[;&|(\s])(curl|wget)\s/.test(cmd)) {
      if (KNOWN.test(cmd)) out('allow', '내부/신뢰 호스트로의 요청이라 자동 허용했습니다.')
      else out('ask', '낯선 외부 호스트로 네트워크 요청을 보냅니다. 데이터가 어디로/무엇이 나가는지 확인하세요.')
      return
    }

    // 3) 배포·게시·푸시
    if (/git\s+push|wrangler[\s\S]*deploy|gh\s+(pr|release)\s/.test(cmd)) {
      out('ask', '외부로 배포·게시·푸시하는 작업입니다. 대상과 내용이 의도한 것인지 확인하세요.')
    }
    // else: no output → 넓은 allow 적용
  } catch {
    // 파싱 실패 시 조용히 통과
  }
})
