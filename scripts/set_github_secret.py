#!/usr/bin/env python3
"""Set a GitHub Actions repository secret from stdin-safe argv.

Usage: set_github_secret.py NAME=value [NAME2=value2 ...]

Requires GH_TOKEN in the environment (GITHUB_TOKEN in Actions works,
classic PAT with repo scope works too). Values are encrypted with the
repository public key (libsodium sealed box) before upload.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

REPO = os.environ.get("GITHUB_REPOSITORY", "superz1402/dmarcduck")
TOKEN = os.environ["GH_TOKEN"]
API = "https://api.github.com"


def api(path: str, method: str = "GET", data: dict | None = None) -> dict:
    req = urllib.request.Request(f"{API}{path}", method=method)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(data).encode()
    with urllib.request.urlopen(req) as resp:
        body = resp.read()
        return json.loads(body) if body else {}


def main() -> int:
    from nacl import encoding, public

    pk = api(f"/repos/{REPO}/actions/secrets/public-key")
    box = public.SealedBox(
        public.PublicKey(pk["key"].encode("utf-8"), encoding.Base64Encoder())
    )

    failures = 0
    for arg in sys.argv[1:]:
        name, _, value = arg.partition("=")
        if not name or not value:
            print(f"skip malformed arg: {name or '<empty>'}")
            failures += 1
            continue
        encrypted = base64.b64encode(box.encrypt(value.encode("utf-8"))).decode()
        try:
            api(
                f"/repos/{REPO}/actions/secrets/{name}",
                "PUT",
                {"encrypted_value": encrypted, "key_id": pk["key_id"]},
            )
            print(f"secret set: {name}")
        except urllib.error.HTTPError as exc:
            print(f"secret FAILED: {name} -> HTTP {exc.code}")
            failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
