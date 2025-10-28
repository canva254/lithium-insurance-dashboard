'use client';

import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { useRole } from '@/hooks/useRole';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useResetUserPassword,
  type UserFilters,
} from '@/hooks/useUsers';
import { ACTION_PERMISSIONS, isRoleAllowed } from '@/lib/permissions';
import type { AdminUser, AdminUserRole } from '@/types/api';

const ROLE_OPTIONS: AdminUserRole[] = ['admin', 'agent', 'support'];
const STATUS_OPTIONS = ['all', 'active', 'inactive'] as const;

type UserFormState = {
  email: string;
  name: string;
  role: AdminUserRole;
  sendInvite: boolean;
  isActive: boolean;
};

export default function UsersPage() {
  const { role } = useRole();
  const canManage = isRoleAllowed(role, ACTION_PERMISSIONS.manageUsers);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserFilters['role']>('all');
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>('all');
  const [formState, setFormState] = useState<UserFormState>({
    email: '',
    name: '',
    role: 'support',
    sendInvite: true,
    isActive: true,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filters = useMemo<UserFilters>(
    () => ({
      search: search.trim() || undefined,
      role: roleFilter,
      status: statusFilter,
    }),
    [search, roleFilter, statusFilter],
  );

  const { data: users = [], isLoading, isError } = useUsers(filters);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateStatus = useUpdateUserStatus();
  const resetPassword = useResetUserPassword();

  const openCreateModal = () => {
    if (!canManage) return;
    setEditingUser(null);
    setFormState({ email: '', name: '', role: 'support', sendInvite: true, isActive: true });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    if (!canManage) return;
    setEditingUser(user);
    setFormState({
      email: user.email,
      name: user.name,
      role: user.role,
      sendInvite: true,
      isActive: user.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (createUser.isLoading || updateUser.isLoading) return;
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;
    setFormError(null);

    const trimmedName = formState.name.trim();
    const trimmedEmail = formState.email.trim().toLowerCase();

    if (!trimmedName) {
      setFormError('Name is required.');
      return;
    }

    if (!editingUser && !trimmedEmail) {
      setFormError('Email is required.');
      return;
    }

    try {
      if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          data: { name: trimmedName, role: formState.role },
        });
        setActionMessage('User updated successfully.');
      } else {
        await createUser.mutateAsync({
          email: trimmedEmail,
          name: trimmedName,
          role: formState.role,
          isActive: formState.isActive,
          sendInvite: formState.sendInvite,
        });
        setActionMessage('User created successfully.');
      }
      closeModal();
    } catch (error: any) {
      setFormError(error?.message ?? 'Unable to save user.');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (!canManage) return;
    try {
      await updateStatus.mutateAsync({ id: user.id, data: { isActive: !user.isActive } });
      setActionMessage(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully.`);
    } catch (error: any) {
      setActionMessage(error?.message ?? 'Unable to update user status.');
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    if (!canManage) return;
    try {
      const response = await resetPassword.mutateAsync({ id: user.id, data: { sendEmail: true } });
      const token = response.data.meta?.resetToken;
      setActionMessage(token ? `Password reset link generated (token: ${token}).` : 'Password reset email sent.');
    } catch (error: any) {
      setActionMessage(error?.message ?? 'Failed to initiate password reset.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admin users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage access levels for the insurance operations team.</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <button
            onClick={openCreateModal}
            disabled={!canManage}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Invite user
          </button>
          {!canManage && <span className="text-xs text-muted-foreground">You have read-only access.</span>}
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 md:col-span-2"
          />
          <select
            value={roleFilter ?? 'all'}
            onChange={(event) => setRoleFilter(event.target.value as UserFilters['role'])}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter ?? 'all'}
            onChange={(event) => setStatusFilter(event.target.value as UserFilters['status'])}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'All statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 text-right">
          <button
            onClick={() => {
              setSearch('');
              setRoleFilter('all');
              setStatusFilter('all');
            }}
            className="text-xs font-medium text-muted-foreground underline"
          >
            Reset filters
          </button>
        </div>
      </section>

      {actionMessage && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
          {actionMessage}
        </div>
      )}

      {isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive-foreground">
          Unable to load users. Please refresh.
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((user) => (
                <tr key={user.id} className="bg-background/80">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{user.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        user.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground hover:bg-muted"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={updateStatus.isLoading}
                          className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={resetPassword.isLoading}
                          className="rounded-md border border-border/60 px-3 py-1 font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset password
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">View only</span>
                    )}
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <EmptyState
                      title="No admin users yet"
                      description="Invite colleagues to collaborate and manage the insurance platform."
                      action={
                        canManage ? (
                          <button
                            onClick={openCreateModal}
                            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                          >
                            Invite user
                          </button>
                        ) : null
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <UserFormModal
          mode={editingUser ? 'edit' : 'create'}
          values={formState}
          onChange={(field, value) => setFormState((prev) => ({ ...prev, [field]: value }))}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isLoading={createUser.isLoading || updateUser.isLoading}
          error={formError}
          isEditing={Boolean(editingUser)}
        />
      )}
    </div>
  );
}

function UserFormModal({
  mode,
  values,
  onChange,
  onSubmit,
  onClose,
  isLoading,
  error,
  isEditing,
}: {
  mode: 'create' | 'edit';
  values: UserFormState;
  onChange: (field: keyof UserFormState, value: string | boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'edit' ? 'Edit user' : 'Invite new user'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            disabled={isLoading}
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          {!isEditing && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
              <input
                value={values.email}
                onChange={(event) => onChange('email', event.target.value)}
                type="email"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Full name</label>
            <input
              value={values.name}
              onChange={(event) => onChange('name', event.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</label>
            <select
              value={values.role}
              onChange={(event) => onChange('role', event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {!isEditing && (
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={values.sendInvite}
                onChange={(event) => onChange('sendInvite', event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Send invite email with password setup link
            </label>
          )}

          {mode === 'create' && (
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) => onChange('isActive', event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Active user
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
