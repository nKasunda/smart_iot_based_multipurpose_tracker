import React, { useMemo, useState } from "react";
import axios from "axios";
import { FiTrash2, FiEdit2 } from "react-icons/fi";
import { API_BASE } from "../../lib/config";
import { getToken } from "../../lib/tokenStorage";
import { formatDateTime, useSettings } from "../../context/SettingsContext";
import { createSmartphoneTracker } from "../../lib/api";

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 2 * 60 * 1000;
}

export default function Devices({ user, devices, selectedDeviceId, setSelectedDeviceId, onRefresh, token }) {
  const { dateFormat, clockFormat } = useSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editFields, setEditFields] = useState({ device_uid: "", imei: "", ownerEmail: "" });

  // Admin provisioning
  const [adminDeviceId, setAdminDeviceId] = useState("");
  const [adminImei, setAdminImei] = useState("");

  // User claiming
  const [userImei, setUserImei] = useState("");
  const [userDeviceName, setUserDeviceName] = useState("");

  // Smartphone creation
  const [smartphoneName, setSmartphoneName] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [phoneUrls, setPhoneUrls] = useState([]);

  const API_URL = API_BASE;
  const isAdmin = user?.role === "admin";
  const bearer = token || getToken();
  const authConfig = bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {};
  const panelStyle = {
    borderRadius: 16,
    background: "var(--surface-strong)",
    boxShadow: "var(--shadow-panel)",
    overflow: "hidden",
  };
  const panelHeadStyle = {
    padding: 16,
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-muted)",
    fontWeight: 700,
    fontSize: 14,
    color: "var(--text)",
  };
  const inputStyle = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface-strong)",
    color: "var(--text)",
    fontSize: 13,
  };
  const smallInputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface-strong)",
    color: "var(--text)",
    fontSize: 12,
  };

  const sorted = useMemo(() => {
    const list = (devices || []).slice();
    if (!searchTerm.trim()) {
      return list.sort((a, b) => String(a.device_uid).localeCompare(String(b.device_uid)));
    }
    const q = searchTerm.trim().toLowerCase();
    return list
      .filter((item) =>
        String(item.device_uid || "").toLowerCase().includes(q) ||
        String(item.imei || "").toLowerCase().includes(q) ||
        String(item.name || "").toLowerCase().includes(q) ||
        String(item.user?.email || "").toLowerCase().includes(q) ||
        String(item.user?.name || "").toLowerCase().includes(q)
      )
      .sort((a, b) => String(a.device_uid).localeCompare(String(b.device_uid)));
  }, [devices, searchTerm]);

  // Admin provision device
  const handleAdminProvision = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!adminDeviceId.trim()) {
        setError("Device ID is required");
        setLoading(false);
        return;
      }
      if (!adminImei.trim()) {
        setError("IMEI is required");
        setLoading(false);
        return;
      }
      await axios.post(
        `${API_URL}/api/admin/devices`,
        {
          device_id: adminDeviceId.trim(),
          imei: adminImei.trim(),
        },
        authConfig
      );
      setSuccess("Device provisioned successfully!");
      setAdminDeviceId("");
      setAdminImei("");
      await onRefresh?.();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to provision device");
    } finally {
      setLoading(false);
    }
  };

  // Admin delete device
  const handleAdminDelete = async (deviceId) => {
    if (!window.confirm(`Are you sure you want to permanently delete device "${deviceId}"? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.delete(
        `${API_URL}/api/admin/devices/${deviceId}`,
        authConfig
      );
      setSuccess(`Device "${deviceId}" deleted successfully`);
      await onRefresh?.();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete device");
    } finally {
      setLoading(false);
    }
  };

  // User unclaim device
  const handleUserUnclaim = async (deviceId) => {
    if (!window.confirm(`Are you sure you want to unclaim device "${deviceId}"? It will be available for other users to claim.`)) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.delete(
        `${API_URL}/api/user/devices/${deviceId}/unclaim`,
        authConfig
      );
      setSuccess(`Device "${deviceId}" unclaimed successfully`);
      await onRefresh?.();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to unclaim device");
    } finally {
      setLoading(false);
    }
  };

  // User claim device
  const handleUserClaim = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!userImei.trim()) {
        setError("IMEI is required");
        setLoading(false);
        return;
      }
      if (!userDeviceName.trim()) {
        setError("Device name is required");
        setLoading(false);
        return;
      }
      await axios.post(
        `${API_URL}/api/user/devices/claim`,
        {
          imei: userImei.trim(),
          name: userDeviceName.trim(),
        },
        authConfig
      );
      setSuccess("Device claimed successfully!");
      setUserImei("");
      setUserDeviceName("");
      await onRefresh?.();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to claim device");
    } finally {
      setLoading(false);
    }
  };

  // Create smartphone tracker
  const handleCreateSmartphone = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!smartphoneName.trim()) {
        setError("Device name is required");
        setLoading(false);
        return;
      }
      const result = await createSmartphoneTracker({ name: smartphoneName.trim() });
      setSuccess("Smartphone tracker created successfully!");
      setTrackingUrl(result.trackingUrl);
      setPhoneUrls([...phoneUrls, { name: smartphoneName.trim(), url: result.trackingUrl, createdAt: new Date().toLocaleString() }]);
      setSmartphoneName("");
      await onRefresh?.();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create smartphone tracker");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async (url) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setSuccess("URL copied to clipboard!");
        setTimeout(() => setSuccess(""), 2000);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setSuccess("URL copied to clipboard!");
        setTimeout(() => setSuccess(""), 2000);
      }
    } catch (err) {
      setError("Failed to copy URL");
      setTimeout(() => setError(""), 2000);
    }
  };

  const handleDeletePhoneUrl = (index) => {
    setPhoneUrls(phoneUrls.filter((_, i) => i !== index));
  };

  const handleStartEdit = (device) => {
    setEditingDeviceId(device.device_uid);
    setEditFields({
      device_uid: device.device_uid || "",
      imei: device.imei || "",
      ownerEmail: device.user?.email || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingDeviceId(null);
    setEditFields({ device_uid: "", imei: "", ownerEmail: "" });
  };

  const handleSaveEdit = async (device) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        device_uid: editFields.device_uid.trim(),
        imei: editFields.imei.trim(),
        ownerEmail: editFields.ownerEmail.trim() || null,
      };
      await axios.patch(
        `${API_URL}/api/admin/devices/${device.device_uid}`,
        payload,
        authConfig
      );
      setSuccess(`Device ${device.device_uid} updated successfully`);
      handleCancelEdit();
      await onRefresh?.();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* ADMIN: Provision New Device Form */}
      {isAdmin && (
        <div
          style={panelStyle}
        >
          <div
            style={panelHeadStyle}
          >
            Provision New Device
          </div>
          <form
            onSubmit={handleAdminProvision}
            style={{
              padding: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 140px",
              gap: 12,
              alignItems: "center",
            }}
          >
            <input
              value={adminDeviceId}
              onChange={(e) => setAdminDeviceId(e.target.value)}
              placeholder="Device ID (e.g., A9G_001, ESP32_GPS)"
              style={{
                ...inputStyle,
              }}
              required
            />
            <input
              value={adminImei}
              onChange={(e) => setAdminImei(e.target.value)}
              placeholder="IMEI"
              style={{
                ...inputStyle,
              }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: loading ? "#6b7280" : "#2563eb",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 13,
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "Provisioning…" : "Provision"}
            </button>
          </form>
          {error ? (
            <div
              style={{
                padding: "0 16px 16px",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ❌ {error}
            </div>
          ) : null}
          {success ? (
            <div
              style={{
                padding: "0 16px 16px",
                color: "#16a34a",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ✓ {success}
            </div>
          ) : null}
        </div>
      )}

      {/* USER: Claim Device Form */}
      {!isAdmin && (
        <div
          style={panelStyle}
        >
          <div
            style={panelHeadStyle}
          >
            Claim Device
          </div>
          <form
            onSubmit={handleUserClaim}
            style={{
              padding: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 140px",
              gap: 12,
              alignItems: "center",
            }}
          >
            <input
              value={userImei}
              onChange={(e) => setUserImei(e.target.value)}
              placeholder="IMEI (from device provisioning)"
              style={{
                ...inputStyle,
              }}
              required
            />
            <input
              value={userDeviceName}
              onChange={(e) => setUserDeviceName(e.target.value)}
              placeholder="Custom Device Name"
              style={{
                ...inputStyle,
              }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: loading ? "#6b7280" : "#2563eb",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 13,
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "Claiming…" : "Claim"}
            </button>
          </form>
          {error ? (
            <div
              style={{
                padding: "0 16px 16px",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ❌ {error}
            </div>
          ) : null}
          {success ? (
            <div
              style={{
                padding: "0 16px 16px",
                color: "#16a34a",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ✓ {success}
            </div>
          ) : null}
        </div>
      )}

      {/* USER: Create Smartphone Tracker */}
      {!isAdmin && (
        <div
          style={panelStyle}
        >
          <div
            style={panelHeadStyle}
          >
            Add Smartphone Tracker
          </div>
          <form
            onSubmit={handleCreateSmartphone}
            style={{
              padding: 16,
              display: "grid",
              gridTemplateColumns: "1fr 140px",
              gap: 12,
              alignItems: "center",
            }}
          >
            <input
              value={smartphoneName}
              onChange={(e) => setSmartphoneName(e.target.value)}
              placeholder="Smartphone Name (e.g., John's iPhone)"
              style={{
                ...inputStyle,
              }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: loading ? "#6b7280" : "#059669",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 13,
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </form>
          {trackingUrl && (
            <div
              style={{
                padding: "0 16px 16px",
                background: "#f0fdf4",
                borderRadius: "0 0 16px 16px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#166534",
                  marginBottom: 8,
                }}
              >
                Tracking URL Created!
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#166534",
                  marginBottom: 8,
                  wordBreak: "break-all",
                }}
              >
                {trackingUrl}
              </div>
              <button
                onClick={() => handleCopyUrl(trackingUrl)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #16a34a",
                  background: "#ffffff",
                  color: "#16a34a",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Copy URL
              </button>
            </div>
          )}
          {error ? (
            <div
              style={{
                padding: "0 16px 16px",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ❌ {error}
            </div>
          ) : null}
          {success && !trackingUrl ? (
            <div
              style={{
                padding: "0 16px 16px",
                color: "#16a34a",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ✓ {success}
            </div>
          ) : null}
        </div>
      )}

      {/* DEVICE LIST */}
      <div
        style={{
          ...panelStyle,
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-muted)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
              {isAdmin ? `System Inventory` : `My Devices`}
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {`(${sorted.length} devices)`}
            </span>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by device ID, IMEI, name, owner..."
              style={{
                flex: 1,
                minWidth: 240,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
                color: "var(--text)",
                fontSize: 13,
              }}
            />
          </div>
        </div>
        <div
          style={{
            maxHeight: "calc(100vh - 300px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isAdmin
                ? "1.2fr 1.2fr 0.9fr 0.9fr 1.3fr 0.7fr 0.7fr 1.2fr 160px"
                : "1.3fr 1.2fr 0.8fr 0.8fr 1.2fr 1.2fr 120px",
              gap: 8,
              padding: "14px 16px",
              fontWeight: 700,
              color: "var(--text-soft)",
              fontSize: 11,
              background: "var(--surface-muted)",
              justifyItems: "center",
              textAlign: "center",
            }}
          >
            <span>{isAdmin ? "Device ID" : "Device Name"}</span>
            <span>IMEI</span>
            {isAdmin && (
              <>
                <span>Status</span>
                <span>Ownership</span>
                <span>Owner</span>
              </>
            )}
            <span>Battery</span>
            <span>Online</span>
            <span>Last Seen</span>
            {!isAdmin && <span>Phone URL</span>}
            <span>Action</span>
          </div>
          {sorted.map((d) => {
            const online = isOnline(d.lastSeen);
            const active = selectedDeviceId === d.device_uid;
            const isEditing = editingDeviceId === d.device_uid;
            return (
              <div
                key={d.device_uid}
                onClick={() => setSelectedDeviceId?.(d.device_uid)}
                style={{
                  display: "grid",
                  gridTemplateColumns: isAdmin
                    ? "1.2fr 1.2fr 0.9fr 0.9fr 1.3fr 0.7fr 0.7fr 1.2fr 100px"
                    : "1.3fr 1.2fr 0.8fr 0.8fr 1.2fr 1.2fr 100px",
                  gap: 8,
                  padding: "12px 16px",
                  borderTop: "1px solid var(--border)",
                  cursor: "pointer",
                  background: active ? "var(--primary-soft)" : "var(--surface-strong)",
                  color: "var(--text)",
                  alignItems: "center",
                  justifyItems: "center",
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                {isEditing ? (
                  <input
                    value={editFields.device_uid}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, device_uid: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      ...smallInputStyle,
                    }}
                  />
                ) : (
                  <strong style={{ color: "var(--text)" }}>
                    {isAdmin ? (d.device_uid || "null") : (d.name || d.device_uid || "null")}
                  </strong>
                )}

                {isEditing ? (
                  <input
                    value={editFields.imei}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, imei: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      ...smallInputStyle,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: "var(--text)",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={d.imei || ""}
                  >
                    {d.imei || "—"}
                  </span>
                )}
                
                {isAdmin && (
                  <>
                    {/* Status: Available or Not Available */}
                    <span
                      style={{
                        fontWeight: 700,
                        color: d.status === "available" ? "#16a34a" : "#dc2626",
                        fontSize: 11,
                      }}
                    >
                      {d.status === "available" ? "Available" : "Not Available"}
                    </span>

                    {/* Ownership: Claimed or Unclaimed */}
                    <span
                      style={{
                        fontWeight: 700,
                        color: d.user ? "#2563eb" : "#9ca3af",
                        fontSize: 11,
                      }}
                    >
                      {d.user ? "Claimed" : "Unclaimed"}
                    </span>

                    {/* Owner: User name/email or dash */}
                    <span style={{ color: "var(--muted)", fontSize: 10 }}>
                      {isEditing ? (
                        <input
                          value={editFields.ownerEmail}
                          onChange={(e) => setEditFields((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                          placeholder="owner email"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 10,
                            ...smallInputStyle,
                          }}
                        />
                      ) : d.user ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{d.user.name || "null"}</div>
                          <div style={{ color: "var(--muted)" }}>{d.user.email || "null"}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </span>
                  </>
                )}

                <span style={{ fontWeight: 700 }}>{d.battery ?? "—"}%</span>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: online ? "#16a34a" : "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={online ? "Online" : "Offline"}
                />
                <span style={{ color: "var(--muted)", fontSize: 10 }}>
                  {d.lastSeen ? formatDateTime(d.lastSeen, dateFormat, clockFormat) : "null"}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isAdmin ? (
                    isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(d)}
                          disabled={loading}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#16a34a",
                            color: "#ffffff",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            fontSize: 12,
                            transition: "all 0.2s ease",
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={loading}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            background: "var(--surface-strong)",
                            color: "var(--text)",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            fontSize: 12,
                            transition: "all 0.2s ease",
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(d)}
                          disabled={loading}
                          aria-label="Edit device"
                          style={{
                            width: 36,
                            height: 36,
                            padding: 0,
                            borderRadius: "10px",
                            border: "1px solid var(--border)",
                            background: "var(--surface-strong)",
                            color: "var(--text)",
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleAdminDelete(d.device_uid)}
                          disabled={loading}
                          style={{
                            padding: "8px",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            background: "var(--surface-strong)",
                            color: "var(--text)",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            fontSize: 12,
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: loading ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--surface-muted)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--surface-strong)";
                          }}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </>
                    )
                  ) : (
                    <button
                      onClick={() => handleUserUnclaim(d.device_uid)}
                      disabled={loading}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#f97316",
                        color: "#ffffff",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 700,
                        fontSize: "12px",
                        transition: "all 0.2s ease",
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      Unclaim
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 ? (
            <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>
              {isAdmin ? "No devices provisioned yet." : "No devices claimed yet."}
            </div>
          ) : null}
        </div>
      </div>

      {/* PHONE URLS SECTION */}
      {!isAdmin && phoneUrls.length > 0 && (
        <div
          style={{
            borderRadius: 16,
            background: "#ffffff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #e5e7eb",
              background: "#f9fafb",
              fontWeight: 700,
              fontSize: 14,
              color: "#020617",
            }}
          >
            My Smartphone Tracking URLs ({phoneUrls.length})
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 150px",
              gap: 8,
              padding: "14px 16px",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 700, color: "#475569" }}>Device Name</div>
            <div style={{ fontWeight: 700, color: "#475569" }}>Created</div>
            <div style={{ fontWeight: 700, color: "#475569", textAlign: "center" }}>Actions</div>
          </div>
          {phoneUrls.map((urlItem, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 150px",
                gap: 8,
                padding: "12px 16px",
                borderTop: "1px solid #e5e7eb",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 13, color: "#1f2937" }}>{urlItem.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{urlItem.createdAt}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                  onClick={() => handleCopyUrl(urlItem.url)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #3b82f6",
                    background: "#ffffff",
                    color: "#3b82f6",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={() => handleDeletePhoneUrl(idx)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #ef4444",
                    background: "#ffffff",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
