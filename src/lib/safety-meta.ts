export function safetyHead(title: string, description: string) {
  return { meta: [{ title: `${title} — GuardianAI` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} — GuardianAI` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] };
}
