import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, X, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

// Format relative time
const getRelativeTime = (timestamp) => {
  const now = new Date();
  const diffMs = now - new Date(timestamp);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Get icon and colors based on alert severity
const getAlertConfig = (severity) => {
  switch (severity) {
    case "critical":
      return {
        icon: AlertTriangle,
        bgColor: "bg-red-50 border-red-200 hover:bg-red-100",
        textColor: "text-red-800",
        accentColor: "text-red-600",
        borderColor: "border-l-red-500"
      };
    case "warning":
      return {
        icon: AlertTriangle,
        bgColor: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
        textColor: "text-yellow-800",
        accentColor: "text-yellow-600",
        borderColor: "border-l-yellow-500"
      };
    case "info":
      return {
        icon: Info,
        bgColor: "bg-blue-50 border-blue-200 hover:bg-blue-100",
        textColor: "text-blue-800",
        accentColor: "text-blue-600",
        borderColor: "border-l-blue-500"
      };
    default:
      return {
        icon: Info,
        bgColor: "bg-gray-50 border-gray-200 hover:bg-gray-100",
        textColor: "text-gray-800",
        accentColor: "text-gray-600",
        borderColor: "border-l-gray-500"
      };
  }
};

export default function AlertItem({ alert, onDismiss, onMarkRead, onMarkResolved }) {
  const [expanded, setExpanded] = useState(false);
  const config = getAlertConfig(alert.severity);
  const IconComponent = config.icon;

  const handleDismiss = (e) => {
    e.stopPropagation();
    onDismiss(alert.id);
  };

  const handleMarkRead = () => {
    if (!alert.isRead) {
      onMarkRead(alert.id);
    }
  };

  const handleMarkResolved = (e) => {
    e.stopPropagation();
    if (onMarkResolved && !alert.isResolved) {
      onMarkResolved(alert.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      onClick={handleMarkRead}
      className={`
        ${config.bgColor} ${config.borderColor}
        p-4 mb-3 rounded-lg border-l-4 cursor-pointer
        transition-all duration-200 ease-in-out
        ${alert.isRead ? 'opacity-75' : 'shadow-md hover:shadow-lg'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <IconComponent className={`w-5 h-5 ${config.accentColor}`} />
          <span className={`font-semibold capitalize ${config.textColor}`}>
            {alert.severity}
          </span>
          {!alert.isRead && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
          {alert.isResolved && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Resolved
            </span>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="
            p-1 rounded-full hover:bg-gray-200 transition-colors duration-150
            text-gray-500 hover:text-gray-700
          "
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Asset ID and time */}
      <div className="flex justify-between items-center mb-2 text-sm">
        <span className="font-medium text-gray-700">{alert.tracker_id}</span>
        <span className="text-gray-500">{getRelativeTime(alert.timestamp)}</span>
      </div>

      {/* Message */}
      <p className="text-gray-800 mb-3 leading-relaxed">{alert.message}</p>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={`
            flex items-center gap-1 text-sm font-medium ${config.accentColor}
            hover:underline transition-all duration-150
          `}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              View details
            </>
          )}
        </button>

        {!alert.isResolved && onMarkResolved && (
          <button
            onClick={handleMarkResolved}
            className="
              text-sm font-medium text-green-600 hover:text-green-700
              hover:underline transition-all duration-150
            "
          >
            Mark as Resolved
          </button>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 p-3 bg-white/50 rounded-md border border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Time:</span>
                <span className="ml-2 text-gray-800">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Device:</span>
                <span className="ml-2 text-gray-800">{alert.tracker_id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Severity:</span>
                <span className="ml-2 text-gray-800 capitalize">{alert.severity}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <span className="ml-2 text-gray-800">
                  {alert.isRead ? "Read" : "New"} | {alert.isResolved ? "Resolved" : "Active"}
                </span>
              </div>
              {alert.resolvedAt && (
                <div className="col-span-2">
                  <span className="font-medium text-gray-600">Resolved At:</span>
                  <span className="ml-2 text-gray-800">
                    {new Date(alert.resolvedAt).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Alert ID:</span>
                <span className="ml-2 text-gray-800 font-mono text-xs">{alert.id}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
