# Zaia Chatbot - Production Deployment Checklist

## Pre-Deployment

### 1. Code & Version Control
- [x] All changes committed
- [x] Commit: `f1ced86` - Add Personal Chatbot Mode and World-Class Context System
- [x] Push to remote repository
- [x] Create release tag `v2.0.0`

### 2. Environment Check
- [x] Backend health: ✅ Healthy
- [x] MongoDB: ✅ Running
- [x] Redis: ✅ Running
- [x] Qdrant: ✅ Running
- [x] Neo4j: ✅ Running
- [x] Celery: ✅ Running

### 3. Database
- [x] Migration script executed (`migrate_personal_mode.py`)
- [x] Indexes created for visitor_id queries
- [ ] Verify backup exists
- [ ] Test restore procedure

### 4. API Smoke Tests
- [x] Health endpoint: ✅
- [x] Public bot config: ✅
- [x] Greeting endpoint: ✅
- [x] Create conversation: ✅
- [x] Send message: ✅
- [x] Delete conversation: ✅

---

## Deployment Steps

### Step 1: Backup (CRITICAL)
```bash
# MongoDB backup
docker exec 218fd5e3bc20_zaia-mongodb mongodump \
  --uri="mongodb://zaia_admin:zaia_secure_pass_2024@localhost:27017/zaia_chatbot?authSource=admin" \
  --out=/backup/$(date +%Y%m%d_%H%M%S)

# Redis backup (if persistence enabled)
docker exec 05d334734a61_zaia-redis redis-cli BGSAVE
```

### Step 2: Pull Latest Code
```bash
cd /home/ubuntu/zaia-chatbot
git pull origin master
```

### Step 3: Rebuild Frontend
```bash
cd frontend
npm install
npm run build
```

### Step 4: Restart Services
```bash
cd /home/ubuntu/zaia-chatbot
docker-compose restart backend celery
```

### Step 5: Verify Deployment
```bash
# Health check
curl http://localhost:8000/health

# Check logs for errors
docker logs zaia-backend --tail 50

# Test a chat message
curl -X POST "http://localhost:8000/api/v1/chat/{BOT_ID}/message" \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "session_id": "test-123"}'
```

---

## Post-Deployment Verification

### Functional Tests
- [ ] Login/Authentication works
- [ ] Create new chatbot
- [ ] Upload document to chatbot
- [ ] Send chat message (non-personal bot)
- [ ] Enable Personal Mode on a bot
- [ ] Test conversation sidebar appears
- [ ] Test new chat creation
- [ ] Test conversation switching
- [ ] Test conversation rename
- [ ] Test conversation delete
- [ ] Test Analytics page on mobile

### Performance Checks
- [ ] Chat response time < 3 seconds
- [ ] Context building < 800ms (check logs)
- [ ] No memory leaks in backend

---

## New Features Summary

### Personal Chatbot Mode
| Feature | Description |
|---------|-------------|
| Toggle | `is_personal` field on chatbot |
| Sidebar | List of past conversations |
| Titles | Auto-generated from first message |
| Identity | Anonymous visitor_id (localStorage) |
| Greeting | Personalized "Welcome back, {name}!" |

### Context System
| Component | Purpose |
|-----------|---------|
| WorkingMemory | Session state in Redis |
| FactExtractor | Extract user info from messages |
| IntentTracker | Track intent evolution |
| StageDetector | Sales funnel stage |
| UserProfileManager | Cross-session profiles |
| ConversationSummarizer | Auto-summarize long chats |
| SemanticHistorySearch | Qdrant vector search |
| ContextManager | Main orchestrator |

---

## Rollback Procedure

If issues occur:

```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Rebuild frontend
cd frontend && npm run build

# 3. Restart services
docker-compose restart backend celery

# 4. Restore database if needed
docker exec -i 218fd5e3bc20_zaia-mongodb mongorestore \
  --uri="mongodb://zaia_admin:zaia_secure_pass_2024@localhost:27017/zaia_chatbot?authSource=admin" \
  /backup/YYYYMMDD_HHMMSS/
```

---

## Support Contacts

- **Technical Issues**: Check logs first
  ```bash
  docker logs zaia-backend --tail 100
  docker logs zaia-celery --tail 100
  ```

- **Database Issues**: MongoDB shell
  ```bash
  docker exec -it 218fd5e3bc20_zaia-mongodb mongosh \
    "mongodb://zaia_admin:zaia_secure_pass_2024@localhost:27017/zaia_chatbot?authSource=admin"
  ```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| DevOps | | | |
| Product Owner | | | |

---

*Generated: December 15, 2025*
