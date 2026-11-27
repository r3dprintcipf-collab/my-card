# My Card — starter

Responsive digital business-card site designed with an Apple-first mobile presentation. Includes public card pages, VCF export, action buttons, social links, a private admin login/editor, and a basic installable PWA shell.

## Important security setup
This is a starter project. Supabase policies must be reviewed and hardened before production. Create **only your own administrator account** in Supabase Authentication. Do not enable public signup. The included authenticated write policies are not a substitute for restricting account creation.

## Deploy (GitHub Pages)
1. Create a GitHub repository and upload all files in this folder to its root.
2. In the repository Settings → Pages, deploy from the main branch/root.
3. Create a free Supabase project.
4. In Supabase SQL Editor, run `supabase.sql`.
5. In Supabase Authentication, create your own admin account and disable public signup.
6. Copy project URL and anon/public key from Supabase Settings → API.
7. Paste those into `config.js`.
8. Commit `config.js` (the anon/public key is designed for browser use; RLS must protect data).
9. Open the GitHub Pages URL, append `#admin` to reach the administrator login. Public card URLs use `?card=slug`.

## Public card URL example
`https://YOUR-USER.github.io/YOUR-REPO/?card=elissa-halaoui`

## Card editor
Links and socials are JSON arrays. Example links:
```json
[
 {"label":"WhatsApp","icon":"◉","url":"https://wa.me/2250000000000"},
 {"label":"Call Me","icon":"☎","url":"tel:+2250000000000"},
 {"label":"Email Me","icon":"✉","url":"mailto:hello@example.com"},
 {"label":"My Website","icon":"◎","url":"https://example.com"}
]
```
Socials example:
```json
[{"label":"Instagram","icon":"◎","url":"https://instagram.com/example"},{"label":"LinkedIn","icon":"in","url":"https://linkedin.com/in/example"}]
```
Photo/logo currently accept direct image URLs. This starter does not yet include a media upload/storage UI.

## iOS widget (planned companion)
The web project does not install native iOS widgets. For an iPhone QR widget, use Scriptable. The companion script should retrieve the public card URL and render a QR code; this is a separate setup step and should be tested on-device before customer distribution.

## Limitations of this starter
- No custom domain included (domain purchase may be required).
- No QR generator/download UI yet.
- No image upload UI yet; use image URLs.
- No Scriptable widget script bundled in this first starter.
- No statistics.
- The SQL write policies need a careful production security review.
- URL structure uses query parameters so GitHub Pages works without SPA rewrite rules.

This starter is a foundation, not yet a production SaaS. Please test thoroughly and secure policies before real customer data is added.
