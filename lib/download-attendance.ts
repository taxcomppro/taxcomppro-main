"use client";

export async function downloadAttendance(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Attendance export failed. Please try again.");
  }
  const file = await response.blob();
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "pro-talk-attendance.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
