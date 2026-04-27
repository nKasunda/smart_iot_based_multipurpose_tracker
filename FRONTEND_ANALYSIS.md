# Frontend Dashboard Data Loading & Refresh Flow Analysis

## Executive Summary
The Frontend uses a **dashboard-centric architecture** with automatic polling (10s interval) and WebSocket real-time updates. Authentication is handled via JWT tokens stored in localStorage, with a boot sequence in AuthProvider.

---

## 1. Dashboard Component Architecture

### Main Page Structure
- **Entry Point**: [Frontend/pages/_app.js](Frontend/pages/_app.js)
  - Wraps all pages with `<AuthProvider>` context
  - Loads global styles and Leaflet CSS

- **Dashboard Component**: [Frontend/pages/dashboard.jsx](Frontend/pages/dashboard.jsx)
  - **Main orchestrator for all device data**
  - Holds state for: `devices`, `latest`, `stats`, `alerts`, `selectedDeviceId`, `socketConnected`
  - Routes: All child sections (Overview, Live Map, Devices, Alerts, History) receive data as props
  
### Dashboard Sections (Child Components)
1. [Frontend/components/DashboardSections/Overview.jsx](Frontend/components/DashboardSections/Overview.jsx) - Summary stats and map
2. [Frontend/components/DashboardSections/LiveMap.jsx](Frontend/components/DashboardSections/LiveMap.jsx) - Device location picker
3. [Frontend/components/DashboardSections/Devices.jsx](Frontend/components/DashboardSections/Devices.jsx) - Device management (provision/claim/unclaim)
4. [Frontend/components/DashboardSections/Alerts.jsx](Frontend/components/DashboardSections/Alerts.jsx) - Low battery & inactive alerts
5. [Frontend/components/DashboardSections/History.jsx](Frontend/components/DashboardSections/History.jsx) - Historical location playback

---

## 2. How Dashboard Loads and Refreshes Device Data

### Initial Load Flow

```
1. AuthProvider boots (in _app.js)
   ↓
2. getToken() from localStorage
   ↓
3. If token exists: apiMe() fetches current user
   ↓
4. auth.isAuthed → true
   ↓
5. Dashboard page renders
   ↓
6. refreshAll() called once on mount
```

### Auto-Refresh Mechanism

