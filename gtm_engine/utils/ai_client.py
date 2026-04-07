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


@retry(wait=wait_exponential(min=2, max=30), stop=stop_after_attempt(4))
def call_claude(
    prompt: str,
    system: str = "",
    model: str = DEFAULT_AI_MODEL,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Send a prompt to Claude and return the text response.

    Retries up to 4 times with exponential backoff on transient failures.
    """
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    messages = [{"role": "user", "content": prompt}]

    kwargs: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": messages,
    }
    if system:
        kwargs["system"] = system

    logger.info("Calling Claude model=%s tokens=%d", model, max_tokens)
    response = client.messages.create(**kwargs)
    return response.content[0].text


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
    model: str = "gemini-1.5-pro",
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Send a prompt to Google Gemini and return the text response."""
    import google.generativeai as genai
    from gtm_engine.config import GOOGLE_API_KEY

    genai.configure(api_key=GOOGLE_API_KEY)
    gen_model = genai.GenerativeModel(model)

    logger.info("Calling Gemini model=%s tokens=%d", model, max_tokens)
    response = gen_model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=max_tokens, temperature=temperature
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
        return call_gemini(prompt, model=model or "gemini-1.5-pro",
                           max_tokens=max_tokens, temperature=temperature)
    else:
        raise ValueError(f"Unknown AI provider: {provider}")
