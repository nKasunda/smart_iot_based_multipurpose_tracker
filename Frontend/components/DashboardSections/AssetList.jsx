import React, { useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

const assets = [
  { id: "A001", name: "Car A", type: "Vehicle", trackerId: "T102", status: "online", lastLocation: "Blantyre", lastUpdate: "5 mins ago", owner: "Transport Dept" },
  { id: "A002", name: "Laptop 01", type: "Equipment", trackerId: "T205", status: "offline", lastLocation: "Lilongwe", lastUpdate: "1 hour ago", owner: "IT Department" },
  { id: "A003", name: "Delivery Van", type: "Vehicle", trackerId: "T310", status: "low battery", lastLocation: "Zomba", lastUpdate: "15 mins ago", owner: "Logistics" },
  { id: "A004", name: "Sensor Unit 5", type: "Sensor", trackerId: "T410", status: "online", lastLocation: "Kasungu", lastUpdate: "2 mins ago", owner: "Research Team" },
  { id: "A005", name: "Truck B", type: "Vehicle", trackerId: "T520", status: "online", lastLocation: "Mzuzu", lastUpdate: "8 mins ago", owner: "Transport Dept" },
  { id: "A006", name: "Generator 2", type: "Equipment", trackerId: "T612", status: "offline", lastLocation: "Salima", lastUpdate: "3 hours ago", owner: "Facilities" },
  { id: "A007", name: "Forklift 03", type: "Equipment", trackerId: "T705", status: "online", lastLocation: "Mchinji", lastUpdate: "12 mins ago", owner: "Warehouse" },
  { id: "A008", name: "Motorbike 12", type: "Vehicle", trackerId: "T808", status: "offline", lastLocation: "Mangochi", lastUpdate: "42 mins ago", owner: "Field Ops" },
  { id: "A009", name: "Cold Room Sensor", type: "Sensor", trackerId: "T901", status: "online", lastLocation: "Karonga", lastUpdate: "1 min ago", owner: "Quality Control" },
  { id: "A010", name: "Patrol Vehicle", type: "Vehicle", trackerId: "T100", status: "low battery", lastLocation: "Ntcheu", lastUpdate: "19 mins ago", owner: "Security" },
  { id: "A011", name: "Router Unit 4", type: "Equipment", trackerId: "T114", status: "online", lastLocation: "Balaka", lastUpdate: "6 mins ago", owner: "IT Department" },
  { id: "A012", name: "Trailer C", type: "Vehicle", trackerId: "T126", status: "offline", lastLocation: "Dedza", lastUpdate: "2 hours ago", owner: "Logistics" },
  { id: "A013", name: "Tank Sensor", type: "Sensor", trackerId: "T138", status: "online", lastLocation: "Nkhotakota", lastUpdate: "4 mins ago", owner: "Utilities" },
  { id: "A014", name: "Service Van", type: "Vehicle", trackerId: "T142", status: "online", lastLocation: "Rumphi", lastUpdate: "9 mins ago", owner: "Maintenance" },
  { id: "A015", name: "Desktop 07", type: "Equipment", trackerId: "T155", status: "low battery", lastLocation: "Thyolo", lastUpdate: "24 mins ago", owner: "Admin" },
  { id: "A016", name: "Weather Sensor", type: "Sensor", trackerId: "T168", status: "offline", lastLocation: "Mulanje", lastUpdate: "58 mins ago", owner: "Research Team" },
];

const PAGE_SIZE = 4;
const TYPE_PLACEHOLDER = "Filter by Type";
const STATUS_PLACEHOLDER = "Filter by Status";

function FilterSelect({ value, onChange, options }) {
  return (
    <div style={styles.selectWrap}>
      <select value={value} onChange={onChange} style={styles.select}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FiChevronDown size={16} color="#64748b" style={styles.selectIcon} />
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "online") {
    return (
      <span style={styles.statusRow}>
        <span style={{ ...styles.dot, backgroundColor: "#22c55e" }} />
        <span style={styles.statusText}>Online</span>
      </span>
    );
  }

  if (status === "offline") {
    return (
      <span style={styles.statusRow}>
        <span style={{ ...styles.dot, backgroundColor: "#ef4444" }} />
        <span style={styles.statusText}>Offline</span>
      </span>
    );
  }

  return (
    <span style={styles.lowBattery}>
      <span style={styles.batteryIcon} />
      <span style={styles.statusText}>Low Battery</span>
    </span>
  );
}

function PagerButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.pagerButton,
        ...(disabled ? styles.disabled : null),
      }}
    >
      {children}
    </button>
  );
}

