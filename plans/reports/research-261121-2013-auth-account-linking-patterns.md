# Is ReadingPro's auth linking logic the usual pattern?

Researched: 2026-11-21 20:15 (Asia/Bangkok). Scope: one email per user, linking Google
with password accounts, unverified-email handling, duplicate sign-up responses, and
adding a password to a Google-only account. Compared with Firebase, Supabase, Clerk,
Auth0, Google Identity Platform, the MSRC pre-hijacking research and OWASP guidance.

## Verdict

Mostly yes. The core rules match what Firebase, Supabase and Clerk do: one user per
email, automatic linking of a verified Google sign-in, and dropping an unverified
password when Google proves ownership of the email. Two gaps remain that common
apps handle and ReadingPro does not: a Google-only user has no way to add a
password, and a duplicate sign-up shows an OTP screen whose code never arrives.

## Rule-by-rule comparison

| ReadingPro behaviour | Common practice | Match |
|---|---|---|
| One email = one `User` (unique index), several login methods in `account` | Firebase "one account per email" mode; Supabase and Clerk link identities by email | Yes |
| No session until the email is verified by OTP | MSRC's main mitigation for pre-hijacking: verify before allowing any use | Yes |
| Verified password account, then Google with the same email: auto-link | Clerk links when the email is verified on both sides; Supabase links by email; Auth0 links only via a custom Action and only for verified emails on both sides | Yes |
| Unverified password account, then Google: mark verified, delete the password | Firebase removes the earlier untrusted credential; Supabase removes unconfirmed identities on link; Clerk instead forces a password change before linking | Yes (Firebase/Supabase variant) |
| Re-sign-up on an unverified email deletes the pending sign-up | Same principle (unverified credentials are not trusted). No vendor documents this exact step | Consistent, not a named standard |
| Sign-up with an existing verified email: fake success, no code sent | OWASP and Auth0 recommend a generic response; Clerk's strict mode sends no code; Google Identity Platform recommends enumeration protection | Partly: the response is right, the follow-up is missing |
| Google-only user cannot set a password | Auth0 and others let the user add a password through a reset/"set password" email | No |
| `trustedProviders: ["google"]` links even if Google reports the email unverified | Auth0 advises linking only when both identities are verified; Firebase trusts Google only for Gmail addresses; the MSRC "classic-federated merge" attack relies on an IdP that skips verification | Stricter option available |

## The two gaps

**1. Duplicate sign-up UX.** The server answer is the recommended one, but the form
then shows "enter the code we sent" and no code arrives. The common fix keeps the
neutral screen and emails the existing owner instead ("You already have an account:
sign in with Google, or reset your password"). This is the pattern proposed in the
Supabase discussion and used by apps with enumeration protection. The alternative
(show "email already registered") is simpler and many apps accept the enumeration
risk; Auth0 and Google both offer it as a switch.

**2. No way to add a password to a Google account.** Users who start with Google and
later want a password are a frequent support topic (Auth0, OpenAI community). The usual
answer is a "forgot / set password" flow by email. Better Auth's `emailOTP` plugin
already ships the `forget-password` OTP type and `/email-otp/reset-password`, so only
the UI is missing. Note that resetting a password for a Google-only user creates a
`credential` account, which is exactly "add a password".

## Recommended next steps

1. Add a "Quên mật khẩu" page using `emailOtp.sendVerificationOtp({ type: "forget-password" })`
   and `emailOtp.resetPassword`. It also covers Google users who want a password.
2. For a sign-up on an existing verified email, send a "you already have an account" email
   (with links to sign in and to reset the password) from the sign-up hook instead of an OTP,
   and keep the neutral OTP screen. If you prefer simplicity, show an explicit error instead.
3. Consider removing `trustedProviders: ["google"]` so Better Auth links only when Google
   reports `email_verified: true`.

## Sources

- [MSRC: Pre-hijacking attacks (Sudhodanan & Paverd, 2022)](https://msrc.microsoft.com/blog/2022/05/pre-hijacking-attacks)
- [Supabase: Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Clerk: Account linking](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking)
- [Clerk: User enumeration protection](https://clerk.com/docs/guides/secure/user-enumeration-protection)
- [Auth0: Link user accounts](https://auth0.com/docs/manage-users/user-accounts/user-account-linking/link-user-accounts.md)
- [Auth0 community: social login first, add password later](https://community.auth0.com/t/social-login-first-but-wants-to-add-password-login/87170)
- [Firebase: Users in Firebase projects](https://firebase.google.com/docs/auth/users)
- [Firebase support: one account per email](https://support.google.com/firebase/answer/9134820)
- [Google Identity Platform: email enumeration protection](https://docs.cloud.google.com/identity-platform/docs/admin/email-enumeration-protection)
- [OWASP WSTG: account enumeration](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account)
- [Supabase discussion #38242: duplicate email handling](https://github.com/orgs/supabase/discussions/38242)

## Unresolved questions

- The Firebase credential-removal rule comes from older forum answers (2016); current
  official docs do not state it directly.
- No source confirms whether Clerk lets a Google-only user set a password through its
  forgot-password flow.
