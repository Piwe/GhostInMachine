"""TabPFN bridge: reads {X_train, y_train, X_test, categorical} as JSON on stdin,
writes {proba: [...]} as JSON on stdout. Called by src/anomaly/index.js."""

import json
import os
import sys


def main() -> None:
    request = json.load(sys.stdin)

    import numpy as np
    from tabpfn import TabPFNClassifier

    clf = TabPFNClassifier(
        n_estimators=int(os.environ.get("TABPFN_ESTIMATORS", "4")),
        categorical_features_indices=request.get("categorical") or None,
        device=os.environ.get("TABPFN_DEVICE", "auto"),
        ignore_pretraining_limits=True,
        random_state=0,
    )
    clf.fit(np.asarray(request["X_train"], dtype=float), np.asarray(request["y_train"], dtype=int))
    proba = clf.predict_proba(np.asarray(request["X_test"], dtype=float))
    haunted = list(clf.classes_).index(1)
    json.dump({"proba": proba[:, haunted].round(4).tolist()}, sys.stdout)


if __name__ == "__main__":
    try:
        main()
    except Exception as err:  # Node reads the message and falls back
        print(f"{type(err).__name__}: {err}".splitlines()[0], file=sys.stderr)
        sys.exit(1)
