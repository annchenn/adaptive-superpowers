export default function SkillLibrary({ skills, events }) {
  return (
    <div style={{ padding: 16, color: 'var(--color-foreground)', opacity: 0.5 }}>
      SkillLibrary (coming soon) — {skills?.length ?? 0} skills
    </div>
  )
}
