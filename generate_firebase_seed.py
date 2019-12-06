import json
import os
import argparse
import sys

parser = argparse.ArgumentParser()
parser.add_argument(
    "folder",
    type=str,
    help="folder containing audio files, the names of which will be used to generate a json file",
)
args = parser.parse_args()
folder = args.folder

files = sorted([e for e in os.listdir(folder) if e.endswith(".wav")])
tree = [{"name": f, "responses": 0} for f in files]
try:
    with open("firebase_seed.json", "w") as out:
        json.dump(tree, out)
    print("Successfully created firebase_seed.json!")
except:
    print(f"ERROR: {sys.exc_info()[0]}")

