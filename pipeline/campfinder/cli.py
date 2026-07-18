"""``campfinder`` command-line entrypoint (IMPLEMENTATION.md §11).

Available commands (scrapers/merge land in a later phase):
    schema      regenerate data/schema/*.json from the models
    registry    build/refresh council stubs from Wikipedia
    detect      classify a council's registration platform
    geocode     fill missing camp lat/lon from addresses
    validate    run the validation gate (exits nonzero on error; --strict on warnings)
    build       compile data/ -> web/public/data/*.json
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from datetime import date

import httpx

from . import build as build_mod
from . import config, enrich as enrich_mod, merge as merge_mod
from . import registry, schema_gen, validate, zipcentroids
from .geocode import geocode
from .io import dumps_canonical, load_all_councils, save_council
from .models import Camp, Platform
from .platform_detect import detect as detect_platform
from .scrapers.blackpug import BlackPugScraper


def _cmd_schema(_: argparse.Namespace) -> int:
    written = schema_gen.generate()
    print(f"wrote {len(written)} schema(s) to {config.SCHEMA_DIR}: {', '.join(written)}")
    return 0


def _cmd_registry(args: argparse.Namespace) -> int:
    n = registry.build()
    print(f"registry: wrote {n} council file(s) to {config.COUNCILS_DIR}")
    return 0


def _cmd_detect(args: argparse.Namespace) -> int:
    councils = load_all_councils()
    if args.council != "all":
        councils = [c for c in councils if c.id == args.council]
        if not councils:
            print(f"no such council: {args.council}", file=sys.stderr)
            return 1
    for c in councils:
        if not c.website:
            print(f"{c.id}: no website, skipping")
            continue
        if c.platform is not Platform.unknown and not args.overwrite:
            print(f"{c.id}: {c.platform.value} (known, skipping)")
            continue
        plat = detect_platform(str(c.website))
        # Never downgrade a known platform to unknown (failed re-detection != confirmed none).
        if plat is Platform.unknown:
            print(f"{c.id}: unknown")
            continue
        if plat is not c.platform:
            c.platform = plat
            save_council(c)
        print(f"{c.id}: {plat.value}")
    return 0


def _cmd_geocode(args: argparse.Namespace) -> int:
    filled = 0
    for c in load_all_councils():
        changed = False
        for camp in c.camps:
            if (camp.lat is None or camp.lon is None) and camp.address:
                coords = geocode(camp.address)
                if coords:
                    camp.lat, camp.lon = coords
                    changed = True
                    filled += 1
                    print(f"{camp.id}: {coords[0]:.4f},{coords[1]:.4f}")
        if changed:
            save_council(c)
    print(f"geocode: filled {filled} camp(s)")
    return 0


def _cmd_validate(args: argparse.Namespace) -> int:
    report = validate.validate_tree()
    print(json.dumps(report.to_dict(), indent=2))
    if report.errors:
        return 1
    if args.strict and report.warnings:
        return 2
    return 0


def _cmd_build(args: argparse.Namespace) -> int:
    meta = build_mod.build()
    print(json.dumps(meta, indent=2))
    return 0


def _cmd_zipcentroids(_: argparse.Namespace) -> int:
    n = zipcentroids.build()
    print(f"zipcentroids: wrote {n} ZIP centroids to {config.WEB_DATA_DIR / 'zip-centroids.json'}")
    return 0


def _cmd_enrich(args: argparse.Namespace) -> int:
    n = enrich_mod.enrich(overwrite=args.overwrite)
    print(f"enrich: filled website for {n} council(s)")
    return 0


def _cmd_scrape(args: argparse.Namespace) -> int:
    councils = load_all_councils()
    if args.council != "all":
        councils = [c for c in councils if c.id == args.council]
        if not councils:
            print(f"no such council: {args.council}", file=sys.stderr)
            return 1
    # Black Pug runs registration off scoutingevent.com by council number. Many councils
    # whose CMS is Doubleknot still register there, so route both through BlackPugScraper
    # (it returns [] when a council has no scoutingevent camp events).
    routed = {Platform.blackpug, Platform.doubleknot}
    targets = [c for c in councils if c.platform in routed and c.number]
    if not targets:
        print("scrape: no Black Pug / Doubleknot councils to scrape")
        return 0
    candidates: list[Camp] = []
    with BlackPugScraper() as scraper:
        for c in targets:
            try:
                camps = scraper.scrape(c)
            except (httpx.HTTPError, PermissionError) as exc:
                print(f"{c.id}: scrape failed: {exc}", file=sys.stderr)
                continue
            candidates.extend(camps)
            n_sess = sum(len(camp.sessions) for camp in camps)
            print(f"{c.id}: {len(camps)} camp(s), {n_sess} session(s)")
    config.CANDIDATES_DIR.mkdir(parents=True, exist_ok=True)
    out = config.CANDIDATES_DIR / f"blackpug-{date.today().isoformat()}.json"
    payload = [c.model_dump(mode="json", exclude_none=True) for c in candidates]
    out.write_text(dumps_canonical(payload), encoding="utf-8")
    print(f"scrape: wrote {len(candidates)} candidate camp(s) to {out}")
    return 0


def _cmd_merge(args: argparse.Namespace) -> int:
    stats = merge_mod.merge_file(args.candidates)
    print(json.dumps(asdict(stats), indent=2))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="campfinder", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("schema", help="regenerate JSON Schemas").set_defaults(func=_cmd_schema)
    sub.add_parser("registry", help="build council registry").set_defaults(func=_cmd_registry)

    p_enrich = sub.add_parser("enrich", help="resolve council websites from Wikipedia")
    p_enrich.add_argument("--overwrite", action="store_true", help="refill even if website set")
    p_enrich.set_defaults(func=_cmd_enrich)

    p_detect = sub.add_parser("detect", help="detect registration platform")
    p_detect.add_argument("--council", default="all")
    p_detect.add_argument(
        "--overwrite", action="store_true", help="re-detect councils that already have a platform"
    )
    p_detect.set_defaults(func=_cmd_detect)

    p_geo = sub.add_parser("geocode", help="fill missing lat/lon")
    p_geo.add_argument("--missing", action="store_true", help="(default behavior)")
    p_geo.set_defaults(func=_cmd_geocode)

    p_val = sub.add_parser("validate", help="run validation gate")
    p_val.add_argument("--strict", action="store_true", help="fail on warnings too")
    p_val.set_defaults(func=_cmd_validate)

    sub.add_parser("build", help="compile frontend data").set_defaults(func=_cmd_build)
    sub.add_parser(
        "zipcentroids", help="build zip-centroids.json from the Census gazetteer"
    ).set_defaults(func=_cmd_zipcentroids)

    p_scrape = sub.add_parser("scrape", help="run platform scraper -> candidates JSON")
    p_scrape.add_argument("--council", default="all")
    p_scrape.set_defaults(func=_cmd_scrape)

    p_merge = sub.add_parser("merge", help="merge a candidates JSON file into data/")
    p_merge.add_argument("candidates")
    p_merge.set_defaults(func=_cmd_merge)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
