/** 流式 reasoning 按字符追加；工具/状态类整句前换行 */
export function appendThinking(acc: string, chunk: string): string {
  if (!chunk) return acc
  const isStatusLine =
    /^(调用工具 |工具 |正在|Analyzing|Generating|Tool )/.test(chunk) || chunk.endsWith('\n')
  if (isStatusLine && acc.length > 0 && !acc.endsWith('\n')) {
    return `${acc}\n\n${chunk}`
  }
  return acc + chunk
}
