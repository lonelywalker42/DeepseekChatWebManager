"""API endpoints for background task status."""

from fastapi import APIRouter, HTTPException

from services.pipeline import get_task_status
from models.schemas import TaskStatus

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.get("/{task_id}", response_model=TaskStatus)
def get_task(task_id: str):
    """Get the status of a processing task."""
    task = get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatus(**task)
