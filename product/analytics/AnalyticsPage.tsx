import React, { useEffect, useState } from "react";
import { analyticsEngine } from "./AnalyticsEngine";

export const AnalyticsPage = () => {
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalWorkflows: 0,
    totalPayments: 0
  });

  const [usage, setUsage] = useState({});
  const [events, setEvents] = useState([]);

  useEffect(() => {
    analyticsEngine.load().then(() => {
      setSummary(analyticsEngine.getSummary());
      setUsage(analyticsEngine.getUsage());
      setEvents(analyticsEngine.getEvents());
    });
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Analytics</h1>

      <div style={{ marginTop: 20 }}>
        <div>Total Users: {summary.totalUsers}</div>
        <div>Total Workflows: {summary.totalWorkflows}</div>
        <div>Total Payments: {summary.totalPayments}</div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Usage</h2>
        <pre>{JSON.stringify(usage, null, 2)}</pre>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Events</h2>
        {events.map((e, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <span>{e.type}</span>
            <span style={{ marginLeft: 10 }}>{e.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
