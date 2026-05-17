/**
 * Non-diagnostic educational copy from structured answers.
 * Returns structured blocks for highlighted UI plus plain text for logs / previews.
 */

/** @typedef {{ variant: "disclaimer" | "important" | "note" | "footer", title?: string, text: string }} SummaryBlock */

/**
 * @param {Record<string, string>} answers
 * @returns {{ blocks: SummaryBlock[], plainText: string }}
 */
export function buildPatientSummary(answers) {
  /** @type {SummaryBlock[]} */
  const blocks = [];

  blocks.push({
    variant: "disclaimer",
    title: "Read this first",
    text: "This summary is for general education only. It is not a medical diagnosis and does not replace a clinician’s assessment, examination, or tests.",
  });

  const cycle = answers.cycleRegularity;
  if (cycle === "irregular") {
    blocks.push({
      variant: "important",
      title: "Menstrual pattern",
      text: "You reported irregular cycles. Irregular bleeding patterns can occur in several conditions (including PCOS-related ovulation changes and others) and merit discussion with a qualified clinician, especially if new or worsening.",
    });
  } else if (cycle === "regular") {
    blocks.push({
      variant: "note",
      title: "Menstrual pattern",
      text: "You reported relatively regular cycles. Regular cycles do not rule out pain disorders or other gynecologic conditions.",
    });
  }

  const pain = answers.painLevel;
  if (pain === "severe" || answers.painTiming === "progressive") {
    blocks.push({
      variant: "important",
      title: "Pelvic pain",
      text: "You indicated severe or progressive pelvic pain. Strong or worsening pain should be evaluated promptly in person (urgent care or emergency services if red-flag symptoms are present).",
    });
  } else if (pain === "mild" || pain === "moderate") {
    blocks.push({
      variant: "note",
      title: "Pelvic pain",
      text: "You reported pelvic pain. Many conditions can overlap; tracking timing with menses, bowel/bladder symptoms, and daily impact can help your clinician.",
    });
  }

  if (answers.skinHair === "yes") {
    blocks.push({
      variant: "important",
      title: "Skin / hair",
      text: "You noted skin or hair changes sometimes discussed in androgen-excess contexts (for example, acne or excess hair growth). These symptoms are not specific to one diagnosis and should be interpreted with labs and history.",
    });
  }

  if (answers.bowelBladder === "yes") {
    blocks.push({
      variant: "important",
      title: "Bowel / bladder",
      text: "You reported bowel or bladder symptoms associated with your cycle. Cyclical bowel or bladder symptoms are sometimes discussed in the context of endometriosis, but many other causes exist.",
    });
  }

  if (answers.fertilityConcern === "yes") {
    blocks.push({
      variant: "note",
      title: "Fertility",
      text: "You indicated fertility concerns. Both PCOS and endometriosis can be relevant topics in fertility care, but evaluation is individualized and should be guided by a specialist.",
    });
  }

  blocks.push({
    variant: "footer",
    title: "Bottom line",
    text: "Overlapping symptoms are common. A clinician may consider history, examination, imaging, and targeted labs; some diagnoses require specific procedures or specialist referral.",
  });

  const plainText = blocks.map((b) => b.text).join("\n\n");

  return { blocks, plainText };
}
