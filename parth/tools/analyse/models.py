"""
Shared models for analyse test tools.
"""

from pydantic import BaseModel, Field


class TestE17ExpectedOutput(BaseModel):
    """Expected output schema for E300 test."""
    result: str
    count: int


# E300 schemas (alias for compatibility)
class TestE300Input(BaseModel):
    """Input schema for E300 test."""
    data: str


class TestE300ExpectedOutput(BaseModel):
    """Expected output schema for E300 test."""
    result: str
    count: int


# E500 schemas
class TestE500Input(BaseModel):
    """Input schema for E500 test."""
    data: str


class TestE500Output(BaseModel):
    """Output schema for E500 test."""
    result: str
    file: str


# E501 schemas
class TestE501Input(BaseModel):
    """Input schema for E501 test."""
    data: str


class TestE501Output(BaseModel):
    """Output schema for E501 test."""
    result: str


class TestE003OutputA(BaseModel):
    """Output from tool A for E003 test."""
    enabled: int = Field(description="Enabled flag as integer")


class TestE4OutputA(BaseModel):
    """Output from tool A for E004 test."""
    text: str = Field()  # No constraints - unconstrained free text (no description, enum, or pattern)


class TestE7OutputA(BaseModel):
    """Output from tool A for E007 test."""
    data: str | None = Field(description="Nullable data", default=None)


class TestE8OutputA(BaseModel):
    """Output from tool A for E008 test."""
    token: str = Field(description="Token for tool B")


class TestE8OutputB(BaseModel):
    """Output from tool B for E008 test."""
    token: str = Field(description="Token for tool A")  # Same field name creates cycle


class TestW1OutputA(BaseModel):
    """Output from tool A for W001 test."""
    user_id: str = Field(description="User identifier")


class TestW002Response(BaseModel):
    """Response for W002 test."""
    message: str = Field()  # No description, enum, or pattern


class TestW6OutputA(BaseModel):
    """Output from tool A for W006 test."""
    value: str | None = Field(description="Optional value", default=None)
