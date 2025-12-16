import asyncio
import os
from .celery_app import celery_app
from .services.ingestion import ingest_document
from .core.database import connect_all, close_all


def run_async(coro):
    """Helper to run async code in celery tasks."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3)
def process_document_task(self, file_path: str, document_id: str, tenant_id: str, bot_id: str, content_type: str, filename: str):
    """Celery task to process document ingestion."""
    try:
        # Check if file exists before processing
        if not os.path.exists(file_path):
            print(f"File not found (likely deleted): {file_path}")
            # Mark document as deleted/cancelled if it still exists in DB
            async def _mark_cancelled():
                from .core.database import get_mongodb
                await connect_all()
                try:
                    db = get_mongodb()
                    doc = await db.documents.find_one({"_id": document_id})
                    if doc:
                        await db.documents.update_one(
                            {"_id": document_id},
                            {"$set": {"status": "cancelled", "error": "File was deleted before processing"}}
                        )
                finally:
                    await close_all()
            run_async(_mark_cancelled())
            return {"status": "cancelled", "reason": "file_deleted"}

        async def _process():
            await connect_all()
            try:
                result = await ingest_document(
                    file_path=file_path,
                    document_id=document_id,
                    tenant_id=tenant_id,
                    bot_id=bot_id,
                    content_type=content_type,
                    filename=filename
                )
                return result
            finally:
                await close_all()

        return run_async(_process())

    except FileNotFoundError:
        # File was deleted during processing - don't retry
        print(f"File deleted during processing: {file_path}")
        return {"status": "cancelled", "reason": "file_deleted"}

    except Exception as exc:
        # Update document status to failed
        async def _mark_failed():
            from .core.database import get_mongodb
            await connect_all()
            try:
                db = get_mongodb()
                await db.documents.update_one(
                    {"_id": document_id},
                    {"$set": {"status": "failed", "error": str(exc)}}
                )
            finally:
                await close_all()

        run_async(_mark_failed())
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def send_booking_notification_task(self, booking_id: str, owner_email: str):
    """Celery task to send booking notification email."""
    try:
        async def _send():
            from .services.booking import get_booking, mark_booking_notified
            from .services.email import send_booking_notification
            from .core.database import get_mongodb

            await connect_all()
            try:
                # Get booking details
                booking = await get_booking(booking_id)
                if not booking:
                    print(f"Booking {booking_id} not found")
                    return {"status": "error", "reason": "booking_not_found"}

                # Get bot name for email
                db = get_mongodb()
                bot = await db.chatbots.find_one({"_id": booking.get("bot_id")})
                bot_name = bot.get("name", "Aiden") if bot else "Aiden"

                # Build booking details for email
                booking_details = {
                    "booking_type": booking.get("booking_type", "booking"),
                    "guest_name": booking.get("guest_name"),
                    "phone": booking.get("phone"),
                    "date": booking.get("date"),
                    "time": booking.get("time"),
                    "people_count": booking.get("people_count"),
                    "purpose": booking.get("purpose"),
                    "duration": booking.get("duration"),
                    "extras": booking.get("extras", []),
                    "notes": booking.get("notes")
                }

                # Send email
                success = await send_booking_notification(
                    to_email=owner_email,
                    booking_details=booking_details,
                    bot_name=bot_name
                )

                if success:
                    await mark_booking_notified(booking_id)
                    print(f"Booking notification sent for {booking_id}")
                    return {"status": "sent"}
                else:
                    print(f"Failed to send booking notification for {booking_id}")
                    return {"status": "failed"}

            finally:
                await close_all()

        return run_async(_send())

    except Exception as exc:
        print(f"Booking notification task error: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def import_integration_items_task(
    self,
    integration_id: str,
    bot_id: str,
    tenant_id: str,
    provider: str,
    items: list,
):
    """Celery task to import items from an OAuth integration."""
    try:
        async def _import():
            from .core.database import get_mongodb
            from .core.encryption import decrypt_token
            from .services.integrations import get_integration
            from datetime import datetime
            import uuid
            import tempfile
            import os
            import base64

            await connect_all()
            try:
                db = get_mongodb()

                # Get integration credentials
                integration_doc = await db.integrations.find_one({"_id": integration_id})
                if not integration_doc:
                    raise Exception("Integration not found")

                access_token = decrypt_token(integration_doc["access_token"])
                integration_service = get_integration(provider)

                imported_count = 0
                errors = []

                for item in items:
                    item_id = item["id"]
                    item_name = item["name"]

                    try:
                        # Fetch content from provider
                        content, filename, mime_type = await integration_service.fetch_content(
                            access_token, item_id
                        )

                        # Create document record
                        document_id = str(uuid.uuid4())

                        # Handle binary content (base64 encoded)
                        if mime_type in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
                            # Decode base64 and save to temp file
                            binary_content = base64.b64decode(content)
                            ext = ".pdf" if mime_type == "application/pdf" else ".docx"
                            file_path = f"/app/uploads/{document_id}{ext}"

                            with open(file_path, "wb") as f:
                                f.write(binary_content)

                            file_size = len(binary_content)
                        else:
                            # Text content - save directly
                            ext = ".txt" if mime_type == "text/plain" else ".md"
                            file_path = f"/app/uploads/{document_id}{ext}"

                            with open(file_path, "w", encoding="utf-8") as f:
                                f.write(content)

                            file_size = len(content.encode("utf-8"))

                        # Create document in DB
                        doc = {
                            "_id": document_id,
                            "tenant_id": tenant_id,
                            "bot_id": bot_id,
                            "filename": filename,
                            "content_type": mime_type,
                            "size": file_size,
                            "file_path": file_path,
                            "status": "processing",
                            "source_type": provider,
                            "integration_id": integration_id,
                            "remote_id": item_id,
                            "created_at": datetime.utcnow(),
                        }
                        await db.documents.insert_one(doc)

                        # Process document through ingestion pipeline
                        result = await ingest_document(
                            file_path=file_path,
                            document_id=document_id,
                            tenant_id=tenant_id,
                            bot_id=bot_id,
                            content_type=mime_type,
                            filename=filename,
                        )

                        imported_count += 1

                    except Exception as e:
                        errors.append(f"{item_name}: {str(e)}")
                        print(f"Error importing {item_name}: {e}")

                # Update integration stats
                await db.integrations.update_one(
                    {"_id": integration_id},
                    {
                        "$set": {
                            "last_sync": datetime.utcnow(),
                            "sync_stats": {
                                "documents_count": imported_count,
                                "last_error": errors[-1] if errors else None,
                            },
                            "updated_at": datetime.utcnow(),
                        }
                    }
                )

                return {
                    "imported": imported_count,
                    "errors": errors,
                }

            finally:
                await close_all()

        return run_async(_import())

    except Exception as exc:
        print(f"Import task error: {exc}")
        raise self.retry(exc=exc, countdown=60)
