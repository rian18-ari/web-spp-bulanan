import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Gender, Student, StudentStatus } from '../../types';
import { extractGradeLevel } from '../../utils/formatters';
import { X, Sparkles } from 'lucide-react';

interface StudentFormModalProps {
  studentToEdit?: Student | null;
  onClose: () => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  studentToEdit,
  onClose,
}) => {
  const { addStudent, updateStudent, settings } = useApp();

  const [formData, setFormData] = useState({
    nis: studentToEdit?.nis || '',
    nisn: studentToEdit?.nisn || '',
    name: studentToEdit?.name || '',
    gender: (studentToEdit?.gender || 'L') as Gender,
    classGrade: studentToEdit?.classGrade || 'VII-A',
    gradeLevel: studentToEdit?.gradeLevel || '7',
    category: (studentToEdit?.category || 'asrama_santri') as 'reguler' | 'asrama_santri' | 'beasiswa',
    dormRoom: studentToEdit?.dormRoom || '',
    parentName: studentToEdit?.parentName || '',
    parentPhone: studentToEdit?.parentPhone || '',
    address: studentToEdit?.address || '',
    enrollmentDate: studentToEdit?.enrollmentDate || new Date().toISOString().split('T')[0],
    status: (studentToEdit?.status || 'active') as StudentStatus,
    monthlyFee: studentToEdit?.monthlyFee || 700000,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableClasses = [
    { grade: 'VII-A', level: '7' },
    { grade: 'VII-B', level: '7' },
    { grade: 'VIII-A', level: '8' },
    { grade: 'VIII-B', level: '8' },
    { grade: 'IX-A', level: '9' },
    { grade: 'IX-B', level: '9' },
    { grade: 'X-MIPA 1', level: '10' },
    { grade: 'X-MIPA 2', level: '10' },
    { grade: 'XI-MIPA', level: '11' },
    { grade: 'XI-IPS', level: '11' },
    { grade: 'XII-MIPA', level: '12' },
    { grade: 'XII-IPS', level: '12' },
  ];

  const handleClassChange = (selectedGrade: string) => {
    const classObj = availableClasses.find((c) => c.grade === selectedGrade);
    const level = classObj ? classObj.level : '10';

    // Look up default fee for this class from settings
    const feeConfig = settings.classFeeRates.find((r) => r.classGrade === selectedGrade);
    const defaultFee = feeConfig ? feeConfig.defaultNominal : 650000;

    setFormData((prev) => ({
      ...prev,
      classGrade: selectedGrade,
      gradeLevel: level,
      monthlyFee: studentToEdit ? prev.monthlyFee : defaultFee,
    }));
  };

  const handleCategoryChange = (cat: 'reguler' | 'asrama_santri' | 'beasiswa') => {
    let fee = formData.monthlyFee;
    if (cat === 'reguler' && fee > 450000) fee = 400000;
    if (cat === 'beasiswa') fee = 150000;
    if (cat === 'asrama_santri' && fee < 600000) fee = 650000;

    setFormData((prev) => ({
      ...prev,
      category: cat,
      monthlyFee: studentToEdit ? prev.monthlyFee : fee,
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.nis.trim()) errs.nis = 'Nomor Induk Siswa/Santri wajib diisi.';
    if (!formData.name.trim()) errs.name = 'Nama lengkap siswa/santri wajib diisi.';
    if (!formData.parentName.trim()) errs.parentName = 'Nama orang tua/wali wajib diisi.';
    if (!formData.parentPhone.trim()) errs.parentPhone = 'Nomor WhatsApp wajib diisi.';
    if (!formData.enrollmentDate) errs.enrollmentDate = 'Tanggal masuk wajib diisi.';
    if (formData.monthlyFee <= 0) errs.monthlyFee = 'Nominal SPP harus lebih dari Rp 0.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (studentToEdit) {
      updateStudent({
        ...studentToEdit,
        ...formData,
      });
    } else {
      addStudent(formData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-neutral-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              {studentToEdit ? 'Edit Data Siswa / Santri' : 'Tambah Siswa / Santri Baru'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Kelola data administrasi santri untuk sistem penagihan SPP bulanan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
          {/* Identitas Utama: NIS & Nama Lengkap */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Nomor Induk (NIS) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nis}
                onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                placeholder="202607105"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:border-neutral-900"
              />
              {errors.nis && <p className="text-rose-500 text-[11px] mt-1">{errors.nis}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-neutral-700 mb-1">
                Nama Lengkap Siswa / Santri <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Muhammad Farhan Al-Ghifari"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
              />
              {errors.name && <p className="text-rose-500 text-[11px] mt-1">{errors.name}</p>}
            </div>
          </div>

          {/* Gender & NISN & Tanggal Masuk */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Jenis Kelamin</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:border-neutral-900"
              >
                <option value="L">Laki-laki (Santriwan)</option>
                <option value="P">Perempuan (Santriwati)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">NISN (Opsional)</label>
              <input
                type="text"
                value={formData.nisn}
                onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                placeholder="0087261901"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Tanggal Masuk <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.enrollmentDate}
                onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:border-neutral-900"
              />
              {errors.enrollmentDate && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.enrollmentDate}</p>
              )}
            </div>
          </div>

          {/* Kelas & Tingkat & Status Aktif */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Kelas</label>
              <select
                value={formData.classGrade}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:border-neutral-900"
              >
                {availableClasses.map((c) => (
                  <option key={c.grade} value={c.grade}>
                    {c.grade} ({extractGradeLevel(c.grade)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Tingkat Pendidikan</label>
              <div className="px-3 py-2 bg-neutral-100 rounded-md text-neutral-700 font-medium">
                {extractGradeLevel(formData.classGrade)}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Status Keaktifan</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:border-neutral-900"
              >
                <option value="active">Aktif Belajar</option>
                <option value="inactive">Nonaktif / Keluar / Pindah</option>
              </select>
            </div>
          </div>

          {/* Kategori & Asrama / Kamar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Kategori Siswa</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  handleCategoryChange(e.target.value as 'reguler' | 'asrama_santri' | 'beasiswa')
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:border-neutral-900"
              >
                <option value="asrama_santri">Santri Asrama Mukim (SPP + Asrama + Makan)</option>
                <option value="reguler">Siswa Reguler / Pulang-Pergi</option>
                <option value="beasiswa">Penerima Beasiswa / Subsidi</option>
              </select>
            </div>

            {formData.category === 'asrama_santri' ? (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Kamar Asrama</label>
                <input
                  type="text"
                  value={formData.dormRoom}
                  onChange={(e) => setFormData({ ...formData, dormRoom: e.target.value })}
                  placeholder="Asrama Abu Bakar Lt. 2 / No. 08"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Keterangan</label>
                <div className="px-3 py-2 bg-neutral-50 text-neutral-500 rounded-md italic">
                  Non-mukim asrama
                </div>
              </div>
            )}
          </div>

          {/* Nominal SPP Bulanan (Per Siswa / Mengikuti Kelas) */}
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-neutral-900">
                Nominal SPP Bulanan Siswa Ini <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const feeConfig = settings.classFeeRates.find((r) => r.classGrade === formData.classGrade);
                  if (feeConfig) {
                    setFormData((prev) => ({ ...prev, monthlyFee: feeConfig.defaultNominal }));
                  }
                }}
                className="text-[11px] text-emerald-800 hover:underline flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3 h-3" />
                <span>Gunakan Tarif Standar Kelas {formData.classGrade}</span>
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-neutral-500 font-mono">Rp</span>
              <input
                type="number"
                step="25000"
                value={formData.monthlyFee}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyFee: parseInt(e.target.value) || 0 })
                }
                className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md font-mono tabular-nums text-sm font-bold bg-white focus:outline-hidden focus:border-neutral-900"
              />
            </div>
            {errors.monthlyFee && (
              <p className="text-rose-500 text-[11px] mt-1">{errors.monthlyFee}</p>
            )}
          </div>

          {/* Orang Tua / Wali & Nomor WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Nama Orang Tua / Wali <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                placeholder="Bpk. Bambang Sulistyo"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
              />
              {errors.parentName && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.parentName}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Nomor WhatsApp Orang Tua / Wali <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                placeholder="081289123456"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:border-neutral-900"
              />
              {errors.parentPhone && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.parentPhone}</p>
              )}
            </div>
          </div>

          {/* Alamat */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Alamat Tinggal</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Jl. Melati Indah Blok C3 No. 14, Jakarta Timur"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-md transition-colors"
            >
              {studentToEdit ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
