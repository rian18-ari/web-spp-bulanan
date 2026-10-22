import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import {
  extractGradeLevel,
  formatIndonesianDate,
  formatRupiah,
} from '../../utils/formatters';
import { StudentFormModal } from './StudentFormModal';
import { StudentDetailModal } from './StudentDetailModal';
import {
  UserPlus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Phone,
  Calendar,
} from 'lucide-react';

export const StudentListView: React.FC = () => {
  const {
    students,
    bills,
    deleteStudent,
    searchQuery,
    setSearchQuery,
    setSelectedStudentForDetail,
    setActiveTab,
    setPreselectedStudentForPayment,
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Extract unique classes
  const classes = Array.from(new Set(students.map((s) => s.classGrade))).sort();

  // Filter students based on name/NIS, class, grade level, and active status
  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch =
      query === '' ||
      student.name.toLowerCase().includes(query) ||
      student.nis.toLowerCase().includes(query) ||
      student.nisn.toLowerCase().includes(query) ||
      student.parentName.toLowerCase().includes(query);

    const matchClass = selectedClass === 'all' || student.classGrade === selectedClass;
    const matchGradeLevel =
      selectedGradeLevel === 'all' ||
      student.gradeLevel === selectedGradeLevel ||
      extractGradeLevel(student.classGrade).includes(selectedGradeLevel);

    const matchStatus = selectedStatus === 'all' || student.status === selectedStatus;

    return matchSearch && matchClass && matchGradeLevel && matchStatus;
  });

  const getStudentArrears = (studentId: string) => {
    const unpaid = bills.filter(
      (b) =>
        b.studentId === studentId &&
        (b.status === 'unpaid' || b.status === 'overdue' || b.status === 'partial')
    );
    const amount = unpaid.reduce(
      (sum, b) =>
        sum +
        (b.remainingAmount !== undefined
          ? b.remainingAmount
          : Math.max(0, b.amount - (b.paidAmount || 0))),
      0
    );
    return { count: unpaid.length, amount };
  };

  const handlePayClick = (studentId: string) => {
    setPreselectedStudentForPayment(studentId);
    setActiveTab('payment');
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  const activeCount = students.filter((s) => s.status === 'active').length;
  const inactiveCount = students.filter((s) => s.status === 'inactive').length;

  return (
    <div className="space-y-4">
      {/* Top Filter and Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Live Search by Name or Nomor Induk */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau nomor induk (NIS/NISN)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
            />
          </div>

          {/* Filter Kelas */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value="all">Semua Kelas</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                Kelas {cls}
              </option>
            ))}
          </select>

          {/* Filter Tingkat */}
          <select
            value={selectedGradeLevel}
            onChange={(e) => setSelectedGradeLevel(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value="all">Semua Tingkat</option>
            <option value="7">Tingkat 7 (SMP/MTs)</option>
            <option value="8">Tingkat 8 (SMP/MTs)</option>
            <option value="9">Tingkat 9 (SMP/MTs)</option>
            <option value="10">Tingkat 10 (SMA/MA)</option>
            <option value="11">Tingkat 11 (SMA/MA)</option>
            <option value="12">Tingkat 12 (SMA/MA)</option>
          </select>

          {/* Filter Status Aktif */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value="all">Semua Status Keaktifan</option>
            <option value="active">Aktif ({activeCount})</option>
            <option value="inactive">Nonaktif ({inactiveCount})</option>
          </select>
        </div>

        {/* Add Student Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Siswa / Santri</span>
        </button>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 text-neutral-600 border-b border-neutral-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Nomor Induk (NIS)</th>
                <th className="py-3 px-4">Nama Lengkap & Gender</th>
                <th className="py-3 px-4">Kelas & Tingkat</th>
                <th className="py-3 px-4">Orang Tua & WhatsApp</th>
                <th className="py-3 px-4">Tanggal Masuk</th>
                <th className="py-3 px-4 text-right">Tarif SPP</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Kewajiban SPP</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-400">
                    Tidak ditemukan data siswa/santri sesuai kriteria pencarian dan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const arrears = getStudentArrears(student.id);
                  const isSantri = student.category === 'asrama_santri';
                  const isActive = student.status === 'active';

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        !isActive ? 'bg-neutral-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* Nomor Induk */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-semibold text-neutral-900 block">{student.nis}</span>
                        {student.nisn && (
                          <span className="text-[11px] text-neutral-400 block">
                            NISN: {student.nisn}
                          </span>
                        )}
                      </td>

                      {/* Nama Lengkap & Gender */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{student.name}</div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <span>{student.gender === 'L' ? 'Laki-laki (Santriwan)' : 'Perempuan (Santriwati)'}</span>
                          <span>·</span>
                          <span>
                            {isSantri ? 'Santri Mukim' : student.category === 'beasiswa' ? 'Beasiswa' : 'Reguler'}
                          </span>
                        </div>
                      </td>

                      {/* Kelas & Tingkat */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-neutral-900 block">
                          Kelas {student.classGrade}
                        </span>
                        <span className="text-[11px] text-neutral-500 block">
                          {extractGradeLevel(student.classGrade)}
                        </span>
                        {isSantri && student.dormRoom && (
                          <span className="text-[10px] text-neutral-400 block truncate max-w-[170px]">
                            {student.dormRoom}
                          </span>
                        )}
                      </td>

                      {/* Orang Tua & WhatsApp */}
                      <td className="py-3 px-4">
                        <span className="block text-neutral-800 font-medium">{student.parentName}</span>
                        <a
                          href={`https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:underline font-mono"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{student.parentPhone}</span>
                        </a>
                      </td>

                      {/* Tanggal Masuk */}
                      <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          <span>{formatIndonesianDate(student.enrollmentDate, 'short')}</span>
                        </div>
                      </td>

                      {/* Tarif SPP */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {formatRupiah(student.monthlyFee)}
                      </td>

                      {/* Status Aktif */}
                      <td className="py-3 px-4 text-center">
                        {isActive ? (
                          <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-600 font-medium bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Status Tunggakan SPP */}
                      <td className="py-3 px-4">
                        {arrears.count === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Lunas (Tertib)
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {arrears.count} Bln Menunggak
                            </span>
                            <span className="block text-[11px] font-mono font-medium text-rose-600 tabular-nums">
                              {formatRupiah(arrears.amount)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedStudentForDetail(student)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Lihat Detail Profil & Histori Tagihan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isActive && (
                            <button
                              onClick={() => handlePayClick(student.id)}
                              className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors"
                              title="Bayar SPP Siswa Ini"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setStudentToEdit(student)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || studentToEdit) && (
        <StudentFormModal
          studentToEdit={studentToEdit}
          onClose={() => {
            setIsAddModalOpen(false);
            setStudentToEdit(null);
          }}
        />
      )}

      {/* Detail Modal */}
      <StudentDetailModal />

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 border border-neutral-200">
            <h4 className="text-sm font-bold text-neutral-900">Konfirmasi Hapus Siswa</h4>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus data siswa{' '}
              <strong className="text-neutral-900">{studentToDelete.name}</strong> (NIS: {studentToDelete.nis})?
              Data tagihan yang belum dibayar akan dihapus dari sistem.
            </p>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-3 py-1.5 text-xs border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium rounded transition-colors"
              >
                Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