**Location**: [dashboard.jsx lines 115-125](Frontend/pages/dashboard.jsx#L115-L125)

```javascript
useEffect(() => {
  if (!auth.isAuthed) return;
  refreshAll().catch(() => {});
  const interval = setInterval(() => refreshAll().catch(() => {}), 10000);  // ← 10s interval
  return () => clearInterval(interval);
}, [auth.isAuthed]);
```

**Key Points:**
- Polls every **10 seconds** (10000ms)
- Calls 4 API endpoints in parallel:
  - `getDevices()` 
  - `getLatest()`
  - `getStats()`
  - `getAlerts()`
- Errors are silently caught (`.catch(() => {})`)
- Interval cleaned up on dependency change

### refreshAll() Implementation

**Location**: [dashboard.jsx lines 109-114](Frontend/pages/dashboard.jsx#L109-L114)

```javascript
const refreshAll = async () => {
  const [d, l, s, a] = await Promise.all([
    getDevices(),
    getLatest(),
    getStats(),
    getAlerts(),
  ]);
  setDevices(d || []);
  setLatest(l || []);
  setStats(s || null);
  setAlerts(a || null);
};
```

---

## 3. onRefresh Definition and Usage

### Where onRefresh is Defined
- **Defined in**: [dashboard.jsx line 192](Frontend/pages/dashboard.jsx#L192)
- **What it is**: The `refreshAll` function passed as a prop to all child components

### Components That Use onRefresh

#### 1. **Devices Component** [Frontend/components/DashboardSections/Devices.jsx](Frontend/components/DashboardSections/Devices.jsx)
Used after device operations:
- **Line 60**: After admin provisions device
  ```javascript
  await onRefresh?.();
  ```
- **Line 83**: After admin deletes device
- **Line 106**: After user unclaimss device
- **Line 143**: After user claims device

#### 2. **Overview Component** [Frontend/components/DashboardSections/Overview.jsx](Frontend/components/DashboardSections/Overview.jsx)
- **Line 141**: Manual refresh button on the map section
  ```javascript
  onClick={() => onRefresh?.()}
  ```

#### 3. **Alerts Component** [Frontend/components/DashboardSections/Alerts.jsx](Frontend/components/DashboardSections/Alerts.jsx)
- Accepts `onRefresh` prop but doesn't actively use it (read-only component)

#### 4. **LiveMap & History Components**
- Receive `onRefresh` in props but don't actively call it

---

## 4. Auth Token Storage and Retrieval

### Token Storage Implementation
**File**: [Frontend/lib/tokenStorage.js](Frontend/lib/tokenStorage.js)

```javascript
const TOKEN_KEY = "tracker.jwt";

export function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}
```

**Key Points:**
- Stored in `localStorage` with key `"tracker.jwt"`
- Checks for browser environment (`typeof window`)
- Silent error handling (errors logged only to console)
- No encryption or expiry mechanism

### Auth Context Flow
**File**: [Frontend/context/AuthContext.jsx](Frontend/context/AuthContext.jsx)

**Boot Sequence (lines 9-26):**
```javascript
useEffect(() => {
  const existing = getToken();
  setTokenState(existing);
  if (!existing) {
    setBooting(false);
    return;
  }

  apiMe()
    .then((u) => setUser(u))
    .catch(() => {
      setToken(null);
      setTokenState(null);
      setUser(null);
    })
    .finally(() => setBooting(false));
}, []);
```

**Token Refresh/Update (lines 35-52):**
- `login()` and `register()` both set token via `setToken()`
- `refresh()` calls `apiMe()` to update user info
- `logout()` clears token and auth state

### Token Usage in API Calls
**File**: [Frontend/lib/api.js](Frontend/lib/api.js)

```javascript
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Key Points:**
- Axios interceptor adds token to all requests
- **Reads fresh token on each request** (not cached)
- Uses `Bearer ${token}` format

---

## 5. Data Fetching and State Initialization Issues

### ⚠️ CRITICAL ISSUES IDENTIFIED

#### Issue 1: No Initial Data Before First Refresh
**Severity**: MEDIUM  
**Location**: [dashboard.jsx line 33-37](Frontend/pages/dashboard.jsx#L33-L37)

```javascript
const [devices, setDevices] = useState([]);      // ← Empty initially
const [latest, setLatest] = useState([]);        // ← Empty initially
const [stats, setStats] = useState(null);        // ← null initially
const [alerts, setAlerts] = useState(null);      // ← null initially
```

**Problem**: Components render with empty data for ~10 seconds (first poll interval) before refreshAll() completes.

**Impact**: 
- Overview shows "0 devices", "0 locations" initially
- Maps don't render until latestByDevice is populated
- User sees blank dashboard for several seconds

**Recommendation**: Load data in AuthProvider after token validation or before dashboard renders.

---

#### Issue 2: Device Selection Auto-selects Only on Mount
**Severity**: LOW  
**Location**: [dashboard.jsx line 88-92](Frontend/pages/dashboard.jsx#L88-L92)

```javascript
useEffect(() => {
  if (devices.length > 0 && !selectedDeviceId) {
    setSelectedDeviceId(devices[0].device_uid);
  }
}, []); // ← Only runs once on mount, empty dependency array
```

**Problem**: If devices load after this effect runs, no device is auto-selected. User must manually select.

**Impact**: LiveMap and History sections show "No devices available" even if devices exist.

**Recommendation**: Add `devices` to dependency array (but watch for infinite loops).

---

#### Issue 3: Silent Error Handling in refreshAll()
**Severity**: MEDIUM  
**Location**: [dashboard.jsx line 123](Frontend/pages/dashboard.jsx#L123)

```javascript
refreshAll().catch(() => {});  // ← Errors silently ignored
const interval = setInterval(() => refreshAll().catch(() => {}), 10000);
```

**Problem**: 
- Network errors, 401 (unauthorized), or 500 (server errors) produce no feedback
- User doesn't know if data is stale or updated
- No retry logic

**Impact**: Dashboard can display outdated data indefinitely without indication.

**Recommendation**: Add error logging and display network status (red/yellow indicator).

---

#### Issue 4: Unvalidated Token Persistence
**Severity**: MEDIUM  
**Location**: [tokenStorage.js](Frontend/lib/tokenStorage.js)

**Problem**:
- Token stored indefinitely in localStorage
- No expiry validation
- Expired tokens continue to be sent until logout

**Impact**: 
- Backend returns 401 errors
- Dashboard silently fails to refresh
- User sees "Please log in" only on page reload

**Recommendation**: 
- Implement token expiry check before API calls
- Auto-logout on 401 errors

---

#### Issue 5: Role-Based Filtering with Incomplete Data
**Severity**: LOW  
**Location**: [dashboard.jsx line 54-66](Frontend/pages/dashboard.jsx#L54-L66)

```javascript
const filteredDevices = useMemo(() => {
  if (!auth.user) return devices;
  if (auth.user.role === "admin") return devices;
  return devices.filter((d) => d.userId === auth.user.id || !d.userId);
}, [devices, auth.user]);

const filteredLatest = useMemo(() => {
  if (!auth.user) return latest;
  if (auth.user.role === "admin") return latest;
  const deviceIds = new Set(filteredDevices.map((d) => d.device_uid));
  return (latest || []).filter((l) => deviceIds.has(l.device_id));
}, [latest, filteredDevices, auth.user]);
```

**Problem**: 
- If `auth.user` doesn't have `role` property, filtering silently returns all data
- Assumes `device_uid` and `device_id` are identical (inconsistent naming)

**Impact**: 
- Non-admin users might see other users' devices
- Map shows locations for devices not in the filtered list

**Recommendation**: 
- Add defensive checks: `auth.user?.role ?? 'user'`
- Standardize device ID fields

---

#### Issue 6: Real-time Updates Don't Sync with Batch Refreshes
**Severity**: LOW  
**Location**: [dashboard.jsx line 126-145](Frontend/pages/dashboard.jsx#L126-L145)

```javascript
socket.on("location:update", ({ location }) => {
  if (!location?.device_id) return;
  setLatest((prev) => {
    const list = Array.isArray(prev) ? [...prev] : [];
    const idx = list.findIndex((x) => x.device_id === location.device_id);
    if (idx >= 0) list[idx] = location;
    else list.unshift(location);
    return list;
  });
});
```

**Problem**:
- WebSocket updates `latest` but don't refresh `devices`, `stats`, `alerts`
- If a device comes online via socket, "Active Now" counter doesn't update
- Battery levels from socket won't trigger alert updates

**Impact**: Dashboard shows inconsistent data (map updated, stats stale).

**Recommendation**: 
- When socket receives location update, also call `getStats()` and `getAlerts()`
- Or include device status in location:update event

---

### ⚠️ POTENTIAL ISSUES

#### Issue 7: No CSRF Protection
- Axios doesn't include CSRF tokens
- If backend requires it, requests will fail

#### Issue 8: No Request Timeout Handling
- Axios timeout is 20 seconds, but no retry logic
- If network is slow, entire dashboard freezes during refresh

#### Issue 9: SVG/Map Library Dynamic Import
**Location**: [Overview.jsx line 4](), [LiveMap.jsx line 1]()

```javascript
const TrackerLeafletMap = dynamic(() => import("../TrackerLeafletMap"), { ssr: false });
```

- Client-side only rendering (good for performance)
- But delays initial paint if component is large

---

## 6. Page Structure Overview

### Routing Hierarchy
```
_app.js (AuthProvider wrapper)
  ↓
  pages/
    ├── index.js (Welcome/Home page)
    ├── welcome.js
    ├── register.js
    ├── login (via ClientSignIn.js, AdminSignIn.js)
    ├── ForgotPassword.js
    ├── dashboard.jsx ← MAIN DASHBOARD
    │   ├── SideMenu (navigation)
    │   ├── DashboardHeader (user info + logout)
    │   └── DashboardSections/
    │       ├── Overview.jsx
    │       ├── LiveMap.jsx
    │       ├── Devices.jsx
    │       ├── Alerts.jsx
    │       └── History.jsx
    └── api/ (API route handlers)
```

### Data Flow
```
AuthProvider (boot + token validation)
  ↓
UserAuth (login/register/logout logic)
  ↓
Dashboard (fetch initial data via refreshAll)
  ↓
Components (receive filteredDevices, filteredLatest, stats, alerts, onRefresh prop)
  ↓
WebSocket (real-time location updates)
  ↓
Auto-poll (refreshAll every 10s)
```

---

## API Endpoints Called

**Base URL**: Configured in [Frontend/lib/config.js](Frontend/lib/config.js)
- `API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"`
- `SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE`

### Endpoints Used by Dashboard

| Endpoint | Method | Called From | Frequency |
|----------|--------|-------------|-----------|
| `/api/auth/me` | GET | AuthProvider, AuthContext.refresh() | Once on boot |
| `/api/tracker/devices` | GET | refreshAll() | Every 10s |
| `/api/tracker/latest` | GET | refreshAll() | Every 10s |
| `/api/tracker/stats` | GET | refreshAll() | Every 10s |
| `/api/tracker/alerts` | GET | refreshAll() | Every 10s |
| `/api/tracker/history` | GET | History.load() | On-demand |
| `/api/admin/devices` | POST | Devices.handleAdminProvision() | On-demand |
| `/api/admin/devices/{id}` | DELETE | Devices.handleAdminDelete() | On-demand |
| `/api/user/devices/claim` | POST | Devices.handleUserClaim() | On-demand |
| `/api/user/devices/{id}/unclaim` | DELETE | Devices.handleUserUnclaim() | On-demand |

---

## Summary of Key Findings

| Item | Status | Details |
|------|--------|---------|
| **Data Loading** | ⚠️ Delayed | 10s delay before first refresh, empty initial state |
| **Refresh Mechanism** | ✅ Working | 10s polling + manual refresh button |
| **onRefresh Usage** | ✅ Consistent | Used in Devices (after CRUD ops), Overview (manual button) |
| **Token Storage** | ⚠️ Risky | No expiry validation, persistent across sessions |
| **Token Retrieval** | ✅ Correct | Fresh read from localStorage on each request |
| **Error Handling** | ❌ Poor | Silent failures, no user feedback |
| **Real-time Updates** | ⚠️ Partial | WebSocket only updates `latest`, not stats/alerts |
| **Role-Based Filtering** | ⚠️ Risk | Assumes `role` property exists |
| **Socket Connection** | ✅ Managed | Proper cleanup on unmount |
| **Page Structure** | ✅ Clear | Hierarchical, dashboard-centric |

---

## Recommendations (Priority Order)

### 🔴 HIGH PRIORITY
1. **Add pre-dashboard data loading** in AuthProvider to eliminate blank state
2. **Implement error logging** for refreshAll failures
3. **Auto-logout on 401** from backend
4. **Add network status indicator** (online/offline, last sync time)

### 🟡 MEDIUM PRIORITY
1. Fix device selection auto-select logic (add devices to useEffect dependencies)
2. Implement WebSocket sync for stats/alerts when location updates arrive
3. Add request retry logic for transient failures
4. Validate token expiry before making API calls

### 🟢 LOW PRIORITY
1. Standardize device ID field naming (`device_id` vs `device_uid`)
2. Add defensive null-checks for role-based filtering
3. Consider request debouncing to reduce server load
4. Measure and optimize first paint time (Leaflet loading)

