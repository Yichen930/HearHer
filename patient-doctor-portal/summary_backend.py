"""Mirror of js/summary.js logic for server-side submission storage."""


def build_patient_summary(answers: dict) -> dict:
    blocks: list[dict] = []

    blocks.append(
        {
            "variant": "disclaimer",
            "title": "Read this first",
            "text": (
                "This summary is for general education only. It is not a medical diagnosis "
                "and does not replace a clinician’s assessment, examination, or tests."
            ),
        }
    )

    cycle = (answers.get("cycleRegularity") or "").strip()
    if cycle == "irregular":
        blocks.append(
            {
                "variant": "important",
                "title": "Menstrual pattern",
                "text": (
                    "You reported irregular cycles. Irregular bleeding patterns can occur in "
                    "several conditions (including PCOS-related ovulation changes and others) "
                    "and merit discussion with a qualified clinician, especially if new or worsening."
                ),
            }
        )
    elif cycle == "regular":
        blocks.append(
            {
                "variant": "note",
                "title": "Menstrual pattern",
                "text": (
                    "You reported relatively regular cycles. Regular cycles do not rule out pain "
                    "disorders or other gynecologic conditions."
                ),
            }
        )

    pain = (answers.get("painLevel") or "").strip()
    pain_timing = (answers.get("painTiming") or "").strip()
    if pain in ("severe",) or pain_timing == "progressive":
        blocks.append(
            {
                "variant": "important",
                "title": "Pelvic pain",
                "text": (
                    "You indicated severe or progressive pelvic pain. Strong or worsening pain "
                    "should be evaluated promptly in person (urgent care or emergency services if "
                    "red-flag symptoms are present)."
                ),
            }
        )
    elif pain in ("mild", "moderate"):
        blocks.append(
            {
                "variant": "note",
                "title": "Pelvic pain",
                "text": (
                    "You reported pelvic pain. Many conditions can overlap; tracking timing with "
                    "menses, bowel/bladder symptoms, and daily impact can help your clinician."
                ),
            }
        )

    if (answers.get("skinHair") or "").strip() == "yes":
        blocks.append(
            {
                "variant": "important",
                "title": "Skin / hair",
                "text": (
                    "You noted skin or hair changes sometimes discussed in androgen-excess contexts "
                    "(for example, acne or excess hair growth). These symptoms are not specific to "
                    "one diagnosis and should be interpreted with labs and history."
                ),
            }
        )

    if (answers.get("bowelBladder") or "").strip() == "yes":
        blocks.append(
            {
                "variant": "important",
                "title": "Bowel / bladder",
                "text": (
                    "You reported bowel or bladder symptoms associated with your cycle. Cyclical "
                    "bowel or bladder symptoms are sometimes discussed in the context of endometriosis, "
                    "but many other causes exist."
                ),
            }
        )

    if (answers.get("fertilityConcern") or "").strip() == "yes":
        blocks.append(
            {
                "variant": "note",
                "title": "Fertility",
                "text": (
                    "You indicated fertility concerns. Both PCOS and endometriosis can be relevant "
                    "topics in fertility care, but evaluation is individualized and should be guided "
                    "by a specialist."
                ),
            }
        )

    blocks.append(
        {
            "variant": "footer",
            "title": "Bottom line",
            "text": (
                "Overlapping symptoms are common. A clinician may consider history, examination, "
                "imaging, and targeted labs; some diagnoses require specific procedures or specialist referral."
            ),
        }
    )

    plain = "\n\n".join(b["text"] for b in blocks)
    return {"blocks": blocks, "plainText": plain}
