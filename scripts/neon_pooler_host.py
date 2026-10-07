#!/usr/bin/env python3
"""Derive a Neon pooled host from an endpoint host, preferring the branch's
endpoint. Reads the endpoints JSON on stdin.

Usage: curl ... /projects/$ID/endpoints | neon_pooler_host.py <branch_id>
"""
import json
import re
import sys


def main() -> int:
    branch_id = sys.argv[1]
    data = json.load(sys.stdin)
    host = ""
    for e in data.get("endpoints", []):
        if e.get("branch_id") == branch_id and e.get("host"):
            host = e["host"]
            break
    if not host:
        print("no endpoint host for branch", branch_id, file=sys.stderr)
        return 1
    # direct:  ep-xxx.c-N.region.aws.neon.tech
    # pooled:  ep-xxx-pooler.region.aws.neon.tech
    host = re.sub(r"\.c-\d+\.", ".", host)
    name, _, rest = host.partition(".")
    if not name.endswith("-pooler"):
        name = f"{name}-pooler"
    print(f"{name}.{rest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
