# Code Review Audit Report: PeñaHub

**Date:** March 2, 2026  
**Scope:** Full codebase review (backend Python + frontend React)  
**Standard:** SOLID Principles, Security, Code Quality, Performance  

---

## Code Review Summary

**Repository**: `/home/adriano/Desktop/Developer/PeñaHub`  
**Overall Assessment**: **REQUEST CHANGES** - Multiple high-priority issues found. Architecture is sound, but security and code quality concerns need attention.

**Key Stats:**
- Backend: Python/FastAPI with hexagonal architecture
- Frontend: React/Vite + Material UI
- Database: MySQL with SQLAlchemy ORM
- **Files analyzed**: Core use cases, controllers, repositories, middleware, config
- **Issues found**: P0: 1, P1: 4, P2: 5, P3: 3

---

## 🚨 Findings

### P0 - Critical

#### 1. **Exposed Debug Information in Production Error Responses**
- **File**: [backend/src/main.py](backend/src/main.py#L171)
- **Issue**: Global exception handler exposes exception class name and message in production environments
- **Code**:
  ```python
  if _include_debug_error_detail():
      detail = f"{exc.__class__.__name__}: {exc}"
  ```
- **Severity**: P0 (Security: Information Disclosure)
- **Impact**: Exception details can leak internal implementation information, stack traces, or sensitive error context to clients
- **Suggested Fix**: Never expose exception details in production. Use generic error messages.
  ```python
  detail = "Internal server error"
  if _include_debug_error_detail():  # Only in dev
      detail = f"{exc.__class__.__name__}: {exc}"
  ```
- **Status**: Conditional mitigation exists but relies on `APP_ENV` config. Verify this is set correctly in production.

---
j

### P1 - High
#### 3. **Session Management: No Distributed Lock for Concurrent Session Operations**
- **File**: [backend/src/auth/session.py](backend/src/auth/session.py#L58)
- **Issue**: `get_session()` uses `with_for_update()` for row-level locking, but race condition risk exists:
  - Cleanup happens outside transaction scope in `create_session()`
  - Multiple concurrent operations on same token could cause stale reads
- **Code**:
  ```python
  def _cleanup_expired(db: Session, now_ts: int | None = None) -> None:
      now_ts = now_ts or _now_ts()
      db.execute(delete(UserSession).where(UserSession.expires_at <= now_ts))
      # No transaction context here
  ```
- **Severity**: P1 (Race condition - low probability but high impact)
- **Suggested Fix**: Wrap cleanup in a transaction:
  ```python
  def create_session(...):
      with db.begin():  # Transaction
          _cleanup_expired(db, now_ts)
          db.add(row)
      # Commit at end of contextj
  ```



#### 5. **Missing Rate Limiting on Auth Endpoints**
- **File**: [backend/src/api/interface/controller/v1/auth_controller.py](backend/src/api/interface/controller/v1/auth_controller.py#L68)
- **Issue**: Login, register endpoints have no rate limiting. Brute force attacks or credential stuffing are possible.
- **Severity**: P1 (Security: Brute force vulnerability)
- **Suggested Fix**: Implement rate limiting middleware:
  ```python
  from slowapi import Limiter
  from slowapi.util import get_remote_address
  
  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  
  @router.post("/auth/login")
  @limiter.limit("5/minute")  # 5 attempts per minute
  def login_user(...):
  ```

---

### P2 - Medium

#### 1. **Overly Broad Exception Handling in Registration**
- **File**: [backend/src/persistence/infrastructure/repository/db/registration_repository.py](backend/src/persistence/infrastructure/repository/db/registration_repository.py#L30)
- **Issue**: Catches `IntegrityError` broadly, assumes all integrity errors are duplicate username. Other FK violations (nationality) are checked only by error message string matching.
- **Code**:
  ```python
  except IntegrityError as exc:
      self.session.rollback()
      if "fk_player_nationality" in str(exc.orig).lower():
          raise InvalidNationalityError() from exc
      raise DuplicateUsernameError() from exc
  ```
- **Severity**: P2 (Code smell: fragile error mapping via string matching)
- **Suggested Fix**: Use constraint names or catch specific DB exceptions:
  ```python
  # Better: check constraint violation details
  if exc.orig.errno == 1452:  # MySQL FK violation
      raise InvalidNationalityError() from exc
  elif exc.orig.errno == 1062:  # MySQL duplicate key
      raise DuplicateUsernameError() from exc
  ```

#### 2. **Unvalidated Update Logic in PenaSeasonUpdate**
- **File**: [backend/src/persistence/application/use_cases/manage_pena_seasons.py](backend/src/persistence/application/use_cases/manage_pena_seasons.py#L157)
- **Issue**: Update fields are validated individually but not holistically. Multiple `_provided` flags create confusing validation logic.
- **Code**:
  ```python
  if not (update.start_date_provided or update.end_date_provided or ...):
      raise InvalidPenaSeasonDataError()
  if update.points_win_provided and update.points_win is None:
      raise InvalidPenaSeasonDataError()
  # ... repeated for each field
  ```
- **Severity**: P2 (Code smell: repetitive validation, hard to maintain)
- **Suggested Fix**: Use dataclass with validation decorator or consolidate logic:
  ```python
  @dataclass(frozen=True)
  class PenaSeasonUpdate:
      def __post_init__(self):
          if not any([self.start_date_provided, self.end_date_provided, ...]):
              raise InvalidPenaSeasonDataError()
  ```

#### 3. **N+1 Query Risk in Season Competition Report Building**
- **File**: [backend/src/persistence/application/use_cases/manage_season_competition.py](backend/src/persistence/application/use_cases/manage_season_competition.py#L1185)
- **Issue**: Large method `_build_match_insights_report` iterates over matches and players, performing label lookups in inner loops. Potential N+1 if player lookups aren't batched.
- **Severity**: P2 (Performance: potential N+1 queries)
- **Suggested Fix**: Pre-fetch player labels in a single batch before loop:
  ```python
  # Batch load all player labels upfront
  player_labels = {p['guid']: p['label'] for p in players_dict.values()}
  
  for pair in top_pairs:
      left_label = player_labels.get(pair['leftGuid'], pair['leftGuid'])
  ```

#### 4. **Logging Doesn't Include Request Context (Tracing)**
- **File**: [backend/src/api/interface/controller/v1/auth_controller.py](backend/src/api/interface/controller/v1/auth_controller.py#L71)
- **Issue**: Log messages (e.g., "User login attempt") don't include request ID or correlation ID. Hard to trace distributed requests.
- **Severity**: P2 (Observability: no request tracing)
- **Suggested Fix**: Add request context middleware:
  ```python
  import contextvars
  
  request_id_var = contextvars.ContextVar('request_id')
  
  @app.middleware("http")
  async def add_request_id(request, call_next):
      request_id = str(uuid.uuid4())
      request_id_var.set(request_id)
      response = await call_next(request)
      return response
  
  # In logging:
  logger.info("User login ok: %s (request_id=%s)", user.guid, request_id_var.get())
  ```

#### 5. **Weak Error Messages in API Responses**
- **File**: [backend/src/api/interface/controller/v1/auth_controller.py](backend/src/api/interface/controller/v1/auth_controller.py#L76)
- **Issue**: Generic error detail "Invalid credentials" doesn't distinguish between user not found vs wrong password. Could leak username enumeration info.
- **Code**:
  ```python
  except InvalidCredentialsError:
      logger.warning("User login failed: invalid credentials")
      raise HTTPException(detail="Invalid credentials")
  ```
- **Severity**: P2 (Security/UX: ambiguous error messaging)
- **Suggested Fix**: Use intentionally vague messages:
  ```python
  raise HTTPException(detail="Invalid username or password")
  ```

---

### P3 - Low

#### 1. **Magic Numbers in Pagination**
- **File**: [backend/src/persistence/application/use_cases/manage_pena_seasons.py](backend/src/persistence/application/use_cases/manage_pena_seasons.py#L87)
- **Issue**: Default page size is hardcoded (20) with no named constant.
- **Severity**: P3 (Code style: magic number)
- **Suggested Fix**:
  ```python
  DEFAULT_PAGE_SIZE = 20
  
  def list_for_pena(self, *, pena_guid: str, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE):
  ```

#### 2. **Inconsistent Null Handling in Data Models**
- **File**: [backend/src/persistence/application/use_cases/manage_season_competition.py](backend/src/persistence/application/use_cases/manage_season_competition.py#L100)
- **Issue**: `surname2` and other optional fields use `str | None` but inconsistent checks throughout.
- **Severity**: P3 (Code smell: null safety inconsistency)
- **Suggested Fix**: Use `Optional[str]` consistently or add validation helper.

#### 3. **Placeholder Comment in Main Module**
- **File**: [backend/src/main.py](backend/src/main.py#L182)
- **Issue**: Commented-out auth dependency override suggests incomplete implementation.
- **Code**:
  ```python
  # Placeholder for auth dependency (to be implemented)
  # from auth.auth import get_current_user
  # app.dependency_overrides[get_current_user] = get_current_user
  ```
- **Severity**: P3 (Code smell: dead code)
- **Suggested Fix**: Remove or track in issue tracker. If needed for future, add TODO comment with issue link.

---

## 🏗️ SOLID & Architecture Analysis

### Overall Assessment: ✅ **Good** with improvements needed

#### ✅ Strengths:
1. **Hexagonal Architecture**: Clear separation of concerns (controllers, use cases, ports, repositories, domain)
2. **SRP (Single Responsibility)**: Each use case focuses on one business capability
3. **DIP (Dependency Inversion)**: Controllers depend on use case abstractions, not concrete implementations
4. **ISP (Interface Segregation)**: Ports are narrow and purpose-driven

#### ⚠️ Areas for Improvement:

##### **1. ISP Violation: Overly Complex Ports**
- **File**: [backend/src/persistence/application/ports/season_competition_repository.py](backend/src/persistence/application/ports/season_competition_repository.py)
- **Issue**: Protocol has 15+ method signatures. Some are rarely used (e.g., niche stats queries).
- **Suggested Refactor**: Split into smaller, focused protocols:
  ```python
  class SeasonRepositoryRead(Protocol):
      def find_season(...) -> SeasonResult: ...
  
  class SeasonRepositoryWrite(Protocol):
      def create_match(...) -> MatchResult: ...
      def update_match(...) -> MatchResult: ...
  
  class SeasonRepositoryStats(Protocol):
      def get_standings(...) -> StandingsReport: ...
  ```

##### **2. OCP Violation: Many Conditional Checks in Update Logic**
- **File**: [backend/src/persistence/application/use_cases/manage_pena_seasons.py](backend/src/persistence/application/use_cases/manage_pena_seasons.py#L155)
- **Issue**: Update method has 10+ `if` checks for `_provided` flags. Adding a new optional field requires editing core logic.
- **Suggested Refactor**: Use a builder or partial update pattern:
  ```python
  # Instead of many _provided flags, use only non-None values
  update_fields = {k: v for k, v in asdict(update).items() if v is not None}
  repository.update_for_admin(..., fields=update_fields)
  ```

##### **3. Feature Envy: Controllers Know Too Much About Use Cases**
- **File**: [backend/src/api/interface/controller/v1/pena_seasons_controller.py](backend/src/api/interface/controller/v1/pena_seasons_controller.py#L119)
- **Issue**: Controllers must map many domain exceptions to HTTP status codes, duplicating error logic.
- **Suggested Improvement**: Centralized error mapper:
  ```python
  # core/error_mapper.py
  ERROR_TO_STATUS = {
      InvalidPenaSeasonDataError: (400, "Invalid season data"),
      PenaSeasonAccessDeniedError: (403, "Access denied"),
      PenaSeasonNotFoundError: (404, "Season not found"),
  }
  
  # In controller:
  try:
      result = use_case.execute(...)
  except Exception as exc:
      status, detail = ERROR_TO_STATUS.get(
          type(exc), (500, "Internal server error")
      )
      raise HTTPException(status_code=status, detail=detail)
  ```

---

## 🔒 Security Scan

### ✅ Strengths:

1. **Password Security**: PBKDF2-SHA256 with 260k iterations (strong)
2. **Session Tokens**: UUID-based, short-lived (default 1 hour), expiration checks
3. **ORM Protection**: SQLAlchemy parameterizes all queries (SQL injection protection ✓)
4. **CORS Configuration**: Correctly handles credentials=true with valid origins
5. **Auth Guards**: Dependency injection for protected endpoints

### ⚠️ Vulnerabilities:

| Issue | Severity | Status |
|-------|----------|--------|
| Debug error details in production | P0 | 🔴 Conditional mitigation exists |
| Database password in connection string | P1 | 🟡 Config-based, not logged |
| Missing rate limiting on auth | P1 | 🔴 Not implemented |
| No HTTPS enforcement | P1 | 🟡 Assumed by infrastructure |
| No CSRF protection | P2 | 🟡 Stateless API (OK for SPA) |
| No input validation on search queries | P2 | 🟡 SQLAlchemy parameterizes |
| No distributed request tracing | P2 | 🟡 Not implemented |

### Recommended Security Actions:

```python
# 1. Add rate limiting
pip install slowapi
# Use @limiter.limit("5/minute") on auth endpoints

# 2. Add request tracing
import contextvars
request_id = contextvars.ContextVar('request_id')

# 3. Secret masking in logs
class SecretFilter(logging.Filter):
    SECRETS = [config.DB_PASSWORD, config.JWT_SECRET]
    def filter(self, record):
        for secret in self.SECRETS:
            record.msg = record.msg.replace(secret, "***")
        return True

# 4. HTTPS enforcement (in production infrastructure)
# Ensure HTTPS-only cookies, HSTS header
```

---

## 📊 Code Quality Scan

### Error Handling: **Acceptable** with gaps

| Aspect | Status | Notes |
|--------|--------|-------|
| Specific exception catching | ✅ Good | Domain exceptions caught separately |
| Error context in logs | ⚠️ Partial | No request IDs, no structured logging |
| Async error handling | ✅ Good | No dangling promises observed |
| Fallback behavior | ⚠️ Missing | Silent failures in some cleanup paths |

**Issues Found:**
1. `_cleanup_expired()` in session.py runs outside transaction (race condition)
2. `IntegrityError` handling relies on string matching (fragile)
3. No retry logic for transient DB errors

---

### Performance: **Good** with one risk area

| Aspect | Status | Notes |
|--------|--------|-------|
| N+1 queries | ⚠️ Potential | Large report building, needs audit |
| Caching | ❌ Missing | No caching layer (catalog, standings could benefit) |
| Pagination | ✅ Good | Implemented correctly with limits |
| Connection pooling | ✅ Good | SQLAlchemy default pool |
| Missing indexes | ❓ Unknown | Assume schema is optimized |

**Recommendations:**
```python
# 1. Add caching for catalogs (nationalities don't change often)
from functools import lru_cache

@lru_cache(maxsize=1)
def get_nationalities():
    # Cached for 1 hour
    return repo.list_nationalities()

# 2. Batch player lookups before iterating
players_by_guid = {p.guid: p for p in players}  # Prefetch

# 3. Add query performance monitoring
from sqlalchemy import event

@event.listens_for(Engine, "before_cursor_execute")
def log_query(conn, cursor, statement, parameters, context, executemany):
    logger.debug("Executing: %s", statement[:100])
```

---

### Boundary Conditions: **Acceptable**

| Check | Status | Notes |
|-------|--------|-------|
| Null/None handling | ⚠️ Partial | Optional fields used, but inconsistent |
| Empty collections | ✅ Good | Pagination prevents 0-length issues |
| Numeric boundaries | ✅ Good | Offsets validated, TTL positive |
| String boundaries | ⚠️ Partial | Whitespace stripping done, but no length limits |

**Issues:**
1. No max length validation on string fields (name, nationality, etc.)
2. `page_size` parameter accepted but not capped (could cause memory issues)

**Fixes:**
```python
# 1. Validate page_size
def list_for_admin(self, admin_id: int, page: int = 1, page_size: int = 20):
    page_size = min(page_size, 100)  # Cap at 100
    if page_size < 1:
        page_size = 20

# 2. Add string length limits
MAX_PENA_NAME_LENGTH = 100
if len(pena_name) > MAX_PENA_NAME_LENGTH:
    raise InvalidRegistrationDataError("Pena name too long")
```

---

## 🗑️ Removal Candidates & Iteration Plan

### Safe to Remove Now

#### ✅ Placeholder Comment in main.py
| Field | Details |
|-------|---------|
| **Location** | [backend/src/main.py](backend/src/main.py#L182) |
| **Rationale** | Dead code, never used, confuses maintainers |
| **Evidence** | No dependency_overrides used anywhere |
| **Impact** | None - pure removal |
| **Steps** | 1. Delete lines 181-183 |

### Defer Removal (Plan Required)

#### ⚠️ Potentially Unused Error Classes
| Field | Details |
|-------|---------|
| **Location** | [backend/src/auth/application/use_cases/](backend/src/auth/application/use_cases/) |
| **Why Defer** | Might be used in tests or future endpoints |
| **Preconditions** | 1. Run full test suite 2. Check all imports via rg |
| **Validation** | `rg "InvalidSessionTypeError"` (if 0 results, safe to remove) |

---

## Summary: Issues by Priority

| Severity | Count | Action |
|----------|-------|--------|
| **P0** | 1 | Must fix before production |
| **P1** | 4 | Should fix before merge |
| **P2** | 5 | Fix in this PR or follow-up |
| **P3** | 3 | Optional improvements |
| **Total** | **13** | |

---

## Recommendations

### Immediate (Before Production):
1. ✅ Fix debug error exposure (P0)
2. ✅ Implement rate limiting on auth endpoints (P1)
3. ✅ Add request tracing context (P2)
4. ✅ Cap page_size parameter (P2)

### Short-term (Next Sprint):
1. Split large ports into focused interfaces (ISP)
2. Refactor update validation logic (OCP)
3. Add N+1 query audit for report building
4. Implement secret masking in logs
5. Add caching layer for catalogs

### Long-term (Architecture):
1. Introduce centralized error-to-HTTP mapper
2. Add structured logging (JSON logs with request context)
3. Implement distributed tracing (OpenTelemetry)
4. Add performance monitoring hooks
5. Develop API versioning strategy

---

## Next Steps

I found **13 issues** (P0: 1, P1: 4, P2: 5, P3: 3).

**How would you like to proceed?**

1. **Fix all** - I'll implement all suggested fixes
2. **Fix P0/P1 only** - Address critical and high-priority issues
3. **Fix specific items** - Tell me which issues to fix
4. **No changes** - Review complete, discuss findings only

Please choose an option or provide specific instructions.
