import json
import os
import sys

def verify_dataset_splits(splits_dir: str):
    """
    Strictly verifies that zero speaker or generator leakage exists
    across Train, Validation, Test, and Unseen Generator splits.
    """
    train_path = os.path.join(splits_dir, "train_speakers.json")
    val_path = os.path.join(splits_dir, "val_speakers.json")
    test_path = os.path.join(splits_dir, "test_speakers.json")
    unseen_path = os.path.join(splits_dir, "unseen_generators.json")

    with open(train_path, "r", encoding="utf-8") as f:
        train_data = json.load(f)
    with open(val_path, "r", encoding="utf-8") as f:
        val_data = json.load(f)
    with open(test_path, "r", encoding="utf-8") as f:
        test_data = json.load(f)
    with open(unseen_path, "r", encoding="utf-8") as f:
        unseen_data = json.load(f)

    train_spks = set(train_data["speaker_ids"])
    val_spks = set(val_data["speaker_ids"])
    test_spks = set(test_data["speaker_ids"])

    train_gens = set(train_data["generators_included"])
    unseen_gens = set(g["name"] for g in unseen_data["generator_families"])

    errors = []

    # 1. Speaker Leakage Checks
    train_val_overlap = train_spks.intersection(val_spks)
    if train_val_overlap:
        errors.append(f"LEAKAGE DETECTED between Train and Validation: {train_val_overlap}")

    train_test_overlap = train_spks.intersection(test_spks)
    if train_test_overlap:
        errors.append(f"LEAKAGE DETECTED between Train and Locked Test: {train_test_overlap}")

    val_test_overlap = val_spks.intersection(test_spks)
    if val_test_overlap:
        errors.append(f"LEAKAGE DETECTED between Validation and Locked Test: {val_test_overlap}")

    # 2. Generator Leakage Checks
    gen_overlap = train_gens.intersection(unseen_gens)
    if gen_overlap:
        errors.append(f"LEAKAGE DETECTED: Unseen generator present in training set: {gen_overlap}")

    if errors:
        print("FAIL: Data split validation failed with leakage errors:")
        for err in errors:
            print(f" - {err}")
        return False

    print("PASS: Zero speaker leakage detected across Train, Val, and Locked Test sets.")
    print("PASS: Zero generator leakage detected in Open-World Unseen Generator holdout.")
    print(f"Verified: {len(train_spks)} Train speakers, {len(val_spks)} Val speakers, {len(test_spks)} Test speakers.")
    print(f"Verified: {len(unseen_gens)} Unseen generator families strictly isolated for zero-shot testing.")
    return True

if __name__ == "__main__":
    current_dir = os.path.dirname(__file__)
    splits_directory = os.path.abspath(os.path.join(current_dir, "..", "data", "splits"))
    success = verify_dataset_splits(splits_directory)
    sys.exit(0 if success else 1)
