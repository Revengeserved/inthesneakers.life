# Contributing

This repository is the public website and brand system for Inside the Sneakers.

## Change process

1. Create a short-lived branch from `main`.
2. Open a pull request for every production change.
3. Complete the pull-request checklist and wait for automated checks to pass.
4. Use squash merge so each pull request has one clear rollback point.
5. Do not commit private case records, housing evidence, credentials, access tokens, reviewer secrets, or personal information.

## Repository boundary

Public website content, brand assets, public storytelling, and deployment configuration belong here. Evidence-management, reviewer-access, private case, legal, and resident-record functionality must live in a separate private repository and deployment project.

If a change may cross that boundary, stop and resolve the destination before committing it.
