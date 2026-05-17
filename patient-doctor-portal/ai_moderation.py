"""AI + rule-based moderation for community posts and comments."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

from ai_chat_backend import _api_key, _base_url, _model, is_configured
from openai_http import urlopen as openai_urlopen

MODERATION_PROMPT = """You are a safety moderator for a gynecology patient education community (PCOS, endometriosis).

Review the user text BEFORE it is published. Return ONLY valid JSON:
{"approved": true|false, "reason": "short explanation for the user", "flags": ["list", "of", "issues"]}

REJECT if the text:
- Claims to diagnose the reader or others ("you have PCOS", "this is definitely endometriosis")
- Gives medical treatment prescriptions or dosages
- Promotes dangerous remedies or discourages urgent care when describing emergencies
- Contains harassment, hate, slurs, or sexual solicitation
- Shares personal contact info (phone, email, address) or full names of clinicians/patients
- Is spam or unrelated advertising

APPROVE supportive peer stories, emotional sharing, questions, and lived experience IF they use cautious language ("I think", "my doctor said", "might be") and do not replace professional care.

Be compassionate; do not reject solely because someone is venting about stress or shame."""

BLOCK_PATTERNS = [
    (r"\byou have pcos\b", "Claims a diagnosis for the reader"),
    (r"\b(take|use)\s+\d+\s*mg\b", "Specific medication dosing"),
    (r"\b(cure|guaranteed fix)\b", "Unverified treatment claims"),
    (r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b", "Possible phone number"),
    (r"[\w.-]+@[\w.-]+\.\w+", "Email address in post"),
]


def _rule_moderate(text: str) -> dict:
    lowered = text.lower()
    flags: list[str] = []
    for pattern, label in BLOCK_PATTERNS:
        if re.search(pattern, lowered, re.I):
            flags.append(label)
    emergency = any(
        w in lowered
        for w in ("suicid", "kill myself", "want to die", "severe bleeding", "fainting")
    )
    if emergency:
        return {
            "approved": False,
            "reason": "If you are in crisis or have emergency symptoms, please contact local emergency services or a clinician immediately. This community cannot provide urgent care.",
            "flags": ["Possible emergency — seek in-person care"],
        }
    if flags:
        return {
            "approved": False,
            "reason": "Your post may contain content we cannot publish (e.g. diagnosis claims or personal contact info). Please rephrase as your experience or questions for a clinician.",
            "flags": flags,
        }
    return {
        "approved": True,
        "reason": "Approved by community safety rules.",
        "flags": [],
    }


def moderate_community_text(text: str, content_type: str = "post") -> dict:
    body = (text or "").strip()
    if len(body) < 3:
        return {
            "approved": False,
            "reason": "Message is too short.",
            "flags": ["empty"],
        }
    if len(body) > 2000:
        return {
            "approved": False,
            "reason": "Message exceeds 2000 characters.",
            "flags": ["too_long"],
        }

    if is_configured():
        try:
            return _ai_moderate(body, content_type)
        except RuntimeError:
            pass

    return _rule_moderate(body)


def _ai_moderate(text: str, content_type: str) -> dict:
    key = _api_key()
    url = f"{_base_url()}/chat/completions"
    payload = {
        "model": _model(),
        "messages": [
            {"role": "system", "content": MODERATION_PROMPT},
            {
                "role": "user",
                "content": f"Content type: {content_type}\n\nText to moderate:\n{text}",
            },
        ],
        "temperature": 0.2,
        "max_tokens": 200,
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )
    try:
        with openai_urlopen(req, timeout=30) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"Moderation API error: {detail}") from e

    content = (raw.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
    data = json.loads(content)
    return {
        "approved": bool(data.get("approved")),
        "reason": str(data.get("reason", "Review complete."))[:500],
        "flags": list(data.get("flags") or [])[:10],
    }
