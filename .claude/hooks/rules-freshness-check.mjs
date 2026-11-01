// SessionStart check
// 작업 브랜치의 지침(CLAUDE.md · .claude/)이 기본 브랜치보다 옛 판이면 세션 시작 때 알린다.
// 지침은 작업 트리의 파일을 읽으므로, 브랜치가 뒤처져 있으면 main 에 새로 들어간 규칙이 세션에 안 보인다.
//
// 경위: 2026-10-30 캐나다 Kris 회신이 텍스트 서명·빈 줄 없이 나갔다. 서명·서식 규칙은 10-27·10-29 에
//   main 에 들어갔지만 세션의 작업 브랜치(claude/canada-…)가 그 이전 판이라 세션이 규칙을 몰랐다.
import { execSync } from 'node:child_process'
const sh = c => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 }).trim()
try {
  let d = 'main'
  try { d = sh("git symbolic-ref --short refs/remotes/origin/HEAD").replace(/^origin\//, '') || 'main' } catch {}
  const cur = sh('git rev-parse --abbrev-ref HEAD')
  if (cur !== d) {
    try { sh(`git fetch -q origin "+refs/heads/${d}:refs/remotes/origin/${d}"`) } catch {}
    // 세 점(...) = 공통 조상 이후 기본 브랜치에서만 바뀐 것. 작업 브랜치 쪽 변경은 셈하지 않는다.
    let changed = ''
    try { changed = sh(`git diff --name-only HEAD...origin/${d} -- CLAUDE.md .claude`) } catch {
      changed = '(공통 조상을 못 찾음 — 얕은 클론이면 git fetch --unshallow origin 후 다시 확인)'
    }
    if (changed) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext:
            `⚠️ 작업 브랜치(${cur})의 지침이 ${d} 보다 옛 판이다. ${d} 에서 바뀐 지침 파일:\n${changed}\n` +
            `메일 발송·문서 작성 등 작업 전에 \`git merge origin/${d}\` 로 지침부터 맞추고, 바뀐 CLAUDE.md 를 다시 읽을 것. ` +
            `다순에게도 "작업 브랜치가 ${d} 지침보다 뒤처져 있어 먼저 맞췄다"고 알릴 것.`,
        },
      }))
    }
  }
} catch {}
