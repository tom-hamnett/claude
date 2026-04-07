"""Layer 4a — Deployment channel connectors.

Each connector handles authentication, formatting, timing, and publishing
for its platform. All share a common interface so the scheduler can treat
them uniformly.

Publishing is gated — nothing goes out without explicit approval unless
auto_publish is enabled in the deployment config.
"""

import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from gtm_engine.content_factory.models import ContentPiece
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)


class ChannelConnector(ABC):
    """Base class for all deployment channel connectors."""

    channel_name: str = "base"

    @abstractmethod
    def authenticate(self) -> bool:
        """Verify credentials and return True if connection is live."""
        ...

    @abstractmethod
    def format_content(self, piece: ContentPiece) -> dict:
        """Transform a ContentPiece into the platform-specific format."""
        ...

    @abstractmethod
    def publish(self, piece: ContentPiece) -> dict:
        """Publish content and return a result dict with status and metadata."""
        ...

    @abstractmethod
    def get_metrics(self, platform_post_id: str) -> dict:
        """Retrieve performance metrics for a published post."""
        ...

    def _log_publish(self, piece: ContentPiece, result: dict) -> None:
        """Log a publish event."""
        log_decision(
            "deployment",
            f"Published {piece.format} to {self.channel_name}",
            f"Piece ID: {piece.id}, Status: {result.get('status', 'unknown')}",
            {"piece_id": piece.id, "platform_post_id": result.get("platform_post_id")},
        )


class EmailConnector(ChannelConnector):
    """SendGrid email deployment."""

    channel_name = "email"

    def __init__(self):
        from gtm_engine.config import SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
        self.api_key = SENDGRID_API_KEY
        self.from_email = SENDGRID_FROM_EMAIL
        self._client = None

    def authenticate(self) -> bool:
        if not self.api_key:
            logger.warning("SendGrid API key not configured")
            return False
        try:
            from sendgrid import SendGridAPIClient
            self._client = SendGridAPIClient(self.api_key)
            return True
        except Exception as e:
            logger.error("SendGrid auth failed: %s", e)
            return False

    def format_content(self, piece: ContentPiece) -> dict:
        """Format as a SendGrid email payload."""
        metadata = piece.metadata or {}
        return {
            "subject": metadata.get("subject", piece.title),
            "html_content": piece.body.replace("\n", "<br>"),
            "plain_text": piece.body,
            "preview_text": metadata.get("preview_text", piece.title[:100]),
        }

    def publish(self, piece: ContentPiece, to_emails: list[str] = None) -> dict:
        """Send an email via SendGrid."""
        if not self._client:
            if not self.authenticate():
                return {"status": "error", "error": "Authentication failed"}

        from sendgrid.helpers.mail import Mail

        formatted = self.format_content(piece)
        to_emails = to_emails or []

        if not to_emails:
            return {"status": "error", "error": "No recipients specified"}

        results = []
        for email in to_emails:
            message = Mail(
                from_email=self.from_email,
                to_emails=email,
                subject=formatted["subject"],
                html_content=formatted["html_content"],
            )
            try:
                response = self._client.send(message)
                results.append({
                    "email": email,
                    "status_code": response.status_code,
                })
            except Exception as e:
                results.append({"email": email, "error": str(e)})

        result = {
            "status": "sent",
            "platform_post_id": f"email_{piece.id}",
            "recipients": len(to_emails),
            "results": results,
            "published_at": datetime.now(timezone.utc).isoformat(),
        }
        self._log_publish(piece, result)
        return result

    def get_metrics(self, platform_post_id: str) -> dict:
        """SendGrid stats are fetched via the stats API."""
        # SendGrid provides aggregate stats, not per-message
        return {
            "platform_post_id": platform_post_id,
            "note": "SendGrid stats available via dashboard or stats API",
        }


