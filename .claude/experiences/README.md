# Experiences (decision log)

A durable record of significant decisions and experiments in this repo:
what we tried, what we decided, and above all **why**. Git history and
memory already record what changed; this folder records the reasoning,
so future work (human or agent, on any harness) can weigh a new change
against past requirements and learnings instead of rediscovering them.

## When to add an entry

Add one whenever a decision is non-trivial and worth remembering later,
especially when:

- we rejected an approach (record why, so it is not reintroduced),
- we removed or undid a feature (record the cost and pain points that
  drove the removal, not just the removal itself),
- we made a real tradeoff,
- an agent ran a significant experiment or analysis (an SEO run, a perf
  audit, an eval) whose findings should outlive the session,
- we changed direction or a convention.

Skip the trivial: routine copy tweaks, small style fixes, obvious bug
fixes.

## Capturing the why

An entry without a why is just a changelog line. When the reason for a
change is not stated, whoever is making it (human or agent) should ask
before recording: what triggered this, what did it cost, what were the
pain points, what would make us revisit it? The answers go in the entry,
in the requester's own words where possible.

## Before any big decision

Read the index below before an architecture change, a dependency add or
removal, a feature removal, a big refactor, or re-running a previously
rejected experiment. If a past entry covers the ground, weigh it before
relitigating; if the situation has genuinely changed, say so in a new
entry that links back to the old one.

## Format

One markdown file per experience, named `YYYY-MM-DD-short-slug.md`. Use
these sections:

- **Status** - what we decided in one line, plus the PR if shipped.
- **Context** - the situation and what prompted it.
- **The why, as given** - the stated reason for doing or undoing this,
  in the requester's own words where possible (trigger, cost, pain
  points). Ask if it was not stated.
- **Idea / options** - what was considered.
- **What we found** - the evidence, with sources.
- **Decision** - what we are doing (and not doing).
- **What we shipped** - concrete changes, if any.
- **Revisit if** - the conditions that would make us reopen this.

## Index

- [2026-07-10 - Experiences decision log added](2026-07-10-experiences-rollout.md) - the convention itself: why this folder exists and the standing rules around it.
