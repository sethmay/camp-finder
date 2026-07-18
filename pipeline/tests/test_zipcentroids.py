"""ZIP centroid gazetteer parser — offline."""

from campfinder.zipcentroids import parse_gazetteer

SAMPLE = "\n".join(
    [
        "GEOID\tALAND\tAWATER\tALAND_SQMI\tAWATER_SQMI\tINTPTLAT\tINTPTLONG",
        "97405\t334500628\t680744\t129.151\t0.263\t43.953602\t-123.155864",
        "00601\t166848592\t798613\t64.421\t0.308\t18.180555\t-66.749961",
        "ABCDE\t1\t2\t3\t4\t40.0\t-80.0",  # non-numeric GEOID -> skipped
        "1234\t1\t2\t3\t4\t40.0\t-80.0",  # not 5 digits -> skipped
        "99999\t1\t2\t3\t4\tNA\tNA",  # bad coords -> skipped
    ]
)


def test_parse_gazetteer_extracts_rounds_and_sorts():
    rows = parse_gazetteer(SAMPLE)
    # only the two valid 5-digit rows, sorted ascending, coords rounded to 4dp
    assert rows == [
        ("00601", 18.1806, -66.75),
        ("97405", 43.9536, -123.1559),
    ]


def test_parse_gazetteer_skips_malformed():
    assert parse_gazetteer("GEOID\tX\n") == []