export default function AssetList() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(TYPE_PLACEHOLDER);
  const [statusFilter, setStatusFilter] = useState(STATUS_PLACEHOLDER);
  const [page, setPage] = useState(1);

  const typeOptions = useMemo(
    () => [TYPE_PLACEHOLDER, ...new Set(assets.map((asset) => asset.type))],
    []
  );

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesSearch = asset.name.toLowerCase().includes(term);
      const matchesType =
        typeFilter === TYPE_PLACEHOLDER || asset.type === typeFilter;
      const matchesStatus =
        statusFilter === STATUS_PLACEHOLDER ||
        asset.status === statusFilter.toLowerCase();

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentItems = filteredAssets.slice(start, start + PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const showingFrom = filteredAssets.length ? start + 1 : 0;
  const showingTo = Math.min(start + currentItems.length, filteredAssets.length);

  return (
    <section style={styles.wrapper}>
      <div style={styles.headingRow}>
        <h2 style={styles.heading}>Asset List</h2>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.filters}>
          <label style={styles.searchBox}>
            <FiSearch size={16} color="#94a3b8" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search assets..."
              style={styles.searchInput}
            />
          </label>

          <FilterSelect
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
            options={typeOptions}
          />

          <FilterSelect
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            options={[STATUS_PLACEHOLDER, "Online", "Offline", "Low Battery"]}
          />
        </div>

        <button style={styles.addButton}>
          <FiPlus size={16} />
          <span>Add Asset</span>
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <colgroup>
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "15.5%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "11.5%" }} />
              <col style={{ width: "10.5%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.th}>Asset ID</th>
                <th style={styles.th}>Asset Name</th>
                <th style={styles.th}>Asset Type</th>
                <th style={styles.th}>Tracker ID</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Location</th>
                <th style={styles.th}>Last Update</th>
                <th style={styles.th}>Owner / Dept</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length ? (
                currentItems.map((asset, index) => (
                  <tr
                    key={asset.id}
                    style={{
                      ...styles.tr,
                      ...(index === currentItems.length - 1
                        ? styles.lastRow
                        : null),
                    }}
                  >
                    <td
                      style={{
                        ...styles.tdStrong,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      {asset.id}
                    </td>
                    <td
                      style={{
                        ...styles.tdName,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      {asset.name}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      {asset.type}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      {asset.trackerId}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      <StatusBadge status={asset.status} />
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      {asset.lastLocation}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      {asset.lastUpdate}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      {asset.owner}
                    </td>
                    <td
                      style={{
                        ...styles.actionCell,
                        ...(index === currentItems.length - 1
                          ? styles.lastRowCell
                          : null),
                      }}
                    >
                      <div style={styles.actions}>
                        <button style={styles.iconButton} aria-label="View asset">
                          <FiEye size={16} color="#1e293b" />
                        </button>
                        <button style={styles.iconButton} aria-label="Edit asset">
                          <FiEdit2 size={15} color="#1e293b" />
                        </button>
                        <button style={styles.iconButton} aria-label="Delete asset">
                          <FiTrash2 size={15} color="#1e293b" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={styles.empty}>
                    No assets match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <div style={styles.footerSectionLeft}>
            <PagerButton
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <FiChevronLeft size={16} />
              <span>Previous</span>
            </PagerButton>
            <PagerButton
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <FiChevronRight size={16} />
              <span>Next</span>
            </PagerButton>
          </div>

          <div style={styles.footerSectionCenter}>
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                ...styles.squareButton,
                ...(currentPage === 1 ? styles.disabled : null),
              }}
              aria-label="Previous page"
            >
              <FiChevronLeft size={15} />
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                style={{
                  ...styles.squareButton,
                  ...(pageNumber === currentPage ? styles.activeSquare : null),
                }}
              >
                {pageNumber}
              </button>
            ))}

            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                ...styles.squareButton,
                ...(currentPage === totalPages ? styles.disabled : null),
              }}
              aria-label="Next page"
            >
              <FiChevronRight size={15} />
            </button>

            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                ...styles.textButton,
                ...(currentPage === totalPages ? styles.disabled : null),
              }}
            >
              <span>Next</span>
              <FiChevronRight size={15} />
            </button>
          </div>

          <div style={styles.footerSectionRight}>
            <span style={styles.showing}>
              Showing {showingFrom}-{showingTo} of {filteredAssets.length}
            </span>
            <PagerButton
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <span>Next</span>
              <FiChevronRight size={16} />
            </PagerButton>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    color: "#475569",
    maxWidth: "100%",
  },
  headingRow: {
    borderBottom: "1px solid #e7edf5",
    paddingBottom: "10px",
  },
  heading: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 700,
    color: "#334155",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  filters: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    flex: "1 1 640px",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: "1 1 250px",
    minWidth: "220px",
    height: "38px",
    padding: "0 12px",
    border: "1px solid #d9e2ee",
    borderRadius: "5px",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
  },
  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: "13px",
    color: "#475569",
    background: "transparent",
  },
  selectWrap: {
    position: "relative",
    flex: "0 1 155px",
    minWidth: "145px",
  },
  select: {
    width: "100%",
    height: "38px",
    padding: "0 36px 0 12px",
    border: "1px solid #d9e2ee",
    borderRadius: "5px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    outline: "none",
    appearance: "none",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
  },
  selectIcon: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  addButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    height: "38px",
    padding: "0 16px",
    border: "1px solid #2f80ed",
    borderRadius: "5px",
    backgroundColor: "#2f80ed",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 3px 8px rgba(47, 128, 237, 0.18)",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #dde5ef",
    borderRadius: "6px",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.05)",
    overflow: "hidden",
    marginTop: "6px",
  },
  tableWrap: {
    overflowX: "auto",
    minHeight: "324px",
    backgroundColor: "#ffffff",
  },
  table: {
    width: "100%",
    minWidth: "980px",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  tableHeadRow: {
    backgroundColor: "#fbfcfe",
  },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#475569",
    borderBottom: "1px solid #e8edf3",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #edf2f7",
  },
  lastRow: {
    borderBottom: "none",
  },
  lastRowCell: {
    borderBottom: "none",
  },
  tdStrong: {
    padding: "13px 10px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  tdName: {
    padding: "13px 10px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  td: {
    padding: "13px 10px",
    fontSize: "13px",
    color: "#475569",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  actionCell: {
    padding: "13px 8px",
    textAlign: "center",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  statusRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  statusText: {
    fontSize: "13px",
    color: "#475569",
    fontWeight: 500,
  },
  dot: {
    width: "11px",
    height: "11px",
    borderRadius: "999px",
    display: "inline-block",
    flexShrink: 0,
  },
  lowBattery: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "2px 8px",
    borderRadius: "4px",
    border: "1px solid #f4d35e",
    backgroundColor: "#fff3cd",
    color: "#8a6a00",
  },
  batteryIcon: {
    width: "10px",
    height: "10px",
    borderRadius: "2px",
    backgroundColor: "#d4a514",
    display: "inline-block",
    flexShrink: 0,
  },
  actions: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    minWidth: "76px",
    flexWrap: "nowrap",
  },
  iconButton: {
    border: "none",
    background: "transparent",
    color: "#1e293b",
    padding: "2px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  },
  empty: {
    padding: "30px 14px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
  },
  footer: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    minHeight: "46px",
    backgroundColor: "#ffffff",
  },
  footerSectionLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    justifySelf: "start",
    flexWrap: "wrap",
  },
  footerSectionCenter: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    justifySelf: "center",
    flexWrap: "wrap",
  },
  footerSectionRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    justifySelf: "end",
    flexWrap: "wrap",
  },
  pagerButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: "30px",
    padding: "0 12px",
    border: "1px solid #d9e2ee",
    borderRadius: "5px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  squareButton: {
    width: "30px",
    height: "30px",
    border: "1px solid #d9e2ee",
    borderRadius: "5px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  activeSquare: {
    backgroundColor: "#2f80ed",
    color: "#ffffff",
    borderColor: "#2f80ed",
  },
  textButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    border: "none",
    background: "transparent",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    padding: "0 6px",
  },
  showing: {
    fontSize: "12px",
    color: "#64748b",
    whiteSpace: "nowrap",
  },
  disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};
