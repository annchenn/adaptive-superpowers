export default function SkillLibrary({ skills, events }) {
  const deployedSkills = new Set(
    (events ?? [])
      .filter(e => e.skill === 'skill-deployed')
      .map(e => e.data?.skillName ?? e.data?.name ?? e.data?.skill)
      .filter(Boolean)
  )

  return (
    <section style={{ padding: '14px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 8,
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-foreground)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Skill Library
        </span>
        {skills?.length > 0 && (
          <span style={{
            background: 'var(--color-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '1px 7px',
            fontSize: 10,
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-foreground)',
            opacity: 0.7,
          }}>
            {skills.length}
          </span>
        )}
      </div>

      {/* Skill list or empty state */}
      {!skills || skills.length === 0 ? (
        <p style={{
          fontSize: 12,
          color: 'var(--color-foreground)',
          opacity: 0.35,
          fontStyle: 'italic',
        }}>
          Loading skills...
        </p>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}>
          {skills.map((skill, i) => {
            const isNew = deployedSkills.has(skill)
            return (
              <div
                key={skill}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 32,
                  padding: '0 4px',
                  borderRadius: 4,
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-secondary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {/* Checkmark */}
                <span style={{
                  color: 'var(--color-accent)',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  width: 14,
                  textAlign: 'center',
                }}>
                  ✓
                </span>

                {/* Skill name */}
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 11,
                  color: 'var(--color-foreground)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {skill}
                </span>

                {/* NEW badge */}
                {isNew && (
                  <span style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.5)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    fontSize: 9,
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-warning)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}>
                    NEW
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
