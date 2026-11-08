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

## Follow-up 2026-11-08: the deleted page kept serving

After #138 merged, `/why-not-petpooja.html`, the trailing-slash form and any query-string form returned 404, and so did the `pages.dev` origin. The bare `https://ediblefactor.com/why-not-petpooja` kept returning the old page for three days, with `cache-control: public, s-maxage=604800`, an `age` header counting up, and `cf-cache-status: DYNAMIC`. DYNAMIC means the zone cache did not serve it, and the zone has no cache rule, header rule or worker route, so the copy is somewhere inside Pages. Its 7-day lifetime would have kept it live until about 2026-11-12.

A one-URL purge was not available here: an ad-hoc API purge is blocked by the cld-flare-maxxing guard, and its guarded `purge-cache` action needs a read token and an edit token that this machine does not have.

Fix: a `RETIRED` pattern in `functions/_middleware.js`, with the same paths in `_routes.json`, so a Function answers those paths before the asset layer and returns the branded 404 with `Cache-Control: no-store`. The 404s this middleware returns now all use `no-store`, so no layer can keep a copy of a 404 either.

Lesson: after deleting a page, check the exact bare URL a person would type. A cache-busting `?x=` probe returned 404 and gave a false all-clear.
