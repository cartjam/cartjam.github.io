# cartjam.github.io

cartjam's site, [cartjam.github.io](https://cartjam.github.io). It's plain HTML, CSS and JavaScript with no build step, and it loads nothing from other sites except the release list from GitHub's API.

- `index.html`: the landing page, what cartjam is and how to hear about the first release. The console in it shows real screens from `assets/img/screens/`.
- `flash.html`: the page that puts cartjam on a console. Choose a console, a release and free games, then write the card with Etcher or `flash.sh`.

## Adding things

- **A release:** a GitHub release in this repo with the image compressed by xz (Etcher reads xz but not zstd) and its checksum. The page finds it by the file name, `cartjam-<console>-<tag>.img.xz`:

  ```sh
  xz -T0 -c cartjam-image-k36.rootfs.wic > cartjam-k36-v0.1.0.img.xz
  shasum -a 256 cartjam-k36-v0.1.0.img.xz > cartjam-k36-v0.1.0.img.xz.sha256
  gh release create v0.1.0 cartjam-k36-v0.1.0.img.xz cartjam-k36-v0.1.0.img.xz.sha256 --title 0.1.0 --notes "..."
  ```

  A release image must not carry the bring-up pieces (`cartjam-bringup`, passwordless root) or anyone's commercial games.

- **A social account:** its entry in `data/social.json` gets `"claimed": true` once the account is cartjam's. The landing page lists only those, so it never links to a handle someone else holds.
- **The waitlist:** `data/waitlist.json` has the mailing service and its form address (`action`, the `https://…sibforms.com/serve/…` address of a Brevo form with double opt-in). While `action` is `null` the form stays hidden and the page offers watching releases on GitHub instead. The form posts straight to the service, so nothing loads from it when the page opens. Turn it on together with a privacy notice at `privacy.html` that says who collects the addresses, how to reach them, and that they go to that service.
- **A console:** an entry in `data/consoles.json`. `status` is `available` or `pending`.
- **A game:** an entry in `data/games.json`, only with a license that lets people share it. Downloads stay on the author's own page. `tested: true` once it has run on a console.
- **A platform:** set its `status` to `available` in `data/games.json` once the image has its emulator.

## Trying it

```sh
python3 -m http.server
```

## Licenses

The page's code and `flash.sh` are under the MIT license (`LICENSE`). The fonts are under the SIL Open Font License (`assets/fonts`). The cartjam name and logos are not covered by it, and the game screenshots belong to the games' authors.