class RedditConnector(ChannelConnector):
    """Reddit deployment via PRAW."""

    channel_name = "reddit"

    def __init__(self):
        from gtm_engine.config import (
            REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET,
            REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_USER_AGENT,
        )
        self.client_id = REDDIT_CLIENT_ID
        self.client_secret = REDDIT_CLIENT_SECRET
        self.username = REDDIT_USERNAME
        self.password = REDDIT_PASSWORD
        self.user_agent = REDDIT_USER_AGENT
        self._reddit = None

    def authenticate(self) -> bool:
        if not self.client_id:
            logger.warning("Reddit credentials not configured")
            return False
        try:
            import praw
            self._reddit = praw.Reddit(
                client_id=self.client_id,
                client_secret=self.client_secret,
                username=self.username,
                password=self.password,
                user_agent=self.user_agent,
            )
            # Verify by accessing the user
            _ = self._reddit.user.me()
            return True
        except Exception as e:
            logger.error("Reddit auth failed: %s", e)
            return False

    def format_content(self, piece: ContentPiece) -> dict:
        metadata = piece.metadata or {}
        return {
            "title": piece.title,
            "selftext": piece.body,
            "subreddits": metadata.get("subreddit_suggestions", []),
        }

    def publish(self, piece: ContentPiece, subreddit: str = None) -> dict:
        if not self._reddit:
            if not self.authenticate():
                return {"status": "error", "error": "Authentication failed"}

        formatted = self.format_content(piece)
        target_sub = subreddit or (formatted["subreddits"][0] if formatted["subreddits"] else None)

        if not target_sub:
            return {"status": "error", "error": "No subreddit specified"}

        try:
            sub = self._reddit.subreddit(target_sub)
            submission = sub.submit(
                title=formatted["title"],
                selftext=formatted["selftext"],
            )
            result = {
                "status": "published",
                "platform_post_id": submission.id,
                "url": f"https://reddit.com{submission.permalink}",
                "subreddit": target_sub,
                "published_at": datetime.now(timezone.utc).isoformat(),
            }
            self._log_publish(piece, result)
            return result
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_metrics(self, platform_post_id: str) -> dict:
        if not self._reddit:
            return {"error": "Not authenticated"}
        try:
            submission = self._reddit.submission(id=platform_post_id)
            return {
                "platform_post_id": platform_post_id,
                "score": submission.score,
                "upvote_ratio": submission.upvote_ratio,
                "num_comments": submission.num_comments,
                "views": getattr(submission, "view_count", None),
            }
        except Exception as e:
            return {"error": str(e)}


