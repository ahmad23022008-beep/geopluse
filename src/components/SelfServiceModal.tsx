import React, { useState } from 'react';
import { X, Send, FileText, Calendar, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';

export type ServiceModalType = 'izin' | 'lembur' | 'tukar_shift' | 'slip_absen' | null;

interface SelfServiceModalProps {
  type: ServiceModalType;
  onClose: () => void;
  onSubmitSuccess: (message: string) => void;
}

export const SelfServiceModal: React.FC<SelfServiceModalProps> = ({
  type,
  onClose,
  onSubmitSuccess,
}) => {
  if (!type) return null;

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    date: new Date().toISOString().split('T')[0],
    hours: '2',
    targetColleague: 'Fahri Ramadhan (Backend Dev)',
  });

  const getTitle = () => {
    switch (type) {
      case 'izin':
        return 'Pengajuan Izin / Sakit';
      case 'lembur':
        return 'Pengajuan Lembur (Overtime)';
      case 'tukar_shift':
        return 'Permohonan Tukar Shift';
      case 'slip_absen':
        return 'Unduh Slip Absensi Digital';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onSubmitSuccess(
        type === 'slip_absen'
          ? 'Slip absensi berhasil diunduh ke folder Downloads.'
          : 'Pengajuan Anda telah berhasil diteruskan ke HRD untuk persetujuan.'
      );
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-structural-border">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
          {type === 'izin' && <Calendar className="w-5 h-5 text-red-500" />}
          {type === 'lembur' && <Clock className="w-5 h-5 text-blue-500" />}
          {type === 'tukar_shift' && <RefreshCw className="w-5 h-5 text-cyan-500" />}
          {type === 'slip_absen' && <FileText className="w-5 h-5 text-indigo-500" />}
          <span>{getTitle()}</span>
        </h2>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Sistem GeoPulse HRIS Terintegrasi • Persetujuan 1x24 Jam
        </p>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-14 h-14 text-tertiary-container animate-bounce" />
            <h3 className="text-base font-bold text-on-surface mt-3">
              Permintaan Berhasil Dikirim!
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Data tersinkronisasi ke server pusat PT GeoPulse Digital.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
            {type === 'izin' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Jenis Permohonan
                  </label>
                  <select className="w-full bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-structural-border focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Sakit dengan Surat Dokter</option>
                    <option>Cuti Tahunan</option>
                    <option>Izin Urusan Keluarga Mendadak</option>
                    <option>Tugas Luar Kota</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Tanggal Efektif
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-structural-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Alasan / Keterangan
                  </label>
                  <textarea
                    required
                    placeholder="Tuliskan keterangan detail..."
                    className="w-full bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-structural-border focus:outline-none focus:ring-2 focus:ring-primary h-20"
                  />
                </div>
              </>
            )}

            {type === 'lembur' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Jumlah Jam Lembur
                  </label>
                  <select
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-structural-border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="1">1 Jam (18:00 - 19:00 WIB)</option>
                    <option value="2">2 Jam (18:00 - 20:00 WIB)</option>
                    <option value="3">3 Jam (18:00 - 21:00 WIB)</option>
                    <option value="4">4 Jam (18:00 - 22:00 WIB)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Deskripsi Pekerjaan / Task JIRA
                  </label>
                  <textarea
                    required
                    placeholder="Contoh: Deployment hotfix production release 3.8.4..."
                    className="w-full bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-structural-border focus:outline-none focus:ring-2 focus:ring-primary h-20"
                  />
                </div>
              </>
            )}

            {type === 'tukar_shift' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Rekan Kerja Pengganti
                  </label>
                  <select className="w-full bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-structural-border focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Fahri Ramadhan (Backend Developer)</option>
                    <option>Siti Nurhaliza (QA Engineer)</option>
                    <option>Budi Santoso (DevOps Lead)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Shift yang Diminta
                  </label>
                  <select className="w-full bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-structural-border focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Shift Siang (13:00 - 21:00 WIB)</option>
                    <option>Shift Malam (21:00 - 05:00 WIB)</option>
                  </select>
                </div>
              </>
            )}

            {type === 'slip_absen' && (
              <div className="py-3 flex flex-col gap-3">
                <div className="p-3 bg-surface-container rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">Periode: Oktober 2024</span>
                    <span className="text-[11px] text-on-surface-variant">24 Hari Kerja • 18 Log Valid</span>
                  </div>
                  <span className="px-2 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded-full">
                    SIAP UNDUH
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Dokumen slip mencakup rekap jam kehadiran, metadata geolokasi, dan tanda tangan digital QR-Code.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="mt-2 py-3 rounded-2xl bg-primary text-white font-semibold text-xs shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {type === 'slip_absen' ? 'Unduh File PDF/CSV' : 'Kirim Pengajuan ke HRD'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
