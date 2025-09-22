export const buildMoodShiftPrompt = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return ''
  }

  const formattedDialogue = messages
    .map(({ role, content }) => {
      const safeRole = role?.toUpperCase() || 'UNKNOWN'
      const safeContent = (content || '').replace(/`/g, '\\`')
      return `${safeRole}: ${safeContent}`
    })
    .join('\n')

  return `You are an emotions analyst. Examine the ordered chat transcript.
Find if the USER transitions from sad/down/negative to happy/hopeful/relieved within this excerpt.
Focus on genuine emotional shift in the USER (not the assistant).
Identify the catalyst that likely produced the uplift.

Return ONLY strict JSON matching this schema:
{
  "transitionDetected": boolean,
  "confidence": number, // 0.0-1.0
  "triggerSummary": string, // brief phrase of what helped
  "supportingUserQuote": string, // direct quote from user expressing improved mood
  "keywords": string[] // 3-6 succinct keywords capturing the trigger context
}
If no transition is found, reply with transitionDetected=false and leave other fields empty or defaults.

Transcript:
${formattedDialogue}`
}
