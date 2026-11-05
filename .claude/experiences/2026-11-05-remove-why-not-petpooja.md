# Remove the /why-not-petpooja sales page

Date: 2026-11-05
Ticket: #137

## Decision

Delete `why-not-petpooja.html` and everything that served it. The URL now gets the existing 404 page. Git history keeps the file if the sales argument is wanted again.

## Why

The page called itself an internal, confidential sales note and worked through a named client's monthly costs, but anyone could open it, and the public homepage footer linked to it. `noindex`, `X-Robots-Tag` and a `robots.txt` Disallow only ask crawlers to stay away. They do not stop a person, and the Disallow itself printed the path for anyone reading `robots.txt`.

Its Contact button also pointed at a placeholder number, `wa.me/910000000000`, so it could not have converted anyone as published.

## Rejected

- Gating it behind a password: nothing else on the apex has auth, so this would add a Pages Function to protect one document.
- Rewriting it without the client's name: a public comparison page needs checked competitor pricing, which is a separate piece of marketing work.

## If it comes back

Send it as a private file to the lead, or rebuild it as a public page with the client removed and every Petpooja figure sourced.
