import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { isAdmin, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <NavLink to="/" className="navbar-logo">
                    <div className="navbar-logo-icon">🧹</div>
                    <div className="navbar-logo-text">
                        Alter<span>Net</span> Chore
                    </div>
                </NavLink>

                <div className="navbar-links">
                    <NavLink to="/" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`} end>
                        {({ isActive }) => (
                            <>
                                📅 Takvim
                                {isActive && (
                                    <motion.div
                                        className="navbar-link-indicator"
                                        layoutId="nav-indicator"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                    {isAdmin && (
                        <NavLink to="/admin" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
                            {({ isActive }) => (
                                <>
                                    ⚙️ Yönetim
                                    {isActive && (
                                        <motion.div
                                            className="navbar-link-indicator"
                                            layoutId="nav-indicator"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    )}
                </div>

                <div className="navbar-actions">
                    {isAdmin ? (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { logout(); navigate('/'); }}
                        >
                            Çıkış Yap
                        </button>
                    ) : (
                        <NavLink to="/login" className="btn btn-primary btn-sm">
                            Giriş Yap
                        </NavLink>
                    )}
                </div>
            </div>
        </nav>
    );
}
