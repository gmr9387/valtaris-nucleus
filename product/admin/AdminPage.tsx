import React, { useEffect, useState } from "react";
import { fetchAdminStats, fetchAdminUsers, updateAdminUser } from "./AdminAPI";

export const AdminPage = () => {
  const [stats, setStats] = useState({ users: 0, workflows: 0, payments: 0 });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchAdminStats().then(setStats);
    fetchAdminUsers().then(setUsers);
  }, []);

  const updateRole = async (id: string, role: string) => {
    await updateAdminUser(id, role);
    const updated = await fetchAdminUsers();
    setUsers(updated);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Admin Console</h1>

      <div style={{ marginTop: 20 }}>
        <div>Total Users: {stats.users}</div>
        <div>Total Workflows: {stats.workflows}</div>
        <div>Total Payments: {stats.payments}</div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Users</h2>
        {users.map((u) => (
          <div key={u.id} style={{ marginBottom: 10 }}>
            <span>{u.email}</span>
            <select
              value={u.role}
              onChange={(e) => updateRole(u.id, e.target.value)}
              style={{ marginLeft: 10 }}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};
