"""
Current location tool.
"""

from .models import LocationResponse


def current_location() -> LocationResponse:
    """Get the user's current location by prompting them.
    
    This tool asks the user for their location. The location field will be empty
    until the user provides their location. The prompt field contains the question
    to ask the user. Once the user provides their location, it should be used as
    the location parameter for get_weather.
    
    Tool chain: current_location prompts user -> user provides location -> get_weather uses location parameter
    
    Returns:
        LocationResponse with an empty "location" field and a "prompt" field containing
        the question to ask the user. Once the user responds, the location field should
        be populated and passed to get_weather as the location parameter.
    """
    # In a real scenario, this would prompt the user and get their response
    # For now, this returns a structured format with an empty location and a prompt
    return LocationResponse(
        location="",
        prompt="What is your current location? Please provide your city, state, or address."
    )
