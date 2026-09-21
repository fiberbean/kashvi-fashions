import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  Phone,
  Sparkles,
  AlertCircle,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminStaffUser, AdminRole } from '../types';

interface AdminStaffProps {
  currentUser: AdminStaffUser | null;
}

export default function AdminStaff({ currentUser }: AdminStaffProps) {
  const [staffList, setStaffList] = useState<AdminStaffUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<AdminStaffUser | null>(null);

  // Form Fields
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AdminRole>('operations');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Strictly Admin Only Check
  const isAdmin = currentUser?.role === 'admin';

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_staff')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setStaffList(data as AdminStaffUser[]);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const resetForm = () => {
    setEmployeeId('');
    setFullName('');
    setPhone('');
    setRole('operations');
    setPin('');
    setShowPin(false);
    setIsActive(true);
    setFormError('');
    setEditingStaff(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (staff: AdminStaffUser) => {
    setEditingStaff(staff);
    setEmployeeId(staff.employee_id);
    setFullName(staff.full_name);
    setPhone(staff.phone || '');
    setRole(staff.role);
    setPin(staff.pin);
    setIsActive(staff.is_active);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Action Restricted: Only Super Admin can manage user profiles.');
      return;
    }

    if (!employeeId.trim() || !fullName.trim() || !pin.trim()) {
      setFormError('User ID, Full Name, and PIN are required.');
      return;
    }

    if (pin.trim().length < 4) {
      setFormError('Security PIN must be at least 4 digits.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (editingStaff) {
        // Update Existing User
        const { error } = await supabase
          .from('admin_staff')
          .update({
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            role,
            pin: pin.trim(),
            is_active: isActive
          })
          .eq('id', editingStaff.id);

        if (error) throw error;
      } else {
        // Create New User
        const { error } = await supabase
          .from('admin_staff')
          .insert({
            employee_id: employeeId.trim().toUpperCase(),
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            role,
            pin: pin.trim(),
            is_active: isActive
          });

        if (error) {
          if (error.code === '23505') {
            throw new Error('This User ID already exists. Please choose another ID.');
          }
          throw error;
        }
      }

      setShowModal(false);
      resetForm();
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save user details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId: string, name: string) => {
    if (!isAdmin) {
      alert('Action Restricted: Only Super Admin can delete user profiles.');
      return;
    }

    if (staffId === currentUser?.id) {
      alert('Cannot delete your own active admin profile.');
      return;
    }

    if (!confirm('Are you sure you want to delete profile for ' + name + '?')) {
      return;
    }

    try {
      const { error } = await supabase.from('admin_staff').delete().eq('id', staffId);
      if (!error) {
        setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getRoleBadge = (r: AdminRole) => {
    switch (r) {
      case 'admin':
        return 'bg-[#6d4aff]/20 text-[#00d9ff] border-[#6d4aff]/40 shadow-[0_0_10px_rgba(109,74,255,0.3)]';
      case 'manager':
        return 'bg-[#00d9ff]/15 text-[#00d9ff] border-[#00d9ff]/30';
      case 'operations':
        return 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/30';
      default:
        return 'bg-white/10 text-white border-white/20';
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-10 border border-white/10 text-center max-w-lg mx-auto mt-16 shadow-[0_20px_60px_rgba(0,0,0,0.8)] space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#ffa500]/10 border border-[#ffa500]/30 flex items-center justify-center mx-auto text-[#ffa500]">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="font-bold text-lg text-white tracking-wide">Access Restricted</h2>
        <p className="text-xs text-[#8b9bb4] leading-relaxed">
          System users and PIN configuration is exclusively available to <strong>Super Admin</strong> role accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 select-none font-sans max-w-[1680px] mx-auto px-2 sm:px-4">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6d4aff]/15 text-[#00d9ff] text-[9.5px] font-mono font-bold uppercase tracking-wider mb-2 border border-[#6d4aff]/30">
            <Sparkles className="w-3 h-3 text-[#00d9ff]" /> Access & Security Directory
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            System Users & Duty PINs
          </h1>
          <p className="text-xs text-[#8b9bb4] mt-1">
            Manage administrative accounts, assign operational roles, and set duty PINs for store staff.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white text-xs font-bold transition-all shadow-lg shadow-[#6d4aff]/30 flex items-center gap-2 cursor-pointer active:scale-95 self-start sm:self-center"
        >
          <UserPlus className="w-4 h-4 text-[#00ff9d]" />
          <span>+ Create New User</span>
        </button>
      </div>

      {/* 2. Staff Profiles Table */}
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.15)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6d4aff]/20 border border-[#6d4aff]/30 flex items-center justify-center text-[#00d9ff]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Registered Users Directory
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Total {staffList.length} Active System Accounts
              </span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-[#00ff9d] bg-[#00ff9d]/10 px-2.5 py-1 rounded-full border border-[#00ff9d]/20 font-semibold">
            Direct Cloud Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#0a0e17]/80 text-[#8b9bb4] uppercase text-[9.5px] font-mono font-bold tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3.5 px-5">User ID</th>
                <th className="py-3.5 px-5">User Name & Contact</th>
                <th className="py-3.5 px-5">Assigned Role</th>
                <th className="py-3.5 px-5">Duty PIN</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Last Login</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8b9bb4]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00d9ff] mb-2" />
                    <span>Loading users directory...</span>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8b9bb4] italic">
                    No users created yet. Click "+ Create New User" above to add your first user.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-[#00ff9d]">
                      {staff.employee_id}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-white text-xs">{staff.full_name}</div>
                      <div className="text-[10px] text-[#8b9bb4] flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="w-3 h-3 text-[#00d9ff]" />
                        <span>{staff.phone || 'No phone added'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-extrabold uppercase border ${getRoleBadge(staff.role)}`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono font-bold text-white tracking-widest text-xs">
                      •••• <span className="text-[#8b9bb4] font-normal font-sans">({staff.pin})</span>
                    </td>
                    <td className="py-4 px-5">
                      {staff.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[9.5px] font-mono font-bold text-[#00ff9d] bg-[#00ff9d]/10 px-2.5 py-1 rounded-full border border-[#00ff9d]/30">
                          <CheckCircle2 className="w-3 h-3 text-[#00ff9d]" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[9.5px] font-mono font-bold text-[#ff6b6b] bg-[#ff6b6b]/10 px-2.5 py-1 rounded-full border border-[#ff6b6b]/30">
                          <XCircle className="w-3 h-3 text-[#ff6b6b]" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-[#8b9bb4] font-mono text-[10px]">
                      {staff.last_login ? new Date(staff.last_login).toLocaleString() : 'Never logged in'}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(staff)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] transition-all cursor-pointer"
                          title="Edit User & PIN"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id, staff.full_name)}
                          className="p-2 rounded-xl bg-[#ff6b6b]/10 hover:bg-[#ff6b6b]/20 text-[#ff6b6b] transition-all cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Create / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e17]/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-6 max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 space-y-4 text-xs relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#00ff9d] rounded-t-3xl" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-md shadow-[#6d4aff]/30">
                  <KeyRound className="w-4 h-4 text-[#00d9ff]" />
                </div>
                <h3 className="font-extrabold text-sm text-white tracking-wide">
                  {editingStaff ? 'Edit User Profile' : 'Create User & PIN Profile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 flex items-center gap-2 text-[#ff6b6b] text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  User ID (Unique) *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingStaff}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  placeholder="e.g. KF_SHIVA01"
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-[#0a0e17] text-xs font-mono font-bold text-[#00ff9d] uppercase tracking-wider outline-none focus:border-[#00d9ff] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter employee or user name"
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-[#0a0e17] text-xs font-semibold text-white outline-none focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9848012345"
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-[#0a0e17] text-xs font-semibold text-white outline-none focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/40 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                    System Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AdminRole)}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#0a0e17] text-xs font-semibold text-white outline-none focus:border-[#00d9ff] cursor-pointer [&>option]:bg-[#101628]"
                  >
                    <option value="operations">Operations: Create & View Only</option>
                    <option value="manager">Manager: Create, Edit & View</option>
                    <option value="admin">Admin: Full Access</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                    Duty PIN (4-8 Digits) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="e.g. 7788"
                      className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-[#0a0e17] text-xs font-semibold text-white font-mono outline-none focus:border-[#00d9ff] pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b9bb4] hover:text-white cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-white/20 bg-[#0a0e17] text-[#00d9ff] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#8b9bb4]">
                    Account Active (Allow Login to Command OS)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8b9bb4] hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white text-xs font-bold shadow-lg shadow-[#6d4aff]/30 cursor-pointer disabled:opacity-60 flex items-center gap-2 transition-all active:scale-95"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d9ff]" />}
                  <span>{submitting ? 'Saving...' : editingStaff ? 'Update User' : 'Save User Profile'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}