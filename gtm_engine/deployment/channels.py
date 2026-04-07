"""Layer 4a — Deployment channel connectors.

Each connector handles authentication, formatting, timing, and publishing
for its platform. All share a common interface.
"""

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class ChannelConnector(ABC):
    """Base class for all deployment channel connectors."""

    @abstractmethod
    def publish(self, content: dict) -> dict:
        """Publish content and return a result dict with status and metadata."""
        ...

    @abstractmethod
    def get_metrics(self, post_id: str) -> dict:
        """Retrieve performance metrics for a published post."""
        ...


class EmailConnector(ChannelConnector):
    """SendGrid email deployment."""

    def publish(self, content: dict) -> dict:
        raise NotImplementedError

    def get_metrics(self, post_id: str) -> dict:
        raise NotImplementedError


class RedditConnector(ChannelConnector):
    """Reddit deployment via PRAW."""

    def publish(self, content: dict) -> dict:
        raise NotImplementedError

    def get_metrics(self, post_id: str) -> dict:
        raise NotImplementedError


class LinkedInConnector(ChannelConnector):
    """LinkedIn deployment via API."""

    def publish(self, content: dict) -> dict:
        raise NotImplementedError

    def get_metrics(self, post_id: str) -> dict:
        raise NotImplementedError


class TwitterConnector(ChannelConnector):
    """X/Twitter deployment via Tweepy."""

    def publish(self, content: dict) -> dict:
        raise NotImplementedError

    def get_metrics(self, post_id: str) -> dict:
        raise NotImplementedError
