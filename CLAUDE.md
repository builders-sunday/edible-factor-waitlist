# CLAUDE.md

> **Deployment & runtime:** This
## Ticket-first workflow (fleet-wide)

Before writing any code in this repo, create a ticket on the Edible Factor project board and plan it there first. The board is the single place we capture every idea, bug, enhancement, and feature across the fleet. It is the source of truth, not scattered per-repo issues.

- Board: https://github.com/orgs/builders-sunday/projects/1
- Flow: create the item first, set its fields (Category: Bug / Feature / Enhancement / Concern; Priority P0 to P3; Area; Target date), write the plan on the item, THEN branch and build. Process before code: no code before a ticket exists.
- Name the repos involved on the ticket itself. Most changes span more than one repo (backend, web, plate, scouter, waitlist, human, ios), so list every repo the change touches on the ticket line and in the "Repos to change" field, so cross-repo work stays visible from the board.
