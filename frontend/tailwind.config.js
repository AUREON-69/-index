// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 37signals inspired palette
        primary: "#2563eb",
        secondary: "#64748b",
        success: "#10b981",
        danger: "#ef4444",
      },
      fontSize: {
        // Bigger base size
        base: "1.125rem", // 18px instead of 16px
      },
      spacing: {
        // More generous spacing
        18: "4.5rem",
        88: "22rem",
      },
    },
  },
};
