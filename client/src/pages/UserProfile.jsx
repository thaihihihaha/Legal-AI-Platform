import React, { useState, useEffect } from 'react';
import { User, Lock, Shield, Eye, EyeOff, CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth.js';
import PageHero from '../components/ui/PageHero';
import './user-profile.css';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  useEffect(() => { loadProfile(); }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadProfile = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/profile`);
      if (!res.ok) throw new Error('Không thể tải thông tin');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading"><Loader size={32} className="spin" /><p>Đang tải...</p></div>
      </div>
    );
  }

  return (
    <div className="profile-page management-page">
      {notification && (
        <div className={`notification ${notification.type}`}>{notification.message}</div>
      )}

      <PageHero
        icon={<User size={32} />}
        title="Hồ sơ cá nhân"
        subtitle="Quản lý thông tin cá nhân, mật khẩu và bảo mật tài khoản của bạn"
        pills={[]}
      />

      <div className="management-table-container" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.6)', borderRadius: '16px' }}>
      <div className="profile-grid">
        <ProfileInfoSection profile={profile} onUpdated={loadProfile} showNotification={showNotification} />
        <ChangePasswordSection showNotification={showNotification} />
        <TwoFactorSection profile={profile} onUpdated={loadProfile} showNotification={showNotification} />
      </div>
      </div>
    </div>
  );
}

// ─── Profile Info Section ──────────────────────────────────────────────────────
function ProfileInfoSection({ profile, onUpdated, showNotification }) {
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone_number: profile?.phone_number || '' });
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) { showNotification('Tên hiển thị không được để trống', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showNotification('Cập nhật thông tin thành công');
      setDirty(false);
      onUpdated();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const map = { admin: 'Quản trị viên', member: 'Thành viên' };
    return map[role] || role;
  };

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <User size={20} />
        <h2>Thông tin cá nhân</h2>
      </div>
      <div className="profile-card-body">
        <div className="profile-avatar">
          <div className="avatar-circle">{(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}</div>
          <div>
            <p className="avatar-name">{profile?.full_name || 'Chưa đặt tên'}</p>
            <span className="role-badge-sm">{getRoleLabel(profile?.role)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-form-group">
            <label>Email</label>
            <input type="email" value={profile?.email || ''} disabled className="input-disabled" />
          </div>
          <div className="profile-form-group">
            <label>Tên hiển thị *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="Nhập tên hiển thị"
            />
          </div>
          <div className="profile-form-group">
            <label>Số điện thoại</label>
            <input
              type="text"
              value={form.phone_number}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              placeholder="Nhập số điện thoại"
            />
          </div>
          <div className="profile-form-group readonly-row">
            <span className="readonly-label">Đăng nhập cuối</span>
            <span className="readonly-value">
              {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString('vi-VN') : 'Chưa có'}
            </span>
          </div>
          {dirty && (
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? <Loader size={14} /> : null}
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Change Password Section ───────────────────────────────────────────────────
function ChangePasswordSection({ showNotification }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRandom = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*';
    const all = upper + lower + digits + special;
    const pwd =
      upper[Math.floor(Math.random() * upper.length)] +
      lower[Math.floor(Math.random() * lower.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      special[Math.floor(Math.random() * special.length)] +
      Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]).join('');
    setForm((prev) => ({ ...prev, newPassword: pwd, confirmPassword: pwd }));
    setShowPw(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword) { setError('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (form.newPassword.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/profile/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showNotification('Đổi mật khẩu thành công');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <Lock size={20} />
        <h2>Đổi mật khẩu</h2>
      </div>
      <div className="profile-card-body">
        <form onSubmit={handleSubmit}>
          <div className="profile-form-group">
            <label>Mật khẩu hiện tại</label>
            <div className="input-with-toggle">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Nhập mật khẩu hiện tại"
              />
              <button type="button" className="toggle-pw" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="profile-form-group">
            <label>Mật khẩu mới</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="input-with-toggle" style={{ flex: 1 }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Nhập mật khẩu mới"
                />
              </div>
              <button type="button" className="btn-generate" onClick={generateRandom} title="Tạo mật khẩu ngẫu nhiên">
                <RefreshCw size={14} />
                Ngẫu nhiên
              </button>
            </div>
          </div>
          <div className="profile-form-group">
            <label>Xác nhận mật khẩu mới</label>
            <div className="input-with-toggle">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
          </div>
          {form.newPassword && form.confirmPassword && (
            <div className={`pw-match-hint ${form.newPassword === form.confirmPassword ? 'match' : 'no-match'}`}>
              {form.newPassword === form.confirmPassword
                ? <><CheckCircle size={14} /> Mật khẩu khớp</>
                : <><XCircle size={14} /> Mật khẩu không khớp</>}
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? <Loader size={14} /> : null}
            {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Two Factor Section ────────────────────────────────────────────────────────
function TwoFactorSection({ profile, onUpdated, showNotification }) {
  const [step, setStep] = useState('idle'); // idle | setup | verify | disable
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/profile/setup-2fa`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const data = await res.json();
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setStep('setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otpToken) { setError('Vui lòng nhập mã OTP'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/profile/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, otp_token: otpToken }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showNotification('Kích hoạt 2FA thành công! Tài khoản của bạn đã được bảo vệ.');
      setStep('idle');
      setOtpToken('');
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!disablePassword) { setError('Vui lòng nhập mật khẩu'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/profile/disable-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: disablePassword }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showNotification('Đã tắt 2FA. Tài khoản chỉ sử dụng mật khẩu để đăng nhập.');
      setStep('idle');
      setDisablePassword('');
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => { setStep('idle'); setError(''); setOtpToken(''); setDisablePassword(''); };

  const isEnabled = profile?.totp_enabled;

  return (
    <div className="profile-card profile-card--2fa">
      <div className="profile-card-header">
        <Shield size={20} />
        <h2>Xác thực 2 lớp (2FA)</h2>
        <span className={`badge-2fa ${isEnabled ? 'enabled' : 'disabled'}`}>
          {isEnabled ? 'Đang bật' : 'Chưa bật'}
        </span>
      </div>
      <div className="profile-card-body">
        {step === 'idle' && (
          <>
            {isEnabled ? (
              <>
                <div className="twofa-status active">
                  <CheckCircle size={18} />
                  <p>Tài khoản được bảo vệ bằng Google Authenticator. Mỗi lần đăng nhập bạn cần nhập mã OTP từ ứng dụng.</p>
                </div>
                <button className="btn-danger-outline" onClick={() => { setStep('disable'); setError(''); }}>
                  Tắt 2FA
                </button>
              </>
            ) : (
              <>
                <div className="twofa-status inactive">
                  <XCircle size={18} />
                  <p>Tài khoản chưa bật 2FA. Kích hoạt để tăng cường bảo mật bằng Google Authenticator.</p>
                </div>
                <button className="btn-save" onClick={handleSetup} disabled={loading}>
                  {loading ? <Loader size={14} /> : <Shield size={14} />}
                  Kích hoạt 2FA
                </button>
              </>
            )}
          </>
        )}

        {step === 'setup' && (
          <div className="twofa-setup">
            <p className="setup-instruction">
              <strong>Bước 1:</strong> Mở <strong>Google Authenticator</strong> và quét mã QR bên dưới:
            </p>
            {qrCode && (
              <div className="qr-wrapper">
                <img src={qrCode} alt="QR Code 2FA" className="qr-image" />
              </div>
            )}
            <div className="manual-key">
              <span>Hoặc nhập thủ công:</span>
              <code>{secret}</code>
            </div>
            <p className="setup-instruction" style={{ marginTop: '16px' }}>
              <strong>Bước 2:</strong> Nhập mã 6 số từ ứng dụng để xác nhận:
            </p>
            <form onSubmit={handleVerify}>
              <div className="otp-input-row">
                <input
                  type="text"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="otp-input"
                  autoComplete="one-time-code"
                />
                <button type="submit" className="btn-save" disabled={loading || otpToken.length !== 6}>
                  {loading ? <Loader size={14} /> : null}
                  Xác nhận
                </button>
                <button type="button" className="btn-cancel-outline" onClick={cancel}>Hủy</button>
              </div>
              {error && <p className="form-error">{error}</p>}
            </form>
          </div>
        )}

        {step === 'disable' && (
          <div className="twofa-disable">
            <p>Nhập mật khẩu của bạn để xác nhận tắt 2FA:</p>
            <form onSubmit={handleDisable}>
              <div className="otp-input-row">
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Mật khẩu hiện tại"
                  className="profile-form-input"
                />
                <button type="submit" className="btn-danger-solid" disabled={loading}>
                  {loading ? <Loader size={14} /> : null}
                  Tắt 2FA
                </button>
                <button type="button" className="btn-cancel-outline" onClick={cancel}>Hủy</button>
              </div>
              {error && <p className="form-error">{error}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
