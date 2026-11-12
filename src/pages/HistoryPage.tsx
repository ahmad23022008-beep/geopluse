import React, { useEffect, useState } from 'react';
import { AttendanceRecord } from '../types/attendance';
import {
  getAdminAttendancePhotos,
  getEmployeeProfile,
  type AttendancePhotoEvidence,
} from '../services/attendanceService';
import {
  Calendar,
  Search,
  SlidersHorizontal,
  Clock,
  MapPin,
  FileText,
  Download,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

interface HistoryPageProps {
  records: AttendanceRecord[];
  onOpenMapDetail: (record: AttendanceRecord) => void;
  onExportReport: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  records,
  onOpenMapDetail,
  onExportReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<'all' | 'tepat_waktu' | 'terlambat' | 'izin_sakit'>('all');
  const [selectedMonth, setSelectedMonth] = useState('Oktober 2024');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEvidence, setAdminEvidence] = useState<AttendancePhotoEvidence[]>([]);
  const [adminEvidenceLoading, setAdminEvidenceLoading] = useState(false);
  const [adminEvidenceError, setAdminEvidenceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadAdminEvidence = async () => {
      try {
        const employee = await getEmployeeProfile();
        if (!employee) {
          throw new Error('Profil karyawan tidak tersedia untuk memeriksa akses bukti foto.');
        }
        if (employee.role !== 'admin') return;

        if (active) {
          setIsAdmin(true);
          setAdminEvidenceLoading(true);
        }
        const evidence = await getAdminAttendancePhotos();
        if (active) setAdminEvidence(evidence);
      } catch (error) {
        if (active) {
          setAdminEvidenceError(
            error instanceof Error ? error.message : 'Bukti foto kehadiran gagal dimuat.'
          );
        }
      } finally {
        if (active) setAdminEvidenceLoading(false);
      }
    };

    void loadAdminEvidence();
    return () => {
      active = false;
    };
  }, []);

  const filteredRecords = records.filter((rec) => {
    // Filter by search query
    const matchesSearch =
      rec.dateFormatted.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.shift.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.checkInLocation && rec.checkInLocation.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filter by segment tab
    if (!matchesSearch) return false;
    if (filterSegment === 'all') return true;
    if (filterSegment === 'tepat_waktu') return rec.status === 'tepat_waktu' || rec.status === 'wfo';
    if (filterSegment === 'terlambat') return rec.status === 'terlambat';
    if (filterSegment === 'izin_sakit') return rec.status === 'izin_sakit';
    return true;
  });

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full pb-10">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            Riwayat & Log Kehadiran
          </h1>
          <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed"></span>
            <span>Audit terenkripsi satelit GPS real-time</span>
          </p>
        </div>

        {/* Month Dropdown Selector */}
        <div className="relative">
          <button className="flex items-center gap-2 bg-surface-container-lowest shadow-sm rounded-full px-4 py-2 border border-structural-border text-xs font-semibold text-on-surface hover:bg-surface-container transition-all">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{selectedMonth}</span>
            <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>
        </div>
      </div>

      {/* Monthly Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Stat 1: Hadir Kerja */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-structural-border flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-14 h-14 bg-tertiary-fixed/30 rounded-full blur-md pointer-events-none"></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Hadir Kerja
            </span>
            <CheckCircle2 className="w-4 h-4 text-tertiary-container" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-on-surface">18 Hari</span>
            <span className="bg-tertiary-fixed px-1.5 py-0.5 rounded-full text-[10px] text-on-tertiary-fixed font-bold">
              94.7%
            </span>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="bg-tertiary-fixed-dim h-full rounded-full" style={{ width: '94.7%' }}></div>
          </div>
        </div>

        {/* Stat 2: Terlambat */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-structural-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Terlambat
            </span>
            <Clock className="w-4 h-4 text-secondary-container" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-on-surface">1 Hari</span>
            <span className="font-mono text-xs text-on-surface-variant">+12 mnt</span>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="bg-secondary-container h-full rounded-full" style={{ width: '5.3%' }}></div>
          </div>
        </div>

        {/* Stat 3: Cuti / Izin */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-structural-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Cuti / Izin
            </span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-on-surface">1 Hari</span>
            <span className="text-[11px] text-on-surface-variant">(Disetujui)</span>
          </div>
          <span className="text-[10px] text-secondary font-medium mt-2">10 Sisa Cuti</span>
        </div>

        {/* Stat 4: Alpha / Absen */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-structural-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Alpha / Bolos
            </span>
            <CheckCircle2 className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-on-surface">0 Hari</span>
            <span className="bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              Nir-Absen
            </span>
          </div>
          <span className="text-[10px] text-tertiary-container font-medium mt-2">Disiplin Prima</span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tanggal, shift, atau lokasi..."
            className="w-full bg-surface-container-lowest pl-9 pr-3 py-2.5 rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/70 shadow-sm border border-structural-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <button
          className="bg-surface-container-lowest p-2.5 rounded-xl shadow-sm border border-structural-border text-primary hover:bg-surface-container transition-all"
          title="Filter lanjutan"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Filter Segmented Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterSegment('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            filterSegment === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-structural-border'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterSegment('tepat_waktu')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            filterSegment === 'tepat_waktu'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-structural-border'
          }`}
        >
          Tepat Waktu
        </button>
        <button
          onClick={() => setFilterSegment('terlambat')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            filterSegment === 'terlambat'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-structural-border'
          }`}
        >
          Terlambat
        </button>
        <button
          onClick={() => setFilterSegment('izin_sakit')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            filterSegment === 'izin_sakit'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-structural-border'
          }`}
        >
          Izin/Sakit
        </button>
      </div>

      {/* Chronological Log Cards */}
      <div className="flex flex-col gap-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-surface-container-lowest p-8 rounded-2xl text-center text-xs text-on-surface-variant border border-structural-border">
            Tidak ada catatan presensi yang sesuai dengan kriteria pencarian.
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-structural-border flex flex-col gap-3 hover:shadow-card-hover transition-all"
            >
              {/* Header with Date and Status pill */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">
                    {rec.dateFormatted}
                  </h3>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {rec.shift} • {rec.shiftHours}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    rec.statusColor === 'lime'
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : rec.statusColor === 'yellow'
                      ? 'bg-blue-100 text-blue-700'
                      : rec.statusColor === 'blue'
                      ? 'bg-secondary-fixed text-secondary'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{rec.statusLabel}</span>
                </span>
              </div>

              {/* Check-In & Check-Out Detail Box */}
              {rec.checkIn && (
                <div className="bg-surface-container-low rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-on-surface-variant font-medium">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>MASUK</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-on-surface mt-0.5 block">
                      {rec.checkIn}
                    </span>
                    <span className="text-[11px] text-on-surface-variant truncate block">
                      {rec.checkInLocation}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-on-surface-variant font-medium">
                      <Clock className="w-3.5 h-3.5 text-secondary" />
                      <span>PULANG</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-on-surface mt-0.5 block">
                      {rec.checkOut || '-'}
                    </span>
                    <span className="text-[11px] text-on-surface-variant truncate block">
                      {rec.checkOutLocation || '-'}
                    </span>
                  </div>
                </div>
              )}

              {/* Attachment if present (e.g. Surat Dokter) */}
              {rec.attachment && (
                <div className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-primary flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-on-surface">
                        {rec.attachment.name}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        {rec.attachment.size} • {rec.attachment.doctor}
                      </span>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-surface-container-lowest text-primary rounded-lg text-xs font-semibold border border-structural-border hover:bg-surface-container transition-colors">
                    Unduh
                  </button>
                </div>
              )}

              {/* Bottom footer: Duration & View Map button */}
              <div className="flex items-center justify-between pt-1 text-xs">
                {rec.duration ? (
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">Durasi: {rec.duration}</span>
                  </div>
                ) : (
                  <span className="text-on-surface-variant italic">Izin Khusus HRD</span>
                )}

                {rec.checkIn && (
                  <button
                    onClick={() => onOpenMapDetail(rec)}
                    className="flex items-center gap-1 text-primary hover:text-primary-container font-semibold transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Lihat Peta</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Download monthly recap button */}
      <div className="mt-2 flex flex-col gap-1.5">
        <button
          onClick={onExportReport}
          className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-xs tracking-wide shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Rekap Bulanan (PDF/CSV)</span>
        </button>
        <span className="text-center text-[11px] text-on-surface-variant">
          Dokumen rekap mencakup tanda tangan digital & metadata geolokasi.
        </span>
      </div>

      {isAdmin && (
        <section className="flex flex-col gap-3" aria-labelledby="attendance-photo-evidence">
          <div>
            <h2 id="attendance-photo-evidence" className="text-lg font-bold text-on-surface">
              Bukti Foto Kehadiran
            </h2>
            <p className="text-xs text-on-surface-variant">
              Foto check-in dan check-out beserta waktu pengambilan dan informasi GPS.
            </p>
          </div>
          {adminEvidenceLoading && (
            <p className="text-sm text-on-surface-variant" role="status">
              Memuat bukti foto...
            </p>
          )}
          {adminEvidenceError && (
            <p className="text-sm text-red-700" role="alert">{adminEvidenceError}</p>
          )}
          {!adminEvidenceLoading && !adminEvidenceError && adminEvidence.length === 0 && (
            <p className="rounded-2xl border border-structural-border bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
              Belum ada foto kehadiran.
            </p>
          )}
          {adminEvidence.map((item) => (
            <article
              key={item.id}
              className="grid gap-3 rounded-2xl border border-structural-border bg-surface-container-lowest p-4 sm:grid-cols-[9rem_1fr]"
            >
              <a
                href={item.photo_url}
                rel="noopener noreferrer"
                target="_blank"
                aria-label={`Buka foto ${item.type === 'check_in' ? 'check-in' : 'check-out'} karyawan ${item.employee_id}`}
              >
                <img
                  alt={`Foto ${item.type === 'check_in' ? 'check-in' : 'check-out'} karyawan ${item.employee_id}`}
                  className="h-36 w-full rounded-xl bg-surface-container object-cover"
                  src={item.photo_url}
                />
              </a>
              <div className="flex flex-col gap-1 text-xs text-on-surface-variant">
                <h3 className="font-bold text-on-surface">
                  {item.type === 'check_in' ? 'Check-in' : 'Check-out'} • {item.employee_id}
                </h3>
                <span>Tanggal: {item.attendance_date}</span>
                <span>
                  Foto dicatat server: {new Date(item.photo_captured_at).toLocaleString('id-ID')}
                </span>
                <span>
                  GPS: {item.latitude?.toFixed(6) ?? '-'}, {item.longitude?.toFixed(6) ?? '-'}
                  {item.gps_accuracy_m !== null ? ` • Akurasi ±${item.gps_accuracy_m.toFixed(1)} m` : ''}
                </span>
                <span>
                  Jarak ke kantor: {item.distance_to_office_m !== null
                    ? `${Math.round(item.distance_to_office_m)} m`
                    : '-'}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};
