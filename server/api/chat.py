"""API endpoint for interactive chat with LLM."""

import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.llm_service import _get_client
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system_prompt: str | None = None


class ChatResponse(BaseModel):
    reply: str


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a chat message and get a response from the LLM (non-streaming)."""
    if not settings.LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")

    try:
        client = _get_client()

        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        else:
            messages.append({
                "role": "system",
                "content": "你是一个有帮助的AI助手。请用中文回答用户的问题。",
            })

        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})

        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=4096,
        )

        reply = response.choices[0].message.content or ""
        return ChatResponse(reply=reply)

    except Exception as e:
        logger.error("Chat API error: %s", e)
        raise HTTPException(status_code=500, detail=f"LLM 调用失败: {str(e)}")


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Send a chat message and get a streaming response from the LLM."""
    if not settings.LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")

    async def generate():
        try:
            client = _get_client()

            messages = []
            if request.system_prompt:
                messages.append({"role": "system", "content": request.system_prompt})
            else:
                messages.append({
                    "role": "system",
                    "content": "你是一个有帮助的AI助手。请用中文回答用户的问题。",
                })

            for msg in request.messages:
                messages.append({"role": msg.role, "content": msg.content})

            stream = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=4096,
                stream=True,
            )

            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    # SSE format: data: {json}\n\n
                    yield f"data: {json.dumps({'content': content}, ensure_ascii=False)}\n\n"

            # End signal
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error("Chat stream error: %s", e)
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
