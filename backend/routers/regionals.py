"""API endpoints for ICPC regional contest analysis."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.regional_analyzer import (
    fetch_and_analyze_regionals,
    get_recommendations_from_regionals,
)

router = APIRouter()


class AnalysisResponse(BaseModel):
    """Response model for regional analysis."""
    contests: list[dict]
    aggregate_stats: dict
    metadata: dict


class RecommendationsResponse(BaseModel):
    """Response model for topic recommendations."""
    recommendations: list[dict]
    message: str


@router.get("/", response_model=AnalysisResponse)
async def get_regional_analysis(
    limit: int = Query(50, ge=1, le=200, description="Max contests to analyze"),
    force_refresh: bool = Query(False, description="Force re-fetch from CF API")
):
    """Get analyzed ICPC regional contest data with topic distributions.

    This endpoint fetches gym contests from Codeforces, filters to ICPC regionals,
    and classifies their problems by topic to show which areas are most tested.
    Results are cached to avoid repeated API calls.
    """
    try:
        result = fetch_and_analyze_regionals(limit=limit, force_refresh=force_refresh)
        return AnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_training_recommendations(
    top_n: int = Query(10, ge=1, le=22, description="Number of top topics to return")
):
    """Get training recommendations based on historical ICPC regional data.

    Returns the most frequently tested topics in ICPC regionals with priority levels.
    """
    try:
        # Load existing analysis (don't force refresh)
        result = fetch_and_analyze_regionals(limit=50, force_refresh=False)
        recommendations = get_recommendations_from_regionals(result, top_n=top_n)

        return RecommendationsResponse(
            recommendations=recommendations,
            message=f"Top {len(recommendations)} topics based on {result['metadata']['total_contests']} ICPC regionals"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.post("/refresh")
async def refresh_analysis(
    limit: int = Query(50, ge=1, le=200, description="Max contests to analyze")
):
    """Force refresh the regional analysis by re-fetching from Codeforces API.

    This will take several minutes due to API rate limiting.
    """
    try:
        result = fetch_and_analyze_regionals(limit=limit, force_refresh=True)
        return {
            "message": "Analysis refreshed successfully",
            "metadata": result["metadata"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


@router.get("/contests/{contest_id}")
async def get_contest_details(contest_id: int):
    """Get detailed analysis for a specific ICPC regional contest."""
    try:
        result = fetch_and_analyze_regionals(limit=200, force_refresh=False)
        contest = next(
            (c for c in result["contests"] if c["contest_id"] == contest_id),
            None
        )

        if not contest:
            raise HTTPException(status_code=404, detail="Contest not found in analysis")

        return contest
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get contest details: {str(e)}")
