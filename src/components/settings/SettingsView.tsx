import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SchoolSettings, BankAccount, ClassFeeRate, UserRole, AppUser } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Building2,
  CreditCard,
  ShieldCheck,
  Layers,
  Calendar,
  Users,
  Lock,
  UserPlus,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetToDefaultData,
    currentUser,
    isAdmin,
    users,
    updateUserRole,
    addUserAccount,
    addNotification,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profil' | 'periode' | 'kelas' | 'bank' | 'pengguna'>('profil');
  const [formData, setFormData] = useState<SchoolSettings>({ ...settings });

  // New Class Modal / Input State
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('7');
  const [newClassFee, setNewClassFee] = useState(650000);
  const [showAddClass, setShowAddClass] = useState(false);

  // New User State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('bendahara');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Bank account handlers
  const handleBankChange = (index: number, field: keyof BankAccount, value: string) => {
    if (!isAdmin) return;
    const updated = [...formData.bankAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, bankAccounts: updated });
  };

  const handleAddBank = () => {
    if (!isAdmin) return;
    const newBank: BankAccount = {
      id: 'bank-' + Date.now(),
      bankName: 'Bank Syariah Indonesia (BSI)',
      accountNumber: '7123456789',
      accountHolder: 'Yayasan Bina Santri Indonesia',
    };
    setFormData({
      ...formData,
      bankAccounts: [...formData.bankAccounts, newBank],
    });
  };

  const handleRemoveBank = (index: number) => {
    if (!isAdmin) return;
    const updated = formData.bankAccounts.filter((_, i) => i !== index);
    setFormData({ ...formData, bankAccounts: updated });
  };

  // Class fee handlers
  const handleClassFeeChange = (index: number, nominal: number) => {
    if (!isAdmin) return;
    const updated = [...(formData.classFeeRates || [])];
    updated[index] = { ...updated[index], defaultNominal: nominal };
    setFormData({ ...formData, classFeeRates: updated });
  };

  const handleCreateNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newClassName.trim()) return;

    const newRate: ClassFeeRate = {
      classGrade: newClassName.trim().toUpperCase(),
      gradeLevel: newClassLevel,
      defaultNominal: newClassFee,
    };

    setFormData({
      ...formData,
      classFeeRates: [...formData.classFeeRates, newRate],
    });

    setNewClassName('');
    setShowAddClass(false);
    addNotification('success', 'Kelas Ditambahkan', `Kelas ${newRate.classGrade} berhasil ditambahkan ke daftar tarif.`);
  };

  const handleRemoveClass = (index: number) => {
    if (!isAdmin) return;
    const updated = formData.classFeeRates.filter((_, i) => i !== index);
    setFormData({ ...formData, classFeeRates: updated });
  };

  // User management handlers
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newUserName || !newUserEmail) return;

    await addUserAccount({
      uid: 'user-' + Date.now(),
      email: newUserEmail,
      name: newUserName,
      role: newUserRole,
      phone: newUserPhone || undefined,
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setShowAddUser(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      addNotification('error', 'Akses Ditolak', 'Hanya Administrator yang memiliki wewenang mengubah konfigurasi sistem.');
      return;
    }
    updateSettings(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & RBAC Notice */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Pengaturan Sistem & Profil Lembaga
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Konfigurasi profil sekolah, tahun ajaran, tarif SPP per kelas, rekening bank, dan hak akses pengguna
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mode Admin: Hak Penuh</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Mode Bendahara: Hanya Lihat (Read-Only)</span>
            </span>
          )}
        </div>
      </div>

      {/* Warning banner if logged in as Bendahara */}
      {!isAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Pemberitahuan Hak Akses (Role-Based Access Control)</span>
            <span>
              Anda saat ini masuk sebagai <strong>{currentUser?.name} (Bendahara)</strong>. Sesuai kebijakan keamanan,
              Bendahara berfokus pada operasional kasir dan laporan, sedangkan modifikasi pengaturan lembaga dan manajemen pengguna
              hanya dapat dilakukan oleh <strong>Administrator</strong>. Anda dapat beralih ke akun Admin melalui menu Quick Switch.
            </span>
          </div>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('profil')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'profil'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Profil Lembaga</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('periode')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'periode'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Tahun Ajaran & Jatuh Tempo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kelas')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'kelas'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Daftar Kelas & Tarif SPP</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'bank'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Rekening Bank & QRIS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pengguna')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'pengguna'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen Akun & Hak Akses</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* TAB 1: PROFIL LEMBAGA */}
        {activeTab === 'profil' && (
          <div className="bg-white p-5 rounded-lg border border-neutral-200 space-y-4 shadow-2xs">
            <div className="border-b border-neutral-100 pb-2">
              <h3 className="text-sm font-bold text-neutral-900">Identitas Sekolah / Pesantren</h3>
              <p className="text-[11px] text-neutral-500">
                Informasi ini akan dicetak pada kop surat kuitansi dan laporan resmi
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Nama Resmi Sekolah / Pesantren <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Jenis Lembaga Pendidikan
                </label>
                <select
                  disabled={!isAdmin}
                  value={formData.institutionType}
                  onChange={(e) => setFormData({ ...formData, institutionType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white disabled:bg-neutral-100 disabled:text-neutral-500"
                >
                  <option value="pesantren">Pondok Pesantren / Islamic Boarding School</option>
                  <option value="terpadu">Sekolah Islam Terpadu (SIT / MTs / MA)</option>
                  <option value="sekolah">Sekolah Formal (SD / SMP / SMA / SMK)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutral-700 mb-1">
                  Motto / Semboyan Lembaga
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutral-700 mb-1">
                  Alamat Lengkap Lembaga
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Nomor Telepon Kantor TU
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Email Resmi Lembaga
                </label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Nama Kepala Sekolah / Mudir Ma'had
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.headmasterName}
                  onChange={(e) => setFormData({ ...formData, headmasterName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Nama Bendahara Utama Lembaga
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.treasurerName}
                  onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERIODE TAHUN AJARAN */}
        {activeTab === 'periode' && (
          <div className="bg-white p-5 rounded-lg border border-neutral-200 space-y-4 shadow-2xs">
            <div className="border-b border-neutral-100 pb-2">
              <h3 className="text-sm font-bold text-neutral-900">Periode Akademik & Penagihan</h3>
              <p className="text-[11px] text-neutral-500">
                Atur kalender penagihan SPP bulanan sekolah
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Tahun Ajaran Aktif
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  placeholder="2026/2027"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono disabled:bg-neutral-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Bulan Penagihan Berjalan
                </label>
                <select
                  disabled={!isAdmin}
                  value={formData.activeMonth}
                  onChange={(e) => setFormData({ ...formData, activeMonth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white disabled:bg-neutral-100"
                >
                  <option value={7}>Juli</option>
                  <option value={8}>Agustus</option>
                  <option value={9}>September</option>
                  <option value={10}>Oktober</option>
                  <option value={11}>November</option>
                  <option value={12}>Desember</option>
                  <option value={1}>Januari</option>
                  <option value={2}>Februari</option>
                  <option value={3}>Maret</option>
                  <option value={4}>April</option>
                  <option value={5}>Mei</option>
                  <option value={6}>Juni</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Tanggal Jatuh Tempo Bulanan
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-neutral-400">Tgl</span>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    disabled={!isAdmin}
                    value={formData.defaultDueDateDay}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultDueDateDay: parseInt(e.target.value) || 10 })
                    }
                    className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md font-mono disabled:bg-neutral-100"
                  />
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Contoh: tanggal 10 setiap bulan
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DAFTAR KELAS & TARIF */}
        {activeTab === 'kelas' && (
          <div className="bg-white p-5 rounded-lg border border-neutral-200 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Daftar Kelas & Nominal Standar SPP</h3>
                <p className="text-[11px] text-neutral-500">
                  Besaran SPP default saat menambah siswa atau menerbitkan tagihan per rombel
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddClass(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Kelas</span>
                </button>
              )}
            </div>

            {/* Add Class Mini Modal / Inline Box */}
            {showAddClass && (
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-300 space-y-3">
                <div className="font-bold text-neutral-900">Tambah Kelas & Tarif Baru</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Nama Kelas</label>
                    <input
                      type="text"
                      placeholder="Contoh: IX-C, XII-IPA"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Tingkat</label>
                    <select
                      value={newClassLevel}
                      onChange={(e) => setNewClassLevel(e.target.value)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded bg-white"
                    >
                      <option value="7">Tingkat 7 (SMP/MTs)</option>
                      <option value="8">Tingkat 8 (SMP/MTs)</option>
                      <option value="9">Tingkat 9 (SMP/MTs)</option>
                      <option value="10">Tingkat 10 (SMA/MA)</option>
                      <option value="11">Tingkat 11 (SMA/MA)</option>
                      <option value="12">Tingkat 12 (SMA/MA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Tarif Standar (Rp)</label>
                    <input
                      type="number"
                      value={newClassFee}
                      onChange={(e) => setNewClassFee(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddClass(false)}
                    className="px-3 py-1 border border-neutral-300 rounded bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewClass}
                    className="px-3 py-1 bg-emerald-700 text-white rounded font-bold"
                  >
                    Simpan Kelas
                  </button>
                </div>
              </div>
            )}

            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Nama Kelas</th>
                    <th className="py-2.5 px-3">Jenjang Tingkat</th>
                    <th className="py-2.5 px-3">Nominal Standar SPP Bulanan</th>
                    {isAdmin && <th className="py-2.5 px-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 font-mono text-[11px]">
                  {formData.classFeeRates.map((rate, index) => (
                    <tr key={index} className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-3 font-sans font-bold text-neutral-900">
                        Kelas {rate.classGrade}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-neutral-600">
                        Tingkat {rate.gradeLevel}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <span className="text-neutral-400">Rp</span>
                          <input
                            type="number"
                            disabled={!isAdmin}
                            value={rate.defaultNominal}
                            onChange={(e) =>
                              handleClassFeeChange(index, parseInt(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border border-neutral-300 rounded font-mono font-bold text-neutral-900 disabled:bg-neutral-100"
                          />
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-center font-sans">
                          <button
                            type="button"
                            onClick={() => handleRemoveClass(index)}
                            className="p-1 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: REKENING BANK & QRIS */}
        {activeTab === 'bank' && (
          <div className="bg-white p-5 rounded-lg border border-neutral-200 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Rekening Penerimaan Lembaga</h3>
                <p className="text-[11px] text-neutral-500">
                  Daftar rekening bank untuk pembayaran transfer santri dan notifikasi WhatsApp
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleAddBank}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Rekening</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {formData.bankAccounts.map((bank, index) => (
                <div
                  key={bank.id || index}
                  className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-0.5">Nama Bank</label>
                      <input
                        type="text"
                        disabled={!isAdmin}
                        value={bank.bankName}
                        onChange={(e) => handleBankChange(index, 'bankName', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-xs font-semibold disabled:bg-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-0.5">Nomor Rekening</label>
                      <input
                        type="text"
                        disabled={!isAdmin}
                        value={bank.accountNumber}
                        onChange={(e) => handleBankChange(index, 'accountNumber', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-xs font-mono font-bold disabled:bg-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-0.5">Atas Nama Pemilik</label>
                      <input
                        type="text"
                        disabled={!isAdmin}
                        value={bank.accountHolder}
                        onChange={(e) => handleBankChange(index, 'accountHolder', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-xs disabled:bg-neutral-100"
                      />
                    </div>
                  </div>

                  {isAdmin && formData.bankAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(index)}
                      className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors self-end sm:self-center"
                      title="Hapus Rekening"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MANAJEMEN AKUN & HAK AKSES (RBAC) */}
        {activeTab === 'pengguna' && (
          <div className="bg-white p-5 rounded-lg border border-neutral-200 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Manajemen Pengguna & Hak Akses (RBAC)</h3>
                <p className="text-[11px] text-neutral-500">
                  Kelola staf dengan peran Administrator (hak penuh) dan Bendahara (operasional kasir & laporan)
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah Staf</span>
                </button>
              )}
            </div>

            {/* Add User Box */}
            {showAddUser && (
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-300 space-y-3">
                <div className="font-bold text-neutral-900">Pendaftaran Akun Staf Baru</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Nama Staf</label>
                    <input
                      type="text"
                      placeholder="Nama lengkap staf..."
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Email Staf</label>
                    <input
                      type="email"
                      placeholder="staf@pesantren.sch.id"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Nomor Telepon / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="0812..."
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Peran Hak Akses</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded bg-white"
                    >
                      <option value="bendahara">Bendahara (Operasional Kasir & Laporan)</option>
                      <option value="admin">Administrator (Hak Penuh Pengaturan)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-3 py-1 border border-neutral-300 rounded bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleAddStaffSubmit}
                    className="px-3 py-1 bg-emerald-700 text-white rounded font-bold"
                  >
                    Simpan Akun
                  </button>
                </div>
              </div>
            )}

            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Nama Staf</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">No. WhatsApp</th>
                    <th className="py-2.5 px-4 text-center">Peran (Role)</th>
                    {isAdmin && <th className="py-2.5 px-4 text-center">Ubah Hak Akses</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 font-mono text-[11px]">
                  {users.map((u) => {
                    const isSelf = currentUser?.uid === u.uid;
                    return (
                      <tr key={u.uid} className="hover:bg-neutral-50/60">
                        <td className="py-2.5 px-4 font-sans font-bold text-neutral-900">
                          {u.name} {isSelf && <span className="text-[10px] text-emerald-700 font-normal">(Anda)</span>}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-neutral-600">{u.email}</td>
                        <td className="py-2.5 px-4 text-neutral-600">{u.phone || '-'}</td>
                        <td className="py-2.5 px-4 text-center font-sans">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-neutral-900 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-4 text-center font-sans">
                            <select
                              value={u.role}
                              onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                              className="px-2 py-1 text-xs border border-neutral-300 rounded bg-white"
                            >
                              <option value="bendahara">Bendahara</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Save Bar */}
        {isAdmin && activeTab !== 'pengguna' && (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data ke Awal Simulasi</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Pengaturan</span>
            </button>
          </div>
        )}
      </form>

      {/* Confirmation Reset Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full space-y-4 border border-neutral-200 shadow-2xl text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <RotateCcw className="w-4 h-4" />
              <span>Konfirmasi Reset Sistem</span>
            </div>
            <p className="text-neutral-600">
              Apakah Anda yakin ingin mengembalikan seluruh data siswa, tagihan, dan pembayaran ke simulasi awal?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDefaultData();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 bg-rose-600 text-white rounded font-bold hover:bg-rose-700"
              >
                Ya, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
