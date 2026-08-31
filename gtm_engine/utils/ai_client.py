"""Unified AI client with retry logic and model routing.

Central place for all LLM calls. Every module goes through here so we get
consistent retry behaviour, logging, and model selection.
"""

import json
import logging
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential

from gtm_engine.config import ANTHROPIC_API_KEY, DEFAULT_AI_MODEL

logger = logging.getLogger(__name__)


def connection_status() -> dict:
    """Presence of each service key (what the UI shows as connected/not)."""
    from gtm_engine.config import _get
    return {
        "anthropic": bool(_get("ANTHROPIC_API_KEY")),   # scripts, strategy, ideas
        "google": bool(_get("GOOGLE_API_KEY")),          # images / character
        "heygen": bool(_get("HEYGEN_API_KEY")),          # avatar video
        "runway": bool(_get("RUNWAY_API_KEY")),          # performance transfer
        "pexels": bool(_get("PEXELS_API_KEY")),          # free stock footage
        "fal": bool(_get("FAL_KEY")),                    # cheap generative b-roll
        "supabase": bool(_get("SUPABASE_URL") and _get("SUPABASE_KEY")),  # durable backup
    }


# Current Claude models (Opus/Sonnet 5, Opus 4.6+, Fable/Mythos 5) reject the
# `temperature` sampling param and support `output_config.effort`. Older models
# (Haiku 4.5, Sonnet 4.5) are the opposite. We simply never send `temperature`
# (safe on every model) and add `effort` only where it's supported.
_EFFORT_MODELS = ("opus-5", "sonnet-5", "fable-5", "mythos-5",
                  "opus-4-6", "opus-4-7", "opus-4-8", "sonnet-4-6")


def _supports_effort(model: str) -> bool:
    return any(s in model for s in _EFFORT_MODELS)


def _first_text(response) -> str:
    """Return the first text block. Current models also emit thinking blocks,
    so response.content[0] is not necessarily the text."""
    for block in response.content:
        if getattr(block, "type", None) == "text":
            return block.text or ""
    return ""


def test_anthropic() -> tuple[bool, str]:
    """Make a tiny live call to confirm the Anthropic key actually works."""
    from gtm_engine.config import _get
    if not _get("ANTHROPIC_API_KEY"):
        return False, "No ANTHROPIC_API_KEY set."
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=_get("ANTHROPIC_API_KEY"))
        kwargs: dict[str, Any] = {
            "model": DEFAULT_AI_MODEL, "max_tokens": 64,
            "messages": [{"role": "user", "content": "Reply with just: OK"}],
        }
        if _supports_effort(DEFAULT_AI_MODEL):
            kwargs["output_config"] = {"effort": "low"}
        r = client.messages.create(**kwargs)
        return True, (_first_text(r).strip()[:40] or "OK")
    except Exception as e:
        return False, str(e)[:200]


@retry(wait=wait_exponential(min=2, max=30), stop=stop_after_attempt(4))
def call_claude(
    prompt: str,
    system: str = "",
    model: str = DEFAULT_AI_MODEL,
    max_tokens: int = 4096,
    temperature: float | None = None,  # accepted for back-compat, not sent
    effort: str = "low",
) -> str:
    """Send a prompt to Claude and return the text response.

    `temperature` is intentionally NOT forwarded — current Claude models reject
    it. Retries up to 4 times with exponential backoff on transient failures.
    """
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    kwargs: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system
    if _supports_effort(model):
        kwargs["output_config"] = {"effort": effort}

    logger.info("Calling Claude model=%s tokens=%d", model, max_tokens)
    response = client.messages.create(**kwargs)
    return _first_text(response)


@retry(wait=wait_exponential(min=2, max=30), stop=stop_after_attempt(4))
def call_openai(
    prompt: str,
    system: str = "",
    model: str = "gpt-4o",
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Send a prompt to OpenAI and return the text response."""
    from openai import OpenAI
    from gtm_engine.config import OPENAI_API_KEY

    client = OpenAI(api_key=OPENAI_API_KEY)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    logger.info("Calling OpenAI model=%s tokens=%d", model, max_tokens)
    response = client.chat.completions.create(
        model=model, messages=messages, max_tokens=max_tokens, temperature=temperature
    )
    return response.choices[0].message.content


@retry(wait=wait_exponential(min=2, max=30), stop=stop_after_attempt(4))
def call_gemini(
    prompt: str,
    model: str = "gemini-2.5-flash",
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Send a prompt to Google Gemini and return the text response.

    Uses the new google-genai SDK (not the deprecated google-generativeai).
    """
    from google import genai
    from google.genai import types
    from gtm_engine.config import GOOGLE_API_KEY

    client = genai.Client(api_key=GOOGLE_API_KEY)

    logger.info("Calling Gemini model=%s tokens=%d", model, max_tokens)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        ),
    )
    return response.text


def call_ai(
    prompt: str,
    system: str = "",
    provider: str = "claude",
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Route an AI call to the appropriate provider.

    This is the single entry point other modules should use. The provider
    parameter controls which backend is called; model defaults to the best
    available for that provider if not specified.
    """
    if provider == "claude":
        return call_claude(prompt, system=system, model=model or DEFAULT_AI_MODEL,
                           max_tokens=max_tokens, temperature=temperature)
    elif provider == "openai":
        return call_openai(prompt, system=system, model=model or "gpt-4o",
                           max_tokens=max_tokens, temperature=temperature)
    elif provider == "gemini":
        return call_gemini(prompt, model=model or "gemini-2.5-flash",
                           max_tokens=max_tokens, temperature=temperature)
    else:
        raise ValueError(f"Unknown AI provider: {provider}")
