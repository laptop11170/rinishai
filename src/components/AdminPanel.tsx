"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Trash2, Loader2, RotateCcw, Gauge } from "lucide-react";

interface User {
  id: string;
  username: string;
  createdAt: number;
  role: string;
  quotaLimitTokens?: number;
  quotaWindowHours?: number;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const WINDOW_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 3, label: "3 hours" },
  { value: 5, label: "5 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 168, label: "7 days" },
];

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState("");
  const [editingQuota, setEditingQuota] = useState<string | null>(null);
  const [quotaLimit, setQuotaLimit] = useState("");
  const [quotaWindowHours, setQuotaWindowHours] = useState(5);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) loadUsers();
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch {
      setMessage("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });

      if (res.ok) {
        const data = await res.json();
        setUsers([...users, data.user]);
        setNewUsername("");
        setNewPassword("");
        setShowAddForm(false);
        setMessage("User added successfully");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to add user");
      }
    } catch {
      setMessage("Failed to add user");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (userId: string) => {
    if (!newPasswordForUser) return;

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, password: newPasswordForUser })
      });

      if (res.ok) {
        setEditingUser(null);
        setNewPasswordForUser("");
        setMessage("Password updated");
      } else {
        setMessage("Failed to update password");
      }
    } catch {
      setMessage("Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuota = async (userId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: userId,
          quotaLimitTokens: parseInt(quotaLimit) || 0,
          quotaWindowHours: quotaWindowHours,
        })
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, quotaLimitTokens: parseInt(quotaLimit) || 0, quotaWindowHours } : u));
        setEditingQuota(null);
        setMessage("Quota updated");
      } else {
        setMessage("Failed to update quota");
      }
    } catch {
      setMessage("Failed to update quota");
    } finally {
      setSaving(false);
    }
  };

  const handleResetUsage = async (userId: string) => {
    if (!confirm("Reset this user's usage? They will have full quota again.")) return;

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, resetUsage: true })
      });

      if (res.ok) {
        setMessage("Usage reset successfully");
      }
    } catch {
      setMessage("Failed to reset usage");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return;

    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId })
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        setMessage("User deleted");
      }
    } catch {
      setMessage("Failed to delete user");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg)] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">Admin Panel</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface)] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--surface)] text-[var(--text)] text-sm">
              {message}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">Loading...</div>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={handleAddUser} className="mb-6 p-4 bg-[var(--surface)] rounded-xl">
                  <h3 className="font-medium mb-3 text-[var(--text)]">Add New User</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving || !newUsername || !newPassword}
                        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Create User
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="p-4 bg-[var(--surface)] rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-[var(--text)]">{user.username}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {user.role === "admin" ? "Admin" : "User"} &bull; Created {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {user.role !== "admin" && (
                      <>
                        {/* Quota section */}
                        <div className="mb-3 p-3 rounded-lg border" style={{ borderColor: "var(--border-md)", background: "var(--bg)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Gauge className="w-4 h-4" style={{ color: "var(--primary)" }} />
                            <span className="text-sm font-medium text-[var(--text)]">Token Quota</span>
                          </div>

                          {editingQuota === user.id ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={quotaLimit}
                                  onChange={(e) => setQuotaLimit(e.target.value)}
                                  placeholder="Token limit (e.g. 1000000)"
                                  className="flex-1 px-2 py-1 text-sm bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)]"
                                />
                                <select
                                  value={quotaWindowHours}
                                  onChange={(e) => setQuotaWindowHours(parseInt(e.target.value))}
                                  className="px-2 py-1 text-sm bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)]"
                                >
                                  {WINDOW_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateQuota(user.id)}
                                  disabled={saving}
                                  className="px-3 py-1 bg-[var(--primary)] text-white text-sm rounded"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingQuota(null)}
                                  className="px-3 py-1 border border-[var(--border)] text-sm rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-[var(--text-secondary)]">
                                {user.quotaLimitTokens && user.quotaLimitTokens > 0
                                  ? `${user.quotaLimitTokens.toLocaleString()} tokens / ${user.quotaWindowHours || 5}h window`
                                  : "No quota set (unlimited)"}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingQuota(user.id);
                                    setQuotaLimit(String(user.quotaLimitTokens || ""));
                                    setQuotaWindowHours(user.quotaWindowHours || 5);
                                  }}
                                  className="px-2 py-1 border border-[var(--border)] text-xs rounded hover:bg-[var(--surface)]"
                                >
                                  Set Quota
                                </button>
                                {(user.quotaLimitTokens && user.quotaLimitTokens > 0) && (
                                  <button
                                    onClick={() => handleResetUsage(user.id)}
                                    className="px-2 py-1 border border-[var(--border)] text-xs rounded hover:bg-[var(--surface)] flex items-center gap-1"
                                    title="Reset usage"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Reset
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Password section */}
                        {editingUser === user.id ? (
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={newPasswordForUser}
                              onChange={(e) => setNewPasswordForUser(e.target.value)}
                              placeholder="New password"
                              className="flex-1 px-2 py-1 text-sm bg-[var(--bg)] border border-[var(--border)] rounded text-[var(--text)]"
                            />
                            <button
                              onClick={() => handleUpdatePassword(user.id)}
                              disabled={saving}
                              className="px-3 py-1 bg-[var(--primary)] text-white text-sm rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingUser(null); setNewPasswordForUser(""); }}
                              className="px-2 py-1 border border-[var(--border)] text-sm rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingUser(user.id)}
                            className="px-3 py-1 border border-[var(--border)] text-sm rounded hover:bg-[var(--bg)]"
                          >
                            Change Password
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
