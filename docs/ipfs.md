# Publish a lesson on IPFS

[Deutsch](ipfs.de.md)

IPFS finds files by their content, not by the server that holds them. `ipfs add`
computes a fingerprint of your build, the CID, and every IPFS node that has the
files can serve them under that CID. A page stays reachable only while a node
that is online keeps a copy. Keeping that copy is called pinning.

## Try it on your computer

1. Start an IPFS node: open [IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop/),
   or install [Kubo](https://docs.ipfs.tech/install/command-line/) and run `ipfs daemon`.
2. Build the lesson and add the build folder:
   ```bash
   npm run build
   ipfs add -r -Q --cid-version=1 public
   ```
   The second command prints the CID of your build.
3. Open `http://localhost:8080/ipfs/<CID>/`. Your node redirects to
   `http://<CID>.ipfs.localhost:8080/` and serves the app from there.

Your node answers only while it runs. To keep the page available, pin the CID
on a node that stays online. Others open it with their own IPFS node, IPFS
Desktop or Kubo, which fetches it over libp2p. This repository pins the lessons
through Aleph, see [below](#how-this-repository-publishes-the-lessons).

## Details

- `-r` adds the folder with everything in it; without it, Kubo stops with
  `'public' is a directory, use the '-r' flag`. `--cid-version=1` gives the
  lowercase base32 form that subdomain addresses use. `-Q` prints only the CID
  of the folder.
- The app loads its files with relative paths (`export const prerender = true`
  in `src/routes/+layout.js`, no `fallback` in `svelte.config.js`). The same
  build works at `/ipfs/<CID>/`, on a subdomain and under
  `/names-on-chain/lesson01/` on GitHub Pages.
- A subdomain gives each CID its own origin. Under `/ipfs/<CID>/` all sites
  share one origin and its `localStorage`; this app keeps only the chosen
  language there.
- Every build gets a new CID, even without code changes: SvelteKit writes the
  build time into `_app/version.json`.
- The public gateways `ipfs.io` and `dweb.link` stop fetching content for you on
  21 September 2026; browsers are already redirected to the service worker
  gateway `inbrowser.link`
  ([announcement](https://blog.ipfs.tech/2026-08-beyond-sponsored-gateways/)).
  Their operator Shipyard ends its public IPFS services, including delegated
  routing and the bootstrap nodes, on 30 September 2026. Kubo, IPFS Desktop and
  the service worker gateway lose their maintainers
  ([announcement](https://ipshipyard.com/blog/2026-the-end-of-ipfs-at-shipyard/)).
  Links in this repository therefore do not point at public gateways.
- Brave removed its built-in IPFS support in version 1.69.153 (August 2024), so
  `ipfs://` links open nothing there.

## How this repository publishes the lessons

`.github/workflows/pages.yml` runs on every push to `main`:

1. **Build:** it builds lesson01 to lesson05 from the heads of their branches,
   adds the overview page and deploys the folder to
   [GitHub Pages](https://doichain.github.io/names-on-chain/).
2. **IPFS:** the job `ipfs` pins the same folder through
   [Aleph](https://aleph.cloud), with the `aleph-site-publish` action from
   [NiKrause/relay-button](https://github.com/NiKrause/relay-button). The action
   packs the folder into a CAR file, uploads it together with a signed Aleph
   `STORE` message and waits until Aleph has processed the message. Then a
   Helia node fetches every block of the folder from the IPFS network over
   libp2p; no HTTP gateway is asked. The job summary shows the CID.
   The job runs only when the repository secret `ALEPH_PRIVATE_KEY` is set: the
   private key of an Ethereum address whose Aleph credits pay for the storage.
   The key signs every upload, so give its address only the credits the site
   needs.
3. **Custom domain:** the job `link-domain` points a domain at the new version.
   It runs only when the repository variable `ALEPH_SITE_DOMAIN` is set.

### Setting up the custom domain

Create three DNS records first, here for `names.example.org`:

| Type  | Name                         | Value                                               |
| ----- | ---------------------------- | --------------------------------------------------- |
| CNAME | `names.example.org`          | `ipfs.public.aleph.sh`                              |
| CNAME | `_dnslink.names.example.org` | `_dnslink.names.example.org.static.public.aleph.sh` |
| TXT   | `_control.names.example.org` | the address of `ALEPH_PRIVATE_KEY` (`0x…`)          |

Aleph serves the domain only when `_control` names the address that signs the
link. Then set `ALEPH_SITE_DOMAIN` and run the workflow again (Actions → GitHub
Pages → Run workflow). `link-domain` reads the domain's DNSLink record and fails
if it does not name the new CID within about five minutes.
