from pydantic import BaseModel, Field, validator, field_validator

class RestaurantCreate(BaseModel):
    name: str
    cuisine_type: str = Field(..., description="음식점 > …")
    location: str | None = None
    latitude:  float | None = Field(None, alias="lat")
    longitude: float | None = Field(None, alias="lon")

    @field_validator("latitude", "longitude", mode="before")
    def _check_minimum_info(cls, v, values):
        address = values.get("location")
        lon     = values.get("longitude")
        if not address and (v is None or lon is None):
            raise ValueError("Must provide either address or both lat/lon")
        return v