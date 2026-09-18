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
  Clock,
  Sparkles,
  AlertCircle
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
      alert('Action Restricted: Only Super Admin can manage staff profiles.');
      return;
    }

    if (!employeeId.trim() || !fullName.trim() || !pin.trim()) {
      setFormError('Employee ID, Full Name, and PIN are required.');
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
        // Update Existing Staff
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
        // Create New Staff
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
            throw new Error('This Employee ID already exists. Choose another ID.');
          }
          throw error;
        }
      }

      setShowModal(false);
      resetForm();
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save staff details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId: string, name: string) => {
    if (!isAdmin) {
      alert('Action Restricted: Only Super Admin can delete staff profiles.');
      return;
    }

    if (staffId === currentUser?.id) {
      alert('Cannot delete your own active admin profile.');
      return;
    }

    if (!confirm(`Are you sure you want to delete profile for ${name}?`)) {
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
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'operations':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-[#e2eae6] text-center max-w-lg mx-auto mt-10 space-y-3">
        <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="font-serif font-bold text-lg text-[#0b3b2c]">Access Restricted</h2>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Employee & Security PIN configuration is exclusively available to <strong>Admin</strong> role accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 select-none font-sans">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9px] font-bold uppercase tracking-wider mb-1.5 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Access & Security Directory
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0b3b2c] tracking-tight leading-none">
            Staff & Duty PIN Profiles
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1">
            Create custom User IDs, assign roles and generate secure duty PINs for store staff.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-center"
        >
          <UserPlus className="w-3.5 h-3.5 text-[#e5c07b]" />
          <span>+ Create Staff Member</span>
        </button>
      </div>

      {/* 2. Staff Profiles Table */}
      <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#edf2ef] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0b3b2c]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0b3b2c]">
              Registered Staff Directory ({staffList.length})
            </h2>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">
            Direct Database Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9.5px] font-bold tracking-wider border-b border-[#edf2ef]">
              <tr>
                <th className="py-3 px-5">Employee ID</th>
                <th className="py-3 px-5">Staff Name & Contact</th>
                <th className="py-3 px-5">Assigned Role</th>
                <th className="py-3 px-5">Duty PIN</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Last Login</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 font-medium">
                    Loading staff directory...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 font-medium">
                    No staff members created yet. Click "+ Create Staff Member" above to add your first user.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-[#f4f7f5] transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-[#0c2b22]">
                      {staff.employee_id}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-[#0c2b22]">{staff.full_name}</div>
                      <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5" />
                        <span>{staff.phone || 'No phone added'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase border ${getRoleBadge(staff.role)}`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-[#0b3b2c] tracking-widest">
                      •••• ({staff.pin})
                    </td>
                    <td className="py-3.5 px-5">
                      {staff.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-neutral-500 text-[10.5px]">
                      {staff.last_login ? new Date(staff.last_login).toLocaleString() : 'Never logged in'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(staff)}
                          className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                          title="Edit Profile & PIN"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id, staff.full_name)}
                          className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                          title="Delete Profile"
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

      {/* 3. Create / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#dce6e1] space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#edf2ef] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0b3b2c]" />
                <h3 className="font-serif font-bold text-base text-[#0b3b2c]">
                  {editingStaff ? 'Edit Staff Profile' : 'Create Staff Profile & PIN'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-neutral-600 block mb-1">
                  Employee User ID (Unique)
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingStaff}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  placeholder="e.g. KF_SHIVA01"
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] uppercase tracking-wider outline-none focus:border-[#0b3b2c] focus:bg-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-600 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter employee name"
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-600 block mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9848012345"
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">
                    System Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AdminRole)}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c]"
                  >
                    <option value="operations">Operations (View Only)</option>
                    <option value="manager">Manager (Edit Only)</option>
                    <option value="admin">Admin (Full Control)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">
                    Duty PIN (4-8 Digits)
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="e.g. 7788"
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] font-mono outline-none focus:border-[#0b3b2c] focus:bg-white pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
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
                    className="rounded border-[#dce6e1] text-[#0b3b2c] focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-neutral-700">
                    Account Active (User can log in to OS)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf2ef]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving Profile...' : editingStaff ? 'Update Profile' : 'Create Staff Member'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}