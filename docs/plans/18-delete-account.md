# 18. Delete my account

Decided 2026-10-18 ([strategy](../strategy/05-backlog.md), P1.10). Built in this plan.

## Why

A learner must be able to leave and take their data with them (LGPD). Today nothing deletes an account; the database
would cascade from the user, but nothing triggers it.

## The experience

- **Delete account** in the account menu opens a dialog: what goes (every path you own, your progress on others',
  your Inbox, your projects), a **Download my paths** link first, and the password to confirm.
- A wrong password says so and deletes nothing. On success the session ends and the login page opens.
- People who studied one of your paths, or were invited to it, lose it and see the usual notice that it was deleted.
  Paths others shared with you stay theirs; only your membership and marks go.

## How it works

- **Domain** (`auth`): `AccountDeletion` (`password`); `Auth.deleteAccount`.
- **Contract** (`AuthApi`): `DELETE /auth/me` with `{ password }`, 204; `InvalidCredentials` for a wrong password.
- **API**: `auth.deleteAccount` checks the password, removes each path the account owns through `removePath` (so its
  members get their notice), then the user; every other table cascades from it. The controller clears the cookie.
- **Web**: `useDeleteAccount` (session atom), `DeleteAccountModal` in `features/auth`, opened from `AccountMenu`.

## Checks

- API: a wrong password deletes nothing; after deleting, the session and the login fail, a taker of a public path of
  theirs has a `deleted` notice, and a path someone else shared with them is still the other owner's.
- Web: the dialog's happy path (password, delete, to the login page) and the wrong password, on `MemoryAuth`.
