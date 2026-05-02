import { useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Star, X, Layers, Image, Type, Upload } from 'lucide-react';

const WHITELABEL_MODES = [
    { id: 'image_text', label: 'Logo + Text', icon: Layers, desc: 'Mini logo with brand name' },
    { id: 'image_full', label: 'Full-width Logo', icon: Image, desc: 'Banner image only' },
    { id: 'text_only', label: 'Text Only', icon: Type, desc: 'Just the brand name' },
];

const WhiteLabelTab = () => {
    const { whiteLabel, setWhiteLabel } = useTheme();
    const logoInputRef = useRef(null);
    const faviconInputRef = useRef(null);

    return (
        <div className="settings-section">
            <div className="section-header">
                <h2>White Label</h2>
                <p>Replace the default ServerKit branding with your own</p>
            </div>

            <div className="settings-card">
                <h3>Custom Branding</h3>
                <p>Replace the sidebar logo, name, and GitHub star link</p>

                <div className="settings-row">
                    <div className="settings-label">
                        <span>Enable custom branding</span>
                        <span className="settings-hint">Replaces the sidebar logo, name, and GitHub star link</span>
                    </div>
                    <div className="settings-control">
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={whiteLabel.enabled}
                                onChange={(e) => setWhiteLabel({ enabled: e.target.checked })}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                {whiteLabel.enabled && (
                    <>
                        <div className="whitelabel-modes">
                            {WHITELABEL_MODES.map(({ id, label, icon: Icon, desc }) => (
                                <button
                                    key={id}
                                    className={`whitelabel-mode${whiteLabel.mode === id ? ' active' : ''}`}
                                    onClick={() => setWhiteLabel({ mode: id })}
                                >
                                    <Icon size={20} />
                                    <span className="whitelabel-mode__label">{label}</span>
                                    <span className="whitelabel-mode__desc">{desc}</span>
                                </button>
                            ))}
                        </div>

                        <div className="whitelabel-fields">
                            {whiteLabel.mode !== 'image_full' && (
                                <div className="form-group">
                                    <label>Brand Name</label>
                                    <input
                                        type="text"
                                        value={whiteLabel.brandName}
                                        onChange={(e) => setWhiteLabel({ brandName: e.target.value })}
                                        placeholder="My Brand"
                                        maxLength={30}
                                    />
                                </div>
                            )}

                            {whiteLabel.mode !== 'text_only' && (
                                <div className="form-group">
                                    <label>Logo Image</label>
                                    <div className="whitelabel-upload" onClick={() => logoInputRef.current?.click()}>
                                        {whiteLabel.logoData ? (
                                            <div className="whitelabel-logo-preview">
                                                <img src={whiteLabel.logoData} alt="Logo preview" />
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={(e) => { e.stopPropagation(); setWhiteLabel({ logoData: '' }); }}
                                                >
                                                    <X size={12} /> Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="whitelabel-upload__placeholder">
                                                <Upload size={20} />
                                                <span>Click to upload logo</span>
                                                <span className="whitelabel-upload__hint">PNG, JPG, SVG — max 200KB</span>
                                            </div>
                                        )}
                                        <input
                                            ref={logoInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (file.size > 200 * 1024) {
                                                    alert('Image must be under 200KB');
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onload = (ev) => setWhiteLabel({ logoData: ev.target.result });
                                                reader.readAsDataURL(file);
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Favicon</label>
                                <div className="whitelabel-upload whitelabel-upload--favicon" onClick={() => faviconInputRef.current?.click()}>
                                    {whiteLabel.faviconData ? (
                                        <div className="whitelabel-favicon-preview">
                                            <img src={whiteLabel.faviconData} alt="Favicon preview" />
                                            <div>
                                                <p className="whitelabel-favicon-preview__name">Custom favicon active</p>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={(e) => { e.stopPropagation(); setWhiteLabel({ faviconData: '' }); }}
                                                >
                                                    <X size={12} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="whitelabel-upload__placeholder">
                                            <Upload size={16} />
                                            <span>Click to upload favicon</span>
                                            <span className="whitelabel-upload__hint">PNG, ICO, SVG — 32×32 recommended — max 100KB</span>
                                        </div>
                                    )}
                                    <input
                                        ref={faviconInputRef}
                                        type="file"
                                        accept="image/png,image/x-icon,image/svg+xml,image/webp"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 100 * 1024) {
                                                alert('Favicon must be under 100KB');
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onload = (ev) => setWhiteLabel({ faviconData: ev.target.result });
                                            reader.readAsDataURL(file);
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="whitelabel-preview">
                            <span className="whitelabel-preview__label">Preview</span>
                            <div className="whitelabel-preview__box">
                                {whiteLabel.mode === 'image_full' ? (
                                    <div className="brand-custom-banner">
                                        {whiteLabel.logoData ? (
                                            <img src={whiteLabel.logoData} alt="Preview" />
                                        ) : (
                                            <Layers size={24} />
                                        )}
                                    </div>
                                ) : whiteLabel.mode === 'text_only' ? (
                                    <span className="brand-custom-text">
                                        {whiteLabel.brandName || 'Brand'}
                                    </span>
                                ) : (
                                    <>
                                        <div className="brand-custom-logo">
                                            {whiteLabel.logoData ? (
                                                <img src={whiteLabel.logoData} alt="Preview" />
                                            ) : (
                                                <Layers size={16} />
                                            )}
                                        </div>
                                        <span className="brand-custom-text">
                                            {whiteLabel.brandName || 'Brand'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="whitelabel-star-prompt">
                            <div className="star-icon">
                                <Star size={22} />
                            </div>
                            <div className="star-content">
                                <h4>Support ServerKit</h4>
                                <p>
                                    By using custom branding, the GitHub star link is hidden from the sidebar.
                                    If ServerKit is useful to you, please consider starring the project — it helps the community grow!
                                </p>
                                <a
                                    href="https://github.com/andreamada/ServerKit"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm"
                                >
                                    <Star size={14} />
                                    Star on GitHub
                                </a>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default WhiteLabelTab;