class LinkedInConnector(ChannelConnector):
    """LinkedIn deployment via REST API."""

    channel_name = "linkedin"

    def __init__(self):
        from gtm_engine.config import LINKEDIN_ACCESS_TOKEN
        self.access_token = LINKEDIN_ACCESS_TOKEN
        self._person_urn = None

    def authenticate(self) -> bool:
        if not self.access_token:
            logger.warning("LinkedIn access token not configured")
            return False
        try:
            import httpx
            response = httpx.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {self.access_token}"},
            )
            if response.status_code == 200:
                data = response.json()
                self._person_urn = f"urn:li:person:{data['sub']}"
                return True
            return False
        except Exception as e:
            logger.error("LinkedIn auth failed: %s", e)
            return False

    def format_content(self, piece: ContentPiece) -> dict:
        metadata = piece.metadata or {}
        body = metadata.get("body", piece.body)
        hashtags = metadata.get("hashtags", [])
        if hashtags:
            body += "\n\n" + " ".join(f"#{tag}" for tag in hashtags)
        return {"text": body}

    def publish(self, piece: ContentPiece) -> dict:
        if not self._person_urn:
            if not self.authenticate():
                return {"status": "error", "error": "Authentication failed"}

        import httpx
        formatted = self.format_content(piece)

        payload = {
            "author": self._person_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": formatted["text"]},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }

        try:
            response = httpx.post(
                "https://api.linkedin.com/v2/ugcPosts",
                headers={
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                json=payload,
            )
            if response.status_code in (200, 201):
                post_id = response.headers.get("x-restli-id", "unknown")
                result = {
                    "status": "published",
                    "platform_post_id": post_id,
                    "published_at": datetime.now(timezone.utc).isoformat(),
                }
                self._log_publish(piece, result)
                return result
            return {"status": "error", "error": response.text}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_metrics(self, platform_post_id: str) -> dict:
        if not self.access_token:
            return {"error": "Not authenticated"}
        try:
            import httpx
            response = httpx.get(
                f"https://api.linkedin.com/v2/socialActions/{platform_post_id}",
                headers={"Authorization": f"Bearer {self.access_token}"},
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "platform_post_id": platform_post_id,
                    "likes": data.get("likesSummary", {}).get("totalLikes", 0),
                    "comments": data.get("commentsSummary", {}).get("totalFirstLevelComments", 0),
                }
            return {"error": response.text}
        except Exception as e:
            return {"error": str(e)}


class TwitterConnector(ChannelConnector):
    """X/Twitter deployment via Tweepy."""

    channel_name = "twitter"

    def __init__(self):
        from gtm_engine.config import (
            TWITTER_API_KEY, TWITTER_API_SECRET,
            TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET,
        )
        self.api_key = TWITTER_API_KEY
        self.api_secret = TWITTER_API_SECRET
        self.access_token = TWITTER_ACCESS_TOKEN
        self.access_secret = TWITTER_ACCESS_SECRET
        self._client = None

    def authenticate(self) -> bool:
        if not self.api_key:
            logger.warning("Twitter credentials not configured")
            return False
        try:
            import tweepy
            self._client = tweepy.Client(
                consumer_key=self.api_key,
                consumer_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_secret,
            )
            # Verify credentials
            self._client.get_me()
            return True
        except Exception as e:
            logger.error("Twitter auth failed: %s", e)
            return False

    def format_content(self, piece: ContentPiece) -> dict:
        metadata = piece.metadata or {}
        text = metadata.get("body", piece.body)
        # Truncate to Twitter limit
        if len(text) > 280:
            text = text[:277] + "..."
        return {"text": text}

    def publish(self, piece: ContentPiece) -> dict:
        if not self._client:
            if not self.authenticate():
                return {"status": "error", "error": "Authentication failed"}

        formatted = self.format_content(piece)
        try:
            response = self._client.create_tweet(text=formatted["text"])
            tweet_id = response.data["id"]
            result = {
                "status": "published",
                "platform_post_id": tweet_id,
                "url": f"https://twitter.com/i/web/status/{tweet_id}",
                "published_at": datetime.now(timezone.utc).isoformat(),
            }
            self._log_publish(piece, result)
            return result
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_metrics(self, platform_post_id: str) -> dict:
        if not self._client:
            return {"error": "Not authenticated"}
        try:
            tweet = self._client.get_tweet(
                platform_post_id,
                tweet_fields=["public_metrics"],
            )
            metrics = tweet.data.get("public_metrics", {}) if tweet.data else {}
            return {
                "platform_post_id": platform_post_id,
                "likes": metrics.get("like_count", 0),
                "retweets": metrics.get("retweet_count", 0),
                "replies": metrics.get("reply_count", 0),
                "impressions": metrics.get("impression_count", 0),
            }
        except Exception as e:
            return {"error": str(e)}


# --- Connector registry ---

CONNECTORS = {
    "email": EmailConnector,
    "reddit": RedditConnector,
    "linkedin": LinkedInConnector,
    "twitter": TwitterConnector,
}


def get_connector(channel: str) -> ChannelConnector:
    """Instantiate and return the connector for a channel."""
    channel_lower = channel.lower()
    for key, cls in CONNECTORS.items():
        if key in channel_lower:
            return cls()
    raise ValueError(f"No connector for channel: {channel}. Available: {list(CONNECTORS.keys())}")
