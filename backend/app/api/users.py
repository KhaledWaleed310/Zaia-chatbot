from fastapi import APIRouter, Depends
from ..core.security import get_current_user
from ..services.limits import get_user_limits_with_usage

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me/usage")
async def get_my_usage(current_user: dict = Depends(get_current_user)):
    """Get current user's usage statistics and limits."""
    return await get_user_limits_with_usage(current_user["_id"], current_user)
