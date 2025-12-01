import json

DATA_PATH = "data/data_kimia_final_indo.json"
OUTPUT_PATH = "data/cleaned_kimia.json"


def preprocess():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    cleaned = []
    for item in raw:

        # Filter wajib: SENYAWA harus punya nama_senyawa
        if "nama_senyawa" not in item:
            continue

        cleaned.append(item)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)

    print("DONE! Total senyawa:", len(cleaned))


if __name__ == "__main__":
    preprocess()
