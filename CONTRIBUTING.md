# Contributing to MockGuard

## Before opening a change

Read `.brain/README.md`, the claims register, and the relevant contract. Keep changes narrow and include tests or a documented reason why a test is not possible.

## Evidence rule

Do not write a benchmark number in a README, deck, or release note until the result file is generated from the tagged commit.

## Safety rule

Do not add automatic package installation, arbitrary remote execution, or unreviewed workflow privileges.

## Synchronization rule (Pull Before Push)

Before pushing any commit to a shared repository or branch, always pull and rebase latest changes (`git fetch origin && git pull --rebase origin <branch>`) to ensure another worker's commits are never overwritten or orphaned. Force pushes are prohibited.

## Handoff

Every change should include the command used to verify it, known limitations, and the next owner if integration is incomplete.
